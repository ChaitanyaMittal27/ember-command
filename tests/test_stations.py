"""Tests for notebooks/stations.py on tiny made-up data with known answers.

Run from the repo root:  python -m pytest tests
"""

from itertools import combinations
from pathlib import Path
import sys

import numpy as np
import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "notebooks"))
import stations as st

# ---- a 4-fire x 3-site example small enough to work out by hand
HAND_COST = np.array([[10, 50, 90],
                      [70, 20, 90],
                      [80, 65, 30],
                      [100, 95, 61]], dtype=float)
HAND_WEIGHTS = np.array([1, 2, 3, 4], dtype=float)
HAND_THRESHOLD = 60

# ---- a 10-fire x 6-site example: travel "minutes" between points on a 10 x 10 grid
FIRES = np.array([(0, 0), (1, 5), (2, 9), (4, 1), (5, 6), (6, 3), (7, 8), (8, 0), (9, 5), (3, 3)], dtype=float)
SITES = np.array([(1, 1), (2, 7), (5, 4), (7, 1), (8, 7), (4, 9)], dtype=float)
COST = np.hypot(FIRES[:, None, 0] - SITES[None, :, 0], FIRES[:, None, 1] - SITES[None, :, 1]) * 10 + 5
WEIGHTS = np.array([6, 1, 4, 1, 5, 9, 2, 6, 5, 3], dtype=float)
THRESHOLD = 35
REGIONS_SITES = np.array(["north", "north", "south", "south", "east", "east"])
REGIONS_FIRES = np.array(["north", "north", "east", "south", "south", "south", "east", "south", "east", "north"])


def total_minutes(sites):
    return float(WEIGHTS @ COST[:, list(sites)].min(axis=1))


def coverage(sites):
    return float(WEIGHTS[COST[:, list(sites)].min(axis=1) <= THRESHOLD].sum() / WEIGHTS.sum())


def brute_force(score, k, best=min, must_include=()):
    """Best k-site set by trying them all. Asserts the optimum is unique so picks can be compared."""
    free = [site for site in range(COST.shape[1]) if site not in must_include]
    scored = [(score(tuple(must_include) + combo), combo) for combo in combinations(free, k)]
    value = best(s for s, _ in scored)
    winners = [combo for s, combo in scored if np.isclose(s, value)]
    assert len(winners) == 1, "test data should have a unique optimum"
    return value, list(winners[0])


def test_cost_matrix_is_fires_by_sites():
    assert COST.shape == (10, 6)


# ---------------------------------------------------------------- evaluate

def test_evaluate_matches_hand_calculation():
    result = st.evaluate(HAND_COST, HAND_WEIGHTS, [0, 1], HAND_THRESHOLD, regions=["a", "a", "b", "b"])
    # nearest open site: fire 0 -> site 0 (10 min); fires 1, 2, 3 -> site 1 (20, 65, 95 min)
    assert result["assignment"].tolist() == [0, 1, 1, 1]
    assert result["minutes"].tolist() == [10, 20, 65, 95]
    assert result["uncovered"].tolist() == [2, 3]
    assert result["coverage"] == pytest.approx(3 / 10)          # weights 1 + 2 of 10
    assert result["ceiling"] == pytest.approx(6 / 10)           # all open: 10, 20, 30, 61 minutes
    assert result["coverage_relative"] == pytest.approx(0.5)    # 0.3 / 0.6
    assert result["mean_minutes"] == pytest.approx(62.5)        # (10 + 40 + 195 + 380) / 10
    assert result["median_minutes"] == 65                       # half the weight (5) is reached at 65
    regions = result["by_region"]
    assert regions.loc["a", ["coverage", "ceiling", "coverage_relative"]].tolist() == pytest.approx([1, 1, 1])
    assert regions.loc["b", ["coverage", "ceiling", "coverage_relative"]].tolist() == pytest.approx([0, 3 / 7, 0])


def test_evaluate_ties_go_to_lowest_site():
    cost = np.array([[30.0, 30.0, 30.0]])
    assert st.evaluate(cost, [1.0], [2, 1], 60)["assignment"].tolist() == [1]


# ---------------------------------------------------------------- greedy

def test_greedy_pmedian_k1_matches_brute_force():
    value, sites = brute_force(total_minutes, 1)
    result = st.greedy_pmedian(COST, WEIGHTS, 1)
    assert result["picks"] == sites
    assert result["objective"] == pytest.approx([value])


def test_greedy_coverage_k1_matches_brute_force():
    value, sites = brute_force(coverage, 1, best=max)
    result = st.greedy_coverage(COST, WEIGHTS, 1, THRESHOLD)
    assert result["picks"] == sites
    assert result["objective"] == pytest.approx([value])


def test_greedy_is_nested_and_objective_improves():
    short, long = st.greedy_pmedian(COST, WEIGHTS, 2), st.greedy_pmedian(COST, WEIGHTS, 6)
    assert long["picks"][:2] == short["picks"]
    assert sorted(long["picks"]) == list(range(6))
    assert all(a >= b for a, b in zip(long["objective"], long["objective"][1:]))
    assert long["objective"][1] == pytest.approx(total_minutes(long["picks"][:2]))
    covered = st.greedy_coverage(COST, WEIGHTS, 6, THRESHOLD)["objective"]
    assert all(a <= b for a, b in zip(covered, covered[1:]))


def test_greedy_ties_go_to_lowest_site():
    cost = np.array([[10.0, 10.0, 10.0], [20.0, 20.0, 20.0]])
    assert st.greedy_pmedian(cost, [1.0, 1.0], 3)["picks"] == [0, 1, 2]
    assert st.greedy_coverage(cost, [1.0, 1.0], 3, 15)["picks"] == [0, 1, 2]


def test_greedy_fair_puts_a_site_in_every_region():
    result = st.greedy_fair(COST, WEIGHTS, REGIONS_FIRES, REGIONS_SITES, 4)
    assert len(result["picks"]) == 4 and len(set(result["picks"])) == 4
    assert set(REGIONS_SITES[result["seeds"]]) == {"north", "south", "east"}
    assert result["picks"][:3] == result["seeds"]
    assert result["objective"][-1] == pytest.approx(total_minutes(result["picks"]))
    with pytest.raises(ValueError):
        st.greedy_fair(COST, WEIGHTS, REGIONS_FIRES, REGIONS_SITES, 2)


def test_greedy_fair_seed_is_best_for_its_region():
    seeds = st.greedy_fair(COST, WEIGHTS, REGIONS_FIRES, REGIONS_SITES, 3)["seeds"]
    # "east" comes first in name order, so its seed is chosen with nothing else open
    east_fires = REGIONS_FIRES == "east"
    east_sites = np.flatnonzero(REGIONS_SITES == "east")
    best = east_sites[np.argmin([WEIGHTS[east_fires] @ COST[east_fires, site] for site in east_sites])]
    assert seeds[0] == best


# ---------------------------------------------------------------- fixed sites

def test_fixed_sites_are_kept_and_not_counted():
    fixed = [3]
    for result in (st.greedy_pmedian(COST, WEIGHTS, 2, fixed=fixed),
                   st.greedy_coverage(COST, WEIGHTS, 2, THRESHOLD, fixed=fixed),
                   st.greedy_fair(COST, WEIGHTS, REGIONS_FIRES, REGIONS_SITES, 3, fixed=fixed)):
        assert 3 not in result["picks"]
        assert len(result["picks"]) == len(result["objective"]) >= 2
    value, sites = brute_force(total_minutes, 1, must_include=(3,))
    result = st.greedy_pmedian(COST, WEIGHTS, 2, fixed=fixed)
    assert result["picks"][:1] == sites
    assert result["objective"][0] == pytest.approx(value)   # the fixed site is part of the score


def test_exact_coverage_with_fixed_site():
    value, sites = brute_force(coverage, 2, best=max, must_include=(0,))
    result = st.exact_coverage(COST, WEIGHTS, 2, THRESHOLD, fixed=[0])
    assert result["picks"] == sites
    assert result["open_sites"] == sorted([0] + sites)
    assert result["coverage"] == pytest.approx(value)


# ---------------------------------------------------------------- exact solvers

def test_exact_coverage_k2_matches_brute_force():
    value, sites = brute_force(coverage, 2, best=max)
    result = st.exact_coverage(COST, WEIGHTS, 2, THRESHOLD)
    assert result["picks"] == sites
    assert result["coverage"] == pytest.approx(value)


def test_exact_pmedian_k2_matches_brute_force():
    # Also confirms spopt's orientation: fires are rows, sites are columns.
    value, sites = brute_force(total_minutes, 2)
    result = st.exact_pmedian(COST, WEIGHTS, 2)
    assert result["picks"] == sites
    assert result["objective"] == pytest.approx(value)


def test_greedy_never_beats_exact():
    for k in (2, 3):
        assert st.greedy_pmedian(COST, WEIGHTS, k)["objective"][-1] >= st.exact_pmedian(COST, WEIGHTS, k)["objective"] - 1e-9
        assert (st.greedy_coverage(COST, WEIGHTS, k, THRESHOLD)["objective"][-1]
                <= st.exact_coverage(COST, WEIGHTS, k, THRESHOLD)["coverage"] + 1e-9)


# ---------------------------------------------------------------- curves

def test_coverage_curve_target_and_elbow():
    picks = st.greedy_coverage(COST, WEIGHTS, 6, THRESHOLD)["picks"]
    curve = st.coverage_curve(COST, WEIGHTS, picks, THRESHOLD)
    assert curve["k"].tolist() == [1, 2, 3, 4, 5, 6]
    assert curve["coverage"].tolist() == pytest.approx([coverage(picks[:k]) for k in range(1, 7)])
    assert curve.attrs["ceiling"] == pytest.approx(coverage(range(6)))
    assert curve["coverage_relative"].iloc[-1] == pytest.approx(1.0)   # all sites open = the ceiling

    hand = pd.DataFrame({"k": [1, 2, 3, 4, 5], "coverage": [0.2, 0.5, 0.7, 0.75, 0.8],
                         "coverage_relative": [0.25, 0.625, 0.875, 0.9375, 1.0]})
    hand.attrs["ceiling"] = 0.8
    assert st.min_k_for_target(hand, 0.95) == {"k": 5, "status": "reached", "ceiling": 0.8}
    assert st.min_k_for_target(hand, 0.85) == {"k": 3, "status": "reached", "ceiling": 0.8}
    assert st.min_k_for_target(hand, 0.95, relative_to_ceiling=False) == {"k": None, "status": "not reachable", "ceiling": 0.8}
    # rescaled points: (0, 0), (.25, .5), (.5, .833), (.75, .917), (1, 1); farthest from y = x is K=3
    assert st.find_elbow(hand) == 3


# ---------------------------------------------------------------- trucks

def test_trucks_per_station_matches_hand_count():
    demand = pd.DataFrame({
        "first_date": pd.to_datetime(["2021-06-01", "2021-06-02", "2021-06-03", "2021-06-10"]),
        "active_days_capped": [3, 2, 1, 1],
    })
    assignment = [5, 5, 5, 7]
    # Season: Jun 1 - Jun 10 (10 days).
    # Station 5 has 1, 2, 3 active fires on Jun 1, 2, 3 and 0 on the other 7 days.
    #   90th percentile of [0]*7 + [1, 2, 3] = 2.1 -> 3 trucks.
    # Station 7 has 1 fire on one day: 90th percentile 0.1 -> 1 truck.
    assert st.trucks_per_station(demand, assignment).to_dict() == {5: 3, 7: 1}
    assert st.trucks_per_station(demand, assignment, percentile=100).to_dict() == {5: 3, 7: 1}
    assert st.trucks_per_station(demand, assignment, percentile=50).to_dict() == {5: 1, 7: 1}  # minimum 1


def test_trucks_per_station_busy_days_only():
    demand = pd.DataFrame({
        "first_date": pd.to_datetime(["2021-06-01", "2021-06-02", "2021-06-03", "2021-06-10"]),
        "active_days_capped": [3, 2, 1, 1],
    })
    # Station 5 is busy on three days with 1, 2, 3 fires: 90th percentile of [1, 2, 3] = 2.8 -> 3 trucks.
    # Station 7 is busy on one day with 1 fire: 1 truck.
    assert st.trucks_per_station(demand, [5, 5, 5, 7], busy_days_only=True).to_dict() == {5: 3, 7: 1}


def test_trucks_per_station_modes_differ():
    demand = pd.DataFrame({
        "first_date": pd.to_datetime(["2021-06-01", "2021-06-01", "2021-06-10"]),
        "active_days_capped": [1, 1, 1],
    })
    assignment = [1, 1, 2]
    # Season: Jun 1 - Jun 10 (10 days). Station 1 has 2 fires on Jun 1 and none on the other 9 days.
    # Every season day: 90th percentile of [0]*9 + [2] = 0.2 -> rounds up to 1 truck.
    # Busy days only:   90th percentile of [2] = 2 -> 2 trucks.
    assert st.trucks_per_station(demand, assignment).to_dict() == {1: 1, 2: 1}
    assert st.trucks_per_station(demand, assignment, busy_days_only=True).to_dict() == {1: 2, 2: 1}


def test_trucks_per_station_seasons_are_per_year():
    demand = pd.DataFrame({
        "first_date": pd.to_datetime(["2021-06-01", "2021-06-01", "2022-06-01", "2022-06-01"]),
        "active_days_capped": [2, 2, 2, 2],
    })
    # Two 2-day seasons, two fires burning every day: 2 trucks. The months between seasons are not counted.
    assert st.trucks_per_station(demand, [1, 1, 1, 1]).to_dict() == {1: 2}


@pytest.mark.parametrize("load, budget, expected", [
    ([5, 3, 2], 10, [5, 3, 2]),
    ([5, 3, 2], 7, [4, 2, 1]),      # quotas 3.5, 2.1, 1.4: the extra truck goes to the largest remainder
    ([1, 1, 1], 4, [2, 1, 1]),      # tie on remainders: first station
    ([10, 0, 0], 3, [1, 1, 1]),     # budget allows one each
    ([10, 0, 0], 2, [2, 0, 0]),     # budget too small for one each
    ([0, 0], 5, [3, 2]),            # no load: equal split
    ([7, 1, 1, 1], 4, [1, 1, 1, 1]),
    ([3], 9, [9]),
])
def test_allocate_trucks_known_cases(load, budget, expected):
    assert st.allocate_trucks(load, budget).tolist() == expected


def test_allocate_trucks_always_sums_to_budget():
    loads = [[1, 2, 3, 4, 5], [0.3, 0.3, 0.4], [100, 1, 1, 1, 1, 1], [2.5, 2.5], [9, 0, 4, 0, 1, 7, 3]]
    for load in loads:
        for budget in range(0, 40):
            trucks = st.allocate_trucks(load, budget)
            assert trucks.sum() == budget and (trucks >= 0).all()
            if budget >= len(load):
                assert (trucks >= 1).all()
