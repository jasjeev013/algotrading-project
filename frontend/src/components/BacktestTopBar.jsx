import StrategyParamsFields from "./StrategyParamsFields";

// Horizontal control bar for the Strategy Explorer tab — same fields as the
// old BacktestSidebar, laid out as a wrapping row above the results instead
// of a fixed-width column on the left.
const BacktestTopBar = ({
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
  pairTicker,
  setPairTicker,
  engine,
  setEngine,
  loading,
  onRun,
}) => {
  return (
    <div className="backtest-topbar">
      <div className="backtest-topbar-row">
        <div className="input-group topbar-field-sm">
          <label>Ticker Symbol</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="AAPL"
          />
        </div>

        <div className="input-group topbar-field-sm">
          <label>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="input-group topbar-field-sm">
          <label>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="input-group topbar-field-md">
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
              Yahoo Finance only provides ~60 days of intraday history.
            </p>
          )}
        </div>

        <div className="input-group topbar-field-md">
          <label>Model</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <option value="SMA">SMA Crossover</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="ML">Machine Learning (RF)</option>
            <option value="StatArb">Pairs Trading (StatArb)</option>
          </select>
        </div>

        <div className="input-group topbar-field-md">
          <label>Engine</label>
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            <option value="iterative">Fast Iterative</option>
            <option value="vectorized">Vectorized</option>
          </select>
        </div>

        <div className="input-group topbar-field-sm">
          <label>Initial Capital ($)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(e.target.value)}
          />
        </div>

        <button
          className="run-btn topbar-run-btn"
          onClick={onRun}
          disabled={loading}
        >
          {loading ? "Running Test…" : "Run Backtest"}
        </button>
      </div>

      <details className="backtest-topbar-params-row" open>
        <summary className="topbar-params-label">
          {strategy === "SMA"
            ? "SMA Crossover Settings"
            : strategy === "Bollinger"
              ? "Bollinger Bands Settings"
              : strategy === "ML"
                ? "Machine Learning Settings"
                : "Pairs Trading Settings"}
        </summary>

        <div className="backtest-topbar-params-content">
          {strategy === "StatArb" && (
            <div className="input-group topbar-field-sm">
              <label>Pair Ticker</label>
              <input
                type="text"
                value={pairTicker}
                onChange={(e) => setPairTicker(e.target.value)}
                placeholder="MSFT"
              />
              <p className="field-hint">
                Second leg of the pair — spread traded against Ticker
                Symbol.
              </p>
            </div>
          )}

          <StrategyParamsFields
            strategy={strategy}
            params={strategyParams}
            onChange={setStrategyParams}
          />
        </div>
      </details>
    </div>
  );
};

export default BacktestTopBar;
