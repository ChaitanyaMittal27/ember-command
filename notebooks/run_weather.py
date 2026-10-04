"""Download BC hourly weather (Open-Meteo ERA5-Seamless), one year at a time.

Runs 02_get_weather.ipynb through papermill for each year's May 1 - Oct 31 season.
Run with:  python notebooks/run_weather.py

Rerunning resumes: finished years are skipped, and the notebook reuses its cached batches.
"""

from pathlib import Path
import sys

import papermill as pm

YEARS = [2022, 2019, 2020, 2021, 2023]

NOTEBOOKS_DIR = Path(__file__).resolve().parent
REPO_ROOT = NOTEBOOKS_DIR.parent
WEATHER_DIR = REPO_ROOT / "data" / "raw" / "weather"
RUNS_DIR = NOTEBOOKS_DIR / "runs"


def main():
    RUNS_DIR.mkdir(exist_ok=True)
    for year in YEARS:
        weather_path = WEATHER_DIR / f"weather_bc_{year}.parquet"
        if weather_path.exists():
            print(f"{year}: {weather_path.name} already exists, skipping.")
            continue
        print(f"{year}: running 02_get_weather.ipynb ...")
        try:
            pm.execute_notebook(
                NOTEBOOKS_DIR / "02_get_weather.ipynb",
                RUNS_DIR / f"02_get_weather_{year}.ipynb",
                parameters={"YEAR": year, "START": f"{year}-05-01", "END": f"{year}-10-31"},
                cwd=NOTEBOOKS_DIR,
            )
        except Exception as error:
            # The notebook raises OpenMeteoLimitError on HTTP 429 or a limit message.
            if getattr(error, "ename", "") == "OpenMeteoLimitError":
                print(error.evalue)
                print("Open-Meteo limit reached; rerun later to resume")
            else:
                print(f"{year}: FAILED\n{error}")
            sys.exit(1)
        print(f"{year}: done.")


if __name__ == "__main__":
    main()
