import React, { useMemo } from 'react';
import { useVitals } from './hooks/useVitals';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Heart, Thermometer, AlertTriangle, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = "http://localhost:5000";

function App() {
  const { readings, latestReading } = useVitals(BACKEND_URL);
  const payload = latestReading?.payload || {};

  // Dynamic Alert Logic
  const alertState = useMemo(() => {
    const hr = payload.heart_rate;
    const spo2 = payload.spo2;
    
    if ((hr && (hr > 120 || hr < 40)) || (spo2 && spo2 < 90)) {
      return { status: 'CRITICAL', color: 'red', text: 'Abnormal vitals detected. Immediate attention required.' };
    }
    return { status: 'STABLE', color: 'emerald', text: 'No clinical alerts detected in last 5 minutes.' };
  }, [payload]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="text-emerald-400" /> 
          ICU Central Monitoring <span className="text-slate-500 text-sm font-normal">| Bed ICU-BED-01</span>
        </h1>
        <div className="flex gap-4">
          <StatusCard label="Heart Rate" value={payload.heart_rate} unit="bpm" icon={<Heart className={alertState.color === 'red' && (payload.heart_rate > 120 || payload.heart_rate < 40) ? "text-red-500 animate-pulse" : "text-emerald-400"} />} />
          <StatusCard label="SpO2" value={payload.spo2} unit="%" icon={<Activity className={alertState.color === 'red' && payload.spo2 < 90 ? "text-red-500 animate-pulse" : "text-blue-400"} />} />
          <StatusCard label="Temp" value={payload.temperature} unit="°C" icon={<Thermometer className="text-orange-400" />} />
        </div>
      </header>
      
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Graph */}
        <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800 h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase">Vital Signs Trend (Live)</h2>
            <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded-md">Decimation Active</span>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="recordedAt" hide />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
              <Line type="monotone" dataKey="payload.heart_rate" name="Heart Rate" stroke="#10b981" strokeWidth={3} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="payload.spo2" name="SpO2" stroke="#3b82f6" strokeWidth={3} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Info Panel */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
           <h2 className="text-sm font-semibold text-slate-400 uppercase">Patient Data</h2>
           <div className="space-y-2 text-sm">
              <p><span className="text-slate-500">Device ID:</span> {latestReading?.deviceCode || 'Waiting...'}</p>
              <p><span className="text-slate-500">Last Sync:</span> {latestReading ? new Date(latestReading.recordedAt).toLocaleTimeString() : '---'}</p>
              <hr className="border-slate-800 my-4" />
              
              <div className={`p-4 bg-${alertState.color}-500/10 border border-${alertState.color}-500/20 rounded-lg text-${alertState.color}-400 transition-colors duration-300`}>
                <div className="flex items-center gap-2 mb-1">
                  {alertState.status === 'CRITICAL' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  <p className="font-bold">Status: {alertState.status}</p>
                </div>
                <p className="text-xs opacity-80">{alertState.text}</p>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}

const StatusCard = ({ label, value, unit, icon }) => (
  <div className="flex items-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800 min-w-32">
    {icon}
    <div>
      <p className="text-[10px] uppercase text-slate-500 leading-none">{label}</p>
      <p className="text-xl font-bold leading-none mt-1">{value ?? '--'}<span className="text-[10px] ml-1 text-slate-400">{unit}</span></p>
    </div>
  </div>
);

export default App;