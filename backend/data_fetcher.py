import yfinance as yf
import pandas as pd
import numpy as np


def fetch_historical_data(
    ticker: str, start_date: str, end_date: str, interval: str = "1d"
) -> list:
    """
    Fetches historical OHLCV data from Yahoo Finance and cleans it.
    """
    try:
        # 1. Fetch data using yfinance
        stock = yf.Ticker(ticker)
        df = stock.history(start=start_date, end=end_date, interval=interval)

        # 2. Check if dataframe is empty (e.g., invalid ticker or weekend dates)
        if df.empty:
            raise ValueError(
                f"No data found for ticker {ticker} between {start_date} and {end_date}."
            )

        # 3. Data Cleaning
        # Forward fill missing data, then drop any remaining NaNs
        df = df.ffill().dropna()

        # 4. Formatting for Frontend Charting (TradingView expects specific formats)
        # Reset index to make the Date a column instead of the index
        df.reset_index(inplace=True)

        # yfinance returns timezone-aware datetimes. Convert to standard string format.
        # "Date" is used for daily intervals, "Datetime" for intraday.
        date_col = "Date" if "Date" in df.columns else "Datetime"

        # Convert date to string format 'YYYY-MM-DD' for daily, or full ISO for intraday
        if interval in ["1d", "1wk", "1mo"]:
            df["time"] = df[date_col].dt.strftime("%Y-%m-%d")
        else:
            df["time"] = df[date_col].dt.strftime("%Y-%m-%d %H:%M:%S")

        # Keep only the necessary columns and rename them to lowercase
        df = df[["time", "Open", "High", "Low", "Close", "Volume"]]
        df.rename(
            columns={
                "Open": "open",
                "High": "high",
                "Low": "low",
                "Close": "close",
                "Volume": "volume",
            },
            inplace=True,
        )

        # 5. Convert DataFrame to a list of dictionaries for JSON serialization
        data_records = df.to_dict(orient="records")

        return data_records

    except Exception as e:
        # Pass the error up to the FastAPI endpoint to handle
        raise Exception(f"Error fetching data: {str(e)}")
