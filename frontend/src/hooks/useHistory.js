import { useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";

// Unified backtest + walk-forward run history. Dispatches a selected row
// to whichever run-loader hook can reload it.
export function useHistory({ loadHistoricalRun, loadWfHistoricalRun }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/api/history`);
      setRuns(response.data.runs || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Error fetching history.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRun = (run) => {
    if (run.run_type === "walkforward") {
      loadWfHistoricalRun(run.run_id);
    } else if (run.run_type === "backtest") {
      loadHistoricalRun(run.run_id);
    }
    // run_type === "live" is reserved for when Live Paper Trading ships.
  };

  return { runs, loading, error, fetchHistory, handleSelectRun };
}
