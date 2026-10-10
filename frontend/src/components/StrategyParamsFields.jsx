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

  if (strategy === "EMA") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Short EMA</label>
            <input
              type="number"
              min="1"
              value={params.ema_short}
              onChange={(e) => setParam("ema_short", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Long EMA</label>
            <input
              type="number"
              min="1"
              value={params.ema_long}
              onChange={(e) => setParam("ema_long", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "MACD") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Fast Period</label>
            <input
              type="number"
              min="1"
              value={params.macd_fast}
              onChange={(e) => setParam("macd_fast", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Slow Period</label>
            <input
              type="number"
              min="1"
              value={params.macd_slow}
              onChange={(e) => setParam("macd_slow", e.target.value)}
            />
          </div>
        </div>
        <div className="input-group">
          <label>Signal Period</label>
          <input
            type="number"
            min="1"
            value={params.macd_signal_period}
            onChange={(e) => setParam("macd_signal_period", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (strategy === "RSI") {
    return (
      <div className="params-box">
        <div className="input-group">
          <label>RSI Period</label>
          <input
            type="number"
            min="2"
            value={params.rsi_period}
            onChange={(e) => setParam("rsi_period", e.target.value)}
          />
        </div>
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Oversold</label>
            <input
              type="number"
              min="1"
              max="49"
              value={params.rsi_oversold}
              onChange={(e) => setParam("rsi_oversold", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Overbought</label>
            <input
              type="number"
              min="51"
              max="99"
              value={params.rsi_overbought}
              onChange={(e) => setParam("rsi_overbought", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "Contrarian") {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Lookback (days)</label>
            <input
              type="number"
              min="1"
              value={params.contrarian_lookback}
              onChange={(e) => setParam("contrarian_lookback", e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Threshold (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={(params.contrarian_threshold * 100).toFixed(1)}
              onChange={(e) =>
                setParam("contrarian_threshold", parseFloat(e.target.value) / 100)
              }
            />
          </div>
        </div>
        <p className="params-hint">
          Buys when the {params.contrarian_lookback}-day return drops below
          −{(params.contrarian_threshold * 100).toFixed(1)}%, shorts when it
          rises above +{(params.contrarian_threshold * 100).toFixed(1)}%.
        </p>
      </div>
    );
  }

  if (strategy === "NDayMom") {
    return (
      <div className="params-box">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Lookback (days)</label>
          <input
            type="number"
            min="1"
            value={params.nday_lookback}
            onChange={(e) => setParam("nday_lookback", e.target.value)}
          />
          <p className="params-hint">
            Long if today's price is above the price{" "}
            {params.nday_lookback} days ago, Short otherwise.
          </p>
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
