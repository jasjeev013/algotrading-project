const FeatureImportancePanel = ({ featureImportance }) => {
  if (!featureImportance) return null;

  const entries = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, value]) => value), 0.0001);

  return (
    <div className="section-block">
      <h2>Feature Importance</h2>
      <p className="section-desc">
        Relative contribution of each input feature to the Random Forest's
        predictions (averaged across walk-forward windows, if used).
      </p>
      <div className="feature-importance-list">
        {entries.map(([name, value]) => (
          <div className="feature-importance-row" key={name}>
            <span className="feature-name">{name}</span>
            <div className="feature-bar-track">
              <div
                className="feature-bar-fill"
                style={{ width: `${(value / maxValue) * 100}%` }}
              />
            </div>
            <span className="feature-value">{(value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureImportancePanel;
