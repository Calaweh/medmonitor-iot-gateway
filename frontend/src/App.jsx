import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useVitals } from './hooks/useVitals';
import Login from './Login';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed, Building2, LogOut } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

function App() {

  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_data')));
  
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Sync axios headers whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('jwt', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('jwt');
    }
  }, [token]);

  // Sync user data to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      localStorage.removeItem('user_data');
    }
  }, [user]);

  // Helper to handle login success
  const handleAuth = (jwt, userData) => {
    // Set header immediately to prevent race conditions in subsequent fetches
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    setToken(jwt);
    setUser(userData);
  };

  // Helper to handle logout
  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSelectedDevice(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  // Fetch all devices/sites on load
  useEffect(() => {
    if (!token) return;

    // Use explicit header for the first fetch to ensure it doesn't fail 
    // while the global axios default is being synchronized
    axios.get(`${BACKEND_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setDevices(res.data))
      .catch(err => {
        console.error("Failed to load devices", err);
        if (err.response?.status === 401) handleLogout(); 
      });
  }, [token]);

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

  // --- RENDER LOGIN IF NOT AUTHENTICATED ---
  if (!token) {
    return <Login setAuth={handleAuth} backendUrl={BACKEND_URL} />;
  }

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
        
        {/* LOGGED IN USER INFO */}
        <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
          <div>
            <div className="text-sm font-semibold">{user?.fullName}</div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wide">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition">
            <LogOut size={16} />
          </button>
        </div>

        {/* ... Keep the rest of your aside list rendering the same ... */}
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
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{bed.deviceCode}</span>
                        {bed.currentAssignment && (
                          <span className="text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded text-emerald-500 uppercase font-bold">Admitted</span>
                        )}
                      </div>
                      <div className="text-[10px] opacity-60">
                        {bed.currentAssignment?.patient?.fullName || bed.description}
                      </div>
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
          <PatientDetail 
            deviceCode={selectedDevice} 
            token={token} 
            patientInfo={devices.find(d => d.deviceCode === selectedDevice)?.currentAssignment}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Activity size={48} className="mb-4 opacity-20" />
            <h2 className="text-xl font-medium text-slate-400">No Patient Selected</h2>
            <p className="text-sm mt-2">Select a bed from the sidebar to view real-time telemetry.</p>
          </div>
        )}
      </main>
    </div>
  );
}

// Extracted Component for the detailed patient view
function PatientDetail({ deviceCode, token, patientInfo }) { 
  const { readings, latestReading, alerts } = useVitals(BACKEND_URL, deviceCode, token); 
  
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadShiftReport = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/shiftreport/${deviceCode}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ShiftReport_${deviceCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download report", err);
      alert("Failed to generate report. Ensure you have clinical data for this window.");
    } finally {
      setIsGenerating(false);
    }
  };

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
      <header className="flex justify-between items-start border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-100">
              {patientInfo?.patient?.fullName || "Unassigned Bed"}
            </h2>
            <span className="text-xs px-2 py-1 bg-slate-800 rounded-md text-slate-400 font-mono">
              {deviceCode}
            </span>
          </div>
          {patientInfo ? (
            <div className="flex gap-4 text-xs text-slate-500">
              <span>MRN: <span className="text-slate-300">{patientInfo.patient.mrn}</span></span>
              <span>•</span>
              <span>Diagnosis: <span className="text-slate-300">{patientInfo.diagnosis}</span></span>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No active patient assignment.</p>
          )}
          
          <div className="pt-2">
            <button 
              onClick={downloadShiftReport}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-400 text-xs font-bold rounded flex items-center gap-2 transition-colors border border-emerald-500/20"
            >
              <Activity size={14} />
              {isGenerating ? "GENERATING REPORT..." : "SHIFT REPORT (PDF)"}
            </button>
          </div>
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