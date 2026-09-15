// Default strategy-parameter values, keyed by field name across all
// strategies (each strategy only reads the subset it needs).
export const DEFAULT_PARAMS = {
  short_window: 20,
  long_window: 50,
  window: 20,
  num_std: 2.0,
  train_split: 0.7,
  lookback_window: 30,
  entry_z: 2.0,
  exit_z: 0.5,
  coint_pvalue_threshold: 0.05,
};

// Strategies with no model to fit — Walk-Forward needs an explicit
// warmup window for these instead of relying on a trained model.
export const NON_FITTING_STRATEGIES = ["BuyHold", "SMA", "Bollinger"];
