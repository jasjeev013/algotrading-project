import { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  createSeriesMarkers,
} from "lightweight-charts";

const ACTION_MARKER = {
  buy: { color: "#4CAF50", shape: "arrowUp", position: "belowBar", text: "Buy" },
  sell: { color: "#f44336", shape: "arrowDown", position: "aboveBar", text: "Sell" },
  close: { color: "#FF9800", shape: "circle", position: "aboveBar", text: "Close" },
};

const toChartTime = (isoString) => {
  const ms = Date.parse(isoString);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
};

const LiveChart = ({ candles, trades, instrument }) => {
  const containerRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const markersPluginRef = useRef(null);

  // Create chart once on mount — never destroy/recreate on data updates.
  useEffect(() => {
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
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
      .map((c) => ({ ...c, time: toChartTime(c.time) }))
      .filter((c) => c.time !== undefined)
      .sort((a, b) => a.time - b.time);

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

    const actionable = new Set(["buy", "sell", "close"]);
    const markers = (trades || [])
      .filter((t) => actionable.has(t.action) && (!instrument || t.instrument === instrument))
      .map((t) => {
        const spec = ACTION_MARKER[t.action];
        const time = toChartTime(t.signal_time);
        if (time === undefined) return null;
        return {
          time,
          position: spec.position,
          color: spec.color,
          shape: spec.shape,
          text: `${spec.text}${t.units ? ` ${t.units}` : ""}`,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.time - b.time);

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
