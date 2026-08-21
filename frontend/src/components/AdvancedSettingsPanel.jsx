const AdvancedSettingsPanel = ({
  commissionPct,
  setCommissionPct,
  spreadPct,
  setSpreadPct,
  slippagePct,
  setSlippagePct,
  financingPct,
  setFinancingPct,
  livePollMinutes,
  setLivePollMinutes,
  liveGranularity,
  setLiveGranularity,
  liveCandleCount,
  setLiveCandleCount,
  liveTradeUnits,
  setLiveTradeUnits,
  liveMinBalance,
  setLiveMinBalance,
  liveMaxPositions,
  setLiveMaxPositions,
}) => {
  return (
    <>
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

    <div className="section-block">
      <h2>Live Bot Defaults</h2>
      <p className="section-desc">
        Controls the OANDA paper-trading bot's tick loop, candle feed, and
        risk guards — applied the next time you click "Start Bot" on the Live
        Paper Trading tab.
      </p>

      <div className="input-row">
        <div className="input-group">
          <label>Poll Interval (seconds)</label>
          <input
            type="number"
            step="1"
            min="10"
            value={livePollMinutes}
            onChange={(e) => setLivePollMinutes(e.target.value)}
          />
          <p className="field-hint">How often the bot fetches candles and re-evaluates its signal. Min 10 s. Setting below your candle granularity catches new candle closes faster.</p>
        </div>
        <div className="input-group">
          <label>Candle Granularity</label>
          <select value={liveGranularity} onChange={(e) => setLiveGranularity(e.target.value)}>
            <option value="M1">1 Minute</option>
            <option value="M5">5 Minutes</option>
            <option value="M15">15 Minutes</option>
            <option value="M30">30 Minutes</option>
            <option value="H1">1 Hour</option>
            <option value="H4">4 Hours</option>
          </select>
          <p className="field-hint">Candle timeframe the strategy evaluates and the chart displays.</p>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Candle Lookback (bars)</label>
          <input
            type="number"
            step="1"
            min="10"
            max="500"
            value={liveCandleCount}
            onChange={(e) => setLiveCandleCount(e.target.value)}
          />
          <p className="field-hint">Number of recent candles fetched per tick and shown on the chart.</p>
        </div>
        <div className="input-group">
          <label>Trade Size (units)</label>
          <input
            type="number"
            step="1"
            min="1"
            value={liveTradeUnits}
            onChange={(e) => setLiveTradeUnits(e.target.value)}
          />
          <p className="field-hint">Order size placed whenever the bot opens or reverses a position.</p>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Min Account Balance</label>
          <input
            type="number"
            step="1"
            min="0"
            value={liveMinBalance}
            onChange={(e) => setLiveMinBalance(e.target.value)}
          />
          <p className="field-hint">Risk guard — the bot won't open new positions below this balance.</p>
        </div>
        <div className="input-group">
          <label>Max Open Positions</label>
          <input
            type="number"
            step="1"
            min="1"
            value={liveMaxPositions}
            onChange={(e) => setLiveMaxPositions(e.target.value)}
          />
          <p className="field-hint">Risk guard — caps how many concurrent open positions the bot allows.</p>
        </div>
      </div>
    </div>
    </>
  );
};

export default AdvancedSettingsPanel;
