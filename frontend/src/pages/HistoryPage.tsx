import HistoryPanel from "../components/HistoryPanel";
import type { useHistory } from "../hooks/useHistory";

interface HistoryPageProps {
  history: ReturnType<typeof useHistory>;
}

const HistoryPage = ({ history }: HistoryPageProps) => (
  <>
    <h1 className="mb-1 text-[17px] font-bold">History</h1>
    <p className="mb-5 text-[12.5px] text-muted-foreground">
      Every backtest and walk-forward run saved to the database. Click a row to reload its results.
    </p>
    <HistoryPanel
      runs={history.runs}
      loading={history.loading}
      error={history.error}
      onSelectRun={history.handleSelectRun}
    />
  </>
);

export default HistoryPage;
