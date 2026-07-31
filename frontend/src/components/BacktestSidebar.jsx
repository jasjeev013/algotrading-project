import StrategyParamsFields from './StrategyParamsFields'

const BacktestSidebar = ({
  ticker, setTicker,
  startDate, setStartDate,
  endDate, setEndDate,
  strategy, setStrategy,
  capital, setCapital,
  strategyParams, setStrategyParams,
  loading, onRun,
}) => {
  return (
    <>
      <div>
        <div className="sidebar-section-title">Instrument</div>
        <div className="input-group" style={{ animationDelay: '0.02s' }}>
          <label>Ticker Symbol</label>
          <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />
        </div>

        <div className="input-row">
          <div className="input-group" style={{ animationDelay: '0.04s' }}>
            <label>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="input-group" style={{ animationDelay: '0.06s' }}>
            <label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <div className="sidebar-section-title">Strategy</div>
        <div className="input-group" style={{ animationDelay: '0.08s' }}>
          <label>Model</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="SMA">SMA Crossover</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="ML">Machine Learning (RF)</option>
          </select>
        </div>

        <StrategyParamsFields strategy={strategy} params={strategyParams} onChange={setStrategyParams} />
      </div>

      <div>
        <div className="sidebar-section-title">Capital</div>
        <div className="input-group" style={{ animationDelay: '0.1s' }}>
          <label>Initial Capital ($)</label>
          <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
        </div>
      </div>

      <button className="run-btn" onClick={onRun} disabled={loading}>
        {loading ? 'Running Test…' : 'Run Backtest'}
      </button>
    </>
  )
}

export default BacktestSidebar
