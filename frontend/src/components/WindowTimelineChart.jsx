// One row per walk-forward window on a shared calendar axis: a muted bar for
// the train period, a colored bar (accent = profit, danger = loss) for the
// trade period. Lets you see at a glance how the rolling windows overlap and
// which ones held up out-of-sample -- the return% is also a direct label on
// each trade bar so the story doesn't depend on color alone.
const WindowTimelineChart = ({ windowMetrics }) => {
  if (!windowMetrics || windowMetrics.length === 0) return null;

  const toTime = (d) => new Date(d).getTime();
  const overallStart = Math.min(...windowMetrics.map((w) => toTime(w.train_start)));
  const overallEnd = Math.max(...windowMetrics.map((w) => toTime(w.trade_end)));
  const span = overallEnd - overallStart || 1;
  const pct = (d) => ((toTime(d) - overallStart) / span) * 100;

  const fmt = (d) =>
    new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short" });

  return (
    <div className="window-timeline">
      <div className="window-timeline-legend">
        <span className="wt-legend-item">
          <span className="wt-swatch wt-swatch-train" /> Train period
        </span>
        <span className="wt-legend-item">
          <span className="wt-swatch wt-swatch-profit" /> Trade — profit
        </span>
        <span className="wt-legend-item">
          <span className="wt-swatch wt-swatch-loss" /> Trade — loss
        </span>
      </div>

      <div className="window-timeline-rows">
        {windowMetrics.map((w) => {
          const trainLeft = pct(w.train_start);
          const trainWidth = pct(w.train_end) - trainLeft;
          const tradeLeft = pct(w.trade_start);
          const tradeWidth = pct(w.trade_end) - tradeLeft;
          const ret = w.metrics?.total_return_pct ?? 0;
          const isProfit = ret >= 0;
          const label = `${isProfit ? "+" : ""}${ret.toFixed(1)}%`;

          return (
            <div className="window-timeline-row" key={w.window_index}>
              <div className="wt-row-label">W{w.window_index + 1}</div>
              <div className="wt-row-track">
                <div
                  className="wt-bar wt-bar-train"
                  style={{ left: `${trainLeft}%`, width: `calc(${trainWidth}% - 2px)` }}
                  title={`Train: ${w.train_start} → ${w.train_end}`}
                />
                <div
                  className={`wt-bar wt-bar-trade ${isProfit ? "wt-bar-profit" : "wt-bar-loss"}`}
                  style={{ left: `${tradeLeft}%`, width: `${tradeWidth}%` }}
                  title={
                    `Trade: ${w.trade_start} → ${w.trade_end}\n` +
                    `Return: ${ret.toFixed(2)}%\n` +
                    `Sharpe: ${w.metrics?.sharpe_ratio?.toFixed(2)}\n` +
                    `Max Drawdown: ${w.metrics?.max_drawdown_pct?.toFixed(2)}%\n` +
                    `Trades: ${w.metrics?.total_trades}`
                  }
                >
                  <span className="wt-bar-label">{label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="window-timeline-axis">
        <span>{fmt(overallStart)}</span>
        <span>{fmt((overallStart + overallEnd) / 2)}</span>
        <span>{fmt(overallEnd)}</span>
      </div>
    </div>
  );
};

export default WindowTimelineChart;
