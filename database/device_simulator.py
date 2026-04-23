import os
import time
import csv
import json
import random
import requests
from datetime import datetime, timezone
from pathlib import Path
import uuid

# --- Configuration ---
BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:5000")
LOKI_URL: str        = f"{os.getenv('LOKI_URL_EXTERNAL', 'http://localhost:3100')}/loki/api/v1/push"
DEVICE_CODE: str     = os.getenv("DEVICE_CODE", "ICU-BED-01")
REPLAY_SPEED: float  = float(os.getenv("REPLAY_SPEED_SEC", "1"))
CSV_PATH: Path       = Path(__file__).parent / "data" / "icu_vitals.csv"
INGEST_ENDPOINT      = f"{BACKEND_API_URL}/api/readings/ingest"

# --- Loki Helper Function (Replaces the buggy library) ---
def push_to_loki(level, message, status="normal", correlation_id="unknown"):
    timestamp_ns = str(time.time_ns())
    payload = {
        "streams": [
            {
                "stream": {
                    "app": "device_simulator",
                    "level": level,
                    "status": status,
                    "device": DEVICE_CODE,
                    "correlation_id": correlation_id
                },
                "values": [
                    [timestamp_ns, message]
                ]
            }
        ]
    }
    try:
        resp = requests.post(LOKI_URL, json=payload, timeout=2)
        if resp.status_code not in (200, 204):
            print(f"[debug-loki] ❌ Rejected: {resp.status_code} - {resp.text}")
    except Exception as e:
        print(f"[debug-loki] ❌ Connection Error: {e}")

# --- Vitals Mapping & Alerts ---
COLUMN_MAP = {
    "heart_rate": "heart_rate", "spo2": "spo2", "systolic_bp": "systolic_bp",
    "diastolic_bp": "diastolic_bp", "temperature": "temperature", "respiratory_rate": "respiration"
}

THRESHOLDS = {
    "heart_rate": {"min": 40, "max": 120},
    "spo2": {"min": 90, "max": 100},
}

def check_alert(payload: dict) -> str | None:
    for key, bounds in THRESHOLDS.items():
        val = payload.get(key)
        if val and (val < bounds["min"] or val > bounds["max"]):
            return f"CRITICAL_{key.upper()}: {val}"
    return None

def stream_csv(path: Path):
    while True:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                payload = {json_key: float(row[csv_col]) for csv_col, json_key in COLUMN_MAP.items() if row.get(csv_col)}
                yield payload
        print("[simulator] CSV exhausted — looping...")

def run():
    print(f"[simulator] Starting — target: {INGEST_ENDPOINT}")
    source = stream_csv(CSV_PATH) if CSV_PATH.exists() else None # Add fallback if needed

    for payload in source:
        correlation_id = str(uuid.uuid4())

        body = {
            "deviceCode": DEVICE_CODE,
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }

        headers = {"X-Correlation-ID": correlation_id}

        # 1. Check for clinical alerts
        alert = check_alert(payload)
        if alert:
            print(f"[simulator] ⚠️  ALERT: {alert}")
            push_to_loki("WARN", f"Clinical Alert: {alert}", status="abnormal", correlation_id=correlation_id)

        # 2. Push to Backend
        try:
            resp = requests.post(INGEST_ENDPOINT, json=body, headers=headers, timeout=20)
            
            if resp.status_code in (200, 201):
                print(f"[simulator] ✅  HR={payload.get('heart_rate')} | ID: {correlation_id[:8]}")
                # Optional: Only log normal pushes every 10th row to keep Loki clean
                push_to_loki("INFO", f"Data pushed successfully HR={payload.get('heart_rate')}", status="normal", correlation_id=correlation_id)
            else:
                # 3. Log Backend Rejections as ABNORMAL
                error_text = f"Backend 400 Error: {resp.text}"
                print(f"[simulator] ❌ {error_text}")
                push_to_loki("ERROR", f"Backend Error: {resp.text}", "abnormal", correlation_id=correlation_id)

        except Exception as e:
            print(f"[simulator] ❌ Connection Error: {e}")
            push_to_loki("ERROR", f"Connection Failed: {e}", status="abnormal", correlation_id=correlation_id)

        time.sleep(REPLAY_SPEED)

if __name__ == "__main__":
    run()