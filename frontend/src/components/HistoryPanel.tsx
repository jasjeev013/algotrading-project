import { useMemo, useState } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HistoryRun } from "../types/history";

const TYPE_LABELS: Record<string, string> = {
  backtest: "Backtest",
  walkforward: "Walk-Forward",
  live: "Live",
};

const TYPE_BADGE_VARIANT: Record<string, "neutral" | "positive" | "negative"> = {
  backtest: "neutral",
  walkforward: "neutral",
  live: "positive",
};

const FILTERS = ["all", "backtest", "walkforward", "live"];

interface HistoryPanelProps {
  runs: HistoryRun[];
  loading: boolean;
  error: string | null;
  onSelectRun: (run: HistoryRun) => void;
}

const HistoryPanel = ({ runs, loading, error, onSelectRun }: HistoryPanelProps) => {
  const [filter, setFilter] = useState("all");

  const filteredRuns = useMemo(() => {
    if (!runs) return [];
    if (filter === "all") return runs;
    return runs.filter((run) => run.run_type === filter);
  }, [runs, filter]);

  if (loading) {
    return (
      <div className="mt-16 flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-accent" />
        <p className="text-[12.5px] text-muted-foreground">Loading history…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 rounded-md border border-negative/30 bg-negative/5 px-3 py-2.5 text-[13px] text-negative">
        {error}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="mb-3.5 flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors",
              filter === f
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : TYPE_LABELS[f]}
          </button>
        ))}
      </div>

      {!filteredRuns || filteredRuns.length === 0 ? (
        <div className="mt-16 rounded-md border border-dashed border-border py-12 text-center text-[13.5px] text-muted-foreground">
          {filter === "live"
            ? "No live trades recorded yet. Start the bot to see activity here."
            : "No saved runs yet. Run a backtest or walk-forward to see it appear here."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Ticker / Instrument</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead>Total Return</TableHead>
              <TableHead>Sharpe</TableHead>
              <TableHead>Run At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRuns.map((run) => {
              const isLive = run.run_type === "live";
              const tickerCell = isLive ? (run.instrument ?? run.ticker ?? "—") : (run.ticker ?? "—");
              const dateCell = isLive
                ? run.start_date
                  ? run.start_date.slice(0, 10)
                  : "—"
                : `${run.start_date ?? "?"} → ${run.end_date ?? "?"}`;
              const returnVal = run.metrics?.total_return_pct;
              const sharpeVal = run.metrics?.sharpe_ratio;

              return (
                <TableRow
                  key={`${run.run_type}-${run.run_id}`}
                  onClick={!isLive ? () => onSelectRun(run) : undefined}
                  className={cn(!isLive && "cursor-pointer")}
                >
                  <TableCell>
                    <Badge variant={TYPE_BADGE_VARIANT[run.run_type] ?? "neutral"}>
                      {isLive ? `Live · ${run.action ?? "tick"}` : TYPE_LABELS[run.run_type] || run.run_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{tickerCell}</TableCell>
                  <TableCell>{run.strategy ?? "—"}</TableCell>
                  <TableCell>{dateCell}</TableCell>
                  <TableCell
                    className={cn(
                      returnVal != null && returnVal >= 0
                        ? "text-positive"
                        : returnVal != null && returnVal < 0
                          ? "text-negative"
                          : "",
                    )}
                  >
                    {returnVal != null ? `${returnVal.toFixed(2)}%` : "—"}
                  </TableCell>
                  <TableCell>{sharpeVal != null ? sharpeVal.toFixed(2) : "—"}</TableCell>
                  <TableCell>{run.created_at ? new Date(run.created_at).toLocaleString() : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default HistoryPanel;
