import StrategyParamsFields from "./StrategyParamsFields";

const BacktestSidebar = ({
  ticker,
  setTicker,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  strategy,
  setStrategy,
  capital,
  setCapital,
  dataInterval,
  setDataInterval,
  strategyParams,
  setStrategyParams,
  commissionPct,
  setCommissionPct,
  spreadPct,
  setSpreadPct,
  slippagePct,
  setSlippagePct,
  financingPct,
  setFinancingPct,
  loading,
  onRun,
}) => {
  return (
    <>
      <div>
        <div className="sidebar-section-title">Instrument</div>
        <div className="input-group" style={{ animationDelay: "0.02s" }}>
          <label>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="AAPL"
          />
        </div>

        <div className="input-row">
          <div className="input-group" style={{ animationDelay: "0.04s" }}>
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ animationDelay: "0.06s" }}>
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="input-group" style={{ animationDelay: "0.07s" }}>
          <label>Data Interval</label>
          <select
            value={dataInterval}
            onChange={(e) => setDataInterval(e.target.value)}
          >
            <optgroup label="Daily+">
              <option value="1d">1 Day</option>
              <option value="1wk">1 Week</option>
              <option value="1mo">1 Month</option>
            </optgroup>
            <optgroup label="Intraday (max 60 days history)">
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
            </optgroup>
          </select>
          {["5m", "15m"].includes(dataInterval) && (
            <p className="field-hint">
              Yahoo Finance only provides ~60 days of intraday history. Set your
              Start Date accordingly.
            </p>
          )}
        </div>
      </div>

      <div>
        <div className="sidebar-section-title">Strategy</div>
        <div className="input-group" style={{ animationDelay: "0.08s" }}>
          <label>Model</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <option value="SMA">SMA Crossover</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="ML">Machine Learning (RF)</option>
          </select>
        </div>

        <StrategyParamsFields
          strategy={strategy}
          params={strategyParams}
          onChange={setStrategyParams}
        />
      </div>

      <div>
        <div className="sidebar-section-title">Capital</div>
        <div className="input-group" style={{ animationDelay: "0.1s" }}>
          <label>Initial Capital ($)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
        </div>
      </div>

      <details className="advanced-settings">
        <summary className="sidebar-section-title">Advanced Settings</summary>

        <div className="input-row">
          <div className="input-group" style={{ animationDelay: "0.11s" }}>
            <label>Commission (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ animationDelay: "0.12s" }}>
            <label>Spread (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={spreadPct}
              onChange={(e) => setSpreadPct(e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group" style={{ animationDelay: "0.13s" }}>
            <label>Slippage (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={slippagePct}
              onChange={(e) => setSlippagePct(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ animationDelay: "0.14s" }}>
            <label>Overnight Financing (%/day)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={financingPct}
              onChange={(e) => setFinancingPct(e.target.value)}
            />
          </div>
        </div>
        <p className="field-hint">
          Fees applied per trade fill (commission, spread, slippage) and per
          calendar day a position is held (overnight financing).
        </p>
      </details>

      <button className="run-btn" onClick={onRun} disabled={loading}>
        {loading ? "Running Test…" : "Run Backtest"}
      </button>
    </>
  );
};

export default BacktestSidebar;
