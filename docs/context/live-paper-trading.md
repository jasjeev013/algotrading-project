# Live Paper Trading — How It Works

This document explains the Live Paper Trading feature in plain, functional terms: what you see on screen, what happens when you click the buttons, and what QuantDash actually does with OANDA behind the scenes. It intentionally skips implementation minutiae (no line-by-line code walkthrough) — see the codebase itself for that.

> **Practice money only.** This feature is hardwired to OANDA's *practice* (paper trading) environment. No real funds are ever at risk.

---

## 1. What you see on the "Live Paper Trading" tab

When you switch to this tab, the dashboard is split into a sidebar (controls) and a main panel (what's happening).

**Sidebar:**
- **Account Summary** — your OANDA practice account's Balance, Margin Used, and Equity (NAV). Refreshed automatically every 60 seconds.
- **Bot Status** — is the bot Running or Stopped, which strategy it's running, when it last "checked in" (heartbeat), and what it last did.
- **Bot Controls** — pick a strategy and an instrument, then **Start Bot** / **Stop Bot**.
- **Open Positions** (mini list) — shows if the bot currently holds anything.
- **Liquidate All Positions** — a red "kill switch" button, always available, that immediately flattens everything.

**Main panel:**
- A live-updating **candlestick price chart** for the selected instrument, refreshed every 15 seconds, with markers showing where the bot bought, sold, or closed a position.
- An **Open Positions table** (instrument, side, units).
- A **Live Trade Log** — a running list of every decision the bot has made, tick by tick, including the ones where it did nothing.

Extra settings (how often the bot checks the market, candle size, trade size, and risk limits) live under **Advanced Settings → Live Bot Defaults**, rather than on the Live tab itself, so the tab stays uncluttered.

---

## 2. Starting the bot

Clicking **Start Bot** does the following:

1. The frontend sends your chosen strategy, instrument, and the settings from "Live Bot Defaults" (check interval, candle granularity/count, trade size, minimum account balance, max open positions) to the backend.
2. Only two strategies are currently allowed to trade live: **SMA Crossover** and **Bollinger Bands**. (The ML and Stat-Arb strategies are excluded — ML because it needs a proper backtest window to be meaningful, and Stat-Arb because it needs two correlated instruments feeding it at once, which the live loop doesn't yet support.)
3. The backend rejects the request if a bot is already running (you have to stop it first), otherwise it kicks off a background loop and immediately reports back "Running."

**Nothing is sent to OANDA at the moment you click Start.** The account connection is only opened; no trades or lookups happen until the first "tick" of the loop, which follows the schedule you configured (15 minutes by default).

---

## 3. What the bot does on every tick

Once running, the bot wakes up on a fixed interval (default every 15 minutes) and repeats this cycle:

1. **Pulls recent price candles** for the instrument from OANDA and drops the most recent, still-forming candle (it only acts on fully closed bars).
2. **Runs the selected strategy** against that candle data to get a signal: should we be long, short, or flat right now?
3. **Checks what OANDA says we actually hold** for that instrument (long, short, or nothing).
4. **Compares desired vs. actual position** and decides an action:
   - Already matching → do nothing (a "no-op").
   - Should be flat but we're holding something → close the position.
   - Should open or flip a position → first run a **risk check**:
     - Is the account balance above your configured minimum?
     - Are we already at the max number of open positions you allowed?
     - If either check fails, the bot skips the trade this round and logs why ("skipped — risk guard").
     - If both pass, and we're flipping from long to short (or vice versa), it closes the old position first, then opens the new one with a market order.
5. **Logs the outcome** — every tick, successful or not, action or no-op — to the Live Trade Log so you have a full audit trail of what the bot was thinking, not just what it traded.

The bot does **not** hold a live streaming price feed open — it polls OANDA for candles on each tick rather than subscribing to a continuous price stream.

---

## 4. Stopping the bot

Clicking **Stop Bot**:

- Signals the background loop to stop and waits (up to 60 seconds) for any in-progress tick to finish cleanly.
- Flips the status to "Stopped."

**Important: Stop Bot does *not* close any open positions.** It only turns off future decision-making. If the bot bought EUR/USD and you hit Stop, you are still holding that position on OANDA afterward. This is intentional — stopping the bot just pauses it; it doesn't assume you want to exit the market.

If you restart the bot later, it will pick back up from whatever position OANDA shows you actually hold and reconcile from there.

---

## 5. Liquidating positions (the kill switch)

The **Liquidate All Positions** button is the "get me flat right now" control, separate from Stop Bot:

1. Asks for confirmation (since it immediately affects real open positions, even if only practice-money ones).
2. If the bot happens to be running, it stops it first — so it can't immediately re-open something you just closed.
3. Closes every open position across all instruments on the account, one by one, and reports success/failure per instrument (so a failure on one instrument doesn't block closing the others).

Use this any time you want a guaranteed clean slate, regardless of whether the bot is currently running.

---

## 6. What gets sent to OANDA, and when

| When | What QuantDash asks OANDA for |
|---|---|
| Account Summary card loads / refreshes (every 60s) | Current account balance, margin used, and equity |
| Chart / status refresh (every 15s) | Recent price candles for the chart; current open positions |
| Each bot tick (every `interval_minutes`, default 15 min) | Recent price candles → current open positions → (only if opening/flipping a position) account balance check → placing or closing a market order |
| Stop Bot | Nothing — purely local, no OANDA calls |
| Kill Switch | Current open positions, then a close request for each one that's actually open |

All trading activity goes through OANDA's practice-account REST endpoints for candles, account summary, open positions, placing market orders, and closing positions — there is no persistent streaming connection; everything is polled on the schedules above.

---

## 7. Known limitations

- **State is in-memory only.** If the backend server restarts while the bot is running, the bot does not automatically resume — you need to click Start Bot again.
- **No unrealized P&L shown yet.** The Open Positions table shows instrument, side, and units, but not profit/loss on the open position.
- **Stop ≠ flatten.** As noted above, stopping the bot leaves any open position untouched — use the kill switch if you want to exit the market.
