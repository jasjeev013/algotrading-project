import { useState } from "react";
import axios from "axios";
import TopBar from "./components/TopBar";
import RegimeHeader from "./components/RegimeHeader";
import NavRail from "./components/NavRail";
import BacktestSidebar from "./components/BacktestSidebar";
import WalkForwardSidebar from "./components/WalkForwardSidebar";
import LiveSidebar from "./components/LiveSidebar";
import AdvancedSettingsSidebar from "./components/AdvancedSettingsSidebar";
import AdvancedSettingsPanel from "./components/AdvancedSettingsPanel";
import HistorySidebar from "./components/HistorySidebar";
import HistoryPanel from "./components/HistoryPanel";
import TradingChart from "./components/TradingChart";
import EquityCurveChart from "./components/EquityCurveChart";
import FeatureImportancePanel from "./components/FeatureImportancePanel";
import WalkForwardTable from "./components/WalkForwardTable";
import "./App.css";

const API_BASE = "http://localhost:8000";

const DEFAULT_PARAMS = {
  short_window: 20,
  long_window: 50,
  window: 20,
  num_std: 2.0,
  train_split: 0.7,
  lookback_window: 30,
  entry_z: 2.0,
  exit_z: 0.5,
  coint_pvalue_threshold: 0.05,
};

const NON_FITTING_STRATEGIES = ["SMA", "Bollinger"];

function App() {
  // --- MODE ---
  const [mode, setMode] = useState("backtest"); // 'backtest' | 'walkforward' | 'live' | 'settings' | 'history'

  // --- SHARED STATE (instrument/strategy selection used by both Backtest and
  // Walk-Forward tabs) ---
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2023-01-01");
  const [strategy, setStrategy] = useState("SMA");
  const [capital, setCapital] = useState(10000);
  const [dataInterval, setDataInterval] = useState("1d");
  const [strategyParams, setStrategyParams] = useState(DEFAULT_PARAMS);
  const [pairTicker, setPairTicker] = useState("MSFT");
  const [engine, setEngine] = useState("iterative");

  // --- COSTS (Advanced Settings — global defaults, displayed as %,
  // converted to decimals when sent to the API; no per-run overrides) ---
  const [commissionPct, setCommissionPct] = useState(0.1);
  const [spreadPct, setSpreadPct] = useState(0.02);
  const [slippagePct, setSlippagePct] = useState(0.01);
  const [financingPct, setFinancingPct] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  // --- UNIFIED HISTORY (backtests + walk-forward runs, merged server-side
  // by GET /api/history) ---
  const [historyRuns, setHistoryRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // --- WALK-FORWARD (separate mode: its own settings and results, decoupled
  // from the plain Backtest flow above) ---
  const [wfTrainMonths, setWfTrainMonths] = useState(12);
  const [wfTradeMonths, setWfTradeMonths] = useState(3);
  const [wfStepMonths, setWfStepMonths] = useState("");
  const [wfWarmupBars, setWfWarmupBars] = useState(60);

  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState(null);
  const [wfResults, setWfResults] = useState(null);

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
    if (strategy === "StatArb") {
      return {
        lookback_window: parseInt(strategyParams.lookback_window, 10),
        entry_z: parseFloat(strategyParams.entry_z),
        exit_z: parseFloat(strategyParams.exit_z),
        coint_pvalue_threshold: parseFloat(strategyParams.coint_pvalue_threshold),
      };
    }
    return {};
  };

  const validateCommonInputs = (setErrorFn) => {
    if (!ticker.trim()) {
      setErrorFn("Please enter a valid Ticker Symbol.");
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setErrorFn("Start Date must be before End Date.");
      return false;
    }
    if (capital <= 0) {
      setErrorFn("Initial Capital must be greater than 0.");
      return false;
    }
    if (strategy === "StatArb" && !pairTicker.trim()) {
      setErrorFn("Please enter a Pair Ticker for the pairs-trading strategy.");
      return false;
    }
    if (["5m", "15m"].includes(dataInterval)) {
      const rangeMs = new Date(endDate) - new Date(startDate);
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      if (rangeMs > sixtyDaysMs) {
        setErrorFn(
          "Intraday intervals only support up to 60 days of history. Please narrow your date range.",
        );
        return false;
      }
    }
    return true;
  };

  const runBacktest = async () => {
    if (!validateCommonInputs(setError)) return;

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
      ...(strategy === "StatArb" ? { pair_ticker: pairTicker.toUpperCase() } : {}),
      initial_capital: parseFloat(capital),
      commission_pct: parseFloat(commissionPct) / 100,
      spread_pct: parseFloat(spreadPct) / 100,
      slippage_pct: parseFloat(slippagePct) / 100,
      overnight_financing_pct: parseFloat(financingPct) / 100,
      engine: engine,
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
      const response = await axios.get(`${API_BASE}/api/history`);
      setHistoryRuns(response.data.runs || []);
    } catch (err) {
      setHistoryError(
        err.response?.data?.detail || "Error fetching history.",
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
      setPairTicker(run.strategy_params?.pair_ticker || "MSFT");
      setCapital(run.initial_capital);
      setCommissionPct(run.commission_pct * 100);
      setSpreadPct(run.spread_pct * 100);
      setSlippagePct(run.slippage_pct * 100);
      setFinancingPct(run.overnight_financing_pct * 100);
      setEngine(run.engine || "iterative");

      setResults(run);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error loading saved backtest run.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryRun = (run) => {
    if (run.run_type === "walkforward") {
      loadWfHistoricalRun(run.run_id);
    } else if (run.run_type === "backtest") {
      loadHistoricalRun(run.run_id);
    }
    // run_type === "live" is reserved for when Live Paper Trading ships.
  };

  const runWalkForward = async () => {
    if (!validateCommonInputs(setWfError)) return;

    setWfLoading(true);
    setWfError(null);
    setWfResults(null);

    const payload = {
      ticker: ticker,
      start_date: startDate,
      end_date: endDate,
      interval: dataInterval,
      strategy: strategy,
      strategy_params: buildParamsForStrategy(),
      ...(strategy === "StatArb" ? { pair_ticker: pairTicker.toUpperCase() } : {}),
      initial_capital: parseFloat(capital),
      commission_pct: parseFloat(commissionPct) / 100,
      spread_pct: parseFloat(spreadPct) / 100,
      slippage_pct: parseFloat(slippagePct) / 100,
      overnight_financing_pct: parseFloat(financingPct) / 100,
      train_months: parseInt(wfTrainMonths, 10),
      trade_months: parseInt(wfTradeMonths, 10),
      ...(wfStepMonths ? { step_months: parseInt(wfStepMonths, 10) } : {}),
      ...(NON_FITTING_STRATEGIES.includes(strategy)
        ? { warmup_bars: parseInt(wfWarmupBars, 10) }
        : {}),
    };

    try {
      const response = await axios.post(`${API_BASE}/api/walk-forward`, payload);
      setWfResults(response.data);
    } catch (err) {
      setWfError(
        err.response?.data?.detail || "Error connecting to the backend.",
      );
    } finally {
      setWfLoading(false);
    }
  };

  const loadWfHistoricalRun = async (runId) => {
    setWfLoading(true);
    setWfError(null);
    setWfResults(null);
    setMode("walkforward");
    try {
      const response = await axios.get(`${API_BASE}/api/walk-forward-runs/${runId}`);
      const run = response.data;

      setTicker(run.ticker);
      setStartDate(run.start_date);
      setEndDate(run.end_date);
      setDataInterval(run.interval);
      setStrategy(run.strategy);
      setStrategyParams({ ...DEFAULT_PARAMS, ...run.strategy_params });
      setPairTicker(run.strategy_params?.pair_ticker || "MSFT");
      setCapital(run.initial_capital);
      setCommissionPct(run.commission_pct * 100);
      setSpreadPct(run.spread_pct * 100);
      setSlippagePct(run.slippage_pct * 100);
      setFinancingPct(run.overnight_financing_pct * 100);
      setWfTrainMonths(run.train_months);
      setWfTradeMonths(run.trade_months);
      setWfStepMonths(run.step_months);

      setWfResults(run);
    } catch (err) {
      setWfError(
        err.response?.data?.detail || "Error loading saved walk-forward run.",
      );
    } finally {
      setWfLoading(false);
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

  const TradeLogTable = ({ tradeLog }) => (
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
            {tradeLog.map((trade, index) => (
              <tr key={index}>
                <td className={trade.type === "LONG" ? "positive" : "negative"}>
                  {trade.type}
                </td>
                <td>{trade.entry_date}</td>
                <td>{trade.exit_date}</td>
                <td>${trade.entry_price.toFixed(2)}</td>
                <td>${trade.exit_price.toFixed(2)}</td>
                <td className={trade.profit_loss >= 0 ? "positive" : "negative"}>
                  ${trade.profit_loss.toFixed(2)}
                </td>
                <td
                  className={
                    trade.net_return_pct >= 0 ? "positive" : "negative"
                  }
                >
                  {trade.net_return_pct.toFixed(2)}%
                </td>
              </tr>
            ))}
            {tradeLog.length === 0 && (
              <tr>
                <td
                  colSpan="7"
                  style={{ textAlign: "center", color: "var(--text-muted)" }}
                >
                  No trades executed during this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      <TopBar mode={mode} />
      <RegimeHeader />

      <div className="dashboard-container">
        <NavRail mode={mode} onSelect={handleModeChange} />

        {/* SIDEBAR */}
        <div className="sidebar">
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
              pairTicker={pairTicker}
              setPairTicker={setPairTicker}
              engine={engine}
              setEngine={setEngine}
              loading={loading}
              onRun={runBacktest}
            />
          ) : mode === "walkforward" ? (
            <WalkForwardSidebar
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
              pairTicker={pairTicker}
              setPairTicker={setPairTicker}
              trainMonths={wfTrainMonths}
              setTrainMonths={setWfTrainMonths}
              tradeMonths={wfTradeMonths}
              setTradeMonths={setWfTradeMonths}
              stepMonths={wfStepMonths}
              setStepMonths={setWfStepMonths}
              warmupBars={wfWarmupBars}
              setWarmupBars={setWfWarmupBars}
              loading={wfLoading}
              onRun={runWalkForward}
            />
          ) : mode === "live" ? (
            <LiveSidebar />
          ) : mode === "settings" ? (
            <AdvancedSettingsSidebar />
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

                  <FeatureImportancePanel
                    featureImportance={results.feature_importance}
                  />

                  <TradeLogTable tradeLog={results.trade_log} />
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
          ) : mode === "walkforward" ? (
            <>
              <h1>Walk-Forward Results</h1>
              <p className="subtitle">
                Rolling train/trade window validation — works for any
                strategy, stitched into one continuous out-of-sample curve.
              </p>

              {wfError && <div className="error-message">{wfError}</div>}

              {wfLoading && (
                <div className="spinner-wrap">
                  <div className="spinner"></div>
                  <p>Running Walk-Forward Engine…</p>
                </div>
              )}

              {wfResults && (
                <>
                  <div className="metrics-grid">
                    <MetricCard
                      title="Total Return"
                      value={wfResults.metrics.total_return_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="CAGR"
                      value={wfResults.metrics.cagr_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="Max Drawdown"
                      value={wfResults.metrics.max_drawdown_pct}
                      suffix="%"
                      isColorCoded
                    />
                    <MetricCard
                      title="Win Rate"
                      value={wfResults.metrics.win_rate_pct}
                      suffix="%"
                    />
                    <MetricCard
                      title="Sharpe Ratio"
                      value={wfResults.metrics.sharpe_ratio}
                      isColorCoded
                    />
                    <MetricCard
                      title="Total Trades"
                      value={wfResults.metrics.total_trades}
                    />
                  </div>

                  {wfResults.price_data && (
                    <div className="section-block">
                      <h2>Price Chart & Executions</h2>
                      <p className="section-desc">
                        Green arrows = Buy, Red arrows = Sell Short, Orange
                        arrows = Exit Position.
                      </p>
                      <TradingChart
                        priceData={wfResults.price_data}
                        tradeLog={wfResults.trade_log}
                      />
                    </div>
                  )}

                  {wfResults.equity_curve && (
                    <div className="section-block">
                      <h2>Stitched Equity Curve</h2>
                      <p className="section-desc">
                        Portfolio value across all walk-forward windows,
                        compounding continuously window to window.
                      </p>
                      <EquityCurveChart equityCurve={wfResults.equity_curve} />
                    </div>
                  )}

                  {!wfResults.price_data && (
                    <p className="field-hint">
                      Loaded from saved history — price and equity charts
                      aren't stored for past runs, only metrics, per-window
                      results, and the trade log.
                    </p>
                  )}

                  <WalkForwardTable walkForward={wfResults.walk_forward} />
                  <FeatureImportancePanel
                    featureImportance={wfResults.feature_importance}
                  />

                  <TradeLogTable tradeLog={wfResults.trade_log} />
                </>
              )}

              {!wfResults && !wfLoading && !wfError && (
                <div className="empty-state">
                  <div className="empty-icon">🔁</div>
                  Configure your parameters on the left and click "Run
                  Walk-Forward" to begin.
                </div>
              )}
            </>
          ) : mode === "live" ? (
            <>
              <h1>Live Paper Trading</h1>
              <p className="subtitle">
                Event-driven execution against OANDA paper trading.
              </p>
              <div className="empty-state">
                <div className="empty-icon">⚡</div>
                Live execution ships in Phase 5–7 of the V2 roadmap. Switch back
                to Strategy Explorer to run a historical simulation.
              </div>
            </>
          ) : mode === "settings" ? (
            <>
              <h1>Advanced Settings</h1>
              <p className="subtitle">
                Global cost defaults applied to every Strategy Explorer and
                Walk Forward Engine run.
              </p>
              <AdvancedSettingsPanel
                commissionPct={commissionPct}
                setCommissionPct={setCommissionPct}
                spreadPct={spreadPct}
                setSpreadPct={setSpreadPct}
                slippagePct={slippagePct}
                setSlippagePct={setSlippagePct}
                financingPct={financingPct}
                setFinancingPct={setFinancingPct}
              />
            </>
          ) : (
            <>
              <h1>History</h1>
              <p className="subtitle">
                Every backtest and walk-forward run saved to the database.
                Click a row to reload its results.
              </p>
              <HistoryPanel
                runs={historyRuns}
                loading={historyLoading}
                error={historyError}
                onSelectRun={handleSelectHistoryRun}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
