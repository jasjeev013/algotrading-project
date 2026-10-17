import { Dispatch, SetStateAction, useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { extractErrorDetail } from "../api/errors";
import { DEFAULT_PARAMS, NON_FITTING_STRATEGIES } from "../constants/strategyDefaults";
import type { useStrategyConfig } from "./useStrategyConfig";
import type { WalkForwardResults } from "../types/walkForward";
import type { Mode } from "../types/mode";

// Runs a walk-forward validation against `config` and tracks its results;
// also reloads a previously saved walk-forward run from history.
export function useWalkForwardRun(
  config: ReturnType<typeof useStrategyConfig>,
  setMode: Dispatch<SetStateAction<Mode>>,
) {
  const [trainMonths, setTrainMonths] = useState<number | string>(12);
  const [tradeMonths, setTradeMonths] = useState<number | string>(3);
  const [stepMonths, setStepMonths] = useState<number | string>("");
  const [windowUnit, setWindowUnit] = useState("months");
  const [warmupBars, setWarmupBars] = useState<number | string>(60);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WalkForwardResults | null>(null);

  const runWalkForward = async () => {
    if (!config.validateCommonInputs(setError)) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const payload = {
      ...config.buildBasePayload(),
      train_months: parseInt(String(trainMonths), 10),
      trade_months: parseInt(String(tradeMonths), 10),
      ...(stepMonths ? { step_months: parseInt(String(stepMonths), 10) } : {}),
      window_unit: windowUnit,
      ...(NON_FITTING_STRATEGIES.includes(config.strategy)
        ? { warmup_bars: parseInt(String(warmupBars), 10) }
        : {}),
    };

    try {
      const response = await axios.post<WalkForwardResults>(
        `${API_BASE}/api/walk-forward`,
        payload,
      );
      setResults(response.data);
    } catch (err) {
      setError(extractErrorDetail(err, "Error connecting to the backend."));
    } finally {
      setLoading(false);
    }
  };

  const loadWfHistoricalRun = async (runId: number) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setMode("walkforward");
    try {
      const response = await axios.get<WalkForwardResults>(
        `${API_BASE}/api/walk-forward-runs/${runId}`,
      );
      const run = response.data;

      config.setTicker(run.ticker ?? "");
      config.setStartDate(run.start_date ?? "");
      config.setEndDate(run.end_date ?? "");
      config.setDataInterval(run.interval ?? "");
      config.setStrategy(run.strategy ?? "");
      config.setStrategyParams({ ...DEFAULT_PARAMS, ...run.strategy_params });
      config.setPairTicker(run.strategy_params?.pair_ticker || "MSFT");
      config.setCapital(run.initial_capital ?? 0);
      config.setCommissionPct((run.commission_pct ?? 0) * 100);
      config.setSpreadPct((run.spread_pct ?? 0) * 100);
      config.setSlippagePct((run.slippage_pct ?? 0) * 100);
      config.setFinancingPct((run.overnight_financing_pct ?? 0) * 100);
      setTrainMonths(run.train_months ?? 12);
      setTradeMonths(run.trade_months ?? 3);
      setStepMonths(run.step_months ?? "");
      setWindowUnit(run.window_unit || "months");

      setResults(run);
    } catch (err) {
      setError(extractErrorDetail(err, "Error loading saved walk-forward run."));
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
    windowUnit,
    setWindowUnit,
    warmupBars,
    setWarmupBars,
    loading,
    error,
    results,
    runWalkForward,
    loadWfHistoricalRun,
  };
}
