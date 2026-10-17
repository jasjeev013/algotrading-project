export type StrategyName =
  | "BuyHold"
  | "SMA"
  | "Bollinger"
  | "EMA"
  | "MACD"
  | "RSI"
  | "Contrarian"
  | "NDayMom"
  | "ML"
  | "StatArb";

export type EngineName = "iterative" | "vectorized";

// Keyed loosely to match the backend's Dict[str, Any] strategy_params: each
// strategy only reads the subset of fields it needs (see
// useStrategyConfig.buildParamsForStrategy), and params flow through number
// inputs whose onChange handlers hand back raw strings before they're
// parsed, so values are read/written as either type.
export type StrategyParams = Record<string, number | string>;
