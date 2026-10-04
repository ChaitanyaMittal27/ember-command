"""Station-placement helpers: scoring, greedy and exact solvers, coverage curves and truck sizing.

Conventions used everywhere:
- A cost matrix has one row per fire (or demand cell) and one column per candidate site.
  Values are travel minutes. The column index is the candidate's cand_id.
- Coverage is the share of fire weight within `threshold` minutes of its nearest open site.
- The ceiling is the coverage with every column of the matrix open.
- Everything is deterministic: ties go to the lowest cand_id and nothing is random.

Settings such as the threshold live in data/processed/model/config.json (see load_model);
nothing here hardcodes them.

Run `python notebooks/stations.py` for a smoke test on the real files.
"""

from pathlib import Path
import json
import math

import numpy as np
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent.parent / "data" / "processed" / "model"


# ---------------------------------------------------------------- loading

def load_model(model_dir=MODEL_DIR):
    """Load candidates, demand tables, cost matrices and config written by 04_candidates_costs."""
    model_dir = Path(model_dir)
    model = {
        "candidates": pd.read_parquet(model_dir / "candidates.parquet"),
        "demand_train": pd.read_parquet(model_dir / "demand_train.parquet"),
        "demand_test": pd.read_parquet(model_dir / "demand_test.parquet"),
        "demand_cells": pd.read_parquet(model_dir / "demand_cells.parquet"),
        "cost_train": np.load(model_dir / "cost_train.npy"),
        "cost_test": np.load(model_dir / "cost_test.npy"),
        "cost_cells": np.load(model_dir / "cost_cells.npy"),
        "config": json.loads((model_dir / "config.json").read_text(encoding="utf-8")),
    }
    n_candidates = len(model["candidates"])
    for name in ("train", "test", "cells"):
        expected = (len(model[f"demand_{name}"]), n_candidates)
        assert model[f"cost_{name}"].shape == expected, (
            f"cost_{name} is {model[f'cost_{name}'].shape}, expected {expected}")
    assert (model["candidates"]["cand_id"].to_numpy() == np.arange(n_candidates)).all()
    return model


# ---------------------------------------------------------------- small helpers

def _sites(sites):
    """Sorted, de-duplicated integer array of site indices (None means no sites)."""
    return np.unique(np.asarray([] if sites is None else sites, dtype=int))


def _weights(weights, n_rows):
    weights = np.asarray(weights, dtype=float)
    assert weights.shape == (n_rows,), "weights must have one value per cost-matrix row"
    return weights


def _coverage(nearest, weights, threshold):
    return float(weights[nearest <= threshold].sum() / weights.sum())


def _weighted_median(values, weights):
    order = np.argsort(values, kind="stable")
    cumulative = np.cumsum(weights[order])
    return float(values[order][np.searchsorted(cumulative, cumulative[-1] / 2)])


def ceiling(cost, weights, threshold):
    """Coverage with every candidate open: the best any layout from these candidates can do."""
    return _coverage(cost.min(axis=1), _weights(weights, len(cost)), threshold)


# ---------------------------------------------------------------- scoring

def evaluate(cost, weights, open_sites, threshold, regions=None):
    """Score a set of open sites: every fire is served by its nearest open site.

    Returns a dict with:
      coverage            weighted share of fires within `threshold` minutes
      ceiling             the same with every candidate open
      coverage_relative   coverage / ceiling
      mean_minutes, median_minutes   weighted, to the nearest open site
      uncovered           indices of fires beyond the threshold
      assignment          site serving each fire (cand_id)
      minutes             minutes from that site to each fire
      by_region           DataFrame per region (only when `regions` is given):
                          weight, coverage, ceiling, coverage_relative
    """
    weights = _weights(weights, len(cost))
    open_sites = _sites(open_sites)
    if len(open_sites) == 0:
        raise ValueError("open_sites is empty")
    open_cost = cost[:, open_sites]
    nearest_column = open_cost.argmin(axis=1)  # first minimum, so ties go to the lowest cand_id
    minutes = open_cost[np.arange(len(cost)), nearest_column]
    covered = minutes <= threshold
    all_open_covered = cost.min(axis=1) <= threshold
    top = float(weights[all_open_covered].sum() / weights.sum())
    coverage = float(weights[covered].sum() / weights.sum())
    result = {
        "coverage": coverage,
        "ceiling": top,
        "coverage_relative": coverage / top if top > 0 else float("nan"),
        "mean_minutes": float(np.average(minutes, weights=weights)),
        "median_minutes": _weighted_median(minutes, weights),
        "uncovered": np.flatnonzero(~covered),
        "assignment": open_sites[nearest_column],
        "minutes": minutes,
    }
    if regions is not None:
        regions = np.asarray(regions)
        rows = []
        for region in sorted(set(regions)):
            inside = regions == region
            weight = weights[inside].sum()
            region_coverage = float(weights[inside & covered].sum() / weight)
            region_ceiling = float(weights[inside & all_open_covered].sum() / weight)
            rows.append({"region": region, "weight": float(weight), "coverage": region_coverage,
                         "ceiling": region_ceiling,
                         "coverage_relative": region_coverage / region_ceiling if region_ceiling > 0 else float("nan")})
        result["by_region"] = pd.DataFrame(rows).set_index("region")
    return result


# ---------------------------------------------------------------- greedy solvers

def _start(cost, fixed):
    """Minutes to the nearest fixed site (infinite if there are none) and the open mask."""
    fixed = _sites(fixed)
    is_open = np.zeros(cost.shape[1], dtype=bool)
    is_open[fixed] = True
    nearest = cost[:, fixed].min(axis=1).astype(float) if len(fixed) else np.full(len(cost), np.inf)
    return nearest, is_open


def _best_minutes_site(cost, weights, nearest, allowed):
    """The allowed site that gives the lowest weighted total minutes when added (lowest cand_id on ties)."""
    totals = weights @ np.minimum(nearest[:, None], cost)
    totals[~allowed] = np.inf
    return int(totals.argmin())


def greedy_pmedian(cost, weights, k_max, fixed=None):
    """Nested greedy p-median: add, one at a time, the site that most reduces weighted total minutes.

    `fixed` sites are open from the start and do not count toward K.
    Returns {"picks": [site for K=1, 2, ...], "objective": [weighted total minutes at each K]}.
    """
    weights = _weights(weights, len(cost))
    nearest, is_open = _start(cost, fixed)
    picks, objective = [], []
    for _ in range(min(k_max, int((~is_open).sum()))):
        site = _best_minutes_site(cost, weights, nearest, ~is_open)
        is_open[site] = True
        nearest = np.minimum(nearest, cost[:, site])
        picks.append(site)
        objective.append(float(weights @ nearest))
    return {"picks": picks, "objective": objective}


def greedy_coverage(cost, weights, k_max, threshold, fixed=None):
    """Nested greedy coverage: add, one at a time, the site that covers the most uncovered weight.

    `fixed` sites are open from the start and do not count toward K.
    Returns {"picks": [...], "objective": [weighted coverage at each K]}.
    """
    weights = _weights(weights, len(cost))
    nearest, is_open = _start(cost, fixed)
    within = cost <= threshold
    covered = nearest <= threshold
    picks, objective = [], []
    for _ in range(min(k_max, int((~is_open).sum()))):
        gains = (weights * ~covered) @ within
        gains[is_open] = -1.0
        site = int(gains.argmax())  # first maximum, so ties go to the lowest cand_id
        is_open[site] = True
        covered |= within[:, site]
        picks.append(site)
        objective.append(float(weights[covered].sum() / weights.sum()))
    return {"picks": picks, "objective": objective}


def greedy_fair(cost, weights, regions_demand, regions_cand, k_max, fixed=None):
    """Greedy p-median that first gives every region one station.

    Seeds: for each region in name order, add the candidate located in that region that most
    reduces that region's weighted minutes, given the sites already open. Then continue with
    greedy_pmedian from those seeds up to k_max sites in total. Seeds count toward K; `fixed` do not.
    Returns {"picks": [...], "objective": [weighted total minutes at each K], "seeds": [...]}.
    """
    weights = _weights(weights, len(cost))
    regions_demand, regions_cand = np.asarray(regions_demand), np.asarray(regions_cand)
    regions = sorted(set(regions_demand))
    if k_max < len(regions):
        raise ValueError(f"k_max={k_max} is smaller than the number of regions ({len(regions)})")
    nearest, is_open = _start(cost, fixed)
    picks, objective = [], []
    for region in regions:
        allowed = (regions_cand == region) & ~is_open
        if not allowed.any():
            raise ValueError(f"no free candidate in region {region!r}")
        region_weights = np.where(regions_demand == region, weights, 0.0)
        site = _best_minutes_site(cost, region_weights, nearest, allowed)
        is_open[site] = True
        nearest = np.minimum(nearest, cost[:, site])
        picks.append(site)
        objective.append(float(weights @ nearest))
    rest = greedy_pmedian(cost, weights, k_max - len(picks), fixed=np.flatnonzero(is_open))
    return {"picks": picks + rest["picks"], "objective": objective + rest["objective"], "seeds": list(picks)}


# ---------------------------------------------------------------- exact solvers (spopt + HiGHS)

def _predefined(fixed, n_sites):
    """spopt wants a 0/1 array marking the facilities that must be open."""
    fixed = _sites(fixed)
    if len(fixed) == 0:
        return None
    flags = np.zeros(n_sites, dtype=int)
    flags[fixed] = 1
    return flags


def _solve(model, time_limit_s=None):
    """Solve a spopt model with HiGHS. Returns the open sites, or None if not proven optimal."""
    import pulp
    try:
        model.solve(pulp.HiGHS(msg=False, timeLimit=time_limit_s), results=False)
    except RuntimeError:  # spopt raises when the solver status is not optimal
        return None
    if model.problem.sol_status != pulp.LpSolutionOptimal:
        return None
    return [site for site, variable in enumerate(model.fac_vars) if variable.value() > 0.5]


def exact_coverage(cost, weights, k, threshold, fixed=None):
    """Maximal covering (spopt MCLP, HiGHS): the k sites covering the most weight within `threshold`.

    `fixed` sites are forced open and do not count toward k.
    Returns {"picks": sorted new sites, "open_sites": fixed + picks, "coverage": weighted share}.
    """
    from spopt.locate import MCLP
    weights = _weights(weights, len(cost))
    fixed = _sites(fixed)
    model = MCLP.from_cost_matrix(np.asarray(cost, dtype=float), weights, service_radius=threshold,
                                  p_facilities=k + len(fixed),
                                  predefined_facilities_arr=_predefined(fixed, cost.shape[1]))
    open_sites = _solve(model)
    if open_sites is None:
        raise RuntimeError("MCLP was not solved to optimality")
    picks = [site for site in open_sites if site not in set(fixed)]
    return {"picks": picks, "open_sites": open_sites,
            "coverage": _coverage(cost[:, open_sites].min(axis=1), weights, threshold)}


def exact_pmedian(cost_cells, weights_cells, k, time_limit_s=120):
    """Exact p-median (spopt PMedian, HiGHS) on the demand cells.

    Returns {"picks": sorted sites, "objective": weighted total minutes},
    or None if it is not solved to optimality within the time limit.
    """
    from spopt.locate import PMedian
    weights_cells = _weights(weights_cells, len(cost_cells))
    model = PMedian.from_cost_matrix(np.asarray(cost_cells, dtype=float), weights_cells, p_facilities=k)
    picks = _solve(model, time_limit_s)
    if picks is None:
        return None
    return {"picks": picks, "objective": float(weights_cells @ cost_cells[:, picks].min(axis=1))}


# ---------------------------------------------------------------- curves

def coverage_curve(cost, weights, picks, threshold):
    """Coverage for every K along a pick order.

    Returns a DataFrame with one row per K: k, site (added at that K), coverage,
    coverage_relative (to the ceiling) and mean_minutes. The ceiling is in `.attrs["ceiling"]`.
    """
    weights = _weights(weights, len(cost))
    top = ceiling(cost, weights, threshold)
    nearest = np.full(len(cost), np.inf)
    rows = []
    for k, site in enumerate(picks, start=1):
        nearest = np.minimum(nearest, cost[:, site])
        coverage = _coverage(nearest, weights, threshold)
        rows.append({"k": k, "site": int(site), "coverage": coverage,
                     "coverage_relative": coverage / top if top > 0 else float("nan"),
                     "mean_minutes": float(np.average(nearest, weights=weights))})
    curve = pd.DataFrame(rows)
    curve.attrs["ceiling"] = top
    return curve


def min_k_for_target(curve, target=0.95, relative_to_ceiling=True):
    """The first K whose coverage reaches `target`.

    Returns {"k": int, "status": "reached", "ceiling": ...}, or
    {"k": None, "status": "not reachable", "ceiling": ...} if no K on the curve gets there.
    """
    values = curve["coverage_relative" if relative_to_ceiling else "coverage"].to_numpy()
    reached = np.flatnonzero(values >= target)
    top = curve.attrs.get("ceiling")
    if len(reached) == 0:
        return {"k": None, "status": "not reachable", "ceiling": top}
    return {"k": int(curve["k"].iloc[reached[0]]), "status": "reached", "ceiling": top}


def find_elbow(curve):
    """The K farthest from the straight line joining the curve's two endpoints.

    K and coverage are both rescaled to 0-1 first, so the answer does not depend on units.
    Ties go to the lowest K.
    """
    k = curve["k"].to_numpy(dtype=float)
    coverage = curve["coverage"].to_numpy(dtype=float)
    if len(curve) < 3 or coverage[-1] == coverage[0]:
        return int(k[0])
    x = (k - k[0]) / (k[-1] - k[0])
    y = (coverage - coverage[0]) / (coverage[-1] - coverage[0])
    distance = np.abs(y - x) / math.sqrt(2)  # distance to the line y = x
    return int(k[distance.argmax()])


# ---------------------------------------------------------------- trucks

def trucks_per_station(demand, assignment, percentile=90):
    """Trucks needed at each station, from how many of its fires burn at the same time.

    A fire is active from first_date through first_date + active_days_capped - 1.
    For each station, count its active fires on every day of the season (days with none count
    as zero), take the given percentile of those daily counts, round up, with a minimum of 1.
    The season of each year runs from that year's earliest first_date to its latest active day
    across all of `demand`, so every station is measured over the same days.

    Returns a Series of trucks indexed by station (cand_id), sorted.
    """
    first = pd.to_datetime(demand["first_date"]).dt.normalize().to_numpy().astype("datetime64[D]")
    duration = demand["active_days_capped"].to_numpy().astype(int)
    last = first + (duration - 1).astype("timedelta64[D]")
    years = first.astype("datetime64[Y]")
    assignment = np.asarray(assignment)
    assert len(assignment) == len(demand)

    season_days = []
    for year in np.unique(years):
        in_year = years == year
        season_days.append(np.arange(first[in_year].min(), last[in_year].max() + np.timedelta64(1, "D")))
    season_days = np.concatenate(season_days)

    trucks = {}
    for station in np.unique(assignment):
        mine = assignment == station
        active = ((first[mine][None, :] <= season_days[:, None])
                  & (season_days[:, None] <= last[mine][None, :])).sum(axis=1)
        trucks[int(station)] = max(1, math.ceil(np.percentile(active, percentile)))
    return pd.Series(trucks, name="trucks", dtype=int).rename_axis("station")


def allocate_trucks(load, budget):
    """Split `budget` trucks across stations in proportion to `load`.

    Largest-remainder rounding, so the result sums exactly to the budget. When the budget is at
    least the number of stations, every station gets at least 1 truck (taken from the stations
    with the most). Ties go to the first station. Returns an integer array in the order of `load`.
    """
    load = np.asarray(load, dtype=float)
    n = len(load)
    if budget < 0 or (load < 0).any():
        raise ValueError("budget and load must be non-negative")
    if n == 0:
        return np.zeros(0, dtype=int)
    share = load / load.sum() if load.sum() > 0 else np.full(n, 1 / n)
    quota = share * budget
    trucks = np.floor(quota).astype(int)
    by_remainder = np.argsort(-(quota - trucks), kind="stable")
    trucks[by_remainder[: budget - trucks.sum()]] += 1
    if budget >= n:
        while (trucks == 0).any():
            trucks[trucks.argmax()] -= 1
            trucks[np.flatnonzero(trucks == 0)[0]] += 1
    return trucks


# ---------------------------------------------------------------- smoke test

if __name__ == "__main__":
    model = load_model()
    config = model["config"]
    threshold = config["THRESHOLD_MIN"]
    demand, cost = model["demand_train"], model["cost_train"]
    weights = demand["weight"].to_numpy()
    K = 10
    solution = greedy_pmedian(cost, weights, K)
    score = evaluate(cost, weights, solution["picks"], threshold, regions=demand["region"])
    names = model["candidates"].loc[solution["picks"], ["cand_id", "name", "kind", "region"]]
    print(f"Greedy p-median, K={K}, train {config['TRAIN_YEARS'][0]}-{config['TRAIN_YEARS'][-1]}, "
          f"threshold {threshold} min")
    print(names.to_string(index=False))
    print(f"coverage:             {score['coverage']:.1%}")
    print(f"ceiling (all open):   {score['ceiling']:.1%}")
    print(f"relative to ceiling:  {score['coverage_relative']:.1%}")
    print(f"weighted mean minutes: {score['mean_minutes']:.1f}  (median {score['median_minutes']:.1f})")
    print("per region:")
    print((score["by_region"].assign(weight=score["by_region"]["weight"].round(0))
           .round({"coverage": 3, "ceiling": 3, "coverage_relative": 3})).to_string())
