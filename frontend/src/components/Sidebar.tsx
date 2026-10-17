import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";

const NYSE_OPEN_HOUR = 9 * 60 + 30; // 09:30 ET in minutes
const NYSE_CLOSE_HOUR = 16 * 60; // 16:00 ET in minutes
const PREMARKET_OPEN = 4 * 60; // 04:00 ET
const AFTERHOURS_CLOSE = 20 * 60; // 20:00 ET

type MarketStatus = "open" | "pre-market" | "after-hours" | "closed";

function getMarketStatus(now: Date): MarketStatus {
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

const MARKET_LABEL: Record<MarketStatus, string> = {
  open: "Market Open",
  "pre-market": "Pre-Market",
  "after-hours": "After-Hours",
  closed: "Market Closed",
};

const ICONS: Record<string, ReactNode> = {
  backtest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 17l5-5 4 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  walkforward: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 4v3h-3M7 20v-3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 17v-5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { mode: "backtest", label: "Strategy Explorer" },
  { mode: "walkforward", label: "Walk Forward Engine" },
  { mode: "live", label: "Live Paper Trading" },
  { mode: "settings", label: "Advanced Settings" },
  { mode: "history", label: "History" },
  { mode: "about", label: "About" },
];

interface SidebarProps {
  mode: string;
  onSelect: (mode: string) => void;
}

const Sidebar = ({ mode, onSelect }: SidebarProps) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [now, setNow] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(() => getMarketStatus(new Date()));

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
    <div className="flex h-full w-56 flex-shrink-0 flex-col border-r border-border bg-background text-foreground">
      <div className="border-b border-border px-4 py-4">
        <div className="text-[15px] font-semibold">QuantDash</div>
        <div className="text-[12px] text-muted-foreground">Algorithmic Trading</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSelect(item.mode)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] font-medium transition-colors",
              mode === item.mode
                ? "bg-accent/10 text-accent"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="h-4 w-4 flex-shrink-0">{ICONS[item.mode]}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 py-1">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              marketStatus === "open" ? "bg-positive" : marketStatus === "closed" ? "bg-negative" : "bg-muted-foreground",
            )}
          />
          {MARKET_LABEL[marketStatus]}
        </div>
        <div className="flex items-center gap-2 py-1">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connected === null ? "bg-muted-foreground" : connected ? "bg-positive" : "bg-negative",
            )}
          />
          {connected === null ? "Checking backend…" : connected ? "Backend Connected" : "Backend Offline"}
        </div>
        <div className="pt-1 font-mono tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
