import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";
const LIVE_STRATEGIES = ["SMA", "Bollinger"];

const LiveSidebar = ({
  strategy,
  setStrategy,
  instrument,
  setInstrument,
  account,
  status,
  onStatusChange,
  startPayload,
}) => {
  const [pending, setPending] = useState(false);
  const [killResults, setKillResults] = useState(null);
  const [error, setError] = useState(null);

  const handleStart = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/live/start`, {
        strategy,
        instrument,
        ...startPayload,
      });
      onStatusChange?.((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start the bot.");
    } finally {
      setPending(false);
    }
  };

  const handleStop = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/live/stop`);
      onStatusChange?.((prev) => ({ ...prev, ...res.data }));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to stop the bot.");
    } finally {
      setPending(false);
    }
  };

  const handleStopAndLiquidate = async () => {
    if (!window.confirm("Stop the bot AND liquidate all open positions? This cannot be undone.")) return;
    setPending(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/live/kill_switch`);
      setKillResults(res.data.results);
      onStatusChange?.((prev) => ({ ...prev, running: false }));
    } catch (err) {
      setError(err.response?.data?.detail || "Stop & Liquidate failed.");
    } finally {
      setPending(false);
    }
  };

  const handleKillSwitch = async () => {
    if (!window.confirm("Liquidate all open positions? This cannot be undone.")) return;
    setPending(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/api/live/kill_switch`);
      setKillResults(res.data.results);
      onStatusChange?.((prev) => ({ ...prev, running: false }));
    } catch (err) {
      setError(err.response?.data?.detail || "Kill switch failed.");
    } finally {
      setPending(false);
    }
  };

  const running = Boolean(status?.running);
  const openPositions = status?.open_positions || [];

  return (
    <div className="live-panel">
      <div className="live-preview-card">
        <h4>Account Summary</h4>
        <div className="live-preview-row">
          <span>Balance</span>
          <span>{account?.balance ?? "—"}</span>
        </div>
        <div className="live-preview-row">
          <span>Margin Used</span>
          <span>{account?.marginUsed ?? "—"}</span>
        </div>
        <div className="live-preview-row">
          <span>Equity (NAV)</span>
          <span>{account?.NAV ?? "—"}</span>
        </div>
      </div>

      <div className="live-preview-card">
        <h4>Bot Status</h4>
        <div className="live-preview-row">
          <span>State</span>
          <span>{running ? "Running" : "Stopped"}</span>
        </div>
        <div className="live-preview-row">
          <span>Strategy</span>
          <span>{status?.strategy ?? "—"}</span>
        </div>
        <div className="live-preview-row">
          <span>Last Heartbeat</span>
          <span>{status?.last_heartbeat ?? "—"}</span>
        </div>
        <div className="live-preview-row">
          <span>Last Action</span>
          <span>{status?.last_action ?? "—"}</span>
        </div>
      </div>

      <div className="live-preview-card">
        <h4>Bot Controls</h4>
        <div className="input-group">
          <label>Strategy</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            disabled={running}
          >
            {LIVE_STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="input-group">
          <label>Instrument</label>
          <input
            type="text"
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            disabled={running}
          />
        </div>
        <p className="field-hint">
          Poll interval, candle feed, trade size, and risk guards come from
          Advanced Settings → Live Bot Defaults.
        </p>

        {!running ? (
          <button className="run-btn live-run-btn" onClick={handleStart} disabled={pending}>
            {pending ? "Starting…" : "Start Bot"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <button className="run-btn live-stop-btn" onClick={handleStop} disabled={pending}>
              {pending ? "Stopping…" : "Stop Bot"}
            </button>
            <p className="field-hint" style={{ margin: 0 }}>
              Stop Bot pauses the loop — open positions stay open. Use Stop &amp; Liquidate below to also close them.
            </p>
            <button className="kill-btn active" onClick={handleStopAndLiquidate} disabled={pending}>
              {pending ? "Stopping…" : "Stop & Liquidate All"}
            </button>
          </div>
        )}

        {error && <p className="live-error">{error}</p>}
      </div>

      {openPositions.length > 0 && (
        <div className="live-preview-card">
          <h4>Open Positions</h4>
          {openPositions.map((pos) => (
            <div className="live-preview-row" key={pos.instrument}>
              <span>{pos.instrument}</span>
              <span>
                {parseFloat(pos.long?.units || 0) !== 0
                  ? `long ${pos.long.units}`
                  : `short ${pos.short?.units}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {!running && (
        <button className="kill-btn active" onClick={handleKillSwitch} disabled={pending}>
          Liquidate All Positions
        </button>
      )}

      {killResults && (
        <div className="live-preview-card">
          <h4>Liquidation Result</h4>
          {killResults.map((r, i) => (
            <div className="live-preview-row" key={i}>
              <span>{r.instrument ?? "—"}</span>
              <span>
                {r.status === "closed"
                  ? r.realized_pl != null
                    ? `closed  P/L: ${parseFloat(r.realized_pl) >= 0 ? "+" : ""}${parseFloat(r.realized_pl).toFixed(2)}`
                    : "closed"
                  : `error — ${r.detail}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveSidebar;
