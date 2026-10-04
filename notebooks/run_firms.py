"""Download and clean BC FIRMS detections, one year at a time.

Runs 01_get_bc_data.ipynb through papermill for each year's May 1 - Oct 31 season.
Run with:  python notebooks/run_firms.py

Rerunning resumes: finished years are skipped, and the notebook reuses its cached chunks.
"""

from pathlib import Path
import sys

import papermill as pm

YEARS = [2022, 2019, 2020, 2021, 2023]

NOTEBOOKS_DIR = Path(__file__).resolve().parent
REPO_ROOT = NOTEBOOKS_DIR.parent
PROCESSED_DIR = REPO_ROOT / "data" / "processed" / "firms"
RUNS_DIR = NOTEBOOKS_DIR / "runs"


def main():
    RUNS_DIR.mkdir(exist_ok=True)
    for year in YEARS:
        processed_path = PROCESSED_DIR / f"firms_bc_{year}.csv"
        if processed_path.exists():
            print(f"{year}: {processed_path.name} already exists, skipping.")
            continue
        print(f"{year}: running 01_get_bc_data.ipynb ...")
        try:
            pm.execute_notebook(
                NOTEBOOKS_DIR / "01_get_bc_data.ipynb",
                RUNS_DIR / f"01_get_bc_data_{year}.ipynb",
                parameters={"YEAR": year, "START": f"{year}-05-01", "END": f"{year}-10-31"},
                cwd=NOTEBOOKS_DIR,
            )
        except Exception as error:
            print(f"{year}: FAILED\n{error}")
            sys.exit(1)
        print(f"{year}: done.")


if __name__ == "__main__":
    main()
