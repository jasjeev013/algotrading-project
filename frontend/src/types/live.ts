// OANDA's raw JSON shapes (account summary, positions) pass through the
// backend largely untouched (see OandaExecutionHandler in
// backend/app/services/execution_handler.py), so these stay index-signature
// shaped rather than fully modeling OANDA's API.

export interface LiveBotStartPayload {
  strategy: string;
  instrument: string;
  interval_seconds: number;
  strategy_params?: Record<string, number | string>;
  granularity: string;
  candle_count: number;
  trade_units: number;
  min_account_balance: number;
  max_open_positions: number;
}

export interface LiveAccount {
  balance?: string | number;
  marginUsed?: string | number;
  NAV?: string | number;
  [key: string]: unknown;
}

export interface LivePositionSide {
  units?: string | number;
  [key: string]: unknown;
}

export interface LiveOpenPosition {
  instrument: string;
  long?: LivePositionSide;
  short?: LivePositionSide;
  [key: string]: unknown;
}

// Mirrors LiveBotController.state in backend/app/services/live_bot.py,
// plus open_positions appended by GET /api/live/status.
export interface LiveStatus {
  status?: string;
  running?: boolean;
  strategy?: string | null;
  instrument?: string | null;
  interval_seconds?: number | null;
  granularity?: string | null;
  candle_count?: number | null;
  trade_units?: number | null;
  min_account_balance?: number | null;
  max_open_positions?: number | null;
  last_heartbeat?: string | null;
  last_action?: string | null;
  last_error?: string | null;
  open_positions?: LiveOpenPosition[];
}

export interface LiveCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface LiveTrade {
  id: number;
  instrument: string;
  strategy: string;
  action: string;
  desired_position: string;
  prior_position: string;
  units: number | null;
  signal_time: string;
  error_detail: string | null;
  realized_pl: number | null;
  created_at: string | null;
}

export interface KillSwitchResult {
  instrument: string | null;
  status: string;
  realized_pl?: number | null;
  detail?: string;
}
