interface FeatureImportancePanelProps {
  featureImportance: Record<string, number> | null | undefined;
}

const FeatureImportancePanel = ({ featureImportance }: FeatureImportancePanelProps) => {
  if (!featureImportance) return null;

  const entries = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, value]) => value), 0.0001);

  return (
    <div className="mb-6">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Feature Importance</h2>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Relative contribution of each input feature to the Random Forest's predictions (averaged across
        walk-forward windows, if used).
      </p>
      <div className="flex flex-col gap-2 border-2 border-foreground p-3.5">
        {entries.map(([name, value]) => (
          <div key={name} className="grid grid-cols-[110px_1fr_48px] items-center gap-2.5">
            <span className="text-[12px] text-muted-foreground">{name}</span>
            <div className="h-2 bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${(value / maxValue) * 100}%` }} />
            </div>
            <span className="text-right text-[12px]">{(value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureImportancePanel;
