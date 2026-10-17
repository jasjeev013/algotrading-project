import { Dispatch, SetStateAction, useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { extractErrorDetail } from "../api/errors";
import { DEFAULT_PARAMS } from "../constants/strategyDefaults";
import type { useStrategyConfig } from "./useStrategyConfig";
import type { BacktestResults } from "../types/backtest";
import type { Mode } from "../types/mode";

// Runs a single historical backtest against `config` and tracks its
// results; also reloads a previously saved backtest run from history.
export function useBacktestRun(
  config: ReturnType<typeof useStrategyConfig>,
  setMode: Dispatch<SetStateAction<Mode>>,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BacktestResults | null>(null);

  const runBacktest = async () => {
    if (!config.validateCommonInputs(setError)) return;

    setLoading(true);
    setError(null);
    setResults(null);

    const payload = { ...config.buildBasePayload(), engine: config.engine };

    try {
      const response = await axios.post<BacktestResults>(`${API_BASE}/api/backtest`, payload);
      setResults(response.data);
    } catch (err) {
      setError(extractErrorDetail(err, "Error connecting to the backend."));
    } finally {
      setLoading(false);
    }
  };

  const loadHistoricalRun = async (runId: number) => {
    setLoading(true);
    setError(null);
    setResults(null);
    setMode("backtest");
    try {
      const response = await axios.get<BacktestResults>(`${API_BASE}/api/backtests/${runId}`);
      const run = response.data;

      // Repopulate the controls with the settings this run was executed with.
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
      config.setEngine((run.engine as "iterative" | "vectorized") || "iterative");

      setResults(run);
    } catch (err) {
      setError(extractErrorDetail(err, "Error loading saved backtest run."));
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, results, runBacktest, loadHistoricalRun };
}
