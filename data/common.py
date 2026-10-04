"""Shared configuration and British Columbia boundary for data notebooks."""

from datetime import date
from pathlib import Path
import time

import geopandas as gpd
import requests

YEAR = 2023
START = date(YEAR, 5, 1)
END = date(YEAR, 10, 31)
BC_BBOX = "-139.1,48.2,-114.0,60.0"


def load_bc_boundary():
    """Return one BC geometry in EPSG:4326, caching Natural Earth admin-1 data.

    Source: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
    The generalized coastline can exclude some near-shore detections.
    """
    cache_dir = Path(__file__).resolve().parent / "raw" / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    boundary_path = cache_dir / "ne_10m_admin_1_states_provinces.zip"
    if not boundary_path.exists():
        url = (
            "https://naturalearth.s3.amazonaws.com/10m_cultural/"
            "ne_10m_admin_1_states_provinces.zip"
        )
        for attempt in range(4):
            try:
                response = requests.get(url, timeout=(15, 120))
                response.raise_for_status()
            except requests.RequestException:
                if attempt == 3:
                    raise RuntimeError("Could not download the Natural Earth BC boundary.") from None
                time.sleep(2 ** (attempt + 1))
            else:
                boundary_path.write_bytes(response.content)
                break

    admin1 = gpd.read_file(boundary_path)
    bc = admin1[(admin1["admin"] == "Canada") & (admin1["name"] == "British Columbia")]
    if bc.empty:
        raise RuntimeError("British Columbia was not found in the Natural Earth boundary.")
    return bc[["geometry"]].to_crs("EPSG:4326").dissolve().reset_index(drop=True)
