import { useEffect, useRef } from "react";
import { createChart, CrosshairMode, LineSeries } from "lightweight-charts";
import type { EquityPoint } from "../types/backtest";
import { toChartTime } from "../utils/chartTime";

interface EquityCurveChartProps {
  equityCurve: EquityPoint[];
}

const EquityCurveChart = ({ equityCurve }: EquityCurveChartProps) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!equityCurve || equityCurve.length === 0) return;
    const container = chartContainerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 260,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#6b7280",
      },
      grid: {
        vertLines: { color: "#eef0f2" },
        horzLines: { color: "#eef0f2" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#e3e5e9",
      },
      rightPriceScale: {
        borderColor: "#e3e5e9",
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color: "#34d399",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    const data = equityCurve.map((point) => ({
      time: toChartTime(point.time),
      value: point.equity,
    }));
    lineSeries.setData(data);
    chart.timeScale().fitContent();

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [equityCurve]);

  return (
    <div
      ref={chartContainerRef}
      style={{
        position: "relative",
        width: "100%",
        background: "#ffffff",
        borderRadius: "6px",
        border: "1px solid #e3e5e9",
        overflow: "hidden",
      }}
    />
  );
};

export default EquityCurveChart;
