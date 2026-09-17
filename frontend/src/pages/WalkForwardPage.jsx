import WalkForwardTopBar from "../components/WalkForwardTopBar";
import TradingChart from "../components/TradingChart";
import EquityCurveChart from "../components/EquityCurveChart";
import FeatureImportancePanel from "../components/FeatureImportancePanel";
import MetricsGrid from "../components/MetricsGrid";
import TradeLogTable from "../components/TradeLogTable";
import WalkForwardTable from "../components/WalkForwardTable";
import WindowTimelineChart from "../components/WindowTimelineChart";

// Walk-Forward tab: the in-content top bar plus the stitched-run results
// (metrics, price/equity charts, per-window table, trade log).
const WalkForwardPage = ({ config, walkForward }) => {
  const { loading, error, results, runWalkForward } = walkForward;

  return (
    <>
      <WalkForwardTopBar
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
        trainMonths={walkForward.trainMonths}
        setTrainMonths={walkForward.setTrainMonths}
        tradeMonths={walkForward.tradeMonths}
        setTradeMonths={walkForward.setTradeMonths}
        stepMonths={walkForward.stepMonths}
        setStepMonths={walkForward.setStepMonths}
        windowUnit={walkForward.windowUnit}
        setWindowUnit={walkForward.setWindowUnit}
        warmupBars={walkForward.warmupBars}
        setWarmupBars={walkForward.setWarmupBars}
        loading={loading}
        onRun={runWalkForward}
      />

      <h1>Walk-Forward Results</h1>
      <p className="subtitle">
        Rolling train/trade window validation — works for any strategy,
        stitched into one continuous out-of-sample curve.
      </p>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="spinner-wrap">
          <div className="spinner"></div>
          <p>Running Walk-Forward Engine…</p>
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
              <h2>Stitched Equity Curve</h2>
              <p className="section-desc">
                Portfolio value across all walk-forward windows, compounding
                continuously window to window.
              </p>
              <EquityCurveChart equityCurve={results.equity_curve} />
            </div>
          )}

          {!results.price_data && (
            <p className="field-hint">
              Loaded from saved history — price and equity charts aren't
              stored for past runs, only metrics, per-window results, and the
              trade log.
            </p>
          )}

          {results.walk_forward?.window_metrics?.length > 0 && (
            <div className="section-block">
              <h2>Window Timeline</h2>
              <p className="section-desc">
                Each row's muted bar is the training period, the colored bar
                is what it traded out-of-sample — hover a trade bar for its
                full metrics.
              </p>
              <WindowTimelineChart
                windowMetrics={results.walk_forward.window_metrics}
              />
            </div>
          )}

          <WalkForwardTable walkForward={results.walk_forward} />
          <FeatureImportancePanel
            featureImportance={results.feature_importance}
          />

          <TradeLogTable tradeLog={results.trade_log} />
        </>
      )}

      {!results && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">🔁</div>
          Configure your parameters above and click "Run Walk-Forward" to
          begin.
        </div>
      )}
    </>
  );
};

export default WalkForwardPage;
