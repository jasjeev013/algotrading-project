import MetricCard from "./MetricCard";

// The six headline metrics, shared by the Backtest and Walk-Forward
// results panes.
const MetricsGrid = ({ metrics }) => (
  <div className="metrics-grid">
    <MetricCard
      title="Total Return"
      value={metrics.total_return_pct}
      suffix="%"
      isColorCoded
    />
    <MetricCard
      title="CAGR"
      value={metrics.cagr_pct}
      suffix="%"
      isColorCoded
    />
    <MetricCard
      title="Max Drawdown"
      value={metrics.max_drawdown_pct}
      suffix="%"
      isColorCoded
    />
    <MetricCard title="Win Rate" value={metrics.win_rate_pct} suffix="%" />
    <MetricCard
      title="Sharpe Ratio"
      value={metrics.sharpe_ratio}
      isColorCoded
    />
    <MetricCard title="Total Trades" value={metrics.total_trades} />
  </div>
);

export default MetricsGrid;
