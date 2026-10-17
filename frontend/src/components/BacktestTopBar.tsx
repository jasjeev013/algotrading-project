import { useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import BacktestStrategyParamsFields from "./BacktestStrategyParamsFields";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";

type BacktestTopBarProps = Pick<
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
  | "engine"
  | "setEngine"
> & {
  loading: boolean;
  onRun: () => void;
};

const STRATEGY_PARAMS_LABEL: Record<string, string> = {
  BuyHold: "Buy & Hold Settings",
  SMA: "SMA Crossover Settings",
  Bollinger: "Bollinger Bands Settings",
  ML: "Machine Learning Settings",
};

// Horizontal control bar for the Strategy Explorer tab.
const BacktestTopBar = ({
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
  engine,
  setEngine,
  loading,
  onRun,
}: BacktestTopBarProps) => {
  const [paramsOpen, setParamsOpen] = useState(true);
  const field = (label: string, children: ReactNode, width = "w-[130px]") => (
    <div className={width}>
      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="mb-5 flex flex-col gap-4 border-2 border-foreground p-4">
      <div className="flex flex-wrap items-start gap-4">
        {field("Ticker Symbol", <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />)}
        {field("Start Date", <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />)}
        {field("End Date", <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />)}

        {field(
          "Data Interval",
          <>
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
            </Select>
            {["5m", "15m"].includes(dataInterval) && (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Yahoo Finance only provides ~60 days of intraday history.
              </p>
            )}
          </>,
          "w-[170px]",
        )}

        {field(
          "Model",
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="BuyHold">Buy &amp; Hold</option>
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

        {field(
          "Engine",
          <Select value={engine} onChange={(e) => setEngine(e.target.value as "iterative" | "vectorized")}>
            <option value="iterative">Fast Iterative</option>
            <option value="vectorized">Vectorized</option>
          </Select>,
          "w-[170px]",
        )}

        {field("Initial Capital ($)", <Input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />)}

        <Button className="ml-auto mt-[22px]" onClick={onRun} disabled={loading}>
          {loading ? "Running Test…" : "Run Backtest"}
        </Button>
      </div>

      <div className="border-t-2 border-foreground pt-4">
        <button
          onClick={() => setParamsOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <span>{paramsOpen ? "▾" : "▸"}</span>
          {STRATEGY_PARAMS_LABEL[strategy] ?? "Pairs Trading Settings"}
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

            <BacktestStrategyParamsFields strategy={strategy} params={strategyParams} onChange={setStrategyParams} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestTopBar;
