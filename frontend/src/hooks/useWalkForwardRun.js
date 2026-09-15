import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import {
  DEFAULT_PARAMS,
  NON_FITTING_STRATEGIES,
} from "../constants/strategyDefaults";

// Runs a walk-forward validation against `config` and tracks its results;
// also reloads a previously saved walk-forward run from history.
export function useWalkForwardRun(config, setMode) {
  const [trainMonths, setTrainMonths] = useState(12);
  const [tradeMonths, setTradeMonths] = useState(3);
  const [stepMonths, setStepMonths] = useState("");
  const [warmupBars, setWarmupBars] = useState(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const runWalkForward = async () => {
    if (!config.validateCommonInputs(setError)) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const payload = {
      ...config.buildBasePayload(),
      train_months: parseInt(trainMonths, 10),
      trade_months: parseInt(tradeMonths, 10),
      ...(stepMonths ? { step_months: parseInt(stepMonths, 10) } : {}),
      ...(NON_FITTING_STRATEGIES.includes(config.strategy)
        ? { warmup_bars: parseInt(warmupBars, 10) }
        : {}),
    };

    try {
      const response = await axios.post(
        `${API_BASE}/api/walk-forward`,
        payload,
      );
      setResults(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error connecting to the backend.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadWfHistoricalRun = async (runId) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setMode("walkforward");
    try {
      const response = await axios.get(
        `${API_BASE}/api/walk-forward-runs/${runId}`,
      );
      const run = response.data;

      config.setTicker(run.ticker);
      config.setStartDate(run.start_date);
      config.setEndDate(run.end_date);
      config.setDataInterval(run.interval);
      config.setStrategy(run.strategy);
      config.setStrategyParams({ ...DEFAULT_PARAMS, ...run.strategy_params });
      config.setPairTicker(run.strategy_params?.pair_ticker || "MSFT");
      config.setCapital(run.initial_capital);
      config.setCommissionPct(run.commission_pct * 100);
      config.setSpreadPct(run.spread_pct * 100);
      config.setSlippagePct(run.slippage_pct * 100);
      config.setFinancingPct(run.overnight_financing_pct * 100);
      setTrainMonths(run.train_months);
      setTradeMonths(run.trade_months);
      setStepMonths(run.step_months);

      setResults(run);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error loading saved walk-forward run.",
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    trainMonths,
    setTrainMonths,
    tradeMonths,
    setTradeMonths,
    stepMonths,
    setStepMonths,
    warmupBars,
    setWarmupBars,
    loading,
    error,
    results,
    runWalkForward,
    loadWfHistoricalRun,
  };
}
