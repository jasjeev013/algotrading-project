from data_fetcher import fetch_historical_data
from strategies import SMACrossover, BollingerBands, MLRandomForest

# 1. Fetch some test data
print("Fetching Data...")
data = fetch_historical_data("AAPL", "2023-01-01", "2024-01-01", "1d")

# 2. Test SMA
print("\n--- Testing SMA Strategy ---")
sma_strat = SMACrossover(data, short_window=10, long_window=30)
sma_results = sma_strat.generate_signals()
# Print the days where a trade actually occurred (signal != 0)
print(
    sma_results[sma_results["signal"] != 0][
        ["time", "close", "sma_short", "sma_long", "position", "signal"]
    ].head()
)

# 3. Test Bollinger Bands
print("\n--- Testing Bollinger Bands Strategy ---")
bb_strat = BollingerBands(data, window=20, num_std=2.0)
bb_results = bb_strat.generate_signals()
print(
    bb_results[bb_results["signal"] != 0][
        ["time", "close", "lower_band", "upper_band", "position"]
    ].head()
)

# 4. Test ML Random Forest
print("\n--- Testing ML Strategy ---")
ml_strat = MLRandomForest(data)
ml_results = ml_strat.generate_signals()
print(ml_results[["time", "close", "position", "signal"]].tail())
