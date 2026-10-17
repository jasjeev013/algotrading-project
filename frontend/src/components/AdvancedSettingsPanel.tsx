import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface AdvancedSettingsPanelProps {
  commissionPct: number | string;
  setCommissionPct: Dispatch<SetStateAction<number | string>>;
  spreadPct: number | string;
  setSpreadPct: Dispatch<SetStateAction<number | string>>;
  slippagePct: number | string;
  setSlippagePct: Dispatch<SetStateAction<number | string>>;
  financingPct: number | string;
  setFinancingPct: Dispatch<SetStateAction<number | string>>;
  livePollMinutes: number | string;
  setLivePollMinutes: Dispatch<SetStateAction<number | string>>;
  liveGranularity: string;
  setLiveGranularity: Dispatch<SetStateAction<string>>;
  liveCandleCount: number | string;
  setLiveCandleCount: Dispatch<SetStateAction<number | string>>;
  liveTradeUnits: number | string;
  setLiveTradeUnits: Dispatch<SetStateAction<number | string>>;
  liveMinBalance: number | string;
  setLiveMinBalance: Dispatch<SetStateAction<number | string>>;
  liveMaxPositions: number | string;
  setLiveMaxPositions: Dispatch<SetStateAction<number | string>>;
}

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) => (
  <div>
    <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">{label}</label>
    {children}
    <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{hint}</p>
  </div>
);

const AdvancedSettingsPanel = ({
  commissionPct,
  setCommissionPct,
  spreadPct,
  setSpreadPct,
  slippagePct,
  setSlippagePct,
  financingPct,
  setFinancingPct,
  livePollMinutes,
  setLivePollMinutes,
  liveGranularity,
  setLiveGranularity,
  liveCandleCount,
  setLiveCandleCount,
  liveTradeUnits,
  setLiveTradeUnits,
  liveMinBalance,
  setLiveMinBalance,
  liveMaxPositions,
  setLiveMaxPositions,
}: AdvancedSettingsPanelProps) => {
  return (
    <>
      <div className="mb-8">
        <h2 className="mb-1 text-[15px] font-semibold">Cost Model</h2>
        <p className="mb-4 text-[12px] text-muted-foreground">
          These friction assumptions apply globally to every Strategy Explorer and Walk Forward Engine run —
          there's one place to set them, not one per section.
        </p>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Commission (%)" hint="Flat fee charged on both entry and exit of every trade.">
            <Input type="number" step="0.01" min="0" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
          </Field>
          <Field label="Spread (%)" hint="Bid/ask spread — half applied to each side of a fill.">
            <Input type="number" step="0.01" min="0" value={spreadPct} onChange={(e) => setSpreadPct(e.target.value)} />
          </Field>
          <Field label="Slippage (%)" hint="Adverse price move applied on every fill.">
            <Input type="number" step="0.01" min="0" value={slippagePct} onChange={(e) => setSlippagePct(e.target.value)} />
          </Field>
          <Field label="Overnight Financing (%/day)" hint="Charged per calendar day a position is held overnight.">
            <Input type="number" step="0.001" min="0" value={financingPct} onChange={(e) => setFinancingPct(e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-1 text-[15px] font-semibold">Live Bot Defaults</h2>
        <p className="mb-4 text-[12px] text-muted-foreground">
          Controls the OANDA paper-trading bot's tick loop, candle feed, and risk guards — applied the next time
          you click "Start Bot" on the Live Paper Trading tab.
        </p>

        <div className="grid grid-cols-2 gap-5">
          <Field
            label="Poll Interval (seconds)"
            hint="How often the bot fetches candles and re-evaluates its signal. Min 10 s. Setting below your candle granularity catches new candle closes faster."
          >
            <Input type="number" step="1" min="10" value={livePollMinutes} onChange={(e) => setLivePollMinutes(e.target.value)} />
          </Field>
          <Field label="Candle Granularity" hint="Candle timeframe the strategy evaluates and the chart displays.">
            <Select value={liveGranularity} onChange={(e) => setLiveGranularity(e.target.value)}>
              <option value="M1">1 Minute</option>
              <option value="M5">5 Minutes</option>
              <option value="M15">15 Minutes</option>
              <option value="M30">30 Minutes</option>
              <option value="H1">1 Hour</option>
              <option value="H4">4 Hours</option>
            </Select>
          </Field>
          <Field label="Candle Lookback (bars)" hint="Number of recent candles fetched per tick and shown on the chart.">
            <Input
              type="number"
              step="1"
              min="10"
              max="500"
              value={liveCandleCount}
              onChange={(e) => setLiveCandleCount(e.target.value)}
            />
          </Field>
          <Field label="Trade Size (units)" hint="Order size placed whenever the bot opens or reverses a position.">
            <Input type="number" step="1" min="1" value={liveTradeUnits} onChange={(e) => setLiveTradeUnits(e.target.value)} />
          </Field>
          <Field label="Min Account Balance" hint="Risk guard — the bot won't open new positions below this balance.">
            <Input type="number" step="1" min="0" value={liveMinBalance} onChange={(e) => setLiveMinBalance(e.target.value)} />
          </Field>
          <Field label="Max Open Positions" hint="Risk guard — caps how many concurrent open positions the bot allows.">
            <Input type="number" step="1" min="1" value={liveMaxPositions} onChange={(e) => setLiveMaxPositions(e.target.value)} />
          </Field>
        </div>
      </div>
    </>
  );
};

export default AdvancedSettingsPanel;
