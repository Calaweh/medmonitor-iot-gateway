import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import axios from "axios";

export const useVitals = (backendUrl, deviceCode = "ICU-BED-01") => {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);

  useEffect(() => {
    // 1. Fetch History
    axios.get(`${backendUrl}/api/readings/${deviceCode}/history`)
      .then(res => setReadings(res.data))
      .catch(err => console.error("History fetch failed", err));

    // 2. Setup Real-time
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${backendUrl}/hubs/vitalsigns`)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNewReading", (data) => {
      if (data.deviceCode === deviceCode) {
        setLatestReading(data);
        setReadings((prev) => [...prev.slice(-29), data]);
      }
    });

    connection.start().catch(console.error);
    return () => connection.stop();
  }, [backendUrl, deviceCode]);

  return { readings, latestReading };
};