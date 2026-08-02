const WalkForwardTable = ({ walkForward }) => {
  if (!walkForward || !walkForward.enabled || !walkForward.window_metrics?.length) {
    return null;
  }

  return (
    <div className="section-block">
      <h2>Walk-Forward Windows</h2>
      <p className="section-desc">
        Each row trains on the window before it, then trades out-of-sample —
        watch for performance degradation across later windows.
      </p>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Window</th>
              <th>Train Period</th>
              <th>Trade Period</th>
              <th>Return</th>
              <th>Sharpe</th>
              <th>Max Drawdown</th>
              <th>Win Rate</th>
              <th>Trades</th>
            </tr>
          </thead>
          <tbody>
            {walkForward.window_metrics.map((w) => (
              <tr key={w.window_index}>
                <td>{w.window_index + 1}</td>
                <td>
                  {w.train_start} → {w.train_end}
                </td>
                <td>
                  {w.trade_start} → {w.trade_end}
                </td>
                <td
                  className={
                    w.metrics?.total_return_pct >= 0 ? "positive" : "negative"
                  }
                >
                  {w.metrics?.total_return_pct?.toFixed(2)}%
                </td>
                <td>{w.metrics?.sharpe_ratio?.toFixed(2)}</td>
                <td className="negative">
                  {w.metrics?.max_drawdown_pct?.toFixed(2)}%
                </td>
                <td>{w.metrics?.win_rate_pct?.toFixed(2)}%</td>
                <td>{w.metrics?.total_trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WalkForwardTable;
