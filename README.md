# Ember Command

Real data sets the scenario. You rewrite the outcome.

Ember Command is a browser-based wildfire command-center strategy game set in
British Columbia. Real NASA FIRMS satellite detections from 2023 initialize
fires; the simulation and your decisions as commander determine what happens next.
Wind comes from ERA5 reanalysis (Copernicus/ECMWF), which assimilates satellite
observations, via Open-Meteo.

## Python setup

From the repository root in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Fill in the keys in `.env` locally. Run the data notebooks with this environment
selected as the Python kernel; the wind notebook needs no API key.

Raw downloads go in `data/raw/` and processed data in `data/processed/`.
Both are ignored by Git, as are the reference notebooks in `learning-docs/`.
