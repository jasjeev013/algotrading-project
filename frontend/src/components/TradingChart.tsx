import { useEffect, useRef, useState } from "react";
import {
  createChart, CrosshairMode, CandlestickSeries, LineSeries, BarSeries, AreaSeries, LineType,
  createSeriesMarkers,
} from "lightweight-charts";
import type { ISeriesApi, ISeriesMarkersPluginApi, LineWidth, SeriesMarker, Time } from "lightweight-charts";
import type { IndicatorSpec, PricePoint, Trade } from "../types/backtest";
import { toChartTime } from "../utils/chartTime";

const CHART_TYPES = [
  { value: "candlestick", label: "Candles" },
  { value: "bar", label: "Bars" },
  { value: "line", label: "Line" },
  { value: "area", label: "Smooth" },
];

interface TradingChartProps {
  priceData: PricePoint[];
  tradeLog: Trade[];
  indicatorData?: Record<string, IndicatorSpec>;
}

const TradingChart = ({ priceData, tradeLog, indicatorData = {} }: TradingChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const lineSeriesRefs = useRef<Record<string, { series: ISeriesApi<"Line">; data: { time: string; value: number }[] }>>({});
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const markersDataRef = useRef<SeriesMarker<Time>[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [chartType, setChartType] = useState("candlestick");
  const [showMarkers, setShowMarkers] = useState(true);

  // Reset visibility when indicator set changes (new strategy selected).
  // Adjusted during render (not in an effect) per React's guidance for
  // state that derives from a prop change, to avoid an extra render pass.
  const indicatorKeys = Object.keys(indicatorData).join(",");
  const [prevIndicatorKeys, setPrevIndicatorKeys] = useState(indicatorKeys);
  if (indicatorKeys !== prevIndicatorKeys) {
    setPrevIndicatorKeys(indicatorKeys);
    setVisible({});
  }

  // Build chart
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!priceData || priceData.length === 0 || !container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: { background: { color: "#f4f2ee" }, textColor: "#5c574c" },
      grid: { vertLines: { color: "#e7e3da" }, horzLines: { color: "#e7e3da" } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#ddd8cc" },
      rightPriceScale: { borderColor: "#ddd8cc" },
    });
    lineSeriesRefs.current = {};

    let priceSeries;
    if (chartType === "bar") {
      priceSeries = chart.addSeries(BarSeries, {
        upColor: "#4CAF50", downColor: "#f44336",
      });
      priceSeries.setData(priceData.map((d) => ({ ...d, time: toChartTime(d.time) })));
    } else if (chartType === "line" || chartType === "area") {
      const closeData = priceData.map((d) => ({ time: toChartTime(d.time), value: d.close }));
      if (chartType === "area") {
        priceSeries = chart.addSeries(AreaSeries, {
          lineColor: "#4CAF50", topColor: "rgba(76, 175, 80, 0.4)", bottomColor: "rgba(76, 175, 80, 0.02)",
          lineWidth: 2, lineType: LineType.Curved,
        });
      } else {
        priceSeries = chart.addSeries(LineSeries, { color: "#4CAF50", lineWidth: 2 });
      }
      priceSeries.setData(closeData);
    } else {
      priceSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#4CAF50", downColor: "#f44336",
        borderVisible: false, wickUpColor: "#4CAF50", wickDownColor: "#f44336",
      });
      priceSeries.setData(priceData.map((d) => ({ ...d, time: toChartTime(d.time) })));
    }

    for (const [key, spec] of Object.entries(indicatorData)) {
      // "oscillator" indicators (MACD, RSI, ...) aren't on the price scale --
      // give them their own auto-scaling axis squeezed into a strip at the
      // bottom of the same chart, instead of sharing the price scale where
      // they'd render as a flat line pinned near zero.
      const isOscillator = spec.scale === "oscillator";
      const seriesOptions: {
        color: string;
        lineWidth: LineWidth;
        priceLineVisible: boolean;
        lastValueVisible: boolean;
        priceScaleId?: string;
      } = {
        color: spec.color, lineWidth: 1.5 as LineWidth,
        priceLineVisible: false, lastValueVisible: false,
      };
      if (isOscillator) seriesOptions.priceScaleId = "oscillator-scale";

      const ls = chart.addSeries(LineSeries, seriesOptions);
      if (isOscillator) {
        ls.priceScale().applyOptions({
          scaleMargins: { top: 0.75, bottom: 0.02 },
          visible: false,
        });
      }
      ls.setData(spec.data.map((d) => ({ time: toChartTime(d.time), value: d.value })));
      lineSeriesRefs.current[key] = { series: ls, data: spec.data };
    }

    const markers: SeriesMarker<Time>[] = [];
    tradeLog.forEach((trade) => {
      markers.push({
        time: toChartTime(trade.entry_date),
        position: trade.type === "LONG" ? "belowBar" : "aboveBar",
        color: trade.type === "LONG" ? "#4CAF50" : "#f44336",
        shape: trade.type === "LONG" ? "arrowUp" : "arrowDown",
        text: `Entry ${trade.type}`,
      });
      markers.push({
        time: toChartTime(trade.exit_date),
        position: trade.type === "LONG" ? "aboveBar" : "belowBar",
        color: "#FF9800",
        shape: trade.type === "LONG" ? "arrowDown" : "arrowUp",
        text: "Exit",
      });
    });
    markers.sort((a, b) => new Date(a.time as unknown as string).getTime() - new Date(b.time as unknown as string).getTime());
    markersDataRef.current = markers;
    markersRef.current = createSeriesMarkers(priceSeries, showMarkers ? markers : []);

    const handleResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [priceData, tradeLog, indicatorData, chartType]);

  // Toggle entry/exit arrows without rebuilding the chart
  useEffect(() => {
    if (markersRef.current) {
      markersRef.current.setMarkers(showMarkers ? markersDataRef.current : []);
    }
  }, [showMarkers]);

  // Toggle visibility without rebuilding the chart
  useEffect(() => {
    for (const [key, ref] of Object.entries(lineSeriesRefs.current)) {
      ref.series.setData(
        visible[key] !== false
          ? ref.data.map((d) => ({ time: toChartTime(d.time), value: d.value }))
          : [],
      );
    }
  }, [visible]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
        {Object.entries(indicatorData).map(([key, spec]) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#5c574c" }}>
            <input type="checkbox" checked={visible[key] !== false}
              onChange={(e) => setVisible((p) => ({ ...p, [key]: e.target.checked }))} />
            <span style={{ display: "inline-block", width: 12, height: 2, background: spec.color, verticalAlign: "middle" }} />
            {spec.label}
          </label>
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#5c574c" }}>
          <input type="checkbox" checked={showMarkers}
            onChange={(e) => setShowMarkers(e.target.checked)} />
          Entry/Exit arrows
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#5c574c", marginLeft: "auto" }}>
          Chart type
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}
            style={{ background: "#f4f2ee", color: "#111111", border: "1px solid #ddd8cc", padding: "2px 6px", fontSize: "12px" }}>
            {CHART_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>
      <div ref={chartContainerRef} style={{ position: "relative", width: "100%", background: "#f4f2ee", border: "1px solid #ddd8cc" }} />
    </div>
  );
};

export default TradingChart;
