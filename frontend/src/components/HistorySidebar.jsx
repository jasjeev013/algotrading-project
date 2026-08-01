const HistorySidebar = ({ onRefresh, loading }) => {
  return (
    <div className="live-panel">
      <span className="live-badge">PAST RUNS</span>

      <p className="live-note">
        Browse previously saved backtest runs. Click a row on the right to
        reload its metrics and trade log without re-running the simulation.
      </p>

      <button className="run-btn" onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh History"}
      </button>
    </div>
  );
};

export default HistorySidebar;
