import LivePanel from "../components/LivePanel";
import type { useLiveTrading } from "../hooks/useLiveTrading";

interface LivePageProps {
  live: ReturnType<typeof useLiveTrading>;
}

const LivePage = ({ live }: LivePageProps) => (
  <>
    <h1 className="mb-1 text-[17px] font-bold">Live Paper Trading</h1>
    <p className="mb-5 text-[12.5px] text-muted-foreground">Event-driven execution against OANDA paper trading.</p>
    <LivePanel instrument={live.instrument} candles={live.candles} trades={live.trades} status={live.status} />
  </>
);

export default LivePage;
