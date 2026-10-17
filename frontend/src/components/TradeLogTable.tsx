import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Trade } from "../types/backtest";

interface TradeLogTableProps {
  tradeLog: Trade[];
}

const TradeLogTable = ({ tradeLog }: TradeLogTableProps) => (
  <details className="mb-6" open>
    <summary className="mb-3 cursor-pointer text-sm font-bold uppercase tracking-wide">Trade Log</summary>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Entry Date</TableHead>
          <TableHead>Exit Date</TableHead>
          <TableHead>Entry Price</TableHead>
          <TableHead>Exit Price</TableHead>
          <TableHead>P/L ($)</TableHead>
          <TableHead>Return (%)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tradeLog.map((trade, index) => (
          <TableRow key={index}>
            <TableCell>
              <Badge variant={trade.type === "LONG" ? "positive" : "negative"}>{trade.type}</Badge>
            </TableCell>
            <TableCell>{trade.entry_date}</TableCell>
            <TableCell>{trade.exit_date}</TableCell>
            <TableCell>${trade.entry_price.toFixed(2)}</TableCell>
            <TableCell>${trade.exit_price.toFixed(2)}</TableCell>
            <TableCell className={cn(trade.profit_loss >= 0 ? "text-positive" : "text-negative")}>
              ${trade.profit_loss.toFixed(2)}
            </TableCell>
            <TableCell className={cn(trade.net_return_pct >= 0 ? "text-positive" : "text-negative")}>
              {trade.net_return_pct.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
        {tradeLog.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No trades executed during this period.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </details>
);

export default TradeLogTable;
