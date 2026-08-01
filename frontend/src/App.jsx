import { useState } from "react";
import axios from "axios";
import TopBar from "./components/TopBar";
import RegimeHeader from "./components/RegimeHeader";
import BacktestSidebar from "./components/BacktestSidebar";
import LiveSidebar from "./components/LiveSidebar";
import HistorySidebar from "./components/HistorySidebar";
import HistoryPanel from "./components/HistoryPanel";
import TradingChart from "./components/TradingChart";
import EquityCurveChart from "./components/EquityCurveChart";
import "./App.css";

const API_BASE = "http://localhost:8000";

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

  // --- COSTS (displayed as %, converted to decimals when sent to the API) ---
  const [commissionPct, setCommissionPct] = useState(0.1);
  const [spreadPct, setSpreadPct] = useState(0.02);
  const [slippagePct, setSlippagePct] = useState(0.01);
  const [financingPct, setFinancingPct] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // --- HISTORY ---
  const [historyRuns, setHistoryRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

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
      commission_pct: parseFloat(commissionPct) / 100,
      spread_pct: parseFloat(spreadPct) / 100,
      slippage_pct: parseFloat(slippagePct) / 100,
      overnight_financing_pct: parseFloat(financingPct) / 100,
    };

    try {
      const response = await axios.post(`${API_BASE}/api/backtest`, payload);
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error connecting to the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/backtests`);
      setHistoryRuns(response.data.runs || []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.detail || "Error fetching backtest history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadHistoricalRun = async (runId) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setMode("backtest");
    try {
      const response = await axios.get(`${API_BASE}/api/backtests/${runId}`);
      const run = response.data;

      // Repopulate the sidebar with the settings this run was executed with.
      setTicker(run.ticker);
      setStartDate(run.start_date);
      setEndDate(run.end_date);
      setDataInterval(run.interval);
      setStrategy(run.strategy);
      setStrategyParams({ ...DEFAULT_PARAMS, ...run.strategy_params });
      setCapital(run.initial_capital);
      setCommissionPct(run.commission_pct * 100);
      setSpreadPct(run.spread_pct * 100);
      setSlippagePct(run.slippage_pct * 100);
      setFinancingPct(run.overnight_financing_pct * 100);

      setResults(run);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error loading saved backtest run.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "history") {
      fetchHistory();
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
              onClick={() => handleModeChange("backtest")}
            >
              <span className="dot" /> Backtest
            </button>
            <button
              className={`mode-tab live ${mode === "live" ? "active" : ""}`}
              onClick={() => handleModeChange("live")}
            >
              <span className="dot" /> Live
            </button>
            <button
              className={`mode-tab history ${mode === "history" ? "active" : ""}`}
              onClick={() => handleModeChange("history")}
            >
              <span className="dot" /> History
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
              commissionPct={commissionPct}
              setCommissionPct={setCommissionPct}
              spreadPct={spreadPct}
              setSpreadPct={setSpreadPct}
              slippagePct={slippagePct}
              setSlippagePct={setSlippagePct}
              financingPct={financingPct}
              setFinancingPct={setFinancingPct}
              loading={loading}
              onRun={runBacktest}
            />
          ) : mode === "live" ? (
            <LiveSidebar />
          ) : (
            <HistorySidebar onRefresh={fetchHistory} loading={historyLoading} />
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

                  {results.price_data && (
                    <div className="section-block">
                      <h2>Price Chart & Executions</h2>
                      <p className="section-desc">
                        Green arrows = Buy, Red arrows = Sell Short, Orange
                        arrows = Exit Position.
                      </p>
                      <TradingChart
                        priceData={results.price_data}
                        tradeLog={results.trade_log}
                      />
                    </div>
                  )}

                  {results.equity_curve && (
                    <div className="section-block">
                      <h2>Equity Curve</h2>
                      <p className="section-desc">
                        Portfolio value over the backtest window.
                      </p>
                      <EquityCurveChart equityCurve={results.equity_curve} />
                    </div>
                  )}

                  {!results.price_data && (
                    <p className="field-hint">
                      Loaded from saved history — price and equity charts
                      aren't stored for past runs, only metrics and the trade
                      log.
                    </p>
                  )}

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
          ) : mode === "live" ? (
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
          ) : (
            <>
              <h1>Backtest History</h1>
              <p className="subtitle">
                Past runs saved to the database. Click a row to reload its
                results.
              </p>
              <HistoryPanel
                runs={historyRuns}
                loading={historyLoading}
                error={historyError}
                onSelectRun={loadHistoricalRun}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
