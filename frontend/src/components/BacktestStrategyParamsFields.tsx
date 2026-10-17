import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import type { StrategyParams } from "../types/strategy";

interface BacktestStrategyParamsFieldsProps {
  strategy: string;
  params: StrategyParams;
  onChange: (params: StrategyParams) => void;
}

// Backtest-only fork of StrategyParamsFields, restyled with the new UI
// primitives. StrategyParamsFields.tsx itself stays untouched because
// WalkForwardTopBar still depends on it (see the plan's fork decision).
const BacktestStrategyParamsFields = ({ strategy, params, onChange }: BacktestStrategyParamsFieldsProps) => {
  const setParam = (key: string, value: number | string) => onChange({ ...params, [key]: value });

  const field = (label: string, children: ReactNode, hint?: string) => (
    <div className="w-[150px]">
      <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );

  if (strategy === "BuyHold") {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        No parameters — buys on the first bar and holds a long position for the entire window. Useful as a
        baseline to compare the other strategies against.
      </p>
    );
  }

  if (strategy === "SMA") {
    return (
      <>
        {field(
          "Short Window",
          <Input type="number" min="1" value={params.short_window} onChange={(e) => setParam("short_window", e.target.value)} />,
        )}
        {field(
          "Long Window",
          <Input type="number" min="1" value={params.long_window} onChange={(e) => setParam("long_window", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "Bollinger") {
    return (
      <>
        {field("Window", <Input type="number" min="1" value={params.window} onChange={(e) => setParam("window", e.target.value)} />)}
        {field(
          "Std Dev",
          <Input type="number" step="0.1" min="0.1" value={params.num_std} onChange={(e) => setParam("num_std", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "EMA") {
    return (
      <>
        {field(
          "Short EMA",
          <Input type="number" min="1" value={params.ema_short} onChange={(e) => setParam("ema_short", e.target.value)} />,
        )}
        {field(
          "Long EMA",
          <Input type="number" min="1" value={params.ema_long} onChange={(e) => setParam("ema_long", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "MACD") {
    return (
      <>
        {field(
          "Fast Period",
          <Input type="number" min="1" value={params.macd_fast} onChange={(e) => setParam("macd_fast", e.target.value)} />,
        )}
        {field(
          "Slow Period",
          <Input type="number" min="1" value={params.macd_slow} onChange={(e) => setParam("macd_slow", e.target.value)} />,
        )}
        {field(
          "Signal Period",
          <Input
            type="number"
            min="1"
            value={params.macd_signal_period}
            onChange={(e) => setParam("macd_signal_period", e.target.value)}
          />,
        )}
      </>
    );
  }

  if (strategy === "RSI") {
    return (
      <>
        {field(
          "RSI Period",
          <Input type="number" min="2" value={params.rsi_period} onChange={(e) => setParam("rsi_period", e.target.value)} />,
        )}
        {field(
          "Oversold",
          <Input
            type="number"
            min="1"
            max="49"
            value={params.rsi_oversold}
            onChange={(e) => setParam("rsi_oversold", e.target.value)}
          />,
        )}
        {field(
          "Overbought",
          <Input
            type="number"
            min="51"
            max="99"
            value={params.rsi_overbought}
            onChange={(e) => setParam("rsi_overbought", e.target.value)}
          />,
        )}
      </>
    );
  }

  if (strategy === "Contrarian") {
    const contrarianThreshold = Number(params.contrarian_threshold);
    return (
      <>
        {field(
          "Lookback (days)",
          <Input
            type="number"
            min="1"
            value={params.contrarian_lookback}
            onChange={(e) => setParam("contrarian_lookback", e.target.value)}
          />,
        )}
        {field(
          "Threshold (%)",
          <Input
            type="number"
            step="0.5"
            min="0"
            value={(contrarianThreshold * 100).toFixed(1)}
            onChange={(e) => setParam("contrarian_threshold", parseFloat(e.target.value) / 100)}
          />,
        )}
        <p className="w-full basis-full text-[11.5px] leading-relaxed text-muted-foreground">
          Buys when the {params.contrarian_lookback}-day return drops below −{(contrarianThreshold * 100).toFixed(1)}
          %, shorts when it rises above +{(contrarianThreshold * 100).toFixed(1)}%.
        </p>
      </>
    );
  }

  if (strategy === "NDayMom") {
    return field(
      "Lookback (days)",
      <Input type="number" min="1" value={params.nday_lookback} onChange={(e) => setParam("nday_lookback", e.target.value)} />,
      `Long if today's price is above the price ${params.nday_lookback} days ago, Short otherwise.`,
    );
  }

  if (strategy === "ML") {
    const trainSplit = Number(params.train_split);
    return field(
      "Train Split",
      <Input
        type="number"
        step="0.05"
        min="0.1"
        max="0.9"
        value={params.train_split}
        onChange={(e) => setParam("train_split", e.target.value)}
      />,
      `Model trains on the first ${Math.round(trainSplit * 100)}% of the window and only trades the remaining ${Math.round(
        (1 - trainSplit) * 100,
      )}% out-of-sample. For rolling multi-window validation, use the Walk-Forward tab instead.`,
    );
  }

  if (strategy === "StatArb") {
    return (
      <>
        {field(
          "Lookback Window",
          <Input type="number" min="5" value={params.lookback_window} onChange={(e) => setParam("lookback_window", e.target.value)} />,
        )}
        {field(
          "Coint. p-value Max",
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={params.coint_pvalue_threshold}
            onChange={(e) => setParam("coint_pvalue_threshold", e.target.value)}
          />,
        )}
        {field(
          "Entry Z-Score",
          <Input type="number" step="0.1" min="0.1" value={params.entry_z} onChange={(e) => setParam("entry_z", e.target.value)} />,
        )}
        {field(
          "Exit Z-Score",
          <Input type="number" step="0.1" min="0" value={params.exit_z} onChange={(e) => setParam("exit_z", e.target.value)} />,
        )}
        <p className="w-full basis-full text-[11.5px] leading-relaxed text-muted-foreground">
          Trades the spread between this ticker and the pair ticker (set above) when cointegrated and the spread's
          z-score crosses the entry threshold; flattens on reversion toward the exit threshold.
        </p>
      </>
    );
  }

  return null;
};

export default BacktestStrategyParamsFields;
