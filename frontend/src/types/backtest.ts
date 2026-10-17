import type { EngineName, StrategyParams } from "./strategy";

export interface Trade {
  type: string;
  entry_date: string;
  exit_date: string;
  entry_price: number;
  exit_price: number;
  profit_loss: number;
  net_return_pct: number;
  equity_after: number;
}

export interface PricePoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface EquityPoint {
  time: string;
  equity: number;
}

export interface IndicatorSpec {
  label: string;
  color: string;
  scale: string;
  data: { time: string; value: number }[];
}

// win_rate_pct is undefined (null), not 0%, when there are no closed trades
// to grade — see calculate_metrics in backend/app/services/analytics.py.
export interface Metrics {
  initial_capital?: number;
  final_equity?: number;
  total_return_pct?: number;
  cagr_pct?: number;
  max_drawdown_pct?: number;
  win_rate_pct?: number | null;
  sharpe_ratio?: number;
  total_trades?: number;
}

// Covers both the POST /api/backtest response (equity_curve/price_data/
// indicator_data/feature_importance present, ticker/strategy/... absent)
// and the GET /api/backtests/{id} response (the reverse) — useBacktestRun
// stores either shape in the same `results` state.
export interface BacktestResults {
  status: string;
  run_id: number;
  metrics: Metrics;
  trade_log: Trade[];
  engine?: EngineName | string;
  equity_curve?: EquityPoint[];
  price_data?: PricePoint[];
  indicator_data?: Record<string, IndicatorSpec>;
  feature_importance?: Record<string, number> | null;
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
}
