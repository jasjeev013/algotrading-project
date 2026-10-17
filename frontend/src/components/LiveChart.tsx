import { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import type { IChartApi, ISeriesApi, ISeriesMarkersPluginApi, SeriesMarker, Time } from "lightweight-charts";
import type { LiveCandle, LiveTrade } from "../types/live";

type MarkerAction = "buy" | "sell" | "close";

const ACTION_MARKER: Record<MarkerAction, { color: string; shape: "arrowUp" | "arrowDown" | "circle"; position: "belowBar" | "aboveBar"; text: string }> = {
  buy: { color: "#4CAF50", shape: "arrowUp", position: "belowBar", text: "Buy" },
  sell: { color: "#f44336", shape: "arrowDown", position: "aboveBar", text: "Sell" },
  close: { color: "#FF9800", shape: "circle", position: "aboveBar", text: "Close" },
};

const toChartTime = (isoString: string): number | undefined => {
  const ms = Date.parse(isoString);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
};

interface LiveChartProps {
  candles: LiveCandle[];
  trades: LiveTrade[];
  instrument: string;
}

const LiveChart = ({ candles, trades, instrument }: LiveChartProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  // Create chart once on mount — never destroy/recreate on data updates.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 400,
      layout: {
        background: { color: "transparent" },
        textColor: "#92a0b8",
      },
      grid: {
        vertLines: { color: "#1b212c" },
        horzLines: { color: "#1b212c" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#232a38",
      },
      rightPriceScale: { borderColor: "#232a38" },
    });
    chartRef.current = chart;

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#4CAF50",
      downColor: "#f44336",
      borderVisible: false,
      wickUpColor: "#4CAF50",
      wickDownColor: "#f44336",
    });
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      markersPluginRef.current = null;
    };
  }, []);

  // Update candle data — preserve the user's zoom/scroll viewport.
  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart || !candles || candles.length === 0) return;

    const priceData = candles
      .map((c) => ({ ...c, time: toChartTime(String(c.time)) }))
      .filter((c): c is typeof c & { time: number } => c.time !== undefined)
      .sort((a, b) => a.time - b.time)
      .map((c) => ({ ...c, time: c.time as unknown as Time }));

    const visibleRange = chart.timeScale().getVisibleLogicalRange();
    series.setData(priceData);
    if (visibleRange) {
      chart.timeScale().setVisibleLogicalRange(visibleRange);
    }
  }, [candles]);

  // Update trade markers without touching the viewport.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    type LiveMarker = {
      time: Time;
      position: "aboveBar" | "belowBar";
      color: string;
      shape: "arrowUp" | "arrowDown" | "circle";
      text: string;
    };

    const actionable = new Set<string>(["buy", "sell", "close"]);
    const markers: SeriesMarker<Time>[] = (trades || [])
      .filter((t) => actionable.has(t.action) && (!instrument || t.instrument === instrument))
      .map((t): LiveMarker | null => {
        const spec = ACTION_MARKER[t.action as MarkerAction];
        const time = toChartTime(t.signal_time);
        if (time === undefined) return null;
        return {
          time: time as unknown as Time,
          position: spec.position,
          color: spec.color,
          shape: spec.shape,
          text: `${spec.text}${t.units ? ` ${t.units}` : ""}`,
        };
      })
      .filter((m): m is LiveMarker => m !== null)
      .sort((a, b) => (a.time as unknown as number) - (b.time as unknown as number));

    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers);
    } else if (markers.length > 0) {
      markersPluginRef.current = createSeriesMarkers(series, markers);
    }
  }, [trades, instrument]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        border: "1px solid #1b212c",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    />
  );
};

export default LiveChart;
