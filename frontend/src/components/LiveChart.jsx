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
  // OANDA candle times look like "2024-01-01T00:00:00.000000000Z" —
  // lightweight-charts wants seconds-resolution UTC.
  const ms = Date.parse(isoString);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
};

const LiveChart = ({ candles, trades, instrument }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();

  useEffect(() => {
    if (!candles || candles.length === 0) return undefined;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#4CAF50",
      downColor: "#f44336",
      borderVisible: false,
      wickUpColor: "#4CAF50",
      wickDownColor: "#f44336",
    });

    const priceData = candles
      .map((c) => ({ ...c, time: toChartTime(c.time) }))
      .filter((c) => c.time !== undefined)
      .sort((a, b) => a.time - b.time);
    candleSeries.setData(priceData);

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

    if (markers.length > 0) {
      createSeriesMarkers(candleSeries, markers);
    }

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, trades, instrument]);

  return (
    <div
      ref={chartContainerRef}
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
