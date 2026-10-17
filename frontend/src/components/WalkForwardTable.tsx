import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { WalkForwardInfo } from "../types/walkForward";

interface WalkForwardTableProps {
  walkForward: WalkForwardInfo | undefined;
}

const WalkForwardTable = ({ walkForward }: WalkForwardTableProps) => {
  if (!walkForward || !walkForward.enabled || !walkForward.window_metrics?.length) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="mb-1 text-[15px] font-semibold">Walk-Forward Windows</h2>
      <p className="mb-2.5 text-[12px] text-muted-foreground">
        Each row trains on the window before it, then trades out-of-sample — watch for performance degradation
        across later windows.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Window</TableHead>
            <TableHead>Train Period</TableHead>
            <TableHead>Trade Period</TableHead>
            <TableHead>Return</TableHead>
            <TableHead>Sharpe</TableHead>
            <TableHead>Max Drawdown</TableHead>
            <TableHead>Win Rate</TableHead>
            <TableHead>Trades</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {walkForward.window_metrics.map((w) => (
            <TableRow key={w.window_index}>
              <TableCell>{w.window_index + 1}</TableCell>
              <TableCell>
                {w.train_start} → {w.train_end}
              </TableCell>
              <TableCell>
                {w.trade_start} → {w.trade_end}
              </TableCell>
              <TableCell className={cn((w.metrics?.total_return_pct ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                {w.metrics?.total_return_pct?.toFixed(2)}%
              </TableCell>
              <TableCell>{w.metrics?.sharpe_ratio?.toFixed(2)}</TableCell>
              <TableCell className="text-negative">{w.metrics?.max_drawdown_pct?.toFixed(2)}%</TableCell>
              <TableCell>
                {w.metrics?.win_rate_pct != null ? `${w.metrics.win_rate_pct.toFixed(2)}%` : "N/A"}
              </TableCell>
              <TableCell>{w.metrics?.total_trades}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WalkForwardTable;
