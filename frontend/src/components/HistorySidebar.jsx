const HistorySidebar = ({ onRefresh, loading }) => {
  return (
    <div className="live-panel">
      <span className="live-badge">ALL RUNS</span>

      <p className="live-note">
        Every backtest and walk-forward run you've saved, in one place. Click
        a row on the right to reload its metrics and trade log without
        re-running it.
      </p>

      <button className="run-btn" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh History"}
      </button>
    </div>
  );
};

export default HistorySidebar;
