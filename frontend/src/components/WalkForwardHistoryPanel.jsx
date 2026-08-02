const WalkForwardHistoryPanel = ({ runs, loading, error, onSelectRun }) => {
  if (loading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner"></div>
        <p>Loading walk-forward history…</p>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!runs || runs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🗂️</div>
        No saved walk-forward runs yet. Run one above to see it appear here.
      </div>
    );
  }

  return (
    <div className="section-block">
      <h2>Past Walk-Forward Runs</h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Strategy</th>
              <th>Date Range</th>
              <th>Train/Trade (mo)</th>
              <th>Total Return</th>
              <th>Sharpe</th>
              <th>Run At</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr
                key={run.run_id}
                className="history-row"
                onClick={() => onSelectRun(run.run_id)}
                style={{ cursor: "pointer" }}
              >
                <td>{run.ticker}</td>
                <td>{run.strategy}</td>
                <td>
                  {run.start_date} → {run.end_date}
                </td>
                <td>
                  {run.train_months} / {run.trade_months}
                </td>
                <td
                  className={
                    run.metrics?.total_return_pct >= 0 ? "positive" : "negative"
                  }
                >
                  {run.metrics?.total_return_pct != null
                    ? `${run.metrics.total_return_pct.toFixed(2)}%`
                    : "—"}
                </td>
                <td>
                  {run.metrics?.sharpe_ratio != null
                    ? run.metrics.sharpe_ratio.toFixed(2)
                    : "—"}
                </td>
                <td>
                  {run.created_at
                    ? new Date(run.created_at).toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WalkForwardHistoryPanel;
