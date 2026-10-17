import { useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import StrategyParamsFields from "./StrategyParamsFields";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";
import type { useWalkForwardRun } from "../hooks/useWalkForwardRun";

const NON_FITTING_STRATEGIES = ["SMA", "Bollinger"];

type WalkForwardTopBarProps = Pick<
  ReturnType<typeof useStrategyConfig>,
  | "ticker"
  | "setTicker"
  | "startDate"
  | "setStartDate"
  | "endDate"
  | "setEndDate"
  | "strategy"
  | "setStrategy"
  | "capital"
  | "setCapital"
  | "dataInterval"
  | "setDataInterval"
  | "strategyParams"
  | "setStrategyParams"
  | "pairTicker"
  | "setPairTicker"
> &
  Pick<
    ReturnType<typeof useWalkForwardRun>,
    | "trainMonths"
    | "setTrainMonths"
    | "tradeMonths"
    | "setTradeMonths"
    | "stepMonths"
    | "setStepMonths"
    | "windowUnit"
    | "setWindowUnit"
    | "warmupBars"
    | "setWarmupBars"
  > & {
    loading: boolean;
    onRun: () => void;
  };

const STRATEGY_PARAMS_LABEL: Record<string, string> = {
  SMA: "SMA Crossover Settings",
  Bollinger: "Bollinger Bands Settings",
  ML: "Machine Learning Settings",
  StatArb: "Pairs Trading Settings",
};

// Horizontal control bar for the Walk-Forward tab — mirrors BacktestTopBar's
// layout (row of core fields + a collapsible params row below), with the
// walk-forward window settings folded into that same collapsible row.
const WalkForwardTopBar = ({
  ticker,
  setTicker,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  strategy,
  setStrategy,
  capital,
  setCapital,
  dataInterval,
  setDataInterval,
  strategyParams,
  setStrategyParams,
  pairTicker,
  setPairTicker,
  trainMonths,
  setTrainMonths,
  tradeMonths,
  setTradeMonths,
  stepMonths,
  setStepMonths,
  windowUnit,
  setWindowUnit,
  warmupBars,
  setWarmupBars,
  loading,
  onRun,
}: WalkForwardTopBarProps) => {
  const [paramsOpen, setParamsOpen] = useState(true);
  const field = (label: string, children: ReactNode, width = "w-[130px]") => (
    <div className={width}>
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );

  return (
    <div className="mb-5 flex flex-col gap-4 rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start gap-4">
        {field("Ticker Symbol", <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />)}
        {field(
          "Start Date",
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />,
          "w-[150px]",
        )}
        {field(
          "End Date",
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />,
          "w-[150px]",
        )}

        {field(
          "Data Interval",
          <Select value={dataInterval} onChange={(e) => setDataInterval(e.target.value)}>
            <optgroup label="Daily+">
              <option value="1d">1 Day</option>
              <option value="1wk">1 Week</option>
              <option value="1mo">1 Month</option>
            </optgroup>
            <optgroup label="Intraday (max 60 days history)">
              <option value="5m">5 Minutes</option>
              <option value="15m">15 Minutes</option>
            </optgroup>
          </Select>,
          "w-[170px]",
        )}

        {field(
          "Model",
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="SMA">SMA Crossover</option>
            <option value="EMA">EMA Crossover</option>
            <option value="MACD">MACD</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="RSI">RSI Mean Reversion</option>
            <option value="Contrarian">Contrarian</option>
            <option value="NDayMom">Momentum (N-Day)</option>
            <option value="ML">Machine Learning (RF)</option>
            <option value="StatArb">Pairs Trading (StatArb)</option>
          </Select>,
          "w-[170px]",
        )}

        {field("Initial Capital ($)", <Input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />)}

        <Button className="ml-auto mt-[22px]" onClick={onRun} disabled={loading}>
          {loading ? "Running Walk-Forward…" : "Run Walk-Forward"}
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <button
          onClick={() => setParamsOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <span>{paramsOpen ? "▾" : "▸"}</span>
          {STRATEGY_PARAMS_LABEL[strategy] ?? "Strategy Settings"} &amp; Walk-Forward Window
        </button>

        {paramsOpen && (
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {strategy === "StatArb" &&
              field(
                "Pair Ticker",
                <>
                  <Input value={pairTicker} onChange={(e) => setPairTicker(e.target.value)} placeholder="MSFT" />
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    Second leg of the pair — spread traded against Ticker Symbol.
                  </p>
                </>,
              )}

            <StrategyParamsFields strategy={strategy} params={strategyParams} onChange={setStrategyParams} />

            {field(
              "Window Unit",
              <Select value={windowUnit} onChange={(e) => setWindowUnit(e.target.value)}>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </Select>,
            )}

            {field(
              "Train Length",
              <Input type="number" min="1" value={trainMonths} onChange={(e) => setTrainMonths(e.target.value)} />,
            )}

            {field(
              "Trade Length",
              <Input type="number" min="1" value={tradeMonths} onChange={(e) => setTradeMonths(e.target.value)} />,
            )}

            {field(
              "Step Length (optional)",
              <Input
                type="number"
                min="1"
                value={stepMonths}
                onChange={(e) => setStepMonths(e.target.value)}
                placeholder={`Defaults to ${tradeMonths}`}
              />,
            )}

            {NON_FITTING_STRATEGIES.includes(strategy) &&
              field(
                "Warm-up Bars",
                <Input type="number" min="1" value={warmupBars} onChange={(e) => setWarmupBars(e.target.value)} />,
              )}

            <p className="w-full basis-full text-[11.5px] leading-relaxed text-muted-foreground">
              Trains on each {trainMonths}-{windowUnit} rolling window, then trades the next {tradeMonths}{" "}
              {windowUnit} out-of-sample — repeated across the full date range and stitched into one continuous
              equity curve.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalkForwardTopBar;
