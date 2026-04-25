import os
import time
import csv
import json
import random
import requests
import threading
from datetime import datetime, timezone
from pathlib import Path
import uuid

# --- Configuration ---
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:5000")
LOKI_URL        = f"{os.getenv('LOKI_URL_EXTERNAL', 'http://localhost:3100')}/loki/api/v1/push"
REPLAY_SPEED    = float(os.getenv("REPLAY_SPEED_SEC", "2")) 
CSV_PATH        = Path(__file__).parent / "data" / "icu_vitals.csv"
INGEST_ENDPOINT = f"{BACKEND_API_URL}/api/readings/ingest"

# The 3 default devices from our database schema
TARGET_DEVICES = ["ICU-BED-01", "ICU-BED-02", "ICU-BED-03"]

COLUMN_MAP = {
    "heart_rate": "heart_rate", "spo2": "spo2", "systolic_bp": "systolic_bp",
    "diastolic_bp": "diastolic_bp", "temperature": "temperature", "respiratory_rate": "respiration"
}

THRESHOLDS = {
    "heart_rate": {"min": 40, "max": 120},
    "spo2": {"min": 90, "max": 100},
}

def push_to_loki(device_code, level, message, status="normal", correlation_id="unknown"):
    timestamp_ns = str(time.time_ns())
    payload = {
        "streams": [
            {
                "stream": {
                    "app": "device_simulator",
                    "level": level,
                    "status": status,
                    "device": device_code,
                    "correlation_id": correlation_id
                },
                "values": [[timestamp_ns, message]]
            }
        ]
    }
    try:
        requests.post(LOKI_URL, json=payload, timeout=2)
    except:
        pass # Ignore Loki errors so simulation doesn't crash if Docker isn't running

def stream_csv(path: Path, start_offset: int):
    """ Yields CSV rows infinitely, starting at a specific offset to stagger the data """
    while True:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            # Skip rows to give each device unique data
            for _ in range(start_offset):
                next(reader, None)
                
            for row in reader:
                payload = {json_key: float(row[csv_col]) for csv_col, json_key in COLUMN_MAP.items() if row.get(csv_col)}
                # Add slight random noise so the beds don't look identical if offsets align
                if "heart_rate" in payload: payload["heart_rate"] += random.randint(-2, 2)
                yield payload

def check_alert(payload: dict) -> str | None:
    for key, bounds in THRESHOLDS.items():
        val = payload.get(key)
        if val and (val < bounds["min"] or val > bounds["max"]):
            return f"CRITICAL_{key.upper()}: {val}"
    return None

def simulate_device(device_code: str, row_offset: int):
    """ Runs in a separate thread for each device """
    print(f"[{device_code}] Thread started. Offset: {row_offset}")
    
    # Introduce a slight random start delay so they don't hit the API at the exact same millisecond
    time.sleep(random.uniform(0, 1.5))
    
    source = stream_csv(CSV_PATH, row_offset)
    
    for payload in source:
        correlation_id = str(uuid.uuid4())
        body = {
            "deviceCode": device_code,
            "recordedAt": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        headers = {
            "X-Correlation-ID": correlation_id,
            "X-Device-Api-Key": os.getenv("DEVICE_API_KEY", "DeviceSecret123!")
        }
        
        alert = check_alert(payload)
        if alert:
            print(f"[{device_code}] ⚠️  ALERT: {alert}")
            push_to_loki(device_code, "WARN", f"Alert: {alert}", "abnormal", correlation_id)

        try:
            resp = requests.post(INGEST_ENDPOINT, json=body, headers=headers, timeout=10)
            if resp.status_code in (200, 201):
                print(f"[{device_code}] ✅ HR={payload.get('heart_rate')} SpO2={payload.get('spo2')}")
                # Log success to Loki so we see activity in Grafana
                push_to_loki(device_code, "INFO", f"Ingested HR={payload.get('heart_rate')}", "normal", correlation_id)
            else:
                print(f"[{device_code}] ❌ Backend Error: {resp.status_code} — {resp.text}")
                push_to_loki(device_code, "ERROR", f"HTTP {resp.status_code}", "abnormal", correlation_id)
        except requests.exceptions.RequestException as e:
            print(f"[{device_code}] ❌ Connection Error: {e}")
            push_to_loki(device_code, "ERROR", f"Connection Error: {e}", "abnormal", correlation_id)
            
        time.sleep(REPLAY_SPEED)

def run_fleet():
    print(f"🏥 Starting Multi-Patient Simulator targeted at: {BACKEND_API_URL}")
    threads = []
    
    # Start a thread for each device. We give them row offsets (0, 500, 1000) 
    # so they read different parts of the CSV and their vitals look completely different!
    for i, device_code in enumerate(TARGET_DEVICES):
        t = threading.Thread(target=simulate_device, args=(device_code, i * 500))
        t.daemon = True
        t.start()
        threads.append(t)
        
    try:
        # Keep main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Simulation stopped by user.")

if __name__ == "__main__":
    run_fleet()