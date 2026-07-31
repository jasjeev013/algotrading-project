const LiveSidebar = () => {
  return (
    <div className="live-panel">
      <span className="live-badge">COMING IN V2 PHASE 5–7</span>

      <p className="live-note">
        Live execution against OANDA's paper-trading API isn't wired up yet. This panel previews
        the control surface planned for the Live Trading dashboard — event-driven signals, a
        real-time position book, and a kill switch.
      </p>

      <div className="live-preview-card">
        <h4>Account Summary</h4>
        <div className="live-preview-row"><span>Balance</span><span>—</span></div>
        <div className="live-preview-row"><span>Margin Used</span><span>—</span></div>
        <div className="live-preview-row"><span>Equity</span><span>—</span></div>
      </div>

      <div className="live-preview-card">
        <h4>Bot Status</h4>
        <div className="live-preview-row"><span>State</span><span>Stopped</span></div>
        <div className="live-preview-row"><span>Last Heartbeat</span><span>—</span></div>
      </div>

      <button className="kill-btn" disabled>Liquidate All Positions</button>
    </div>
  )
}

export default LiveSidebar
