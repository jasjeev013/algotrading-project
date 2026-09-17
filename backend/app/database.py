from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

SQLALCHEMY_DATABASE_URL = "sqlite:///./quantdash.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    import app.models  # noqa: F401  (ensure models are registered before create_all)

    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()


def _run_lightweight_migrations():
    """
    Base.metadata.create_all() never alters existing tables. There's no
    Alembic in this project, so new nullable/defaulted columns on
    already-created tables are added here via a guarded ALTER TABLE,
    safe to run on every startup.
    """
    with engine.connect() as conn:
        cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(backtest_runs)"))
        }
        if "engine" not in cols:
            conn.execute(
                text(
                    "ALTER TABLE backtest_runs ADD COLUMN engine VARCHAR DEFAULT 'iterative'"
                )
            )
            conn.commit()

        try:
            live_cols = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info(live_trade_records)"))
            }
            if live_cols and "realized_pl" not in live_cols:
                conn.execute(text("ALTER TABLE live_trade_records ADD COLUMN realized_pl REAL"))
                conn.commit()
        except Exception:
            pass

        try:
            wf_cols = {
                row[1]
                for row in conn.execute(text("PRAGMA table_info(walk_forward_runs)"))
            }
            if wf_cols and "window_unit" not in wf_cols:
                conn.execute(
                    text(
                        "ALTER TABLE walk_forward_runs ADD COLUMN window_unit VARCHAR DEFAULT 'months'"
                    )
                )
                conn.commit()
        except Exception:
            pass
