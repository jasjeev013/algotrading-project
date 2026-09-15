def extract_indicator_data(strategy_instance, signal_df) -> dict:
    """
    Reshape a strategy's INDICATOR_COLUMNS (e.g. SMA lines, Bollinger bands)
    out of its signal DataFrame into the {key: {label, color, data}} shape
    the frontend's chart overlay expects.
    """
    result = {}
    for col_spec in getattr(strategy_instance, "INDICATOR_COLUMNS", []):
        col = col_spec["key"]
        if col not in signal_df.columns:
            continue
        series = signal_df[["time", col]].dropna(subset=[col])
        result[col] = {
            "label": col_spec["label"],
            "color": col_spec["color"],
            "data": [
                {"time": str(r["time"]), "value": float(r[col])}
                for _, r in series.iterrows()
            ],
        }
    return result
