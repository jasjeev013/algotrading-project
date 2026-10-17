import { cn } from "@/lib/utils";
import type { WalkForwardWindowMetric } from "../types/walkForward";

interface WindowTimelineChartProps {
  windowMetrics: WalkForwardWindowMetric[];
}

// One row per walk-forward window on a shared calendar axis: a muted bar for
// the train period, a colored bar (positive = profit, negative = loss) for
// the trade period. Lets you see at a glance how the rolling windows overlap
// and which ones held up out-of-sample -- the return% is also a direct label
// on each trade bar so the story doesn't depend on color alone.
const WindowTimelineChart = ({ windowMetrics }: WindowTimelineChartProps) => {
  if (!windowMetrics || windowMetrics.length === 0) return null;

  const toTime = (d: string) => new Date(d).getTime();
  const overallStart = Math.min(...windowMetrics.map((w) => toTime(w.train_start)));
  const overallEnd = Math.max(...windowMetrics.map((w) => toTime(w.trade_end)));
  const span = overallEnd - overallStart || 1;
  const pct = (d: string) => ((toTime(d) - overallStart) / span) * 100;

  const fmt = (d: number) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" });

  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-3.5 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/40" /> Train period
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-positive" /> Trade — profit
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-negative" /> Trade — loss
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {windowMetrics.map((w) => {
          const trainLeft = pct(w.train_start);
          const trainWidth = pct(w.train_end) - trainLeft;
          const tradeLeft = pct(w.trade_start);
          const tradeWidth = pct(w.trade_end) - tradeLeft;
          const ret = w.metrics?.total_return_pct ?? 0;
          const isProfit = ret >= 0;
          const label = `${isProfit ? "+" : ""}${ret.toFixed(1)}%`;

          return (
            <div className="flex h-[26px] items-center gap-2.5" key={w.window_index}>
              <div className="w-8 flex-shrink-0 text-right text-[11px] text-muted-foreground">
                W{w.window_index + 1}
              </div>
              <div className="relative h-[18px] flex-1 rounded bg-muted">
                <div
                  className="absolute top-0 h-full rounded bg-muted-foreground/40"
                  style={{ left: `${trainLeft}%`, width: `calc(${trainWidth}% - 2px)` }}
                  title={`Train: ${w.train_start} → ${w.train_end}`}
                />
                <div
                  className={cn(
                    "absolute top-0 flex h-full items-center justify-center overflow-hidden rounded",
                    isProfit ? "bg-positive" : "bg-negative",
                  )}
                  style={{ left: `${tradeLeft}%`, width: `${tradeWidth}%` }}
                  title={
                    `Trade: ${w.trade_start} → ${w.trade_end}\n` +
                    `Return: ${ret.toFixed(2)}%\n` +
                    `Sharpe: ${w.metrics?.sharpe_ratio?.toFixed(2)}\n` +
                    `Max Drawdown: ${w.metrics?.max_drawdown_pct?.toFixed(2)}%\n` +
                    `Trades: ${w.metrics?.total_trades}`
                  }
                >
                  <span className="whitespace-nowrap px-1 text-[10px] font-semibold text-white">{label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 flex justify-between pl-[42px] text-[11px] text-muted-foreground">
        <span>{fmt(overallStart)}</span>
        <span>{fmt((overallStart + overallEnd) / 2)}</span>
        <span>{fmt(overallEnd)}</span>
      </div>
    </div>
  );
};

export default WindowTimelineChart;
