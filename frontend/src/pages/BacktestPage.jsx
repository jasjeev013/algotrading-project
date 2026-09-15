import BacktestTopBar from "../components/BacktestTopBar";
import TradingChart from "../components/TradingChart";
import EquityCurveChart from "../components/EquityCurveChart";
import FeatureImportancePanel from "../components/FeatureImportancePanel";
import MetricsGrid from "../components/MetricsGrid";
import TradeLogTable from "../components/TradeLogTable";

// Strategy Explorer tab: the in-content top bar plus the single-run
// results (metrics, price/equity charts, feature importance, trade log).
const BacktestPage = ({ config, backtest }) => {
  const { loading, error, results, runBacktest } = backtest;

  return (
    <>
      <BacktestTopBar
        ticker={config.ticker}
        setTicker={config.setTicker}
        startDate={config.startDate}
        setStartDate={config.setStartDate}
        endDate={config.endDate}
        setEndDate={config.setEndDate}
        strategy={config.strategy}
        setStrategy={config.setStrategy}
        capital={config.capital}
        setCapital={config.setCapital}
        dataInterval={config.dataInterval}
        setDataInterval={config.setDataInterval}
        strategyParams={config.strategyParams}
        setStrategyParams={config.setStrategyParams}
        pairTicker={config.pairTicker}
        setPairTicker={config.setPairTicker}
        engine={config.engine}
        setEngine={config.setEngine}
        loading={loading}
        onRun={runBacktest}
      />

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
          <MetricsGrid metrics={results.metrics} />

          {results.price_data && (
            <div className="section-block">
              <h2>Price Chart & Executions</h2>
              <p className="section-desc">
                Green arrows = Buy, Red arrows = Sell Short, Orange arrows =
                Exit Position.
              </p>
              <TradingChart
                priceData={results.price_data}
                tradeLog={results.trade_log}
                indicatorData={results.indicator_data || {}}
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
              Loaded from saved history — price and equity charts aren't
              stored for past runs, only metrics and the trade log.
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
          Configure your parameters above and click "Run Backtest" to begin.
        </div>
      )}
    </>
  );
};

export default BacktestPage;
