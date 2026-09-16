from app.services.strategies import (
    BuyAndHold,
    SMACrossover,
    BollingerBands,
    MLRandomForest,
    StatArbitrageStrategy,
    EMACrossover,
    MACDStrategy,
    RSIMeanReversion,
    ContrarianStrategy,
    NDayMomentum,
)

STRATEGY_REGISTRY = {
    "BuyHold": BuyAndHold,
    "SMA": SMACrossover,
    "EMA": EMACrossover,
    "MACD": MACDStrategy,
    "Bollinger": BollingerBands,
    "RSI": RSIMeanReversion,
    "Contrarian": ContrarianStrategy,
    "NDayMom": NDayMomentum,
    "ML": MLRandomForest,
    "StatArb": StatArbitrageStrategy,
}

# Phase 6 baseline: only stateless strategies that are correct to recompute
# from scratch on a single fresh candle pull each tick. ML's generate_signals()
# does an in-sample/out-of-sample split that isn't meaningful on one live bar,
# and StatArb needs a second live instrument feed -- both deferred.
LIVE_ELIGIBLE_STRATEGIES = {"SMA", "Bollinger"}
