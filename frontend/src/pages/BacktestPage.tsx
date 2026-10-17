import BacktestTopBar from "../components/BacktestTopBar";
import TradingChart from "../components/TradingChart";
import EquityCurveChart from "../components/EquityCurveChart";
import FeatureImportancePanel from "../components/FeatureImportancePanel";
import MetricsGrid from "../components/MetricsGrid";
import TradeLogTable from "../components/TradeLogTable";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";
import type { useBacktestRun } from "../hooks/useBacktestRun";

interface BacktestPageProps {
  config: ReturnType<typeof useStrategyConfig>;
  backtest: ReturnType<typeof useBacktestRun>;
}

const BacktestPage = ({ config, backtest }: BacktestPageProps) => {
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

      <h1 className="mb-1 text-[17px] font-bold">Backtest Results</h1>
      <p className="mb-5 text-[12.5px] text-muted-foreground">Historical simulation over the selected date range.</p>

      {error && (
        <div className="mb-4 rounded-md border border-negative/30 bg-negative/5 px-3 py-2.5 text-[13px] text-negative">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
          <p className="text-[12.5px] text-muted-foreground">Running Backtest Engine…</p>
        </div>
      )}

      {results && (
        <>
          <MetricsGrid metrics={results.metrics} />

          {results.price_data && (
            <div className="mb-6">
              <h2 className="mb-1 text-[15px] font-semibold">Price Chart & Executions</h2>
              <p className="mb-2.5 text-[12px] text-muted-foreground">
                Green arrows = Buy, Red arrows = Sell Short, Orange arrows = Exit Position.
              </p>
              <TradingChart
                priceData={results.price_data}
                tradeLog={results.trade_log}
                indicatorData={results.indicator_data || {}}
              />
            </div>
          )}

          {results.equity_curve && (
            <div className="mb-6">
              <h2 className="mb-1 text-[15px] font-semibold">Equity Curve</h2>
              <p className="mb-2.5 text-[12px] text-muted-foreground">Portfolio value over the backtest window.</p>
              <EquityCurveChart equityCurve={results.equity_curve} />
            </div>
          )}

          {!results.price_data && (
            <p className="mb-5 text-[11.5px] leading-relaxed text-muted-foreground">
              Loaded from saved history — price and equity charts aren't stored for past runs, only metrics and
              the trade log.
            </p>
          )}

          <FeatureImportancePanel featureImportance={results.feature_importance} />

          <TradeLogTable tradeLog={results.trade_log} />
        </>
      )}

      {!results && !loading && !error && (
        <div className="mt-16 rounded-md border border-dashed border-border py-12 text-center text-[13.5px] text-muted-foreground">
          Configure your parameters above and click "Run Backtest" to begin.
        </div>
      )}
    </>
  );
};

export default BacktestPage;
