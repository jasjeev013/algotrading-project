import { useState } from "react";
import axios from "axios";
import TopBar from "./components/TopBar";
import RegimeHeader from "./components/RegimeHeader";
import BacktestSidebar from "./components/BacktestSidebar";
import LiveSidebar from "./components/LiveSidebar";
import TradingChart from "./components/TradingChart";
import EquityCurveChart from "./components/EquityCurveChart";
import "./App.css";

const DEFAULT_PARAMS = {
  short_window: 20,
  long_window: 50,
  window: 20,
  num_std: 2.0,
  train_split: 0.7,
};

function App() {
  // --- MODE ---
  const [mode, setMode] = useState("backtest"); // 'backtest' | 'live'

  // --- STATE MANAGEMENT ---
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2023-01-01");
  const [strategy, setStrategy] = useState("SMA");
  const [capital, setCapital] = useState(10000);
  const [dataInterval, setDataInterval] = useState("1d");
  const [strategyParams, setStrategyParams] = useState(DEFAULT_PARAMS);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const buildParamsForStrategy = () => {
    if (strategy === "SMA") {
      return {
        short_window: parseInt(strategyParams.short_window, 10),
        long_window: parseInt(strategyParams.long_window, 10),
      };
    }
    if (strategy === "Bollinger") {
      return {
        window: parseInt(strategyParams.window, 10),
        num_std: parseFloat(strategyParams.num_std),
      };
    }
    if (strategy === "ML") {
      return {
        train_split: parseFloat(strategyParams.train_split),
      };
    }
    return {};
  };

  const runBacktest = async () => {
    if (!ticker.trim()) {
      setError("Please enter a valid Ticker Symbol.");
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setError("Start Date must be before End Date.");
      return;
    }
    if (capital <= 0) {
      setError("Initial Capital must be greater than 0.");
      return;
    }
    if (["5m", "15m"].includes(dataInterval)) {
      const rangeMs = new Date(endDate) - new Date(startDate);
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      if (rangeMs > sixtyDaysMs) {
        setError(
          "Intraday intervals only support up to 60 days of history. Please narrow your date range.",
        );
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const payload = {
      ticker: ticker,
      start_date: startDate,
      end_date: endDate,
      interval: dataInterval,
      strategy: strategy,
      strategy_params: buildParamsForStrategy(),
      initial_capital: parseFloat(capital),
      commission_pct: 0.001,
    };

    try {
      const response = await axios.post(
        "http://localhost:8000/api/backtest",
        payload,
      );
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error connecting to the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, suffix = "", isColorCoded = false }) => {
    let colorClass = "";
    if (isColorCoded) {
      colorClass = parseFloat(value) >= 0 ? "positive" : "negative";
    }
    return (
      <div className="metric-card">
        <h3>{title}</h3>
        <div className={`value ${colorClass}`}>
          {value}
          {suffix}
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <TopBar mode={mode} />
      <RegimeHeader />

      <div className="dashboard-container">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="mode-tabs">
            <button
              className={`mode-tab backtest ${mode === "backtest" ? "active" : ""}`}
              onClick={() => setMode("backtest")}
            >
              <span className="dot" /> Backtest
            </button>
            <button
              className={`mode-tab live ${mode === "live" ? "active" : ""}`}
              onClick={() => setMode("live")}
            >
              <span className="dot" /> Live
            </button>
          </div>

          {mode === "backtest" ? (
            <BacktestSidebar
              ticker={ticker}
              setTicker={setTicker}
              startDate={startDate}
              setStartDate={setStartDate}
              endDate={endDate}
              setEndDate={setEndDate}
              strategy={strategy}
              setStrategy={setStrategy}
              capital={capital}
              setCapital={setCapital}
              dataInterval={dataInterval}
              setDataInterval={setDataInterval}
              strategyParams={strategyParams}
              setStrategyParams={setStrategyParams}
              loading={loading}
              onRun={runBacktest}
            />
          ) : (
            <LiveSidebar />
          )}
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">
          {mode === "backtest" ? (
            <>
              <h1>Backtest Results</h1>
              <p className="subtitle">
                Historical simulation over the selected date range.
              </p>

              {error && <div className="error-message">{error}</div>}

              {loading && (
                <div className="spinner-wrap">
                  <div className="spinner"></div>
                  <p>Running Backtest Engine…</p>
                </div>
              )}

              {results && (
                <>
                  <div className="metrics-grid">
                    <MetricCard
                      title="Total Return"
                      value={results.metrics.total_return_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="CAGR"
                      value={results.metrics.cagr_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="Max Drawdown"
                      value={results.metrics.max_drawdown_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="Win Rate"
                      value={results.metrics.win_rate_pct}
                      suffix="%"
                    />
                    <MetricCard
                      title="Sharpe Ratio"
                      value={results.metrics.sharpe_ratio}
                      isColorCoded
                    />
                    <MetricCard
                      title="Total Trades"
                      value={results.metrics.total_trades}
                    />
                  </div>

                  <div className="section-block">
                    <h2>Price Chart & Executions</h2>
                    <p className="section-desc">
                      Green arrows = Buy, Red arrows = Sell Short, Orange arrows
                      = Exit Position.
                    </p>
                    <TradingChart
                      priceData={results.price_data}
                      tradeLog={results.trade_log}
                    />
                  </div>

                  <div className="section-block">
                    <h2>Equity Curve</h2>
                    <p className="section-desc">
                      Portfolio value over the backtest window.
                    </p>
                    <EquityCurveChart equityCurve={results.equity_curve} />
                  </div>

                  <div className="section-block">
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
                              <td
                                className={
                                  trade.type === "LONG"
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {trade.type}
                              </td>
                              <td>{trade.entry_date}</td>
                              <td>{trade.exit_date}</td>
                              <td>${trade.entry_price.toFixed(2)}</td>
                              <td>${trade.exit_price.toFixed(2)}</td>
                              <td
                                className={
                                  trade.profit_loss >= 0
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                ${trade.profit_loss.toFixed(2)}
                              </td>
                              <td
                                className={
                                  trade.net_return_pct >= 0
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {trade.net_return_pct.toFixed(2)}%
                              </td>
                            </tr>
                          ))}
                          {results.trade_log.length === 0 && (
                            <tr>
                              <td
                                colSpan="7"
                                style={{
                                  textAlign: "center",
                                  color: "var(--text-muted)",
                                }}
                              >
                                No trades executed during this period.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {!results && !loading && !error && (
                <div className="empty-state">
                  <div className="empty-icon">📈</div>
                  Configure your parameters on the left and click "Run Backtest"
                  to begin.
                </div>
              )}
            </>
          ) : (
            <>
              <h1>Live Trading</h1>
              <p className="subtitle">
                Event-driven execution against OANDA paper trading.
              </p>
              <div className="empty-state">
                <div className="empty-icon">⚡</div>
                Live execution ships in Phase 5–7 of the V2 roadmap. Switch back
                to Backtest to run a historical simulation.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
