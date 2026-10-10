import AdvancedSettingsPanel from "../components/AdvancedSettingsPanel";

const SettingsPage = ({ config, live }) => (
  <>
    <h1>Advanced Settings</h1>
    <p className="subtitle">
      Global cost defaults applied to every Strategy Explorer and Walk
      Forward Engine run.
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
