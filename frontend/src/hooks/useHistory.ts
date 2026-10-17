import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { extractErrorDetail } from "../api/errors";
import type { HistoryRun } from "../types/history";

interface UseHistoryArgs {
  loadHistoricalRun: (runId: number) => void;
  loadWfHistoricalRun: (runId: number) => void;
}

// Unified backtest + walk-forward run history. Dispatches a selected row
// to whichever run-loader hook can reload it.
export function useHistory({ loadHistoricalRun, loadWfHistoricalRun }: UseHistoryArgs) {
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get<{ runs: HistoryRun[] }>(`${API_BASE}/api/history`);
      setRuns(response.data.runs || []);
    } catch (err) {
      setError(extractErrorDetail(err, "Error fetching history."));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = (run: HistoryRun) => {
    if (run.run_type === "walkforward") {
      loadWfHistoricalRun(run.run_id);
    } else if (run.run_type === "backtest") {
      loadHistoricalRun(run.run_id);
    }
    // run_type === "live" is reserved for when Live Paper Trading ships.
  };

  return { runs, loading, error, fetchHistory, handleSelectRun };
}
