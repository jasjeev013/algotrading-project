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
            ? "No live trades recorded yet. Start the bot to see activity here."
            : "No saved runs yet. Run a backtest or walk-forward to see it appear here."}
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Ticker / Instrument</th>
                <th>Strategy</th>
                <th>Date Range</th>
                <th>Total Return</th>
                <th>Sharpe</th>
                <th>Run At</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => {
                const isLive = run.run_type === "live";
                const tickerCell = isLive ? (run.instrument ?? run.ticker ?? "—") : (run.ticker ?? "—");
                const dateCell = isLive
                  ? (run.start_date ? run.start_date.slice(0, 10) : "—")
                  : `${run.start_date ?? "?"} → ${run.end_date ?? "?"}`;
                const returnVal = run.metrics?.total_return_pct;
                const sharpeVal = run.metrics?.sharpe_ratio;

                return (
                  <tr
                    key={`${run.run_type}-${run.run_id}`}
                    className={`history-row ${!isLive ? "clickable" : ""}`}
                    onClick={!isLive ? () => onSelectRun(run) : undefined}
                    style={{ cursor: isLive ? "default" : "pointer" }}
                  >
                    <td>
                      <span className={`history-type-badge ${run.run_type}`}>
                        {isLive
                          ? `Live · ${run.action ?? "tick"}`
                          : (TYPE_LABELS[run.run_type] || run.run_type)}
                      </span>
                    </td>
                    <td>{tickerCell}</td>
                    <td>{run.strategy ?? "—"}</td>
                    <td>{dateCell}</td>
                    <td className={returnVal >= 0 ? "positive" : returnVal < 0 ? "negative" : ""}>
                      {returnVal != null ? `${returnVal.toFixed(2)}%` : "—"}
                    </td>
                    <td>
                      {sharpeVal != null ? sharpeVal.toFixed(2) : "—"}
                    </td>
                    <td>
                      {run.created_at
                        ? new Date(run.created_at).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
