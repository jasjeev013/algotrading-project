from abc import ABC, abstractmethod
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier


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


class SMACrossover(BaseStrategy):
    """
    Trend-following strategy.
    Goes Long (1) when Fast SMA > Slow SMA.
    Goes Short (-1) when Fast SMA < Slow SMA.
    """

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

    def generate_signals(self) -> pd.DataFrame:
        window = int(self.params.get("window", 20))
        num_std = float(self.params.get("num_std", 2.0))

        df = self.data.copy()

        # Calculate Indicators
        df["sma"] = df["close"].rolling(window=window).mean()
        df["std"] = df["close"].rolling(window=window).std()
        df["upper_band"] = df["sma"] + (df["std"] * num_std)
        df["lower_band"] = df["sma"] - (df["std"] * num_std)

        # Initialize position column with NaNs
        df["position"] = np.nan

        # Generate raw position signals
        df.loc[df["close"] < df["lower_band"], "position"] = 1  # Buy signal
        df.loc[df["close"] > df["upper_band"], "position"] = -1  # Sell signal

        # Forward fill the positions (hold the trade until the opposite signal triggers)
        df["position"] = df["position"].ffill().fillna(0)

        df["signal"] = df["position"].diff().fillna(0)

        return df


class MLRandomForest(BaseStrategy):
    """
    Machine Learning momentum predictor.
    Uses basic feature engineering (past returns & volatility) to predict if tomorrow's return is positive.

    Trains only on the first `train_split` fraction of the window (default 70%) and only trades
    (predicts) on the remaining out-of-sample fraction, so the equity curve never reflects a
    decision informed by data from its own future. No position is taken during the training window.
    """

    def generate_signals(self) -> pd.DataFrame:
        train_split = float(self.params.get("train_split", 0.7))
        df = self.data.copy()

        # 1. Feature Engineering
        df["returns"] = df["close"].pct_change()
        df["mom_3d"] = df["close"].pct_change(periods=3)
        df["mom_5d"] = df["close"].pct_change(periods=5)
        df["volatility_5d"] = df["returns"].rolling(window=5).std()

        # 2. Define Target (1 if tomorrow's price is higher than today, else -1)
        df["target"] = np.where(df["close"].shift(-1) > df["close"], 1, -1)

        # Drop rows with NaN values (created by rolling windows and shifts)
        clean_df = df.dropna().copy()

        features = ["returns", "mom_3d", "mom_5d", "volatility_5d"]

        # 3. Time-based train/test split (train on the earlier segment only)
        split_idx = int(len(clean_df) * train_split)
        train_df = clean_df.iloc[:split_idx]
        test_df = clean_df.iloc[split_idx:]

        # 4. Train Model on in-sample data only
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(train_df[features], train_df["target"])

        # 5. Predict only on out-of-sample data
        df["position"] = 0.0
        if len(test_df) > 0:
            df.loc[test_df.index, "position"] = model.predict(test_df[features])

        df["signal"] = df["position"].diff().fillna(0)

        return df
