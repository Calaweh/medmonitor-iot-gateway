import requests
import time

url = "http://localhost:3100/loki/api/v1/push"
ts = str(time.time_ns())
payload = {
    "streams": [
        {
            "stream": { "app": "manual_test" },
            "values": [ [ts, "This is a direct test log"] ]
        }
    ]
}

r = requests.post(url, json=payload)
print(f"Status: {r.status_code}")
print(f"Response: {r.text}")