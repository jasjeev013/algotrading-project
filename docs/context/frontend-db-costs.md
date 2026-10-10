# QuantDash: Frontend State Management, Database Schema & Cost Calculations

---

## Answer 1: Frontend State Management & Persistence

### Technology Stack
- **NO** react-persist
- **NO** Redux
- **NO** Zustand
- **YES** Custom `usePersisted()` hook with **localStorage only**

### Custom Hook Implementation (App.jsx:22-40)

```javascript
function lsGet(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function usePersisted(key, defaultValue) {
  const [value, setValue] = useState(() => lsGet(key, defaultValue));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}
```

### What Gets Persisted to localStorage (Survives Page Reload)

| State | localStorage Key | Default |
|-------|------------------|---------|
| Commission % | `qs_commissionPct` | 0.1% |
| Spread % | `qs_spreadPct` | 0.02% |
| Slippage % | `qs_slippagePct` | 0.01% |
| Financing % | `qs_financingPct` | 0% |
| Live Poll Interval (seconds) | `qs_livePollSeconds` | 60s |
| Live Granularity | `qs_liveGranularity` | M1 |
| Live Candle Count | `qs_liveCandleCount` | 100 |
| Live Trade Units | `qs_liveTradeUnits` | 100 |
| Live Min Balance | `qs_liveMinBalance` | 100 |
| Live Max Positions | `qs_liveMaxPositions` | 3 |

**Why these?** Because they're user preferences that should persist across sessions.

### What Is NOT Persisted (Lost on Page Reload)

- `results` — backtest/walk-forward output (stored in React state only)
- `ticker, startDate, endDate` — temporary UI form state
- `strategy, capital, dataInterval` — temporary UI form state
- `strategyParams` — temporary UI form state
- `liveAccount, liveStatus, liveCandles, liveTrades` — live polling data (fetched fresh each session)

**Why not?** These are either temporary form inputs or live data that should be refetched on session start.

### What Gets Loaded from Database

When user clicks "History" tab:
1. Frontend calls `GET /api/history`
2. Backend returns all past backtest/walk-forward runs (sorted most recent first)
3. When user clicks a past run, sidebar is repopulated with its settings (from DB)
4. **BUT:** `equity_curve` and `price_data` are NOT stored in DB
   - Only metrics and trade_log are persisted
   - Charts are regenerated if user reloads a historical run

---

## Answer 2: Database Schema & Entity Relationships

### Table 1: `backtest_runs` (One row per backtest execution)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Primary key |
| `ticker` | String | Stock symbol (e.g., "AAPL") |
| `strategy` | String | Strategy name (SMA, Bollinger, ML, StatArb) |
| `interval` | String | Timeframe (1d, 1h, 15m, etc.) |
| `start_date` | String | YYYY-MM-DD format |
| `end_date` | String | YYYY-MM-DD format |
| `initial_capital` | Float | Starting equity (e.g., 10000.0) |
| `commission_pct` | Float | 0.001 = 0.1% per trade |
| `spread_pct` | Float | 0.0002 = 0.02% bid-ask width |
| `slippage_pct` | Float | 0.0001 = 0.01% adverse move |
| `overnight_financing_pct` | Float | Daily fee if holding overnight |
| `engine` | String | "iterative" or "vectorized" |
| `strategy_params` | JSON | {"short_window": 20, "long_window": 50, ...} |
| `metrics` | JSON | {total_return_pct, cagr_pct, max_drawdown_pct, sharpe_ratio, win_rate_pct, total_trades} |
| `created_at` | DateTime | Auto-timestamp (UTC) |

**Relationship:** Has MANY `trade_records` (1:N, cascade delete)

---

### Table 2: `trade_records` (One row per executed trade)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Primary key |
| `backtest_run_id` | Integer (FK) | Foreign key → backtest_runs.id |
| `type` | String | "LONG" or "SHORT" |
| `entry_date` | String | Trade entry date |
| `exit_date` | String | Trade exit date |
| `entry_price` | Float | Entry price (after fill costs) |
| `exit_price` | Float | Exit price (after fill costs) |
| `profit_loss` | Float | Dollars made/lost |
| `net_return_pct` | Float | % return including all costs |
| `equity_after` | Float | Portfolio value after trade closed |

**Relationship:** Belongs to ONE `backtest_runs` (N:1)

**Why separate table?** Enables querying individual trades, computing trade statistics, audit trail of execution.

---

### Table 3: `walk_forward_runs` (One row per walk-forward backtest)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Primary key |
| `ticker` | String | Stock symbol |
| `strategy` | String | Strategy name |
| `interval` | String | Timeframe |
| `start_date` | String | YYYY-MM-DD |
| `end_date` | String | YYYY-MM-DD |
| `initial_capital` | Float | Starting equity |
| `commission_pct` | Float | Transaction cost |
| `spread_pct` | Float | Bid-ask spread |
| `slippage_pct` | Float | Slippage cost |
| `overnight_financing_pct` | Float | Daily financing cost |
| `train_months` | Integer | Training window (e.g., 12) |
| `trade_months` | Integer | Trading window (e.g., 3) |
| `step_months` | Integer | Rolling step size |
| `strategy_params` | JSON | Parameters used for this run |
| `metrics` | JSON | Overall performance metrics |
| `window_metrics` | JSON | Per-window results [{...}, {...}, ...] |
| `trade_log` | JSON | All trades as array [{type, entry_date, exit_date, ...}, ...] |
| `created_at` | DateTime | Auto-timestamp (UTC) |

**Relationships:** NONE (standalone, independent historical record)

**Why JSON for trades?** Walk-forward runs produce many windows of trades. Since we never query individual trades from WFO runs, storing them as a JSON array avoids unnecessary table joins.

---

### Table 4: `live_trade_records` (Audit trail for live trading)

| Column | Type | Description |
|--------|------|-------------|
| `id` | Integer (PK) | Primary key |
| `instrument` | String | Currency pair (EUR_USD, AAPL, etc.) |
| `strategy` | String | Strategy being executed |
| `action` | String | buy, sell, close, noop, error, skipped_risk |
| `desired_position` | String | long, short, or flat |
| `prior_position` | String | long, short, or flat |
| `units` | Integer | Trade size (if executed) |
| `signal_time` | String | When signal was generated (ISO timestamp) |
| `oanda_response` | JSON | Raw OANDA API response (if executed) |
| `error_detail` | String | Error message (if failed) |
| `account_balance_after` | Float | Account balance after execution |
| `realized_pl` | Float | Profit/loss if position closed |
| `created_at` | DateTime | Auto-timestamp (UTC) |

**Relationships:** NONE (standalone audit trail)

**Why include noops?** Full transparency on every bot decision, including:
- Trades that executed
- Noops (signal said hold, already in that position)
- Risk guard skips (wanted to trade but risk rules blocked it)
- Errors (attempted trade but OANDA rejected it)

---

### Entity Relationship Diagram

```
BacktestRun (1)
    │
    │ 1:N relationship
    │ cascade delete
    ↓
TradeRecord (N)

When a BacktestRun is deleted, all its TradeRecords are automatically deleted.
```

**Other tables:**
- `WalkForwardRun` — standalone (no FKs)
- `LiveTradeRecord` — standalone (no FKs)

---

## Answer 3: Where Costs Are Computed in Backend

### Cost Computation Flow

```
React Frontend (App.jsx)
    ↓ POST /api/backtest
Backend main.py:150
    ├─ Receives: commission_pct, spread_pct, slippage_pct, overnight_financing_pct
    ↓
ENGINE_REGISTRY[request.engine]()
    ├─ run_iterative_backtest (backtester.py:6-109)
    │   └─ Row-by-row Python loop (slower, simpler)
    │
    └─ run_vectorized_backtest (vectorized_backtester.py:7-134)
        └─ Pandas/NumPy operations (10-50x faster, identical output)
    ↓
apply_fill_costs() (cost_model.py:5-12)
    ├─ Applies spread & slippage to fill price
    ↓
return equity_curve, trade_log
```

---

### Step 1: Frontend Sends Costs (App.jsx:268-271)

```javascript
const payload = {
  commission_pct: parseFloat(commissionPct) / 100,      // 0.1 → 0.001
  spread_pct: parseFloat(spreadPct) / 100,              // 0.02 → 0.0002
  slippage_pct: parseFloat(slippagePct) / 100,          // 0.01 → 0.0001
  overnight_financing_pct: parseFloat(financingPct) / 100, // 0 → 0.0
  ...
}
```

User enters: `0.1%` → Sent to backend as: `0.001`

---

### Step 2: Backend Routes to Engine (main.py:150-200)

```python
@app.post("/api/backtest")
def run_backtest(request: BacktestRequest, db: Session = Depends(get_db)):
    # ... fetch data, generate signals ...
    
    run_engine = ENGINE_REGISTRY.get(request.engine)
    # request.engine = "iterative" (default) or "vectorized"
    
    equity_curve, trade_log = run_engine(
        df=signal_df,
        initial_capital=request.initial_capital,
        commission_pct=request.commission_pct,      # ← passed here
        spread_pct=request.spread_pct,
        slippage_pct=request.slippage_pct,
        overnight_financing_pct=request.overnight_financing_pct,
    )
```

**Which engine?**
- `"iterative"` → `run_iterative_backtest()` — row-by-row Python loop
- `"vectorized"` → `run_vectorized_backtest()` — pandas/numpy vectorized

---

### Step 3: Spread & Slippage Adjustment (cost_model.py:5-12)

```python
def apply_fill_costs(price: float, side: str, spread_pct: float, slippage_pct: float) -> float:
    """
    Adjusts a raw close price for bid/ask spread and slippage.
    side: "buy" fills above the raw price, "sell" fills below it.
    """
    if side == "buy":
        return price * (1 + spread_pct / 2 + slippage_pct)
    return price * (1 - spread_pct / 2 - slippage_pct)
```

**Example:**
- Raw close: $100.00
- spread_pct = 0.0002 (0.02%)
- slippage_pct = 0.0001 (0.01%)

| Action | Calculation | Result |
|--------|-------------|--------|
| **Buy** | $100 × (1 + 0.0001 + 0.0001) | $100.02 (WORSE — pay more) |
| **Sell** | $100 × (1 - 0.0001 - 0.0001) | $99.98 (WORSE — get less) |

**Why split spread in half?**
- `spread_pct` = TOTAL bid-ask width
- Half-spread on each side: buyer gets 0.01% worse, seller gets 0.01% worse
- `slippage_pct` = ADDITIONAL adverse move (full amount on top of spread)

---

### Step 4A: Iterative Engine (backtester.py:6-109)

For each bar in the price DataFrame:

#### 1. Apply Overnight Financing (if holding position)
```python
if current_pos != 0 and last_charged_date is not None:
    elapsed_days = (row_date - last_charged_date).days
    if elapsed_days > 0:
        equity -= equity * overnight_financing_pct * elapsed_days
```

Charged **ONCE per calendar day** held (not per bar).

#### 2. Check if Position Changes (signal triggered)

**a) Close Old Position:**
```python
if current_pos != 0:
    exit_side = "sell" if current_pos == 1 else "buy"
    exit_price = apply_fill_costs(price, exit_side, spread_pct, slippage_pct)
```

**b) Calculate Gross Return:**
```python
if current_pos == 1:  # was long
    gross_return = (exit_price - entry_price) / entry_price
elif current_pos == -1:  # was short
    gross_return = (entry_price - exit_price) / entry_price
```

**c) Apply Commission (entry + exit):**
```python
net_return = gross_return - (2 * commission_pct)
# Example: 0.001 entry + 0.001 exit = 0.002 total per round trip
```

**d) Update Equity:**
```python
trade_profit = equity * net_return
equity += trade_profit
```

**e) Open New Position:**
```python
if target_pos != 0:
    entry_side = "buy" if target_pos == 1 else "sell"
    entry_price = apply_fill_costs(price, entry_side, spread_pct, slippage_pct)
    entry_date = date
```

#### 3. Track Equity Curve (mark-to-market)
```python
if current_pos == 1:
    unrealized = (price - entry_price) / entry_price
elif current_pos == -1:
    unrealized = (entry_price - price) / entry_price
else:
    unrealized = 0

current_equity = equity * (1 + unrealized)
equity_curve.append({"time": date, "equity": round(current_equity, 2)})
```

---

### Step 4B: Vectorized Engine (vectorized_backtester.py:7-134)

Same logic, **10-50x faster** using pandas/numpy operations:

- Identifies position segments via `cumsum()` grouping
- Broadcasts `apply_fill_costs_vectorized()` over entire Series
- Calculates `gross_return`, `net_return`, financing all vectorized
- Uses `cumprod()` for equity compounding

**Verified identical output** bar-by-bar and trade-by-trade by `test_backtester_parity.py`.

---

### Cost Deduction Sequence (Complete Round-Trip Trade)

```
Raw Close Price:           $100.00

├─ ENTRY EXECUTION:
│   Spread (half):         -$0.01
│   Slippage:              -$0.01
│   Entry Price:           $99.98
│
├─ [Position held for N calendar days]
│   Overnight Fee:         -equity × 0% × N days
│
└─ EXIT EXECUTION:
    Spread (half):        +$0.01  (beneficial on sell side!)
    Slippage:             -$0.01
    Exit Price:           $100.00
    
    ════════════════════════════════════════════════════════
    Gross Return:         (100 - 99.98) / 99.98 = 0.0200%
    Commission (entry):   -0.1%
    Commission (exit):    -0.1%
    ════════════════════════════════════════════════════════
    Net Return:           0.0200% - 0.2% = -0.18%
    
    Impact on $10,000:    $10,000 × -0.18% = -$18 LOSS per round trip!
```

---

### Cost Application Summary

| Cost Type | File | How Applied | Impact |
|-----------|------|-------------|--------|
| **Commission** | backtester.py:65<br>vectorized_backtest.py:89 | Flat % per trade (2× per round trip)<br>`net_return -= 2 * commission_pct` | Example: 0.001 each on entry & exit = 0.2% total per RT |
| **Bid/Ask Spread** | cost_model.py:11-12<br>`apply_fill_costs()` | Half applied each side<br>Buy: `price × (1 + spread/2)`<br>Sell: `price × (1 - spread/2)` | Example: 0.02% width = 0.01% adverse on each side |
| **Slippage** | cost_model.py:11-12<br>`apply_fill_costs()` | Full adverse move to price<br>Buy: `price × (1 + slippage)`<br>Sell: `price × (1 - slippage)` | Example: 0.01% additional adverse move |
| **Overnight Financing** | backtester.py:42-45<br>vectorized_backtest.py:92-93 | Daily % charged per calendar day held<br>`equity *= (1 - financing × days)` | Example: 0.1% daily = significant cost if holding weeks |

---

## Summary

1. **Frontend State:** Custom `usePersisted()` hook + localStorage for cost settings & live bot config. Backtest results NOT persisted.

2. **Database:** 4 tables with one-to-many relationship (BacktestRun → TradeRecord), plus standalone tables for walk-forward and live trades.

3. **Costs:** Applied in backtester engines (iterative or vectorized) using `apply_fill_costs()` function. Commission deducted per trade, spread/slippage applied to fill price, financing charged daily per calendar day held.
