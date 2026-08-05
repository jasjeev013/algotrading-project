import LiveChart from "./LiveChart";

const ACTION_CLASS = {
  buy: "positive",
  sell: "negative",
  close: "",
  noop: "",
  skipped_risk_guard: "",
  error: "negative",
};

const LivePanel = ({ instrument, candles, trades, status }) => {
  const running = Boolean(status?.running);
  const openPositions = status?.open_positions || [];

  return (
    <>
      <div className="live-status-strip">
        <div className={`status-pill live-state ${running ? "on" : "off"}`}>
          <span className={`status-dot ${running ? "online" : "offline"}`}></span>
          {running ? `Running — ${status?.strategy ?? ""} on ${status?.instrument ?? instrument}` : "Stopped"}
        </div>
        {status?.last_heartbeat && (
          <span className="live-heartbeat">Last heartbeat: {status.last_heartbeat}</span>
        )}
        {status?.last_error && <span className="live-heartbeat error">Last error: {status.last_error}</span>}
      </div>

      <div className="section-block">
        <h2>Live Price Chart</h2>
        <p className="section-desc">
          {instrument} · candles refresh every 15s. Green = Buy, Red = Sell, Orange = Close.
        </p>
        {candles && candles.length > 0 ? (
          <LiveChart candles={candles} trades={trades} instrument={instrument} />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            Waiting for candle data from OANDA…
          </div>
        )}
      </div>

      <div className="section-block">
        <h2>Open Positions</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Instrument</th>
                <th>Side</th>
                <th>Units</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((pos) => {
                const longUnits = parseFloat(pos.long?.units || 0);
                const shortUnits = parseFloat(pos.short?.units || 0);
                const side = longUnits !== 0 ? "long" : "short";
                const units = longUnits !== 0 ? longUnits : shortUnits;
                return (
                  <tr key={pos.instrument}>
                    <td>{pos.instrument}</td>
                    <td className={side === "long" ? "positive" : "negative"}>{side}</td>
                    <td>{units}</td>
                  </tr>
                );
              })}
              {openPositions.length === 0 && (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No open positions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="section-block">
        <h2>Live Trade Log</h2>
        <p className="section-desc">Every tick the bot has evaluated — actions, no-ops, and risk-guard skips.</p>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Instrument</th>
                <th>Strategy</th>
                <th>Prior → Desired</th>
                <th>Action</th>
                <th>Units</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(trades || []).map((t) => (
                <tr key={t.id}>
                  <td>{t.signal_time}</td>
                  <td>{t.instrument}</td>
                  <td>{t.strategy}</td>
                  <td>
                    {t.prior_position} → {t.desired_position}
                  </td>
                  <td className={ACTION_CLASS[t.action] || ""}>{t.action}</td>
                  <td>{t.units ?? "—"}</td>
                  <td>{t.error_detail ?? "—"}</td>
                </tr>
              ))}
              {(!trades || trades.length === 0) && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "var(--text-muted)" }}>
                    No live activity yet — start the bot to see ticks here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default LivePanel;
