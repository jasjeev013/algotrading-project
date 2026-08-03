import { useMemo, useState } from "react";

const TYPE_LABELS = {
  backtest: "Backtest",
  walkforward: "Walk-Forward",
  live: "Live",
};

const FILTERS = ["all", "backtest", "walkforward", "live"];

const HistoryPanel = ({ runs, loading, error, onSelectRun }) => {
  const [filter, setFilter] = useState("all");

  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    if (filter === "all") return runs;
    return runs.filter((run) => run.run_type === filter);
  }, [runs, filter]);

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

  return (
    <div className="section-block">
      <div className="history-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`history-filter-chip ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {(!filteredRuns || filteredRuns.length === 0) ? (
        <div className="empty-state">
          <div className="empty-icon">🗂️</div>
          {filter === "live"
            ? "Live paper trading isn't wired up yet — this filter will populate once it ships."
            : "No saved runs yet. Run a backtest or walk-forward to see it appear here."}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Ticker</th>
                <th>Strategy</th>
                <th>Date Range</th>
                <th>Total Return</th>
                <th>Sharpe</th>
                <th>Run At</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr
                  key={`${run.run_type}-${run.run_id}`}
                  className="history-row"
                  onClick={() => onSelectRun(run)}
                  style={{ cursor: "pointer" }}
                >
                  <td>
                    <span className={`history-type-badge ${run.run_type}`}>
                      {TYPE_LABELS[run.run_type] || run.run_type}
                    </span>
                  </td>
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
      )}
    </div>
  );
};

export default HistoryPanel;
