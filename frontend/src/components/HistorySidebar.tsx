import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface HistorySidebarProps {
  onRefresh: () => void;
  loading: boolean;
}

const HistorySidebar = ({ onRefresh, loading }: HistorySidebarProps) => {
  return (
    <div className="flex flex-col gap-4">
      <Badge variant="neutral">All runs</Badge>

      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Every backtest and walk-forward run you've saved, in one place. Click a row on the right to reload its
        metrics and trade log without re-running it.
      </p>

      <Button onClick={onRefresh} disabled={loading}>
        {loading ? "Refreshing…" : "Refresh History"}
      </Button>
    </div>
  );
};

export default HistorySidebar;
