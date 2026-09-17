import pandas as pd

from app.services.backtester import run_iterative_backtest
from app.services.analytics import calculate_metrics
from app.utils.indicators import extract_indicator_data

MAX_WINDOWS = 100

WINDOW_UNITS = ("days", "weeks", "months")


def _offset(n, unit):
    """
    A length `n` in `unit` as something addable to a Timestamp. "months" uses
    DateOffset (calendar-aware: adding 1 month to Jan 31 lands on the last day
    of Feb, not an invalid date); "days"/"weeks" are exact fixed-length spans,
    so plain Timedelta is enough for them.
    """
    if unit == "months":
        return pd.DateOffset(months=n)
    if unit == "weeks":
        return pd.Timedelta(weeks=n)
    if unit == "days":
        return pd.Timedelta(days=n)
    raise ValueError(f"Unknown window_unit '{unit}'; expected one of {WINDOW_UNITS}.")


def generate_windows(dates, train_months=12, trade_months=3, step_months=None, window_unit="months"):
    """
    Splits a date range into rolling (train_start, train_end, trade_start, trade_end)
    windows, anchored to `window_unit`-sized steps (days/weeks/months). trade_end is
    exclusive of overall_end's boundary check but the window itself is [train_start,
    train_end) train / [trade_start, trade_end) trade, with train_end == trade_start
    (no gap, no overlap). train_months/trade_months/step_months are lengths measured
    in `window_unit`, not necessarily calendar months, despite the field names kept
    for backward compatibility with existing saved runs (which default to "months").
    """
    if step_months is None:
        step_months = trade_months

    dates = pd.to_datetime(pd.Series(dates)).sort_values()
    if dates.empty:
        raise ValueError("No dates available to build walk-forward windows.")

    overall_start = dates.iloc[0]
    overall_end = dates.iloc[-1]

    train_offset = _offset(train_months, window_unit)
    trade_offset = _offset(trade_months, window_unit)
    step_offset = _offset(step_months, window_unit)

    windows = []
    window_start = overall_start
    while True:
        train_end = window_start + train_offset
        trade_end = train_end + trade_offset
        if trade_end > overall_end:
            break
        windows.append((window_start, train_end, train_end, trade_end))
        if len(windows) > MAX_WINDOWS:
            raise ValueError(
                f"Walk-forward parameters produced more than {MAX_WINDOWS} windows; "
                "widen train/trade/step length (or switch to a coarser window_unit) "
                "or shorten the date range."
            )
        window_start = window_start + step_offset

    if not windows:
        raise ValueError(
            "Date range is too short to form a single walk-forward window with the "
            f"given train={train_months}/trade={trade_months} {window_unit}."
        )

    return windows


def run_walk_forward_backtest(
    raw_data: list,
    strategy_class,
    strategy_params: dict,
    train_months: int = 12,
    trade_months: int = 3,
    step_months: int | None = None,
    window_unit: str = "months",
    initial_capital: float = 10000.0,
    commission_pct: float = 0.001,
    spread_pct: float = 0.0002,
    slippage_pct: float = 0.0001,
    overnight_financing_pct: float = 0.0,
    pair_raw_data: list | None = None,
) -> dict:
    """
    Drives a strategy through rolling train/trade windows, stitching the traded
    segments into one continuous equity curve. Capital carries forward from the
    end of one window to the start of the next.
    """
    df = pd.DataFrame(raw_data)
    df["time"] = pd.to_datetime(df["time"])

    pair_df = None
    if pair_raw_data is not None:
        pair_df = pd.DataFrame(pair_raw_data)
        pair_df["time"] = pd.to_datetime(pair_df["time"])

    windows = generate_windows(df["time"], train_months, trade_months, step_months, window_unit)

    equity = initial_capital
    combined_equity_curve = []
    combined_trade_log = []
    window_metrics = []
    importances = []
    indicator_series = {}

    for idx, (train_start, train_end, trade_start, trade_end) in enumerate(windows):
        train_df = df[(df["time"] >= train_start) & (df["time"] < train_end)].reset_index(drop=True)
        trade_df = df[(df["time"] >= trade_start) & (df["time"] < trade_end)].reset_index(drop=True)
        if trade_df.empty:
            continue

        train_df_str = train_df.copy()
        train_df_str["time"] = train_df_str["time"].astype(str)
        trade_df_str = trade_df.copy()
        trade_df_str["time"] = trade_df_str["time"].astype(str)

        strategy_kwargs = dict(strategy_params)
        if pair_df is not None:
            pair_train_df = pair_df[
                (pair_df["time"] >= train_start) & (pair_df["time"] < train_end)
            ].reset_index(drop=True)
            pair_trade_df = pair_df[
                (pair_df["time"] >= trade_start) & (pair_df["time"] < trade_end)
            ].reset_index(drop=True)
            pair_trade_df_str = pair_trade_df.copy()
            pair_trade_df_str["time"] = pair_trade_df_str["time"].astype(str)
            strategy_kwargs["pair_data"] = pair_trade_df_str.to_dict("records")

        strategy_instance = strategy_class(trade_df_str.to_dict("records"), **strategy_kwargs)
        strategy_instance.train_df = train_df_str
        if pair_df is not None:
            pair_train_df_str = pair_train_df.copy()
            pair_train_df_str["time"] = pair_train_df_str["time"].astype(str)
            strategy_instance.pair_train_df = pair_train_df_str

        window_signals = strategy_instance.generate_signals_for_window(
            train_df_str, trade_df_str
        )

        if window_signals is None or window_signals.empty:
            continue

        window_indicators = extract_indicator_data(strategy_instance, window_signals)
        for key, spec in window_indicators.items():
            bucket = indicator_series.setdefault(
                key, {"label": spec["label"], "color": spec["color"], "scale": spec["scale"], "data": []}
            )
            bucket["data"].extend(spec["data"])

        equity_at_window_start = equity
        window_equity_curve, window_trade_log = run_iterative_backtest(
            df=window_signals,
            initial_capital=equity,
            commission_pct=commission_pct,
            spread_pct=spread_pct,
            slippage_pct=slippage_pct,
            overnight_financing_pct=overnight_financing_pct,
            force_close_at_end=True,
        )
        if window_equity_curve:
            equity = window_equity_curve[-1]["equity"]

        combined_equity_curve.extend(window_equity_curve)
        combined_trade_log.extend(window_trade_log)
        window_metrics.append(
            {
                "window_index": idx,
                "train_start": str(train_start.date()),
                "train_end": str(train_end.date()),
                "trade_start": str(trade_start.date()),
                "trade_end": str(trade_end.date()),
                "metrics": calculate_metrics(
                    window_equity_curve, window_trade_log, equity_at_window_start
                ),
            }
        )

        window_importance = getattr(strategy_instance, "last_feature_importance", None)
        if window_importance:
            importances.append(window_importance)

    if not combined_equity_curve:
        raise ValueError(
            "Walk-forward produced no tradeable windows for the given date range/params."
        )

    feature_importance = None
    if importances:
        feature_importance = (
            pd.DataFrame(importances).fillna(0).mean().to_dict()
        )

    return {
        "equity_curve": combined_equity_curve,
        "trade_log": combined_trade_log,
        "window_metrics": window_metrics,
        "feature_importance": feature_importance,
        "indicator_data": indicator_series,
    }
