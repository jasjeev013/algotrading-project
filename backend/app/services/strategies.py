from abc import ABC, abstractmethod
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from statsmodels.tsa.stattools import coint


class BaseStrategy(ABC):
    """
    Abstract Base Class for all strategies.
    Forces every strategy to have a generate_signals() method.
    """

    def __init__(self, data: list, **kwargs):
        # Convert the list of dicts (from data_fetcher) back into a Pandas DataFrame for fast math
        self.data = pd.DataFrame(data)
        self.params = kwargs

    @abstractmethod
    def generate_signals(self) -> pd.DataFrame:
        pass

    def generate_signals_for_window(self, train_df: pd.DataFrame, trade_df: pd.DataFrame) -> pd.DataFrame:
        """
        Default implementation used by the walk-forward engine for strategies
        that don't fit a model (SMA, Bollinger): pulls a trailing `warmup_bars`
        slice from train_df as context so rolling indicators (e.g. a 50-day SMA)
        aren't NaN at the very start of the trade window, runs generate_signals()
        on that combined slice, then trims the result back down to only the
        trade window before returning. ML/StatArb override this entirely to
        fit a fresh model on train_df and predict on trade_df instead.
        """
        warmup_bars = int(self.params.get("warmup_bars", 60))
        context = train_df.tail(warmup_bars)
        self.data = pd.concat([context, trade_df], ignore_index=True)
        signals = self.generate_signals()

        trade_start_time = trade_df["time"].iloc[0] if len(trade_df) > 0 else None
        result = signals[signals["time"] >= trade_start_time].reset_index(drop=True)
        result["signal"] = result["position"].diff().fillna(0)
        return result


class BuyAndHold(BaseStrategy):
    """
    Baseline strategy. Goes Long (1) on the very first bar and holds
    that position for the entire window — no exits, no parameters.
    Useful as a reference line against which the other strategies are
    measured.
    """

    def generate_signals(self) -> pd.DataFrame:
        df = self.data.copy()
        df["position"] = 1
        df["signal"] = df["position"].diff().fillna(0)
        return df


class  SMACrossover(BaseStrategy):
    """
    Trend-following strategy.
    Goes Long (1) when Fast SMA > Slow SMA.
    Goes Short (-1) when Fast SMA < Slow SMA.
    """

    INDICATOR_COLUMNS = [
        {"key": "sma_short", "label": "SMA Short", "color": "#2196F3"},
        {"key": "sma_long",  "label": "SMA Long",  "color": "#FF9800"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        short_window = int(self.params.get("short_window", 20))
        long_window = int(self.params.get("long_window", 50))

        df = self.data.copy()

        # Calculate Indicators
        df["sma_short"] = df["close"].rolling(window=short_window).mean()
        df["sma_long"] = df["close"].rolling(window=long_window).mean()

        # Determine Position (1 = Long, -1 = Short)
        # np.where works like an IF statement: IF short > long, THEN 1, ELSE -1
        df["position"] = np.where(df["sma_short"] > df["sma_long"], 1, -1)

        # Handle initial NaN values before the moving averages can calculate
        df.iloc[:long_window, df.columns.get_loc("position")] = 0

        # Calculate Signal (The action to take).
        # diff() shows when the position changes (e.g., from -1 to 1 means a signal of 2... meaning buy to cover + buy to open)
        df["signal"] = df["position"].diff().fillna(0)

        return df


class BollingerBands(BaseStrategy):
    """
    Mean-reversion strategy.
    Goes Long (1) when price drops below the lower band (oversold).
    Goes Short (-1) when price rises above the upper band (overbought).
    """

    INDICATOR_COLUMNS = [
        {"key": "bb_middle",  "label": "BB Middle",     "color": "#9E9E9E"},
        {"key": "upper_band", "label": "BB Upper Band", "color": "#f44336"},
        {"key": "lower_band", "label": "BB Lower Band", "color": "#4CAF50"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        window = int(self.params.get("window", 20))
        num_std = float(self.params.get("num_std", 2.0))

        df = self.data.copy()

        # Calculate Indicators
        df["bb_middle"] = df["close"].rolling(window=window).mean()
        df["std"] = df["close"].rolling(window=window).std()
        df["upper_band"] = df["bb_middle"] + (df["std"] * num_std)
        df["lower_band"] = df["bb_middle"] - (df["std"] * num_std)

        # Initialize position column with NaNs
        df["position"] = np.nan

        # Generate raw position signals
        df.loc[df["close"] < df["lower_band"], "position"] = 1  # Buy signal
        df.loc[df["close"] > df["upper_band"], "position"] = -1  # Sell signal

        # Forward fill the positions (hold the trade until the opposite signal triggers)
        df["position"] = df["position"].ffill().fillna(0)

        df["signal"] = df["position"].diff().fillna(0)

        return df


class EMACrossover(BaseStrategy):
    """
    Trend-following strategy, same shape as SMACrossover but with
    exponentially-weighted moving averages (more weight on recent bars).
    Long when fast EMA > slow EMA, Short otherwise.
    """

    INDICATOR_COLUMNS = [
        {"key": "ema_short", "label": "EMA Short", "color": "#00BCD4"},
        {"key": "ema_long",  "label": "EMA Long",  "color": "#9C27B0"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        ema_short = int(self.params.get("ema_short", 12))
        ema_long = int(self.params.get("ema_long", 26))

        df = self.data.copy()
        df["ema_short"] = df["close"].ewm(span=ema_short, adjust=False).mean()
        df["ema_long"] = df["close"].ewm(span=ema_long, adjust=False).mean()

        df["position"] = np.where(df["ema_short"] > df["ema_long"], 1, -1)
        df.iloc[:ema_long, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)

        return df


class MACDStrategy(BaseStrategy):
    """
    Trend-following strategy built on the MACD line (fast EMA - slow EMA)
    crossing its own signal line (an EMA of the MACD line itself).
    Long when MACD line > signal line, Short otherwise. No price-scale
    overlay -- MACD lives on its own scale, not the price chart.
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        fast = int(self.params.get("macd_fast", 12))
        slow = int(self.params.get("macd_slow", 26))
        signal_period = int(self.params.get("macd_signal_period", 9))

        df = self.data.copy()
        ema_fast = df["close"].ewm(span=fast, adjust=False).mean()
        ema_slow = df["close"].ewm(span=slow, adjust=False).mean()
        df["macd_line"] = ema_fast - ema_slow
        df["macd_signal_line"] = df["macd_line"].ewm(span=signal_period, adjust=False).mean()

        df["position"] = np.where(df["macd_line"] > df["macd_signal_line"], 1, -1)
        df.iloc[:slow, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)

        return df


def _compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta = close.diff()
    avg_gain = delta.clip(lower=0).ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


class RSIMeanReversion(BaseStrategy):
    """
    Mean-reversion strategy on the Relative Strength Index.
    Goes Long (1) when RSI drops below the oversold threshold, Short (-1)
    when RSI rises above the overbought threshold, and holds that position
    until the opposite threshold fires.
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        period = int(self.params.get("rsi_period", 14))
        oversold = float(self.params.get("rsi_oversold", 30))
        overbought = float(self.params.get("rsi_overbought", 70))

        df = self.data.copy()
        df["rsi"] = _compute_rsi(df["close"], period)

        df["position"] = np.nan
        df.loc[df["rsi"] < oversold, "position"] = 1
        df.loc[df["rsi"] > overbought, "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:period, df.columns.get_loc("position")] = 0

        df["signal"] = df["position"].diff().fillna(0)

        return df


class ContrarianStrategy(BaseStrategy):
    """
    Contrarian strategy: bets against short-term price extremes.
    Buys after a recent drop exceeding contrarian_threshold (expecting a
    bounce), shorts after a recent rally exceeding it (expecting a pullback),
    and holds until the opposite extreme fires.
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        lookback = int(self.params.get("contrarian_lookback", 5))
        threshold = float(self.params.get("contrarian_threshold", 0.03))

        df = self.data.copy()
        df["ret_n"] = df["close"].pct_change(periods=lookback)

        df["position"] = np.nan
        df.loc[df["ret_n"] < -threshold, "position"] = 1
        df.loc[df["ret_n"] > threshold, "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0

        df["signal"] = df["position"].diff().fillna(0)

        return df


class NDayMomentum(BaseStrategy):
    """
    Simple momentum strategy: Long when today's close is above the close
    from nday_lookback bars ago (price has been rising), Short when it's
    below (price has been falling). No smoothing/threshold -- the plainest
    possible "trend continues" bet.
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        lookback = int(self.params.get("nday_lookback", 20))

        df = self.data.copy()
        df["position"] = np.where(
            df["close"] > df["close"].shift(lookback), 1, -1
        ).astype(float)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0

        df["signal"] = df["position"].diff().fillna(0)

        return df


ML_FEATURES = [
    "returns",
    "mom_3d",
    "mom_5d",
    "volatility_5d",
    "rsi_14",
    "macd_signal",
    "atr_14",
    "day_of_week",
    "volume_ratio",
]


def _add_ml_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Shared feature engineering used by both MLRandomForest.generate_signals()
    (legacy single-split path) and generate_signals_for_window() (walk-forward path).
    """
    df = df.copy()

    # Momentum / volatility features
    df["returns"] = df["close"].pct_change()
    df["mom_3d"] = df["close"].pct_change(periods=3)
    df["mom_5d"] = df["close"].pct_change(periods=5)
    df["volatility_5d"] = df["returns"].rolling(window=5).std()

    # RSI(14), Wilder smoothing
    delta = df["close"].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()
    rs = avg_gain / avg_loss
    df["rsi_14"] = 100 - (100 / (1 + rs))

    # MACD signal line
    ema12 = df["close"].ewm(span=12, adjust=False).mean()
    ema26 = df["close"].ewm(span=26, adjust=False).mean()
    macd = ema12 - ema26
    df["macd_signal"] = macd.ewm(span=9, adjust=False).mean()

    # ATR(14), Wilder smoothing
    prev_close = df["close"].shift(1)
    true_range = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - prev_close).abs(),
            (df["low"] - prev_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    df["atr_14"] = true_range.ewm(alpha=1 / 14, min_periods=14, adjust=False).mean()

    # Day of week (0=Monday .. 4=Friday)
    df["day_of_week"] = pd.to_datetime(df["time"]).dt.dayofweek

    # Volume ratio: today's volume vs. trailing 5-day average
    df["volume_ratio"] = df["volume"] / df["volume"].rolling(window=5).mean()

    return df


class MLRandomForest(BaseStrategy):
    """
    Machine Learning momentum predictor.
    Uses feature engineering (returns, momentum, volatility, RSI, MACD, ATR,
    day-of-week, volume ratio) to predict if tomorrow's return is positive.

    Two modes:
    - Backtest mode (generate_signals): trains only on the first `train_split`
      fraction of the window (default 70%) and only trades (predicts) on the
      remaining out-of-sample fraction, within a single backtest window. No
      position is taken during training.
    - Walk-Forward mode (generate_signals_for_window): fits a fresh model per
      rolling window on that window's train slice only, predicts on that
      window's trade slice. Driven by POST /api/walk-forward.
    """

    def __init__(self, data: list, **kwargs):
        super().__init__(data, **kwargs)
        self.last_feature_importance = None

    def generate_signals(self) -> pd.DataFrame:
        train_split = float(self.params.get("train_split", 0.7))
        df = _add_ml_features(self.data.copy())

        # Target: 1 if tomorrow's close is higher than today's, else -1
        df["target"] = np.where(df["close"].shift(-1) > df["close"], 1, -1)

        # Drop rows with NaN values (created by rolling windows and shifts)
        clean_df = df.dropna().copy()

        # Time-based train/test split (train on the earlier segment only)
        split_idx = int(len(clean_df) * train_split)
        train_df = clean_df.iloc[:split_idx]
        test_df = clean_df.iloc[split_idx:]

        # Train Model on in-sample data only
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        if len(train_df) > 0:
            model.fit(train_df[ML_FEATURES], train_df["target"])
            self.last_feature_importance = dict(
                zip(ML_FEATURES, model.feature_importances_.tolist())
            )

        # Predict only on out-of-sample data
        df["position"] = 0.0
        if len(test_df) > 0 and len(train_df) > 0:
            df.loc[test_df.index, "position"] = model.predict(test_df[ML_FEATURES])

        df["signal"] = df["position"].diff().fillna(0)

        return df

    def generate_signals_for_window(self, train_df: pd.DataFrame, trade_df: pd.DataFrame) -> pd.DataFrame:
        warmup_bars = int(self.params.get("warmup_bars", 40))
        context = train_df.tail(warmup_bars)
        combined = pd.concat([context, trade_df], ignore_index=True)

        featured = _add_ml_features(combined)
        train_featured = _add_ml_features(train_df)
        train_featured["target"] = np.where(
            train_featured["close"].shift(-1) > train_featured["close"], 1, -1
        )
        train_clean = train_featured.dropna(subset=ML_FEATURES + ["target"])

        model = RandomForestClassifier(n_estimators=100, random_state=42)
        if len(train_clean) == 0:
            featured["position"] = 0.0
        else:
            model.fit(train_clean[ML_FEATURES], train_clean["target"])
            self.last_feature_importance = dict(
                zip(ML_FEATURES, model.feature_importances_.tolist())
            )

            predictable = featured.dropna(subset=ML_FEATURES)
            featured["position"] = 0.0
            if len(predictable) > 0:
                featured.loc[predictable.index, "position"] = model.predict(
                    predictable[ML_FEATURES]
                )

        featured["signal"] = featured["position"].diff().fillna(0)

        # Only the trade slice (drop the warm-up context rows used purely to
        # unblock rolling indicators — never trade before trade_df's start).
        trade_start_time = trade_df["time"].iloc[0] if len(trade_df) > 0 else None
        result = featured[featured["time"] >= trade_start_time].reset_index(drop=True)
        result["signal"] = result["position"].diff().fillna(0)

        return result


class StatArbitrageStrategy(BaseStrategy):
    """
    Pairs-trading (statistical arbitrage) strategy.
    Tests cointegration between the primary ticker and a second `pair_data` ticker,
    then trades the price spread: goes long the spread when it's oversold (z-score
    below -entry_z) and short the spread when it's overbought (z-score above entry_z),
    flattening when the z-score reverts inside exit_z.

    Simplification: the spread is modeled as a single synthetic instrument (its own
    "close" series) fed through the existing single-instrument backtester rather than
    simulating two separate legs with independent notional P&L. This reuses all
    existing commission/spread/slippage/equity plumbing but means net_return_pct is
    expressed in spread-return terms, not true two-leg notional dollar P&L.

    The hedge ratio is fit on log prices and the tradeable "close" fed to the
    backtester is exp(log_spread) rather than the raw linear spread. A mean-
    reverting linear spread oscillates around zero by construction, and the
    backtester computes returns as (exit_price - entry_price) / entry_price —
    an entry price near zero would blow up that division. exp(log_spread) is
    always strictly positive, so this can't happen.
    """

    def __init__(self, data: list, pair_data: list = None, **kwargs):
        super().__init__(data, **kwargs)
        if not pair_data:
            raise ValueError(
                "StatArbitrageStrategy requires pair_data (the second ticker's OHLCV records)."
            )
        self.pair_df = pd.DataFrame(pair_data)
        self.last_feature_importance = None
        self.last_coint_pvalue = None

    def _build_spread(self, df_a: pd.DataFrame, df_b: pd.DataFrame):
        merged = pd.merge(
            df_a[["time", "close"]],
            df_b[["time", "close"]],
            on="time",
            suffixes=("_a", "_b"),
            how="inner",
        ).sort_values("time").reset_index(drop=True)

        log_a = np.log(merged["close_a"])
        log_b = np.log(merged["close_b"])

        if len(merged) < 2:
            hedge_ratio = 1.0
        else:
            hedge_ratio = float(np.polyfit(log_b, log_a, 1)[0])

        merged["log_spread"] = log_a - hedge_ratio * log_b
        return merged, hedge_ratio

    def _signals_from_spread(self, merged: pd.DataFrame, base_df: pd.DataFrame) -> pd.DataFrame:
        lookback_window = int(self.params.get("lookback_window", 30))
        entry_z = float(self.params.get("entry_z", 2.0))
        exit_z = float(self.params.get("exit_z", 0.5))

        merged = merged.copy()
        rolling_mean = merged["log_spread"].rolling(window=lookback_window).mean()
        rolling_std = merged["log_spread"].rolling(window=lookback_window).std()
        merged["z_score"] = (merged["log_spread"] - rolling_mean) / rolling_std

        merged["position"] = np.nan
        merged.loc[merged["z_score"] > entry_z, "position"] = -1  # spread overbought -> short spread
        merged.loc[merged["z_score"] < -entry_z, "position"] = 1  # spread oversold -> long spread
        merged.loc[merged["z_score"].abs() < exit_z, "position"] = 0  # revert -> flatten
        merged["position"] = merged["position"].ffill().fillna(0)
        merged["signal"] = merged["position"].diff().fillna(0)

        # Build the synthetic single-instrument OHLC frame the backtester expects,
        # using exp(log_spread) as the tradeable "price" -- always strictly
        # positive, unlike the raw linear spread which oscillates around zero.
        out = merged[["time", "position", "signal"]].copy()
        synthetic_price = np.exp(merged["log_spread"])
        out["close"] = synthetic_price
        out["open"] = synthetic_price
        out["high"] = synthetic_price
        out["low"] = synthetic_price

        return out

    def generate_signals(self) -> pd.DataFrame:
        coint_pvalue_threshold = float(self.params.get("coint_pvalue_threshold", 0.05))

        merged_full, hedge_ratio = self._build_spread(self.data, self.pair_df)
        try:
            _, pvalue, _ = coint(merged_full["close_a"], merged_full["close_b"])
        except Exception:
            pvalue = 1.0
        self.last_coint_pvalue = pvalue

        signals = self._signals_from_spread(merged_full, self.data)
        if pvalue > coint_pvalue_threshold:
            signals["position"] = 0.0
            signals["signal"] = 0.0

        return signals

    def generate_signals_for_window(self, train_df: pd.DataFrame, trade_df: pd.DataFrame) -> pd.DataFrame:
        coint_pvalue_threshold = float(self.params.get("coint_pvalue_threshold", 0.05))
        lookback_window = int(self.params.get("lookback_window", 30))

        pair_train_df = getattr(self, "pair_train_df", None)
        if pair_train_df is None:
            pair_train_df = self.pair_df

        # Fit hedge ratio + cointegration test on TRAIN data only.
        merged_train, hedge_ratio = self._build_spread(train_df, pair_train_df)
        try:
            _, pvalue, _ = coint(merged_train["close_a"], merged_train["close_b"])
        except Exception:
            pvalue = 1.0
        self.last_coint_pvalue = pvalue

        # Apply the train-fitted hedge ratio to a context+trade slice (context
        # rows unblock the rolling z-score at the start of the trade window),
        # then trim back down to only the trade window before returning.
        context_a = train_df.tail(lookback_window)
        context_b = pair_train_df.tail(lookback_window)
        combined_a = pd.concat([context_a, trade_df], ignore_index=True)
        combined_b = pd.concat([context_b, self.pair_df], ignore_index=True)

        merged = pd.merge(
            combined_a[["time", "close"]],
            combined_b[["time", "close"]],
            on="time",
            suffixes=("_a", "_b"),
            how="inner",
        ).sort_values("time").reset_index(drop=True)
        merged["log_spread"] = np.log(merged["close_a"]) - hedge_ratio * np.log(merged["close_b"])

        signals = self._signals_from_spread(merged, trade_df)
        if pvalue > coint_pvalue_threshold:
            signals["position"] = 0.0
            signals["signal"] = 0.0

        trade_start_time = trade_df["time"].iloc[0] if len(trade_df) > 0 else None
        result = signals[signals["time"] >= trade_start_time].reset_index(drop=True)
        result["signal"] = result["position"].diff().fillna(0)

        return result
