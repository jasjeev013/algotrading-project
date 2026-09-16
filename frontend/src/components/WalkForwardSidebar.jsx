import StrategyParamsFields from "./StrategyParamsFields";

const NON_FITTING_STRATEGIES = ["SMA", "Bollinger"];

const WalkForwardSidebar = ({
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
  warmupBars,
  setWarmupBars,
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
        </div>
      </div>

      <div>
        <div className="sidebar-section-title">Strategy</div>
        <div className="input-group" style={{ animationDelay: "0.08s" }}>
          <label>Model</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
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

        {strategy === "StatArb" && (
          <div className="input-group" style={{ animationDelay: "0.085s" }}>
            <label>Pair Ticker</label>
            <input
              type="text"
              value={pairTicker}
              onChange={(e) => setPairTicker(e.target.value)}
              placeholder="MSFT"
            />
          </div>
        )}

        <StrategyParamsFields
          strategy={strategy}
          params={strategyParams}
          onChange={setStrategyParams}
        />
      </div>

      <div>
        <div className="sidebar-section-title">Walk-Forward Settings</div>
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Train Months</label>
            <input
              type="number"
              min="1"
              value={trainMonths}
              onChange={(e) => setTrainMonths(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Trade Months</label>
            <input
              type="number"
              min="1"
              value={tradeMonths}
              onChange={(e) => setTradeMonths(e.target.value)}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Step Months (optional)</label>
          <input
            type="number"
            min="1"
            value={stepMonths}
            onChange={(e) => setStepMonths(e.target.value)}
            placeholder={`Defaults to ${tradeMonths}`}
          />
        </div>

        {NON_FITTING_STRATEGIES.includes(strategy) && (
          <div className="input-group">
            <label>Warm-up Bars</label>
            <input
              type="number"
              min="1"
              value={warmupBars}
              onChange={(e) => setWarmupBars(e.target.value)}
            />
            <p className="field-hint">
              Trailing history borrowed from the previous window so this
              strategy's indicators aren't NaN at the start of each trade
              window. Raise it if using a long SMA/Bollinger window.
            </p>
          </div>
        )}

        <p className="params-hint">
          Trains on each {trainMonths}-month rolling window, then trades the
          next {tradeMonths} months out-of-sample — repeated across the full
          date range and stitched into one continuous equity curve, so
          performance degradation over time is visible.
        </p>
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

      <button className="run-btn" onClick={onRun} disabled={loading}>
        {loading ? "Running Walk-Forward…" : "Run Walk-Forward"}
      </button>
    </>
  );
};

export default WalkForwardSidebar;
