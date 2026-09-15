const MetricCard = ({ title, value, suffix = "", isColorCoded = false }) => {
  let colorClass = "";
  if (isColorCoded) {
    colorClass = parseFloat(value) >= 0 ? "positive" : "negative";
  }
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <div className={`value ${colorClass}`}>
        {value}
        {suffix}
      </div>
    </div>
  );
};

export default MetricCard;
