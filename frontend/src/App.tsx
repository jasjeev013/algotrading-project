import { useState } from "react";
import Sidebar from "./components/Sidebar";
import RegimeHeader from "./components/RegimeHeader";
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
import type { Mode } from "./types/mode";

import "./App.css";

function App() {
  // --- MODE ---
  const [mode, setMode] = useState<Mode>("backtest");

  // --- STATE (one hook per tab's concerns; config is shared) ---
  const config = useStrategyConfig();
  const backtest = useBacktestRun(config, setMode);
  const walkForward = useWalkForwardRun(config, setMode);
  const live = useLiveTrading(mode);
  const history = useHistory({
    loadHistoricalRun: backtest.loadHistoricalRun,
    loadWfHistoricalRun: walkForward.loadWfHistoricalRun,
  });

  const handleModeChange = (nextMode: string) => {
    setMode(nextMode as Mode);
    if (nextMode === "history") {
      history.fetchHistory();
    }
  };

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <Sidebar mode={mode} onSelect={handleModeChange} />

      {/* Secondary sidebar for tabs that use one (Strategy Explorer and
          Walk-Forward use an in-content top bar instead). Unmigrated —
          keeps the old .sidebar-section-title / dark-theme styling its
          children already rely on. */}
      {mode !== "backtest" && mode !== "walkforward" && (
        <div className="w-[300px] flex-shrink-0 overflow-y-auto border-r-2 border-foreground bg-background p-[18px]">
          {mode === "live" ? (
            <LiveSidebar
              strategy={live.strategy}
              setStrategy={live.setStrategy}
              instrument={live.instrument}
              setInstrument={live.setInstrument}
              account={live.account}
              status={live.status}
              onStatusChange={live.setStatus}
              startPayload={{
                interval_seconds: parseInt(String(live.pollSeconds), 10),
                granularity: live.granularity,
                candle_count: parseInt(String(live.candleCount), 10),
                trade_units: parseInt(String(live.tradeUnits), 10),
                min_account_balance: parseFloat(String(live.minBalance)),
                max_open_positions: parseInt(String(live.maxPositions), 10),
              }}
            />
          ) : mode === "settings" ? (
            <AdvancedSettingsSidebar />
          ) : mode === "about" ? null : (
            <HistorySidebar onRefresh={history.fetchHistory} loading={history.loading} />
          )}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <RegimeHeader />

        {mode === "backtest" ? (
          <BacktestPage config={config} backtest={backtest} />
        ) : mode === "walkforward" ? (
          <WalkForwardPage config={config} walkForward={walkForward} />
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
  );
}

export default App;
