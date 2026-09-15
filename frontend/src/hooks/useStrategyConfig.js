import { useState } from "react";
import { usePersisted } from "./usePersisted";
import { DEFAULT_PARAMS } from "../constants/strategyDefaults";

// Instrument/strategy/cost configuration shared by the Backtest and
// Walk-Forward tabs — both run the same setup, just through different
// engines. Costs are persisted to localStorage so they survive reloads.
export function useStrategyConfig() {
  const [ticker, setTicker] = useState("AAPL");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2023-01-01");
  const [strategy, setStrategy] = useState("SMA");
  const [capital, setCapital] = useState(10000);
  const [dataInterval, setDataInterval] = useState("1d");
  const [strategyParams, setStrategyParams] = useState(DEFAULT_PARAMS);
  const [pairTicker, setPairTicker] = useState("MSFT");
  const [engine, setEngine] = useState("iterative");

  const [commissionPct, setCommissionPct] = usePersisted(
    "qs_commissionPct",
    0.1,
  );
  const [spreadPct, setSpreadPct] = usePersisted("qs_spreadPct", 0.02);
  const [slippagePct, setSlippagePct] = usePersisted("qs_slippagePct", 0.01);
  const [financingPct, setFinancingPct] = usePersisted("qs_financingPct", 0);

  const buildParamsForStrategy = () => {
    if (strategy === "SMA") {
      return {
        short_window: parseInt(strategyParams.short_window, 10),
        long_window: parseInt(strategyParams.long_window, 10),
      };
    }
    if (strategy === "Bollinger") {
      return {
        window: parseInt(strategyParams.window, 10),
        num_std: parseFloat(strategyParams.num_std),
      };
    }
    if (strategy === "ML") {
      return {
        train_split: parseFloat(strategyParams.train_split),
      };
    }
    if (strategy === "StatArb") {
      return {
        lookback_window: parseInt(strategyParams.lookback_window, 10),
        entry_z: parseFloat(strategyParams.entry_z),
        exit_z: parseFloat(strategyParams.exit_z),
        coint_pvalue_threshold: parseFloat(
          strategyParams.coint_pvalue_threshold,
        ),
      };
    }
    return {};
  };

  const validateCommonInputs = (setErrorFn) => {
    if (!ticker.trim()) {
      setErrorFn("Please enter a valid Ticker Symbol.");
      return false;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      setErrorFn("Start Date must be before End Date.");
      return false;
    }
    if (capital <= 0) {
      setErrorFn("Initial Capital must be greater than 0.");
      return false;
    }
    if (strategy === "StatArb" && !pairTicker.trim()) {
      setErrorFn("Please enter a Pair Ticker for the pairs-trading strategy.");
      return false;
    }
    if (["5m", "15m"].includes(dataInterval)) {
      const rangeMs = new Date(endDate) - new Date(startDate);
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
    ...(strategy === "StatArb"
      ? { pair_ticker: pairTicker.toUpperCase() }
      : {}),
    initial_capital: parseFloat(capital),
    commission_pct: parseFloat(commissionPct) / 100,
    spread_pct: parseFloat(spreadPct) / 100,
    slippage_pct: parseFloat(slippagePct) / 100,
    overnight_financing_pct: parseFloat(financingPct) / 100,
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
