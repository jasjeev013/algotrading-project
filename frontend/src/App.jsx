import { useState } from 'react'
import TradingChart from './components/TradingChart'
import axios from 'axios'
import './App.css'

function App() {
  // --- STATE MANAGEMENT ---
  // Form Inputs
  const [ticker, setTicker] = useState("AAPL")
  const [startDate, setStartDate] = useState("2020-01-01")
  const [endDate, setEndDate] = useState("2023-01-01")
  const [strategy, setStrategy] = useState("SMA")
  const [capital, setCapital] = useState(10000)
  
  // App State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  // --- API CALL ---
  const runBacktest = async () => {
    setLoading(true)
    setError(null)
    setResults(null)

    // Build the payload to match our FastAPI BacktestRequest model
    const payload = {
      ticker: ticker,
      start_date: startDate,
      end_date: endDate,
      interval: "1d",
      strategy: strategy,
      strategy_params: {
        short_window: 20,
        long_window: 50,
        window: 20,
        num_std: 2.0
      },
      initial_capital: parseFloat(capital),
      commission_pct: 0.001
    }

    try {
      const response = await axios.post("http://localhost:8000/api/backtest", payload)
      setResults(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || "Error connecting to the backend.")
    } finally {
      setLoading(false)
    }
  }

  // --- HELPER COMPONENT FOR METRICS ---
  const MetricCard = ({ title, value, suffix = "", isColorCoded = false }) => {
    let colorClass = "";
    if (isColorCoded) {
      colorClass = parseFloat(value) >= 0 ? "positive" : "negative";
    }
    return (
      <div className="metric-card">
        <h3>{title}</h3>
        <div className={`value ${colorClass}`}>
          {value}{suffix}
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* SIDEBAR: Controls */}
      <div className="sidebar">
        <h2>QuantDash</h2>
        
        <div className="input-group">
          <label>Ticker Symbol</label>
          <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} />
        </div>

        <div className="input-group">
          <label>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>

        <div className="input-group">
          <label>End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="input-group">
          <label>Strategy</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="SMA">SMA Crossover</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="ML">Machine Learning (RF)</option>
          </select>
        </div>

        <div className="input-group">
          <label>Initial Capital ($)</label>
          <input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />
        </div>

        <button 
          className="run-btn" 
          onClick={runBacktest} 
          disabled={loading}
        >
          {loading ? "Running Test..." : "Run Backtest"}
        </button>
      </div>

      {/* MAIN CONTENT: Results */}
      <div className="main-content">
        <h1>Backtest Results</h1>
        <br />

        {error && <div className="error-message">{error}</div>}

        {results && (
          <>
            {/* Top Metrics Row */}
            <div className="metrics-grid">
              <MetricCard 
                title="Total Return" 
                value={results.metrics.total_return_pct} 
                suffix="%" 
                isColorCoded={true} 
              />
              <MetricCard 
                title="CAGR" 
                value={results.metrics.cagr_pct} 
                suffix="%" 
                isColorCoded={true} 
              />
              <MetricCard 
                title="Max Drawdown" 
                value={results.metrics.max_drawdown_pct} 
                suffix="%" 
                isColorCoded={true} 
              />
              <MetricCard 
                title="Win Rate" 
                value={results.metrics.win_rate_pct} 
                suffix="%" 
              />
              <MetricCard 
                title="Sharpe Ratio" 
                value={results.metrics.sharpe_ratio} 
                isColorCoded={true} 
              />
              <MetricCard 
                title="Total Trades" 
                value={results.metrics.total_trades} 
              />
            </div>

            {/* Chart Area */}
            <div style={{ marginTop: '20px', marginBottom: '30px' }}>
              <h2>Price Chart & Executions</h2>
              <p style={{ color: '#888', marginBottom: '10px', fontSize: '14px' }}>
                Green arrows = Buy, Red arrows = Sell Short, Orange arrows = Exit Position.
              </p>
              <TradingChart 
                priceData={results.price_data} 
                tradeLog={results.trade_log} 
              />
            </div>

            {/* Trade Log Table */}
            <div style={{ marginTop: '20px' }}>
              <h2>Trade Log</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Entry Date</th>
                      <th>Exit Date</th>
                      <th>Entry Price</th>
                      <th>Exit Price</th>
                      <th>P/L ($)</th>
                      <th>Return (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trade_log.map((trade, index) => (
                      <tr key={index}>
                        <td className={trade.type === 'LONG' ? 'positive' : 'negative'}>{trade.type}</td>
                        <td>{trade.entry_date}</td>
                        <td>{trade.exit_date}</td>
                        <td>${trade.entry_price.toFixed(2)}</td>
                        <td>${trade.exit_price.toFixed(2)}</td>
                        <td className={trade.profit_loss >= 0 ? 'positive' : 'negative'}>
                          ${trade.profit_loss.toFixed(2)}
                        </td>
                        <td className={trade.net_return_pct >= 0 ? 'positive' : 'negative'}>
                          {trade.net_return_pct.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                    {results.trade_log.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', color: '#888' }}>No trades executed during this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
        
        {!results && !loading && !error && (
          <div style={{ color: '#888', marginTop: '20px' }}>
            Configure your parameters on the left and click "Run Backtest" to begin.
          </div>
        )}
      </div>
    </div>
  )
}

export default App