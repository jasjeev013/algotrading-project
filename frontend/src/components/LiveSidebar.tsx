import { useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { extractErrorDetail } from "../api/errors";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { KillSwitchResult, LiveAccount, LiveBotStartPayload, LiveStatus } from "../types/live";

const API_BASE = "http://localhost:8000";
const LIVE_STRATEGIES = ["SMA", "Bollinger"];

interface LiveSidebarProps {
  strategy: string;
  setStrategy: (strategy: string) => void;
  instrument: string;
  setInstrument: (instrument: string) => void;
  account: LiveAccount | null;
  status: LiveStatus | null;
  onStatusChange: (updater: (prev: LiveStatus | null) => LiveStatus | null) => void;
  startPayload: Omit<LiveBotStartPayload, "strategy" | "instrument" | "strategy_params">;
}

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between border-t border-border py-1.5 text-[12.5px] first:border-t-0">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const LiveSidebar = ({
  strategy,
  setStrategy,
  instrument,
  setInstrument,
  account,
  status,
  onStatusChange,
  startPayload,
}: LiveSidebarProps) => {
  const [pending, setPending] = useState(false);
  const [killResults, setKillResults] = useState<KillSwitchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await axios.post<LiveStatus>(`${API_BASE}/api/live/start`, {
        strategy,
        instrument,
        ...startPayload,
      });
      onStatusChange?.((prev) => ({ ...(prev ?? {}), ...res.data }));
    } catch (err) {
      setError(extractErrorDetail(err, "Failed to start the bot."));
    } finally {
      setPending(false);
    }
  };

  const handleStop = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await axios.post<LiveStatus>(`${API_BASE}/api/live/stop`);
      onStatusChange?.((prev) => ({ ...(prev ?? {}), ...res.data }));
    } catch (err) {
      setError(extractErrorDetail(err, "Failed to stop the bot."));
    } finally {
      setPending(false);
    }
  };

  const handleStopAndLiquidate = async () => {
    if (!window.confirm("Stop the bot AND liquidate all open positions? This cannot be undone.")) return;
    setPending(true);
    setError(null);
    try {
      const res = await axios.post<{ results: KillSwitchResult[] }>(`${API_BASE}/api/live/kill_switch`);
      setKillResults(res.data.results);
      onStatusChange?.((prev) => ({ ...(prev ?? {}), running: false }));
    } catch (err) {
      setError(extractErrorDetail(err, "Stop & Liquidate failed."));
    } finally {
      setPending(false);
    }
  };

  const handleKillSwitch = async () => {
    if (!window.confirm("Liquidate all open positions? This cannot be undone.")) return;
    setPending(true);
    setError(null);
    try {
      const res = await axios.post<{ results: KillSwitchResult[] }>(`${API_BASE}/api/live/kill_switch`);
      setKillResults(res.data.results);
      onStatusChange?.((prev) => ({ ...(prev ?? {}), running: false }));
    } catch (err) {
      setError(extractErrorDetail(err, "Kill switch failed."));
    } finally {
      setPending(false);
    }
  };

  const running = Boolean(status?.running);
  const openPositions = status?.open_positions || [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label="Balance" value={account?.balance ?? "—"} />
          <Row label="Margin Used" value={account?.marginUsed ?? "—"} />
          <Row label="Equity (NAV)" value={account?.NAV ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bot Status</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Row label="State" value={running ? "Running" : "Stopped"} />
          <Row label="Strategy" value={status?.strategy ?? "—"} />
          <Row label="Last Heartbeat" value={status?.last_heartbeat ?? "—"} />
          <Row label="Last Action" value={status?.last_action ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bot Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-3">
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">Strategy</label>
            <Select value={strategy} onChange={(e) => setStrategy(e.target.value)} disabled={running}>
              {LIVE_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-[12.5px] font-medium text-muted-foreground">Instrument</label>
            <Input value={instrument} onChange={(e) => setInstrument(e.target.value)} disabled={running} />
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Poll interval, candle feed, trade size, and risk guards come from Advanced Settings → Live Bot Defaults.
          </p>

          {!running ? (
            <Button onClick={handleStart} disabled={pending}>
              {pending ? "Starting…" : "Start Bot"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleStop} disabled={pending}>
                {pending ? "Stopping…" : "Stop Bot"}
              </Button>
              <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                Stop Bot pauses the loop — open positions stay open. Use Stop &amp; Liquidate below to also close
                them.
              </p>
              <Button variant="destructive" onClick={handleStopAndLiquidate} disabled={pending}>
                {pending ? "Stopping…" : "Stop & Liquidate All"}
              </Button>
            </div>
          )}

          {error && <p className="text-[12px] text-negative">{error}</p>}
        </CardContent>
      </Card>

      {openPositions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Positions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {openPositions.map((pos) => (
              <Row
                key={pos.instrument}
                label={pos.instrument}
                value={
                  parseFloat(String(pos.long?.units || 0)) !== 0
                    ? `long ${pos.long?.units}`
                    : `short ${pos.short?.units}`
                }
              />
            ))}
          </CardContent>
        </Card>
      )}

      {!running && (
        <Button variant="destructive" onClick={handleKillSwitch} disabled={pending}>
          Liquidate All Positions
        </Button>
      )}

      {killResults && (
        <Card>
          <CardHeader>
            <CardTitle>Liquidation Result</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {killResults.map((r, i) => (
              <Row
                key={i}
                label={r.instrument ?? "—"}
                value={
                  r.status === "closed"
                    ? r.realized_pl != null
                      ? `closed  P/L: ${r.realized_pl >= 0 ? "+" : ""}${r.realized_pl.toFixed(2)}`
                      : "closed"
                    : `error — ${r.detail}`
                }
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveSidebar;
