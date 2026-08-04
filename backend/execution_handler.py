import oandapyV20
from oandapyV20 import API
from oandapyV20.endpoints import instruments, accounts, orders, positions
from oandapyV20.exceptions import V20Error

from config import OANDA_ACCOUNT_ID, OANDA_API_KEY, OANDA_ENVIRONMENT

MAX_ORDER_UNITS = 1000


class OandaExecutionHandler:
    def __init__(self):
        env = "practice" if OANDA_ENVIRONMENT != "live" else "live"
        self.client = API(access_token=OANDA_API_KEY, environment=env)
        self.account_id = OANDA_ACCOUNT_ID

    def get_live_candles(self, instrument: str, count: int = 100, granularity: str = "M15"):
        params = {"count": count, "granularity": granularity, "price": "M"}
        req = instruments.InstrumentsCandles(instrument=instrument, params=params)
        try:
            response = self.client.request(req)
        except V20Error as e:
            raise RuntimeError(f"Failed to fetch candles for {instrument}: {e}") from e
        return response.get("candles", [])

    def get_account_summary(self):
        req = accounts.AccountSummary(accountID=self.account_id)
        try:
            response = self.client.request(req)
        except V20Error as e:
            raise RuntimeError(f"Failed to fetch account summary: {e}") from e
        return response.get("account", {})

    def get_open_positions(self):
        req = positions.OpenPositions(accountID=self.account_id)
        try:
            response = self.client.request(req)
        except V20Error as e:
            raise RuntimeError(f"Failed to fetch open positions: {e}") from e
        return response.get("positions", [])

    def place_market_order(self, instrument: str, units: int, direction: str):
        if direction not in ("buy", "sell"):
            raise ValueError(f"direction must be 'buy' or 'sell', got {direction!r}")
        if abs(units) > MAX_ORDER_UNITS:
            raise ValueError(
                f"Order size {abs(units)} exceeds max allowed {MAX_ORDER_UNITS} units."
            )

        signed_units = units if direction == "buy" else -units
        order_data = {
            "order": {
                "type": "MARKET",
                "instrument": instrument,
                "units": str(signed_units),
                "timeInForce": "FOK",
                "positionFill": "DEFAULT",
            }
        }
        req = orders.OrderCreate(accountID=self.account_id, data=order_data)
        try:
            response = self.client.request(req)
        except V20Error as e:
            raise RuntimeError(f"Failed to place order for {instrument}: {e}") from e
        return response

    def close_position(self, instrument: str):
        data = {"longUnits": "ALL", "shortUnits": "ALL"}
        req = positions.PositionClose(accountID=self.account_id, instrument=instrument, data=data)
        try:
            response = self.client.request(req)
        except V20Error as e:
            raise RuntimeError(f"Failed to close position {instrument}: {e}") from e
        return response

    def close_all_positions(self):
        """Emergency-stop path: flattens every open position, continuing past
        individual failures so one bad response can't block the rest of the book
        from closing."""
        results = []
        try:
            open_positions = self.get_open_positions()
        except RuntimeError as e:
            return [{"instrument": None, "status": "error", "detail": str(e)}]

        for pos in open_positions:
            instrument = pos.get("instrument")
            try:
                self.close_position(instrument)
                results.append({"instrument": instrument, "status": "closed"})
            except RuntimeError as e:
                results.append({"instrument": instrument, "status": "error", "detail": str(e)})

        return results
