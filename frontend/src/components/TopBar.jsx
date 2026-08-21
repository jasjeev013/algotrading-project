import { useEffect, useState } from "react";
import axios from "axios";

const NYSE_OPEN_HOUR = 9 * 60 + 30;   // 09:30 ET in minutes
const NYSE_CLOSE_HOUR = 16 * 60;       // 16:00 ET in minutes
const PREMARKET_OPEN = 4 * 60;         // 04:00 ET
const AFTERHOURS_CLOSE = 20 * 60;      // 20:00 ET

function getMarketStatus(now) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const tod = hour * 60 + minute;
  if (tod >= NYSE_OPEN_HOUR && tod < NYSE_CLOSE_HOUR) return "open";
  if (tod >= PREMARKET_OPEN && tod < NYSE_OPEN_HOUR) return "pre-market";
  if (tod >= NYSE_CLOSE_HOUR && tod < AFTERHOURS_CLOSE) return "after-hours";
  return "closed";
}

const MARKET_LABEL = {
  open: "Market Open",
  "pre-market": "Pre-Market",
  "after-hours": "After-Hours",
  closed: "Market Closed",
};

const MARKET_DOT_CLASS = {
  open: "online",
  "pre-market": "warning",
  "after-hours": "warning",
  closed: "offline",
};

const TopBar = ({ mode }) => {
  const [connected, setConnected] = useState(null);
  const [now, setNow] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState(() => getMarketStatus(new Date()));

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        await axios.get("http://localhost:8000/", { timeout: 4000 });
        if (!cancelled) setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const clock = setInterval(() => {
      const n = new Date();
      setNow(n);
      setMarketStatus(getMarketStatus(n));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <div className="topbar-logo">Q</div>
        <div className="topbar-titles">
          <h1>QuantDash</h1>
          <span>
            {mode === "live"
              ? "Live Execution Console"
              : mode === "walkforward"
                ? "Walk-Forward Validation Engine"
                : mode === "settings"
                  ? "Advanced Settings"
                  : mode === "history"
                    ? "Activity History"
                    : mode === "about"
                      ? "About QuantDash"
                      : "Strategy Explorer"}
          </span>
        </div>
      </div>

      <div className="topbar-status">
        <div className="status-pill">
          <span className={`status-dot ${MARKET_DOT_CLASS[marketStatus]}`} />
          {MARKET_LABEL[marketStatus]}
        </div>
        <div className="status-pill">
          <span
            className={`status-dot ${connected === null ? "" : connected ? "online" : "offline"}`}
          />
          {connected === null
            ? "Checking backend…"
            : connected
              ? "Backend Connected"
              : "Backend Offline"}
        </div>
        <div className="topbar-clock">
          {now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
