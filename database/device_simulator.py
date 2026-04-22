"""
device_simulator.py
====================
Simulates a medical device by replaying rows from a Kaggle ICU CSV dataset
and POSTing each reading to the .NET backend REST API.

Kaggle dataset (free):
  "ICU Patients Vital Signs" — search on kaggle.com/datasets
  Expected columns (after download & rename):
    timestamp, heart_rate, spo2, systolic_bp, diastolic_bp, temperature, respiration

Usage:
  1. Download the dataset and save as: database/data/icu_vitals.csv
  2. Install deps:  pip install -r requirements.txt
  3. Run:           python device_simulator.py

Environment variables (optional — defaults shown below):
  BACKEND_API_URL   http://localhost:5000
  DEVICE_CODE       ICU-BED-01
  REPLAY_SPEED_SEC  1       (seconds between each row push)
"""

import os
import time
import csv
import json
import random
import requests
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from parent directory .env
load_dotenv(Path(__file__).parent.parent / ".env")

# ─── Config ─────────────────────────────────────────────────
BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:5000")
DEVICE_CODE: str     = os.getenv("DEVICE_CODE", "ICU-BED-01")
REPLAY_SPEED: float  = float(os.getenv("REPLAY_SPEED_SEC", "1"))
CSV_PATH: Path       = Path(__file__).parent / "data" / "icu_vitals.csv"

INGEST_ENDPOINT = f"{BACKEND_API_URL}/api/readings/ingest"

# ─── Column Mapping ─────────────────────────────────────────
COLUMN_MAP = {
    "heart_rate":       "heart_rate",
    "spo2":             "spo2",
    "systolic_bp":      "systolic_bp",
    "diastolic_bp":     "diastolic_bp",
    "temperature":      "temperature",
    "respiratory_rate": "respiration"
}

# ─── Alert Thresholds (for local logging only) ───────────────
THRESHOLDS = {
    "heart_rate":  {"min": 40, "max": 120},
    "spo2":        {"min": 90, "max": 100},
    "systolic_bp": {"min": 80, "max": 180},
}


def check_alert(payload: dict) -> str | None:
    """Return an alert message if any value exceeds clinical threshold."""
    for key, bounds in THRESHOLDS.items():
        val = payload.get(key)
        if val is None:
            continue
        if val < bounds["min"]:
            return f"LOW_{key.upper()}: {val} (min {bounds['min']})"
        if val > bounds["max"]:
            return f"HIGH_{key.upper()}: {val} (max {bounds['max']})"
    return None


def generate_synthetic_row() -> dict:
    """
    Fallback: generate a synthetic reading if no CSV is found.
    Values stay within realistic ICU ranges.
    """
    return {
        "heart_rate":   random.randint(55, 110),
        "spo2":         round(random.uniform(93.0, 100.0), 1),
        "systolic_bp":  random.randint(90, 160),
        "diastolic_bp": random.randint(60, 100),
        "temperature":  round(random.uniform(36.0, 38.5), 1),
        "respiration":  random.randint(12, 24),
    }


def stream_csv(path: Path):
    """Generator: yields one payload dict per CSV row, loops forever."""
    while True:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                payload = {}
                for csv_col, json_key in COLUMN_MAP.items():
                    raw = row.get(csv_col)
                    if raw is not None:
                        try:
                            payload[json_key] = float(raw)
                        except ValueError:
                            pass
                yield payload
        print("[simulator] CSV exhausted — restarting from row 1 (loop mode)")


def run():
    print(f"[simulator] Starting — target: {INGEST_ENDPOINT}")
    print(f"[simulator] Device:  {DEVICE_CODE}")
    print(f"[simulator] Speed:   {REPLAY_SPEED}s per reading")

    if CSV_PATH.exists():
        print(f"[simulator] Data source: {CSV_PATH}")
        source = stream_csv(CSV_PATH)
    else:
        print(f"[simulator] ⚠️  CSV not found at {CSV_PATH}")
        print("[simulator] Falling back to synthetic data generation.")
        source = (generate_synthetic_row() for _ in iter(int, 1))  # infinite

    for payload in source:
        body = {
            "deviceCode": DEVICE_CODE,
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }

        alert = check_alert(payload)
        if alert:
            print(f"[simulator] ⚠️  ALERT → {alert}")

        try:
            resp = requests.post(
                INGEST_ENDPOINT,
                json=body,
                timeout=30,
                headers={"Content-Type": "application/json"},
            )
            status = "✅" if resp.status_code in (200, 201) else f"❌ {resp.status_code}"
            print(f"[simulator] {status}  HR={payload.get('heart_rate')}  "
                  f"SpO2={payload.get('spo2')}  BP={payload.get('systolic_bp')}/{payload.get('diastolic_bp')}")
        except requests.exceptions.ConnectionError:
            print("[simulator] ⚠️  Cannot reach backend — is it running? Retrying...")
        except Exception as exc:
            print(f"[simulator] Error: {exc}")

        time.sleep(REPLAY_SPEED)


if __name__ == "__main__":
    run()
