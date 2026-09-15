from fastapi import APIRouter, HTTPException, Query

from app.schemas.regime import RegimeResponse
from app.services.data_fetcher import fetch_historical_data
from app.services.market_regime import get_current_regime

router = APIRouter()


@router.get("/api/data")
def get_market_data(
    ticker: str = Query(..., description="Stock ticker symbol (e.g., AAPL)"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    interval: str = Query("1d", description="Data timeframe (e.g., 1d, 1h, 15m)"),
):
    """
    API Endpoint to fetch clean historical market data.
    """
    try:
        # Call our data fetcher function
        data = fetch_historical_data(
            ticker=ticker.upper(),
            start_date=start_date,
            end_date=end_date,
            interval=interval,
        )

        return {
            "status": "success",
            "meta": {
                "ticker": ticker.upper(),
                "start_date": start_date,
                "end_date": end_date,
                "interval": interval,
                "total_records": len(data),
            },
            "data": data,
        }

    except ValueError as ve:
        # Return a 404 Not Found if the ticker is bad or data is empty
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        # Return a 500 Internal Server Error for everything else
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/regime", response_model=RegimeResponse)
def get_market_regime():
    """
    API Endpoint to fetch current market regime (SPY trend + VIX level classification).
    """
    try:
        return get_current_regime()
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
