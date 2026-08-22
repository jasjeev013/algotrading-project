import { useEffect, useRef, useState } from "react";
import {
  createChart, CrosshairMode, CandlestickSeries, LineSeries, createSeriesMarkers,
} from "lightweight-charts";

const TradingChart = ({ priceData, tradeLog, indicatorData = {} }) => {
  const chartContainerRef = useRef();
  const lineSeriesRefs = useRef({});
  const [visible, setVisible] = useState({});

  // Reset visibility when indicator set changes (new strategy selected)
  useEffect(() => {
    const initial = {};
    for (const key of Object.keys(indicatorData)) initial[key] = true;
    setVisible(initial);
  }, [Object.keys(indicatorData).join(",")]);

  // Build chart
  useEffect(() => {
    if (!priceData || priceData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "transparent" }, textColor: "#92a0b8" },
      grid: { vertLines: { color: "#1b212c" }, horzLines: { color: "#1b212c" } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#232a38" },
      rightPriceScale: { borderColor: "#232a38" },
    });
    lineSeriesRefs.current = {};

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#4CAF50", downColor: "#f44336",
      borderVisible: false, wickUpColor: "#4CAF50", wickDownColor: "#f44336",
    });
    candleSeries.setData(priceData);

    for (const [key, spec] of Object.entries(indicatorData)) {
      const ls = chart.addSeries(LineSeries, {
        color: spec.color, lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false,
      });
      ls.setData(spec.data);
      lineSeriesRefs.current[key] = { series: ls, data: spec.data };
    }

    const markers = [];
    tradeLog.forEach((trade) => {
      markers.push({ time: trade.entry_date, position: trade.type === "LONG" ? "belowBar" : "aboveBar",
        color: trade.type === "LONG" ? "#4CAF50" : "#f44336",
        shape: trade.type === "LONG" ? "arrowUp" : "arrowDown", text: `Entry ${trade.type}` });
      markers.push({ time: trade.exit_date, position: trade.type === "LONG" ? "aboveBar" : "belowBar",
        color: "#FF9800", shape: trade.type === "LONG" ? "arrowDown" : "arrowUp", text: "Exit" });
    });
    markers.sort((a, b) => new Date(a.time) - new Date(b.time));
    createSeriesMarkers(candleSeries, markers);

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [priceData, tradeLog, indicatorData]);

  // Toggle visibility without rebuilding the chart
  useEffect(() => {
    for (const [key, ref] of Object.entries(lineSeriesRefs.current)) {
      ref.series.setData(visible[key] !== false ? ref.data : []);
    }
  }, [visible]);

  return (
    <div>
      {Object.keys(indicatorData).length > 0 && (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
          {Object.entries(indicatorData).map(([key, spec]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#92a0b8" }}>
              <input type="checkbox" checked={visible[key] !== false}
                onChange={(e) => setVisible((p) => ({ ...p, [key]: e.target.checked }))} />
              <span style={{ display: "inline-block", width: 12, height: 2, background: spec.color, verticalAlign: "middle" }} />
              {spec.label}
            </label>
          ))}
        </div>
      )}
      <div ref={chartContainerRef} style={{ position: "relative", width: "100%", border: "1px solid #1b212c", borderRadius: "10px", overflow: "hidden" }} />
    </div>
  );
};

export default TradingChart;
