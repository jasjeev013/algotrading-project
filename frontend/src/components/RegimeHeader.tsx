import { useEffect, useState } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Regime {
  regime: string;
  spy_price: number;
  spy_daily_change_pct: number;
  spy_trend: string;
  vix_level: number;
  as_of: string;
}

const vixClass = (vix: number | null | undefined) => {
  if (vix === null || vix === undefined) return "text-foreground";
  if (vix < 20) return "text-positive";
  if (vix < 30) return "text-muted-foreground";
  return "text-negative";
};

const regimeVariant = (regime: string): "positive" | "negative" | "neutral" => {
  const r = regime.toLowerCase();
  if (r === "trending") return "positive";
  if (r === "volatile") return "negative";
  return "neutral";
};

const RegimeHeader = () => {
  const [regime, setRegime] = useState<Regime | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRegime = async () => {
      try {
        const res = await axios.get<Regime>("http://localhost:8000/api/regime", { timeout: 8000 });
        if (!cancelled) {
          setRegime(res.data);
          setError(null);
        }
      } catch {
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
    return <div className="mb-4 text-[12.5px] text-muted-foreground">{error}</div>;
  }
  if (!regime) {
    return <div className="mb-4 text-[12.5px] text-muted-foreground">Loading market regime…</div>;
  }

  const changeClass = regime.spy_daily_change_pct >= 0 ? "text-positive" : "text-negative";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-6 border-b border-border pb-3 text-[12.5px]">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">SPY</span>
        <span className="font-bold tabular-nums">${regime.spy_price.toFixed(2)}</span>
        <span className={cn("tabular-nums", changeClass)}>
          {regime.spy_daily_change_pct >= 0 ? "+" : ""}
          {regime.spy_daily_change_pct.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">VIX</span>
        <span className={cn("font-bold tabular-nums", vixClass(regime.vix_level))}>
          {regime.vix_level.toFixed(2)}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Regime</span>
        <Badge variant={regimeVariant(regime.regime)}>{regime.regime}</Badge>
      </div>
    </div>
  );
};

export default RegimeHeader;
