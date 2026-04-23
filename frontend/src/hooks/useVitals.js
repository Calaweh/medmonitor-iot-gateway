import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import axios from "axios";

export const useVitals = (backendUrl, deviceCode) => {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!deviceCode) return; // Don't fetch if no device is selected

    // Reset state when switching patients
    setReadings([]);
    setLatestReading(null);
    setAlerts([]);

    // 1. Fetch History for selected device
    axios.get(`${backendUrl}/api/readings/${deviceCode}/history`)
      .then(res => setReadings(res.data))
      .catch(err => console.error("History fetch failed", err));

    // Fetch active alerts for this device
    axios.get(`${backendUrl}/api/alerts?deviceCode=${deviceCode}`)
      .then(res => setAlerts(res.data))
      .catch(err => console.error("Alerts fetch failed", err));

    // 2. Setup Real-time connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${backendUrl}/hubs/vitalsigns`)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNewReading", (data) => {
      // ONLY update if the incoming data matches the CURRENTLY selected bed
      if (data.deviceCode === deviceCode) {
        setLatestReading(data);
        setReadings((prev) => [...prev.slice(-49), data]); // Keep last 50 points
      }
    });

    connection.on("ReceiveNewAlert", (alertData) => {
      if (alertData.deviceCode === deviceCode) {
        setAlerts((prev) => [alertData, ...prev].slice(0, 10)); // Keep latest 10
      }
    });

    connection.start().catch(console.error);

    return () => connection.stop();
  }, [backendUrl, deviceCode]); // Re-run whenever deviceCode changes

  return { readings, latestReading, alerts };
};