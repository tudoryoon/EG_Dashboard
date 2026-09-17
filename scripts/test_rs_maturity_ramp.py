from __future__ import annotations

import pandas as pd

import update_market_rs as rs


def legacy_weighted(period_ratings: dict[str, pd.DataFrame]) -> pd.DataFrame:
    first = next(iter(period_ratings.values()))
    weighted_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)
    weight_sum = pd.DataFrame(0.0, index=first.index, columns=first.columns)
    for period_key, weight in rs.RS_WEIGHTS.items():
        component = period_ratings[period_key]
        weighted_sum = weighted_sum.add(component.fillna(0).mul(weight), fill_value=0)
        weight_sum = weight_sum.add(component.notna().astype(float).mul(weight), fill_value=0)
    return weighted_sum.div(weight_sum.where(weight_sum > 0)).round().clip(lower=1, upper=99)


def main() -> None:
    dates = pd.bdate_range("2025-01-02", periods=430)
    columns = ["MATURE", "NEW"]
    period_ratings: dict[str, pd.DataFrame] = {}
    values = {"1m": (70.0, 83.0), "3m": (60.0, 9.0), "6m": (50.0, 55.0), "12m": (40.0, 45.0)}
    listing_offset = 100
    for period_key, (mature_value, new_value) in values.items():
        frame = pd.DataFrame(index=dates, columns=columns, dtype=float)
        frame.loc[dates[rs.LOOKBACKS[period_key] :], "MATURE"] = mature_value
        new_start = listing_offset + rs.LOOKBACKS[period_key]
        frame.loc[dates[new_start:], "NEW"] = new_value
        period_ratings[period_key] = frame

    limited = pd.Series({"MATURE": False, "NEW": True})
    ramped = rs.weighted_rs_rating(period_ratings, limited)
    legacy = legacy_weighted(period_ratings)
    pd.testing.assert_series_equal(ramped["MATURE"], legacy["MATURE"])

    first_3m_index = listing_offset + rs.LOOKBACKS["3m"]
    first_3m_score = round((83 * 0.20 + 9 * (0.40 / 21)) / (0.20 + 0.40 / 21))
    assert ramped.iloc[first_3m_index]["NEW"] == first_3m_score
    full_3m_index = first_3m_index + rs.RS_MATURITY_RAMP_SESSIONS - 1
    assert ramped.iloc[full_3m_index]["NEW"] == legacy.iloc[full_3m_index]["NEW"]

    close = pd.DataFrame(index=dates, columns=columns, dtype=float)
    close["MATURE"] = range(1, len(dates) + 1)
    close.loc[dates[listing_offset]:, "NEW"] = range(1, len(dates) - listing_offset + 1)
    detected = rs.identify_limited_history_tickers(close)
    assert not bool(detected["MATURE"])
    assert bool(detected["NEW"])

    singleton = pd.DataFrame([[1.0, None], [2.0, 3.0]], columns=["A", "B"])
    singleton_rating = rs.percentile_to_rating(singleton)
    assert singleton_rating.iloc[0]["A"] == 99
    assert pd.isna(singleton_rating.iloc[0]["B"])

    provisional = rs.rs_provisional_status(period_ratings, limited)
    assert not bool(provisional["MATURE"])
    assert not bool(provisional["NEW"]), "The synthetic NEW ticker has completed its 12M ramp."
    short_periods = {key: frame.iloc[: listing_offset + 200] for key, frame in period_ratings.items()}
    short_provisional = rs.rs_provisional_status(short_periods, limited)
    assert bool(short_provisional["NEW"])

    print("Validated RS maturity ramp and pre-listing null handling.")


if __name__ == "__main__":
    main()
