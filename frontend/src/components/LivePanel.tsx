import LiveChart from "./LiveChart";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LiveCandle, LiveStatus, LiveTrade } from "../types/live";

const ACTION_CLASS: Record<string, string> = {
  buy: "text-positive",
  sell: "text-negative",
  close: "",
  noop: "",
  skipped_risk_guard: "",
  error: "text-negative",
};

interface LivePanelProps {
  instrument: string;
  candles: LiveCandle[];
  trades: LiveTrade[];
  status: LiveStatus | null;
}

const LivePanel = ({ instrument, candles, trades, status }: LivePanelProps) => {
  const running = Boolean(status?.running);
  const openPositions = status?.open_positions || [];

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-md border border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className={cn("h-2 w-2 rounded-full", running ? "bg-positive" : "bg-muted-foreground")} />
          {running ? `Running — ${status?.strategy ?? ""} on ${status?.instrument ?? instrument}` : "Stopped"}
        </div>
        {status?.last_heartbeat && (
          <span className="text-[12px] text-muted-foreground">Last heartbeat: {status.last_heartbeat}</span>
        )}
        {status?.last_error && (
          <span className="text-[12px] text-negative">Last error: {status.last_error}</span>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-1 text-[15px] font-semibold">Live Price Chart</h2>
        <p className="mb-2.5 text-[12px] text-muted-foreground">
          {instrument} · candles refresh on every poll. Green = Buy, Red = Sell, Orange = Close.
        </p>
        {candles && candles.length > 0 ? (
          <LiveChart candles={candles} trades={trades} instrument={instrument} />
        ) : (
          <div className="rounded-md border border-dashed border-border py-12 text-center text-[13.5px] text-muted-foreground">
            Waiting for candle data from OANDA…
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="mb-1 text-[15px] font-semibold">Open Positions</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instrument</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openPositions.map((pos) => {
              const longUnits = parseFloat(String(pos.long?.units || 0));
              const shortUnits = parseFloat(String(pos.short?.units || 0));
              const side = longUnits !== 0 ? "long" : "short";
              const units = longUnits !== 0 ? longUnits : shortUnits;
              return (
                <TableRow key={pos.instrument}>
                  <TableCell>{pos.instrument}</TableCell>
                  <TableCell>
                    <Badge variant={side === "long" ? "positive" : "negative"}>{side}</Badge>
                  </TableCell>
                  <TableCell>{units}</TableCell>
                </TableRow>
              );
            })}
            {openPositions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No open positions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mb-6">
        <h2 className="mb-1 text-[15px] font-semibold">Live Trade Log</h2>
        <p className="mb-2.5 text-[12px] text-muted-foreground">
          Every tick evaluated — actions, no-ops, and risk-guard skips.
        </p>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Prior → Desired</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Units</TableHead>
              <TableHead>P/L</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(trades || []).map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.signal_time}</TableCell>
                <TableCell>{t.instrument}</TableCell>
                <TableCell>{t.strategy}</TableCell>
                <TableCell>
                  {t.prior_position} → {t.desired_position}
                </TableCell>
                <TableCell className={cn(ACTION_CLASS[t.action] || "")}>{t.action}</TableCell>
                <TableCell>{t.units ?? "—"}</TableCell>
                <TableCell className={cn(t.realized_pl != null ? (t.realized_pl >= 0 ? "text-positive" : "text-negative") : "")}>
                  {t.realized_pl != null ? `${t.realized_pl >= 0 ? "+" : ""}${t.realized_pl.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell>{t.error_detail ?? "—"}</TableCell>
              </TableRow>
            ))}
            {(!trades || trades.length === 0) && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No live activity yet — start the bot to see ticks here.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default LivePanel;
