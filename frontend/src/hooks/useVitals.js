import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export const useVitals = (backendUrl) => {
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${backendUrl}/hubs/vitalsigns`)
      .withAutomaticReconnect()
      .build();

    connection.on("ReceiveNewReading", (data) => {
      console.log("New reading received:", data);
      setLatestReading(data);
      setReadings((prev) => {
        const newList = [...prev, data];
        return newList.slice(-30); // Keep only the last 30 readings for the chart
      });
    });

    connection.start().catch((err) => console.error("SignalR Connection Error: ", err));

    return () => connection.stop();
  }, [backendUrl]);

  return { readings, latestReading };
};