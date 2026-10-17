import type { StrategyParams } from "./strategy";
import type { EquityPoint, IndicatorSpec, Metrics, PricePoint, Trade } from "./backtest";

export interface WalkForwardWindowMetric {
  window_index: number;
  train_start: string;
  train_end: string;
  trade_start: string;
  trade_end: string;
  metrics: Metrics;
}

export interface WalkForwardInfo {
  enabled: boolean;
  train_months: number;
  trade_months: number;
  step_months: number | null;
  window_unit: string;
  window_metrics: WalkForwardWindowMetric[];
}

// Same dual-shape situation as BacktestResults: POST /api/walk-forward
// returns the full run plus `walk_forward`; GET /api/walk-forward-runs/{id}
// returns the persisted run fields plus the same `walk_forward` envelope,
// but without equity_curve/price_data/indicator_data/feature_importance.
export interface WalkForwardResults {
  status: string;
  run_id: number;
  metrics: Metrics;
  trade_log: Trade[];
  equity_curve?: EquityPoint[];
  price_data?: PricePoint[];
  indicator_data?: Record<string, IndicatorSpec>;
  feature_importance?: Record<string, number> | null;
  walk_forward?: WalkForwardInfo;
  ticker?: string;
  strategy?: string;
  strategy_params?: StrategyParams & { pair_ticker?: string };
  interval?: string;
  start_date?: string;
  end_date?: string;
  initial_capital?: number;
  commission_pct?: number;
  spread_pct?: number;
  slippage_pct?: number;
  overnight_financing_pct?: number;
  train_months?: number;
  trade_months?: number;
  step_months?: number | null;
  window_unit?: string;
}
