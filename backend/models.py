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

from database import Base


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
