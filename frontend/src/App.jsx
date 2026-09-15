import { useState } from "react";
import TopBar from "./components/TopBar";
import RegimeHeader from "./components/RegimeHeader";
import NavRail from "./components/NavRail";
import WalkForwardSidebar from "./components/WalkForwardSidebar";
import LiveSidebar from "./components/LiveSidebar";
import AdvancedSettingsSidebar from "./components/AdvancedSettingsSidebar";
import HistorySidebar from "./components/HistorySidebar";

import BacktestPage from "./pages/BacktestPage";
import WalkForwardPage from "./pages/WalkForwardPage";
import LivePage from "./pages/LivePage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import HistoryPage from "./pages/HistoryPage";

import { useStrategyConfig } from "./hooks/useStrategyConfig";
import { useBacktestRun } from "./hooks/useBacktestRun";
import { useWalkForwardRun } from "./hooks/useWalkForwardRun";
import { useLiveTrading } from "./hooks/useLiveTrading";
import { useHistory } from "./hooks/useHistory";

import "./App.css";

function App() {
  // --- MODE ---
  const [mode, setMode] = useState("backtest"); // 'backtest' | 'walkforward' | 'live' | 'settings' | 'history' | 'about'

  // --- STATE (one hook per tab's concerns; config is shared) ---
  const config = useStrategyConfig();
  const backtest = useBacktestRun(config, setMode);
  const walkForward = useWalkForwardRun(config, setMode);
  const live = useLiveTrading(mode);
  const history = useHistory({
    loadHistoricalRun: backtest.loadHistoricalRun,
    loadWfHistoricalRun: walkForward.loadWfHistoricalRun,
  });

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    if (nextMode === "history") {
      history.fetchHistory();
    }
  };

  return (
    <div className="app-shell">
      <TopBar mode={mode} />
      <RegimeHeader />

      <div className="dashboard-container">
        <NavRail mode={mode} onSelect={handleModeChange} />

        {/* SIDEBAR (Strategy Explorer uses an in-content top bar instead — see BacktestPage) */}
        {mode !== "backtest" && (
          <div className="sidebar">
            {mode === "walkforward" ? (
              <WalkForwardSidebar
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
                warmupBars={walkForward.warmupBars}
                setWarmupBars={walkForward.setWarmupBars}
                loading={walkForward.loading}
                onRun={walkForward.runWalkForward}
              />
            ) : mode === "live" ? (
              <LiveSidebar
                strategy={live.strategy}
                setStrategy={live.setStrategy}
                instrument={live.instrument}
                setInstrument={live.setInstrument}
                account={live.account}
                status={live.status}
                onStatusChange={live.setStatus}
                startPayload={{
                  interval_seconds: parseInt(live.pollSeconds, 10),
                  granularity: live.granularity,
                  candle_count: parseInt(live.candleCount, 10),
                  trade_units: parseInt(live.tradeUnits, 10),
                  min_account_balance: parseFloat(live.minBalance),
                  max_open_positions: parseInt(live.maxPositions, 10),
                }}
              />
            ) : mode === "settings" ? (
              <AdvancedSettingsSidebar />
            ) : mode === "about" ? null : (
              <HistorySidebar
                onRefresh={history.fetchHistory}
                loading={history.loading}
              />
            )}
          </div>
        )}

        {/* MAIN CONTENT */}
        <div className="main-content">
          {mode === "backtest" ? (
            <BacktestPage config={config} backtest={backtest} />
          ) : mode === "walkforward" ? (
            <WalkForwardPage walkForward={walkForward} />
          ) : mode === "live" ? (
            <LivePage live={live} />
          ) : mode === "settings" ? (
            <SettingsPage config={config} live={live} />
          ) : mode === "about" ? (
            <AboutPage />
          ) : (
            <HistoryPage history={history} />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
