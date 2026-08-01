const HistoryPanel = ({ runs, loading, error, onSelectRun }) => {
  if (loading) {
    return (
      <div className="spinner-wrap">
        <div className="spinner"></div>
        <p>Loading history…</p>
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
        No saved backtest runs yet. Run a backtest to see it appear here.
      </div>
    );
  }

  return (
    <div className="section-block">
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Strategy</th>
              <th>Date Range</th>
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

export default HistoryPanel;
