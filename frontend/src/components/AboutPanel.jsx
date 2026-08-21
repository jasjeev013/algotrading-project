const Section = ({ title, children }) => (
  <div className="section-block">
    <h2>{title}</h2>
    {children}
  </div>
);

const DefList = ({ items }) => (
  <dl style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "10px 20px", margin: "12px 0" }}>
    {items.map(({ term, def }) => (
      <>
        <dt key={`dt-${term}`} style={{ fontWeight: 600, color: "var(--text-primary)" }}>{term}</dt>
        <dd key={`dd-${term}`} style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.6 }}>{def}</dd>
      </>
    ))}
  </dl>
);

const AboutPanel = () => (
  <>
    <Section title="Platform Overview">
      <p className="section-desc">
        QuantDash is a full-stack algorithmic trading and backtesting platform. It lets you design
        and validate trading strategies on historical data, then deploy them as a live paper-trading
        bot against OANDA's practice environment — all from one dashboard.
      </p>
    </Section>

    <Section title="Market Indices — SPY &amp; VIX">
      <DefList items={[
        {
          term: "SPY",
          def: "The SPDR S&P 500 ETF Trust. Tracks the S&P 500 index — 500 large-cap US companies weighted by market cap. Used as the primary benchmark for US equity market performance. QuantDash uses SPY's price trend to classify the current market regime (Bull / Bear / Neutral).",
        },
        {
          term: "VIX",
          def: "The CBOE Volatility Index — often called the 'Fear Gauge'. Measures the market's expectation of 30-day S&P 500 volatility implied by options prices. VIX < 20 is considered low volatility (calm market); 20–30 is elevated; > 30 is high stress. QuantDash uses VIX to characterise regime risk.",
        },
      ]} />
    </Section>

    <Section title="Strategies">
      <DefList items={[
        {
          term: "SMA Crossover",
          def: "Simple Moving Average crossover strategy. Goes long when the short-window SMA (default 20 bars) crosses above the long-window SMA (default 50 bars), and short when it crosses below. A trend-following approach — it works well in trending markets and badly in choppy sideways periods.",
        },
        {
          term: "Bollinger Bands",
          def: "Mean-reversion strategy. Bollinger Bands are a channel of ±N standard deviations around a rolling mean (default 20-bar window, 2 std). Goes short near the upper band and long near the lower band on the assumption that price will revert to the mean. Works well in range-bound markets.",
        },
        {
          term: "ML (Random Forest)",
          def: "A machine-learning classifier trained on recent price-derived features: daily returns, 3-day and 5-day momentum, and 5-day realised volatility. Predicts next-bar direction as long or short. The train_split parameter controls how much history is used for training vs. out-of-sample testing.",
        },
        {
          term: "Statistical Arbitrage",
          def: "Pairs trading using cointegration. Finds the spread between two instruments, z-scores it, and goes long the spread when it is low (spread likely to widen) and short when it is high. Requires a pair ticker. The entry_z and exit_z parameters control when to enter and exit trades.",
        },
      ]} />
    </Section>

    <Section title="Performance Metrics">
      <DefList items={[
        {
          term: "Total Return (%)",
          def: "The percentage gain or loss of the portfolio over the entire backtest window. Formula: (final equity − initial capital) / initial capital × 100. Simple and intuitive but ignores how long the strategy was running.",
        },
        {
          term: "CAGR (%)",
          def: "Compound Annual Growth Rate. Annualises Total Return so you can compare strategies run over different time horizons on equal footing. Formula: (final / initial)^(1/years) − 1. A CAGR of 10% means the portfolio grew at the equivalent of 10% per year.",
        },
        {
          term: "Max Drawdown (%)",
          def: "The largest peak-to-trough decline in portfolio value during the backtest. Measures the worst sequence of losses you would have experienced. Lower is better — a drawdown of −40% means the portfolio halved from its peak before recovering.",
        },
        {
          term: "Win Rate (%)",
          def: "The percentage of closed trades that were profitable. Win Rate alone is not enough — a strategy can be profitable with a 30% win rate if its winners are much larger than its losers (favourable risk/reward ratio).",
        },
        {
          term: "Sharpe Ratio",
          def: "Risk-adjusted return. Measures how much excess return is earned per unit of volatility. Calculated as (annualised mean daily return) / (annualised daily return std dev), assuming a 0% risk-free rate. Sharpe > 1 is considered good; > 2 is excellent. Negative Sharpe means the strategy underperformed cash.",
        },
        {
          term: "Total Trades",
          def: "The number of round-trip trades (open + close) the strategy executed over the backtest window. Very low trade counts make metrics statistically unreliable.",
        },
      ]} />
    </Section>

    <Section title="Cost Model">
      <DefList items={[
        {
          term: "Commission (%)",
          def: "Flat percentage fee charged on both entry and exit of every trade. Represents broker transaction fees. Typical for stock brokers: 0.05–0.1%.",
        },
        {
          term: "Spread (%)",
          def: "The bid/ask spread cost, applied as half on each side of a fill. Represents the liquidity cost of trading — the difference between the price you pay (ask) and the price you sell at (bid). FX spreads are often 0.01–0.05%.",
        },
        {
          term: "Slippage (%)",
          def: "Adverse price movement between order submission and execution. Captures market impact — large orders move prices against you. Typically modelled as 0.01–0.05%.",
        },
        {
          term: "Overnight Financing (%/day)",
          def: "Interest charged per calendar day a leveraged position is held overnight (like a CFD or margin position). Based on the interbank rate + broker spread. Set to 0 for fully-funded equity positions.",
        },
      ]} />
    </Section>

    <Section title="Walk-Forward Optimisation">
      <p className="section-desc">
        Walk-Forward Optimisation (WFO) is a rigorous validation technique that guards against
        overfitting. Instead of running a single backtest on all available data, WFO splits history
        into rolling windows:
      </p>
      <DefList items={[
        {
          term: "Train Window",
          def: "The in-sample period the strategy is fitted on (or, for non-fitting strategies like SMA, used for warm-up). Default: 12 months.",
        },
        {
          term: "Trade Window",
          def: "The out-of-sample period immediately following the train window, where the fitted strategy is evaluated without seeing any future data. Default: 3 months.",
        },
        {
          term: "Step",
          def: "How far to slide the window forward before the next fold. Defaults to the trade window length (non-overlapping). Smaller steps produce more folds but with more overlap.",
        },
      ]} />
      <p className="section-desc" style={{ marginTop: 8 }}>
        The resulting equity curve is a concatenation of each window's out-of-sample performance —
        the fairest estimate of live performance you can get from historical data alone.
      </p>
    </Section>

    <Section title="Live Paper Trading">
      <DefList items={[
        {
          term: "Poll Interval",
          def: "How often the bot fetches fresh candles and re-evaluates its signal. Shorter intervals catch new candle closes sooner. Setting this lower than the candle granularity is still useful — it ensures you act on a new candle within seconds of it closing.",
        },
        {
          term: "Candle Granularity",
          def: "The OANDA timeframe for each candle (M1 = 1 min, M5 = 5 min, M15 = 15 min, etc.). The strategy uses this resolution to generate signals. SMA with long_window=50 on M1 candles looks back ~50 minutes.",
        },
        {
          term: "Candle Lookback",
          def: "Number of recent candles fetched per poll and shown on the chart. Must be larger than the strategy's longest parameter (e.g., long_window=50 for SMA). The strategy computes a signal only on the last bar of this window.",
        },
        {
          term: "SMA & Rolling Windows",
          def: "At M1 candle granularity with short_window=20 and long_window=50: the strategy needs at least 50 candles to produce a valid crossover signal. The first signal can be immediate if the lookback window already shows a crossover, but a new crossover only fires when the 20-bar MA actually crosses the 50-bar MA — this can take many candles of trending price action.",
        },
        {
          term: "Kill Switch / Liquidate",
          def: "Emergency flat: closes every open position on the OANDA account and stops the bot. Use 'Stop & Liquidate All' from the sidebar to do both at once. 'Stop Bot' alone pauses the loop but leaves positions open — useful if you want to manually manage the position while the bot is idle.",
        },
      ]} />
    </Section>

    <Section title="OANDA Integration">
      <p className="section-desc">
        QuantDash connects to OANDA's practice (paper-trading) environment using the
        oandapyV20 REST API. All orders are placed as market orders with Fill-or-Kill
        time-in-force on the configured instrument (e.g., EUR_USD). No real money is at risk.
        Credentials are stored in the backend .env file and never sent to the frontend.
      </p>
    </Section>
  </>
);

export default AboutPanel;
