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
  pairTicker,
  setPairTicker,
  engine,
  setEngine,
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
            <p className="field-hint">
              The second leg of the pair — the strategy trades the spread
              between {"{Ticker Symbol}"} and this ticker.
            </p>
          </div>
        )}

        <StrategyParamsFields
          strategy={strategy}
          params={strategyParams}
          onChange={setStrategyParams}
        />

        <div className="input-group" style={{ animationDelay: "0.09s" }}>
          <label>Engine</label>
          <select value={engine} onChange={(e) => setEngine(e.target.value)}>
            <option value="iterative">Fast Iterative</option>
            <option value="vectorized">Vectorized</option>
          </select>
          <p className="field-hint">
            Both engines apply the same cost model and produce equivalent
            results — Vectorized is faster on large bar counts.
          </p>
        </div>
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
        {loading ? "Running Test…" : "Run Backtest"}
      </button>
    </>
  );
};

export default BacktestSidebar;
