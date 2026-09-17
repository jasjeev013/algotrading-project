from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import relationship

from app.database import Base


class BacktestRun(Base):
    __tablename__ = "backtest_runs"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    strategy = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    initial_capital = Column(Float, nullable=False)
    commission_pct = Column(Float, nullable=False)
    spread_pct = Column(Float, nullable=False, default=0.0002)
    slippage_pct = Column(Float, nullable=False, default=0.0001)
    overnight_financing_pct = Column(Float, nullable=False, default=0.0)
    engine = Column(String, nullable=False, default="iterative")
    strategy_params = Column(JSON, nullable=False, default=dict)
    metrics = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    trades = relationship(
        "TradeRecord", back_populates="run", cascade="all, delete-orphan"
    )


class TradeRecord(Base):
    __tablename__ = "trade_records"

    id = Column(Integer, primary_key=True, index=True)
    backtest_run_id = Column(Integer, ForeignKey("backtest_runs.id"), nullable=False)
    type = Column(String, nullable=False)
    entry_date = Column(String, nullable=False)
    exit_date = Column(String, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=False)
    profit_loss = Column(Float, nullable=False)
    net_return_pct = Column(Float, nullable=False)
    equity_after = Column(Float, nullable=False)

    run = relationship("BacktestRun", back_populates="trades")


class WalkForwardRun(Base):
    """
    Persistence for the strategy-agnostic Walk-Forward mode, kept fully
    separate from BacktestRun/TradeRecord (a plain single full-range run).
    The stitched trade_log is stored as a JSON blob rather than a child
    table -- a walk-forward run's trades aren't queried individually, so a
    relational child table would add join overhead for no benefit here.
    """

    __tablename__ = "walk_forward_runs"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, nullable=False)
    strategy = Column(String, nullable=False)
    interval = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    initial_capital = Column(Float, nullable=False)
    commission_pct = Column(Float, nullable=False)
    spread_pct = Column(Float, nullable=False, default=0.0002)
    slippage_pct = Column(Float, nullable=False, default=0.0001)
    overnight_financing_pct = Column(Float, nullable=False, default=0.0)
    train_months = Column(Integer, nullable=False)
    trade_months = Column(Integer, nullable=False)
    step_months = Column(Integer, nullable=False)
    window_unit = Column(String, nullable=False, default="months")
    strategy_params = Column(JSON, nullable=False, default=dict)
    metrics = Column(JSON, nullable=False, default=dict)
    window_metrics = Column(JSON, nullable=False, default=list)
    trade_log = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LiveTradeRecord(Base):
    """
    Audit trail for the live bot (Phase 6). One row per instrument acted on
    per tick, including noop and risk-guard-skip rows -- the point is a full
    record of every decision the bot made, not just executed trades.
    """

    __tablename__ = "live_trade_records"

    id = Column(Integer, primary_key=True, index=True)
    instrument = Column(String, nullable=False)
    strategy = Column(String, nullable=False)
    action = Column(String, nullable=False)  # buy | sell | close | noop | error | skipped_risk_guard
    desired_position = Column(String, nullable=False)  # long | short | flat
    prior_position = Column(String, nullable=False)  # long | short | flat
    units = Column(Integer, nullable=True)
    signal_time = Column(String, nullable=False)
    oanda_response = Column(JSON, nullable=True)
    error_detail = Column(String, nullable=True)
    account_balance_after = Column(Float, nullable=True)
    realized_pl = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
