import yfinance as yf
import pandas as pd

SPY_TICKER = "SPY"
VIX_TICKER = "^VIX"
TREND_LOOKBACK_DAYS = 90
TREND_SMA_WINDOW = 50
VIX_LOW_THRESHOLD = 20.0
VIX_HIGH_THRESHOLD = 30.0


def _fetch_recent_daily(
    ticker: str, lookback_days: int = TREND_LOOKBACK_DAYS
) -> pd.DataFrame:
    """
    Fetches recent daily OHLCV for a single ticker as a raw DataFrame, for
    rolling-mean math. Kept separate from data_fetcher.fetch_historical_data,
    which reshapes output into list[dict] for the frontend chart.
    """
    end = pd.Timestamp.today()
    start = end - pd.Timedelta(days=lookback_days)
    df = yf.Ticker(ticker).history(
        start=start.strftime("%Y-%m-%d"),
        end=end.strftime("%Y-%m-%d"),
        interval="1d",
    )
    if df.empty:
        raise ValueError(f"No data returned for {ticker}.")
    df = df.ffill().dropna()
    return df


def _classify_spy_trend(spy_df: pd.DataFrame) -> str:
    """
    Simple trend detection: current close vs SMA(TREND_SMA_WINDOW).
    """
    sma = spy_df["Close"].rolling(window=TREND_SMA_WINDOW).mean()
    latest_close = spy_df["Close"].iloc[-1]
    latest_sma = sma.iloc[-1]
    if pd.isna(latest_sma):
        latest_sma = spy_df["Close"].mean()
    return "up" if latest_close >= latest_sma else "down"


def get_current_regime() -> dict:
    """
    Fetches SPY and VIX data and classifies the current market regime.

    Regime rules:
      - VIX > VIX_HIGH_THRESHOLD (30) -> "Volatile"
      - VIX < VIX_LOW_THRESHOLD (20)  -> "Trending"
      - otherwise                     -> "Sideways"
    """
    try:
        spy_df = _fetch_recent_daily(SPY_TICKER)
        vix_df = _fetch_recent_daily(VIX_TICKER)

        spy_latest_close = float(spy_df["Close"].iloc[-1])
        spy_prev_close = (
            float(spy_df["Close"].iloc[-2]) if len(spy_df) > 1 else spy_latest_close
        )
        spy_daily_change_pct = (
            ((spy_latest_close - spy_prev_close) / spy_prev_close) * 100
            if spy_prev_close
            else 0.0
        )

        vix_latest = float(vix_df["Close"].iloc[-1])
        spy_trend = _classify_spy_trend(spy_df)

        if vix_latest > VIX_HIGH_THRESHOLD:
            regime = "Volatile"
        elif vix_latest < VIX_LOW_THRESHOLD:
            regime = "Trending"
        else:
            regime = "Sideways"

        return {
            "regime": regime,
            "spy_price": round(spy_latest_close, 2),
            "spy_daily_change_pct": round(spy_daily_change_pct, 2),
            "spy_trend": spy_trend,
            "vix_level": round(vix_latest, 2),
            "as_of": spy_df.index[-1].strftime("%Y-%m-%d"),
        }
    except Exception as e:
        raise Exception(f"Error computing market regime: {str(e)}")
