const AdvancedSettingsPanel = ({
  commissionPct,
  setCommissionPct,
  spreadPct,
  setSpreadPct,
  slippagePct,
  setSlippagePct,
  financingPct,
  setFinancingPct,
}) => {
  return (
    <div className="section-block">
      <h2>Cost Model</h2>
      <p className="section-desc">
        These friction assumptions apply globally to every Strategy Explorer
        and Walk Forward Engine run — there's one place to set them, not one
        per section.
      </p>

      <div className="input-row">
        <div className="input-group">
          <label>Commission (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={commissionPct}
            onChange={(e) => setCommissionPct(e.target.value)}
          />
          <p className="field-hint">Flat fee charged on both entry and exit of every trade.</p>
        </div>
        <div className="input-group">
          <label>Spread (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={spreadPct}
            onChange={(e) => setSpreadPct(e.target.value)}
          />
          <p className="field-hint">Bid/ask spread — half applied to each side of a fill.</p>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Slippage (%)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={slippagePct}
            onChange={(e) => setSlippagePct(e.target.value)}
          />
          <p className="field-hint">Adverse price move applied on every fill.</p>
        </div>
        <div className="input-group">
          <label>Overnight Financing (%/day)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={financingPct}
            onChange={(e) => setFinancingPct(e.target.value)}
          />
          <p className="field-hint">Charged per calendar day a position is held overnight.</p>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettingsPanel;
