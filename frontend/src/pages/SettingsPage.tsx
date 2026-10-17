import AdvancedSettingsPanel from "../components/AdvancedSettingsPanel";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";
import type { useLiveTrading } from "../hooks/useLiveTrading";

interface SettingsPageProps {
  config: ReturnType<typeof useStrategyConfig>;
  live: ReturnType<typeof useLiveTrading>;
}

const SettingsPage = ({ config, live }: SettingsPageProps) => (
  <>
    <h1 className="mb-1 text-[17px] font-bold">Advanced Settings</h1>
    <p className="mb-5 text-[12.5px] text-muted-foreground">
      Global cost defaults applied to every Strategy Explorer and Walk Forward Engine run.
    </p>
    <AdvancedSettingsPanel
      commissionPct={config.commissionPct}
      setCommissionPct={config.setCommissionPct}
      spreadPct={config.spreadPct}
      setSpreadPct={config.setSpreadPct}
      slippagePct={config.slippagePct}
      setSlippagePct={config.setSlippagePct}
      financingPct={config.financingPct}
      setFinancingPct={config.setFinancingPct}
      livePollMinutes={live.pollSeconds}
      setLivePollMinutes={live.setPollSeconds}
      liveGranularity={live.granularity}
      setLiveGranularity={live.setGranularity}
      liveCandleCount={live.candleCount}
      setLiveCandleCount={live.setCandleCount}
      liveTradeUnits={live.tradeUnits}
      setLiveTradeUnits={live.setTradeUnits}
      liveMinBalance={live.minBalance}
      setLiveMinBalance={live.setMinBalance}
      liveMaxPositions={live.maxPositions}
      setLiveMaxPositions={live.setMaxPositions}
    />
  </>
);

export default SettingsPage;
