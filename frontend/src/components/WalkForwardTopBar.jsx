import StrategyParamsFields from "./StrategyParamsFields";

const NON_FITTING_STRATEGIES = ["SMA", "Bollinger"];

// Horizontal control bar for the Walk-Forward tab — mirrors BacktestTopBar's
// layout (row of core fields + a collapsible params row below), with the
// walk-forward window settings folded into that same collapsible row.
const WalkForwardTopBar = ({
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
  trainMonths,
  setTrainMonths,
  tradeMonths,
  setTradeMonths,
  stepMonths,
  setStepMonths,
  windowUnit,
  setWindowUnit,
  warmupBars,
  setWarmupBars,
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
        </div>

        <div className="input-group topbar-field-md">
          <label>Model</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <option value="SMA">SMA Crossover</option>
            <option value="EMA">EMA Crossover</option>
            <option value="MACD">MACD</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="RSI">RSI Mean Reversion</option>
            <option value="Contrarian">Contrarian</option>
            <option value="NDayMom">Momentum (N-Day)</option>
            <option value="ML">Machine Learning (RF)</option>
            <option value="StatArb">Pairs Trading (StatArb)</option>
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
          {loading ? "Running Walk-Forward…" : "Run Walk-Forward"}
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
                : strategy === "StatArb"
                  ? "Pairs Trading Settings"
                  : "Strategy Settings"}{" "}
          &amp; Walk-Forward Window
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

          <div className="input-group topbar-field-sm">
            <label>Window Unit</label>
            <select
              value={windowUnit}
              onChange={(e) => setWindowUnit(e.target.value)}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>

          <div className="input-group topbar-field-sm">
            <label>Train Length</label>
            <input
              type="number"
              min="1"
              value={trainMonths}
              onChange={(e) => setTrainMonths(e.target.value)}
            />
          </div>

          <div className="input-group topbar-field-sm">
            <label>Trade Length</label>
            <input
              type="number"
              min="1"
              value={tradeMonths}
              onChange={(e) => setTradeMonths(e.target.value)}
            />
          </div>

          <div className="input-group topbar-field-sm">
            <label>Step Length (optional)</label>
            <input
              type="number"
              min="1"
              value={stepMonths}
              onChange={(e) => setStepMonths(e.target.value)}
              placeholder={`Defaults to ${tradeMonths}`}
            />
          </div>

          {NON_FITTING_STRATEGIES.includes(strategy) && (
            <div className="input-group topbar-field-sm">
              <label>Warm-up Bars</label>
              <input
                type="number"
                min="1"
                value={warmupBars}
                onChange={(e) => setWarmupBars(e.target.value)}
              />
            </div>
          )}

          <p className="params-hint">
            Trains on each {trainMonths}-{windowUnit} rolling window, then
            trades the next {tradeMonths} {windowUnit} out-of-sample —
            repeated across the full date range and stitched into one
            continuous equity curve.
          </p>
        </div>
      </details>
    </div>
  );
};

export default WalkForwardTopBar;
