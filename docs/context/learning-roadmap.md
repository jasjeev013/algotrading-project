# QuantDash — Learning Roadmap & Future Direction

> Written: 2026-08-14. A guide for growing from basic backtesting knowledge toward a system you'd trust with real capital.

---

## Where You Actually Stand

You've built more than most beginners — a full pipeline from data → signal → backtest → execution is genuinely non-trivial. But the strategies are weak. Here's why:

- **SMA Crossover** — a 1970s strategy. Every retail trader knows it. When everyone uses the same signal, the edge disappears.
- **Bollinger Bands** — better, but still a single-indicator mean reversion signal with no context about *why* price deviated or whether it will revert.
- **ML RandomForest on raw returns** — the features (3d/5d momentum, 5d volatility) are too simple. The model is essentially learning noise.

None of these have a thesis behind them. A strategy needs a *reason* price should move in a direction — a market inefficiency you're exploiting.

---

## The Mental Model You Need First

Before better code, you need better thinking. Algo trading has a hierarchy:

```
1. Market Understanding      ← what drives prices
2. Edge Hypothesis           ← why should THIS strategy make money
3. Signal Design             ← how to detect the edge mathematically
4. Risk Management           ← how to survive being wrong
5. Execution                 ← how to enter/exit without losing edge to friction
6. Evaluation                ← was it actually the edge, or luck?
```

Currently operating at level 3–5. Levels 1–2 are missing, which is why the strategies feel hollow.

---

## Learning Path — In Order

### Stage 1: Understand Market Structure (2–3 weeks)

Understand *what* you're trading before writing a single line of signal code.

**Topics to study:**
- How a limit order book works (bid, ask, spread, market makers)
- Why prices trend sometimes and mean-revert other times
- What "volatility clustering" means (calm periods followed by volatile ones)
- The difference between Forex (24h, no central exchange), Equities (auction market, earnings), and Futures

**Practical exercise:** Open OANDA's interface and just *watch* EUR/USD tick for 30 minutes. Notice how spread widens at low-volume times, how price consolidates before news.

**Resources:**
- *Advances in Financial Machine Learning* by Marcos Lopez de Prado — chapters 1–5 first
- Investopedia's "How Forex Works" series for Forex basics
- YouTube: "How the Stock Market Works" by Patrick Boyle (institutional perspective, no hype)

---

### Stage 2: Learn What Makes a Strategy Have Edge (3–4 weeks)

An "edge" means: on average, across many trades, you make more than you lose *after costs*. Most retail strategies don't have edge — they just haven't been tested on enough data to see they don't.

**Three actual sources of edge:**

**1. Momentum (trend following)**
Price that has moved in one direction tends to continue short-term. Works better on longer timeframes (daily/weekly). Fails in choppy/ranging markets and drawdowns can be brutal.

**2. Mean Reversion**
Price that deviates too far from "fair value" tends to snap back. Works in low-volatility regimes, fails catastrophically when there's a real trend (you keep buying a falling asset thinking it'll revert).

**3. Statistical Arbitrage (pairs/spread trading)**
Two correlated instruments diverge temporarily. Trade the spread assuming it reverts. Most sophisticated of the three and the most durable as an edge.

**Key insight:** No strategy works in all market conditions. The best systems know *when* to trade, not just *how* to trade.

**Exercise:** For each of your current 3 strategies, write one sentence answering: "This strategy makes money because ___." If you can't answer it, the strategy has no thesis.

---

### Stage 3: Upgrade Your Strategy Toolkit (ongoing, start now)

A progression from beginner to intermediate strategies, each with a thesis:

#### Immediate Upgrades (implement in project now)

**RSI + Trend Filter**
- Thesis: RSI catches overbought/oversold, but only trade mean-reversion when the broader trend supports it
- Signal: RSI < 30 AND price above 200-day SMA → buy. RSI > 70 AND price below 200-day SMA → sell
- Better than raw Bollinger because it has a trend filter

**ATR-Based Breakout**
- Thesis: After a period of low volatility (tight range), price often breaks out strongly
- Signal: If today's range > 1.5× average ATR over 14 days, and price closes in top 25% of range → long
- Why it works: volatility contraction before expansion is a documented pattern

**Volume-Confirmed Momentum**
- Thesis: Price moves on high volume are more likely to sustain than moves on low volume (institutions are behind them)
- Signal: Price closes above N-day high AND volume > 1.5× 20-day average volume → long
- Without volume confirmation, breakouts fail 60–70% of the time

#### Intermediate (learn over 2–3 months)

**Regime-Adaptive Strategy**
- Instead of one strategy, use a classifier to determine current regime (trending/ranging/volatile) and switch strategy accordingly
- Trending → momentum signals. Ranging → mean reversion. Volatile → stay flat or reduce size
- This is what most professional CTAs do

**MACD Divergence**
- Don't use MACD crossovers (too slow, too lagged). Use *divergence*: price makes new high but MACD doesn't → bearish divergence, anticipate reversal
- A qualitative signal that can be quantified

**Z-Score Pairs Trading**
- EUR/USD and GBP/USD are correlated. When z-score of the spread > 2, short the outperformer, long the underperformer
- Has real institutional use. More durable than any single-asset strategy
- Already in project plan — worth prioritising

---

### Stage 4: Learn Proper Statistical Evaluation (critical, often skipped)

This is where most beginners go wrong. An 80% win rate backtest probably doesn't mean what you think it means.

**Key concepts:**

**Overfitting** — if you test 100 parameter combinations and pick the best one, you've curve-fit to historical noise. Fix: test on out-of-sample data you never touched during parameter search.

**Minimum trade count** — a strategy with 20 trades doesn't have enough data. You need 200+ trades minimum to have statistical confidence.

**Sharpe Ratio interpretation:**
- Sharpe > 1.0 is decent
- Sharpe > 1.5 is good
- Sharpe > 2.0 is exceptional (and suspicious — check for lookahead bias)
- Most real strategies live between 0.5–1.2

**Monte Carlo simulation** — take your actual trade returns, shuffle them 10,000 times, see the distribution of outcomes. This tells you if your backtest result was skill or one lucky sequence of trades.

**The right questions to ask about any backtest:**
1. How many trades? (need 200+)
2. What's the maximum drawdown? (would I actually hold through this?)
3. Does it work in both bull and bear markets?
4. What happens if I shift the start date by 30 days? (robust strategies shouldn't collapse)
5. What's the breakeven commission rate? (if strategy breaks even at 0.05% commission and real commission is 0.1%, it loses in practice)

---

### Stage 5: Risk Management (often ignored, most important)

You can have a 60% win rate strategy and still blow up your account with bad sizing.

**Kelly Criterion** — mathematically optimal position sizing based on win rate and average win/loss ratio. In practice, use half-Kelly.

```
Kelly % = Win Rate - (Loss Rate / Win:Loss Ratio)
```

**ATR-Based Position Sizing** — size your position so that a 2× ATR move against you equals 1–2% of your account. Volatile instruments get smaller positions automatically.

**Maximum Drawdown rules (hard-wire these into the bot):**
- Drawdown exceeds 15% → reduce position size by 50%
- Drawdown exceeds 25% → stop trading, investigate
- These are not soft guidelines — they are circuit breakers

---

## What to Build Next in the Project

Priority order given current knowledge level:

| Timeline | Task | Why |
|----------|------|-----|
| This week | Fix Live tab UI — add last-decision log (signal fired, why, action taken) | Can't learn from a system you can't observe |
| Next 2 weeks | Add RSI + Trend Filter strategy | Simple to implement, has a real thesis, easy to compare against SMA |
| Next month | Add Monte Carlo + minimum trade count warnings to backtest evaluation | Teaches you to distrust good-looking backtests |
| After that | Build Pairs Trading (Z-score, EUR/USD vs GBP/USD) | Best edge-learning exercise available |
| Ongoing | Paper trade 3–6 months, accumulate 200+ trades per strategy | Real data on whether the strategy has edge |

---

## The Honest Truth About This Project

QuantDash as a learning tool is excellent. As a money-making system in its current form — not yet. That's accurate, not a failure.

The path from here to a system you'd trust with real capital:

1. Learn market structure and edge hypothesis thinking (Stage 1–2)
2. Implement strategies that have a documented reason to work, not just "it looked good in backtests"
3. Paper trade for at least 3–6 months, accumulate 200+ trades per strategy
4. Build evaluation tools to know whether paper trading results are statistically meaningful

Most retail algo traders skip steps 1, 2, and 4 and wonder why their system doesn't work live.

The infrastructure is already built. Now fill in the thinking behind it.
