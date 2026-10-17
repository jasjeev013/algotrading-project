import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE } from "../api/config";
import { usePersisted } from "./usePersisted";
import type { LiveAccount, LiveCandle, LiveStatus, LiveTrade } from "../types/live";

// All Live Paper Trading tab state, including the account/status/candle
// polling that only runs while that tab is open.
export function useLiveTrading(mode: string) {
  const [strategy, setStrategy] = useState("SMA");
  const [instrument, setInstrument] = useState("EUR_USD");

  // Live bot settings — persisted to localStorage so they survive reloads.
  // pollSeconds: poll interval in seconds (default 60; min 10).
  const [pollSeconds, setPollSeconds] = usePersisted<number | string>(
    "qs_livePollSeconds",
    60,
  );
  const [granularity, setGranularity] = usePersisted("qs_liveGranularity", "M1");
  const [candleCount, setCandleCount] = usePersisted<number | string>(
    "qs_liveCandleCount",
    100,
  );
  const [tradeUnits, setTradeUnits] = usePersisted<number | string>("qs_liveTradeUnits", 100);
  const [minBalance, setMinBalance] = usePersisted<number | string>("qs_liveMinBalance", 100);
  const [maxPositions, setMaxPositions] = usePersisted<number | string>(
    "qs_liveMaxPositions",
    3,
  );

  const [account, setAccount] = useState<LiveAccount | null>(null);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [candles, setCandles] = useState<LiveCandle[]>([]);
  const [trades, setTrades] = useState<LiveTrade[]>([]);

  // Account + bot status: light polling, only while the Live tab is open.
  useEffect(() => {
    if (mode !== "live") return undefined;
    let cancelled = false;

    const fetchAccount = async () => {
      try {
        const res = await axios.get<{ account: LiveAccount }>(`${API_BASE}/api/live/account`, {
          timeout: 8000,
        });
        if (!cancelled) setAccount(res.data.account);
      } catch {
        if (!cancelled) setAccount(null);
      }
    };
    const fetchStatus = async () => {
      try {
        const res = await axios.get<LiveStatus>(`${API_BASE}/api/live/status`, {
          timeout: 8000,
        });
        if (!cancelled) setStatus(res.data);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };

    fetchAccount();
    fetchStatus();
    const accountPoll = setInterval(fetchAccount, 60000);
    const statusPoll = setInterval(fetchStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(accountPoll);
      clearInterval(statusPoll);
    };
  }, [mode]);

  // Chart candles + trade log: poll while the Live tab is open, tracking
  // whichever instrument/granularity the bot is (or would be) running with.
  useEffect(() => {
    if (mode !== "live") return undefined;
    let cancelled = false;

    const fetchCandles = async () => {
      try {
        const res = await axios.get<{ candles: LiveCandle[] }>(`${API_BASE}/api/live/candles`, {
          params: {
            instrument,
            granularity,
            count: candleCount,
          },
          timeout: 8000,
        });
        if (!cancelled) setCandles(res.data.candles || []);
      } catch {
        if (!cancelled) setCandles([]);
      }
    };
    const fetchTrades = async () => {
      try {
        const res = await axios.get<{ trades: LiveTrade[] }>(`${API_BASE}/api/live/trades`, {
          timeout: 8000,
        });
        if (!cancelled) setTrades(res.data.trades || []);
      } catch {
        if (!cancelled) setTrades([]);
      }
    };

    // Poll at the same cadence as the bot, minimum 5 s for the UI.
    const pollMs = Math.max(5000, parseInt(String(pollSeconds), 10) * 1000);

    fetchCandles();
    fetchTrades();
    const candlePoll = setInterval(fetchCandles, pollMs);
    const tradePoll = setInterval(fetchTrades, pollMs);
    return () => {
      cancelled = true;
      clearInterval(candlePoll);
      clearInterval(tradePoll);
    };
  }, [mode, instrument, granularity, candleCount, pollSeconds]);

  return {
    strategy,
    setStrategy,
    instrument,
    setInstrument,
    pollSeconds,
    setPollSeconds,
    granularity,
    setGranularity,
    candleCount,
    setCandleCount,
    tradeUnits,
    setTradeUnits,
    minBalance,
    setMinBalance,
    maxPositions,
    setMaxPositions,
    account,
    status,
    setStatus,
    candles,
    trades,
  };
}
