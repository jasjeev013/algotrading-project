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
        background: { color: "#f4f2ee" },
        textColor: "#5c574c",
      },
      grid: {
        vertLines: { color: "#e7e3da" },
        horzLines: { color: "#e7e3da" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#ddd8cc",
      },
      rightPriceScale: {
        borderColor: "#ddd8cc",
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
        background: "#f4f2ee",
        border: "1px solid #ddd8cc",
      }}
    />
  );
};

export default EquityCurveChart;
