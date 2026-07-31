const StrategyParamsFields = ({ strategy, params, onChange }) => {
  const setParam = (key, value) => onChange({ ...params, [key]: value })

  if (strategy === 'SMA') {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Short Window</label>
            <input
              type="number"
              min="1"
              value={params.short_window}
              onChange={(e) => setParam('short_window', e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Long Window</label>
            <input
              type="number"
              min="1"
              value={params.long_window}
              onChange={(e) => setParam('long_window', e.target.value)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (strategy === 'Bollinger') {
    return (
      <div className="params-box">
        <div className="input-row">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Window</label>
            <input
              type="number"
              min="1"
              value={params.window}
              onChange={(e) => setParam('window', e.target.value)}
            />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Std Dev</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={params.num_std}
              onChange={(e) => setParam('num_std', e.target.value)}
            />
          </div>
        </div>
      </div>
    )
  }

  if (strategy === 'ML') {
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
            onChange={(e) => setParam('train_split', e.target.value)}
          />
        </div>
        <p className="params-hint">
          Model trains on the first {Math.round(params.train_split * 100)}% of the window and only
          trades the remaining {Math.round((1 - params.train_split) * 100)}% out-of-sample — prevents
          the leakage bug from V1.
        </p>
      </div>
    )
  }

  return null
}

export default StrategyParamsFields
