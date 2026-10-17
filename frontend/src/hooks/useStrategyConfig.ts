import { useState } from "react";
import { usePersisted } from "./usePersisted";
import { DEFAULT_PARAMS } from "../constants/strategyDefaults";
import type { EngineName, StrategyName, StrategyParams } from "../types/strategy";

// Instrument/strategy/cost configuration shared by the Backtest and
// Walk-Forward tabs — both run the same setup, just through different
// engines. Costs are persisted to localStorage so they survive reloads.
export function useStrategyConfig() {
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2023-01-01");
  const [strategy, setStrategy] = useState<StrategyName | string>("SMA");
  const [capital, setCapital] = useState<number | string>(10000);
  const [dataInterval, setDataInterval] = useState("1d");
  const [strategyParams, setStrategyParams] = useState<StrategyParams>(DEFAULT_PARAMS);
  const [pairTicker, setPairTicker] = useState("MSFT");
  const [engine, setEngine] = useState<EngineName>("iterative");

  const [commissionPct, setCommissionPct] = usePersisted<number | string>(
    "qs_commissionPct",
    0.1,
  );
  const [spreadPct, setSpreadPct] = usePersisted<number | string>("qs_spreadPct", 0.02);
  const [slippagePct, setSlippagePct] = usePersisted<number | string>("qs_slippagePct", 0.01);
  const [financingPct, setFinancingPct] = usePersisted<number | string>("qs_financingPct", 0);

  const buildParamsForStrategy = (): Record<string, number> => {
    if (strategy === "SMA") {
      return {
        short_window: parseInt(String(strategyParams.short_window), 10),
        long_window: parseInt(String(strategyParams.long_window), 10),
      };
    }
    if (strategy === "Bollinger") {
      return {
        window: parseInt(String(strategyParams.window), 10),
        num_std: parseFloat(String(strategyParams.num_std)),
      };
    }
    if (strategy === "EMA") {
      return {
        ema_short: parseInt(String(strategyParams.ema_short), 10),
        ema_long: parseInt(String(strategyParams.ema_long), 10),
      };
    }
    if (strategy === "MACD") {
      return {
        macd_fast: parseInt(String(strategyParams.macd_fast), 10),
        macd_slow: parseInt(String(strategyParams.macd_slow), 10),
        macd_signal_period: parseInt(String(strategyParams.macd_signal_period), 10),
      };
    }
    if (strategy === "RSI") {
      return {
        rsi_period: parseInt(String(strategyParams.rsi_period), 10),
        rsi_oversold: parseFloat(String(strategyParams.rsi_oversold)),
        rsi_overbought: parseFloat(String(strategyParams.rsi_overbought)),
      };
    }
    if (strategy === "Contrarian") {
      return {
        contrarian_lookback: parseInt(String(strategyParams.contrarian_lookback), 10),
        contrarian_threshold: parseFloat(String(strategyParams.contrarian_threshold)),
      };
    }
    if (strategy === "NDayMom") {
      return {
        nday_lookback: parseInt(String(strategyParams.nday_lookback), 10),
      };
    }
    if (strategy === "ML") {
      return {
        train_split: parseFloat(String(strategyParams.train_split)),
      };
    }
    if (strategy === "StatArb") {
      return {
        lookback_window: parseInt(String(strategyParams.lookback_window), 10),
        entry_z: parseFloat(String(strategyParams.entry_z)),
        exit_z: parseFloat(String(strategyParams.exit_z)),
        coint_pvalue_threshold: parseFloat(String(strategyParams.coint_pvalue_threshold)),
      };
    }
    return {};
  };

  const validateCommonInputs = (setErrorFn: (message: string) => void): boolean => {
    if (!ticker.trim()) {
      setErrorFn("Please enter a valid Ticker Symbol.");
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setErrorFn("Start Date must be before End Date.");
      return false;
    }
    if (Number(capital) <= 0) {
      setErrorFn("Initial Capital must be greater than 0.");
      return false;
    }
    if (strategy === "StatArb" && !pairTicker.trim()) {
      setErrorFn("Please enter a Pair Ticker for the pairs-trading strategy.");
      return false;
    }
    if (["5m", "15m"].includes(dataInterval)) {
      const rangeMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      if (rangeMs > sixtyDaysMs) {
        setErrorFn(
          "Intraday intervals only support up to 60 days of history. Please narrow your date range.",
        );
        return false;
      }
    }
    return true;
  };

  // Fields common to both the /api/backtest and /api/walk-forward payloads.
  const buildBasePayload = () => ({
    ticker,
    start_date: startDate,
    end_date: endDate,
    interval: dataInterval,
    strategy,
    strategy_params: buildParamsForStrategy(),
    ...(strategy === "StatArb" ? { pair_ticker: pairTicker.toUpperCase() } : {}),
    initial_capital: parseFloat(String(capital)),
    commission_pct: parseFloat(String(commissionPct)) / 100,
    spread_pct: parseFloat(String(spreadPct)) / 100,
    slippage_pct: parseFloat(String(slippagePct)) / 100,
    overnight_financing_pct: parseFloat(String(financingPct)) / 100,
  });

  return {
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
    commissionPct,
    setCommissionPct,
    spreadPct,
    setSpreadPct,
    slippagePct,
    setSlippagePct,
    financingPct,
    setFinancingPct,
    buildParamsForStrategy,
    validateCommonInputs,
    buildBasePayload,
  };
}
