import { useEffect, useState } from "react";
import axios from "axios";

const vixColorClass = (vix) => {
  if (vix === null || vix === undefined) return "";
  if (vix < 20) return "vix-green";
  if (vix < 30) return "vix-yellow";
  return "vix-red";
};

const RegimeHeader = () => {
  const [regime, setRegime] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRegime = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/regime", {
          timeout: 8000,
        });
        if (!cancelled) {
          setRegime(res.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError("Regime data unavailable");
      }
    };
    fetchRegime();
    const poll = setInterval(fetchRegime, 60000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  if (error) {
    return <div className="regime-header regime-header-error">{error}</div>;
  }
  if (!regime) {
    return (
      <div className="regime-header regime-header-loading">
        Loading market regime…
      </div>
    );
  }

  const changeClass =
    regime.spy_daily_change_pct >= 0 ? "positive" : "negative";

  return (
    <div className="regime-header">
      <div className="regime-item">
        <span className="regime-label">SPY</span>
        <span className="regime-value">${regime.spy_price.toFixed(2)}</span>
        <span className={`regime-change ${changeClass}`}>
          {regime.spy_daily_change_pct >= 0 ? "+" : ""}
          {regime.spy_daily_change_pct.toFixed(2)}%
        </span>
      </div>
      <div className="regime-item">
        <span className="regime-label">VIX</span>
        <span
          className={`regime-value vix-dot ${vixColorClass(regime.vix_level)}`}
        >
          {regime.vix_level.toFixed(2)}
        </span>
      </div>
      <div className="regime-item">
        <span className="regime-label">Regime</span>
        <span className={`regime-badge regime-${regime.regime.toLowerCase()}`}>
          {regime.regime}
        </span>
      </div>
    </div>
  );
};

export default RegimeHeader;
