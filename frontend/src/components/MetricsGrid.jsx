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
      info="Overall percentage gain or loss on the starting capital over the full backtest period."
    />
    <MetricCard
      title="CAGR"
      value={metrics.cagr_pct}
      suffix="%"
      isColorCoded
      info="Compound Annual Growth Rate — the constant yearly return that would produce the same overall result, letting periods of different lengths be compared fairly."
    />
    <MetricCard
      title="Max Drawdown"
      value={metrics.max_drawdown_pct}
      suffix="%"
      isColorCoded
      info="The largest drop from a peak to a subsequent trough in the equity curve — a measure of the worst loss an investor would have experienced."
    />
    <MetricCard
      title="Win Rate"
      value={metrics.win_rate_pct}
      suffix="%"
      info="The percentage of closed trades that were profitable. Shows N/A when no trade was closed during the window (e.g. Buy & Hold, or a position still open when the backtest ends)."
    />
    <MetricCard
      title="Sharpe Ratio"
      value={metrics.sharpe_ratio}
      isColorCoded
      info="Annualised risk-adjusted return — average return earned per unit of volatility. Higher is better; above 1 is generally considered good."
    />
    <MetricCard
      title="Total Trades"
      value={metrics.total_trades}
      info="The total number of completed (opened and closed) trades taken during the backtest."
    />
  </div>
);

export default MetricsGrid;
