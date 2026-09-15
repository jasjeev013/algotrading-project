const StrategyParamsFields = ({ strategy, params, onChange }) => {
  const setParam = (key, value) => onChange({ ...params, [key]: value });

  if (strategy === "BuyHold") {
    return (
      <div className="params-box">
        <p className="params-hint">
          No parameters — buys on the first bar and holds a long position
          for the entire window. Useful as a baseline to compare the other
          strategies against.
        </p>
      </div>
    );
  }

  if (strategy === "SMA") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Short Window</label>
            <input
              type="number"
              min="1"
              value={params.short_window}
              onChange={(e) => setParam("short_window", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Long Window</label>
            <input
              type="number"
              min="1"
              value={params.long_window}
              onChange={(e) => setParam("long_window", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "Bollinger") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Window</label>
            <input
              type="number"
              min="1"
              value={params.window}
              onChange={(e) => setParam("window", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Std Dev</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={params.num_std}
              onChange={(e) => setParam("num_std", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "ML") {
    return (
      <div className="params-box">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Train Split</label>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="0.9"
            value={params.train_split}
            onChange={(e) => setParam("train_split", e.target.value)}
          />
        </div>
        <p className="params-hint">
          Model trains on the first {Math.round(params.train_split * 100)}% of
          the window and only trades the remaining{" "}
          {Math.round((1 - params.train_split) * 100)}% out-of-sample. For
          rolling multi-window validation, use the Walk-Forward tab instead.
        </p>
      </div>
    );
  }

  if (strategy === "StatArb") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Lookback Window</label>
            <input
              type="number"
              min="5"
              value={params.lookback_window}
              onChange={(e) => setParam("lookback_window", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Coint. p-value Max</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={params.coint_pvalue_threshold}
              onChange={(e) =>
                setParam("coint_pvalue_threshold", e.target.value)
              }
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Entry Z-Score</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={params.entry_z}
              onChange={(e) => setParam("entry_z", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Exit Z-Score</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={params.exit_z}
              onChange={(e) => setParam("exit_z", e.target.value)}
            />
          </div>
        </div>
        <p className="params-hint">
          Trades the spread between this ticker and the pair ticker (set
          above) when cointegrated and the spread's z-score crosses the entry
          threshold; flattens on reversion toward the exit threshold.
        </p>
      </div>
    );
  }

  return null;
};

export default StrategyParamsFields;
