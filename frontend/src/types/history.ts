import type { Metrics } from "./backtest";

// A read-time merge over BacktestRun + WalkForwardRun + LiveTradeRecord
// (see backend/app/routers/history.py), not a single backend model — hence
// most fields besides run_id/run_type/created_at/metrics are optional.
export interface HistoryRun {
  run_id: number;
  run_type: "backtest" | "walkforward" | "live";
  ticker?: string;
  instrument?: string;
  strategy?: string;
  interval?: string;
  start_date?: string | null;
  end_date?: string | null;
  engine?: string;
  action?: string;
  train_months?: number;
  trade_months?: number;
  step_months?: number | null;
  created_at: string | null;
  metrics: Metrics;
}
