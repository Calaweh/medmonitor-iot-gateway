import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useVitals } from './hooks/useVitals';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed, Building2 } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function App() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Fetch all devices/sites on load
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/devices`)
      .then(res => setDevices(res.data))
      .catch(err => console.error("Failed to load devices", err));
  }, []);

  // Group devices by Site/Location
  const sites = useMemo(() => {
    const groups = {};
    devices.forEach(d => {
      const loc = d.location || 'Unassigned Site';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(d);
    });
    return groups;
  }, [devices]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
      
      {/* SIDEBAR: Sites & Patients */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold flex items-center gap-2 text-emerald-400">
            <Activity /> MedMonitor
          </h1>
          <p className="text-xs text-slate-500 mt-1">Multi-Site Command Center</p>
        </div>
        <div className="overflow-y-auto flex-grow p-4 space-y-6">
          {Object.entries(sites).map(([siteName, beds]) => (
            <div key={siteName}>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 size={14} /> {siteName}
              </h2>
              <div className="space-y-1">
                {beds.map(bed => (
                  <button
                    key={bed.deviceCode}
                    onClick={() => setSelectedDevice(bed.deviceCode)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 text-sm transition-colors ${
                      selectedDevice === bed.deviceCode 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                        : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                    }`}
                  >
                    <Bed size={16} />
                    <div>
                      <div className="font-medium">{bed.deviceCode}</div>
                      <div className="text-[10px] opacity-60">{bed.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        {selectedDevice ? (
          <PatientDetail deviceCode={selectedDevice} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Activity size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-medium text-slate-400">No Patient Selected</h2>
            <p className="text-sm mt-2">Select a bed from the sidebar to view real-time telemetry.</p>
            <div className="mt-8 flex gap-8 text-center">
              <div>
                <p className="text-3xl font-bold text-slate-300">{Object.keys(sites).length}</p>
                <p className="text-xs uppercase tracking-wider mt-1">Active Sites</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-300">{devices.length}</p>
                <p className="text-xs uppercase tracking-wider mt-1">Monitored Beds</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Extracted Component for the detailed patient view
function PatientDetail({ deviceCode }) {
  const { readings, latestReading, alerts } = useVitals(BACKEND_URL, deviceCode);
  const payload = latestReading?.payload || {};

  const alertState = useMemo(() => {
    const hr = payload.heart_rate;
    const spo2 = payload.spo2;
    if ((hr && (hr > 120 || hr < 40)) || (spo2 && spo2 < 90)) {
      return { status: 'CRITICAL', color: 'red', text: 'Abnormal vitals detected. Immediate attention required.' };
    }
    return { status: 'STABLE', color: 'emerald', text: 'No clinical alerts detected in last 5 minutes.' };
  }, [payload]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
            Patient Telemetry
            <span className="text-sm font-normal px-2 py-1 bg-slate-800 rounded-md text-slate-400">Bed: {deviceCode}</span>
          </h2>
        </div>
        <div className="flex gap-4">
          <StatusCard label="Heart Rate" value={payload.heart_rate} unit="bpm" icon={<Heart className={alertState.color === 'red' && (payload.heart_rate > 120 || payload.heart_rate < 40) ? "text-red-500 animate-pulse" : "text-emerald-400"} />} />
          <StatusCard label="SpO2" value={payload.spo2} unit="%" icon={<Activity className={alertState.color === 'red' && payload.spo2 < 90 ? "text-red-500 animate-pulse" : "text-blue-400"} />} />
          <StatusCard label="Temp" value={payload.temperature} unit="°C" icon={<Thermometer className="text-orange-400" />} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 h-[400px] flex flex-col">
          <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Live Trend</h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="recordedAt" hide />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{fontSize: 12}} width={40} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="payload.heart_rate" name="Heart Rate" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="payload.spo2" name="SpO2" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col gap-6 h-[400px]">
          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex-shrink-0">
             <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Status</h3>
             <div className={`p-4 bg-${alertState.color}-500/10 border border-${alertState.color}-500/20 rounded-lg text-${alertState.color}-400`}>
                <div className="flex items-center gap-2 mb-1">
                  {alertState.status === 'CRITICAL' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <p className="font-bold">{alertState.status}</p>
                </div>
                <p className="text-xs opacity-80">{alertState.text}</p>
             </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 flex-grow flex flex-col overflow-hidden">
            <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Recent Alerts</h3>
            <div className="overflow-y-auto space-y-2 pr-2">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No alerts recorded.</p>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="text-xs p-3 rounded bg-red-500/10 border border-red-500/20 text-red-200">
                    <div className="flex justify-between mb-1 opacity-70">
                      <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                      <span className="font-bold">{a.severity}</span>
                    </div>
                    <p>{a.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatusCard = ({ label, value, unit, icon }) => (
  <div className="flex items-center gap-3 bg-slate-900 px-5 py-3 rounded-xl border border-slate-800 min-w-[140px]">
    {icon}
    <div>
      <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1 text-slate-200">{value ?? '--'}<span className="text-xs ml-1 text-slate-500 font-normal">{unit}</span></p>
    </div>
  </div>
);

export default App;