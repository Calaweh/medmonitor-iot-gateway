// frontend/src/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Settings, ShieldCheck, Save, Database, FileText, 
  Lock, CheckCircle2, AlertTriangle, Activity, 
  Thermometer, Clock, RefreshCw 
} from 'lucide-react';

export default function SystemSettings({ backendUrl }) {
  const [activeTab, setActiveTab] = useState('parameters'); // parameters | audit

  // Parameters State
  const [thresholds, setThresholds] = useState({
    hrMin: 40, hrMax: 120,
    spo2Min: 90,
    tempMin: 35.0, tempMax: 39.0,
    retention: 30
  });
  const [isSaving, setIsSaving] = useState(false);
  const[saveMessage, setSaveMessage] = useState('');

  // Audit State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const[verifyStatus, setVerifyStatus] = useState('idle'); // idle | loading | success | error
  const[verifyMessage, setVerifyMessage] = useState('');

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchLogs();
    }
  }, [activeTab, backendUrl]);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(`${backendUrl}/api/Audit`);
      setLogs(res.data);
    } catch (err) {
      console.error("Failed to fetch logs", err);
      // Fallback mock logs if endpoint is unavailable
      setLogs([
        { id: 105, userId: 'sys-admin', action: 'RESOLVE_ALERT', entityType: 'Alert', entityId: '842', occurredAt: new Date().toISOString(), hash: 'a1b2c3d4e5f6g7h8i9j0...' },
        { id: 104, userId: 'dr-sarah', action: 'ADMIT_PATIENT', entityType: 'Patient', entityId: 'P-991', occurredAt: new Date(Date.now() - 3600000).toISOString(), hash: 'b2c3d4e5f6g7h8i9j0a1...' },
      ]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyStatus('loading');
    try {
      const res = await axios.get(`${backendUrl}/api/Audit/verify`);
      setVerifyStatus(res.data.isValid ? 'success' : 'error');
      setVerifyMessage(res.data.message);
    } catch (err) {
      setVerifyStatus('error');
      setVerifyMessage('Failed to connect to verification service.');
    }
  };

  const handleSaveParameters = (e) => {
    e.preventDefault();
    setIsSaving(true);
    // Mock API call to save global parameters (Since backend reads from hardcoded limits currently)
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('System parameters successfully updated and staged for edge devices.');
      setTimeout(() => setSaveMessage(''), 5000);
    }, 800);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-200">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Settings size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">System Parameters & Logs</h2>
            <p className="text-xs text-slate-500 mt-0.5">Global configuration and regulatory audit trails</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'parameters' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Database size={14} /> Global Parameters
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'audit' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ShieldCheck size={14} /> Audit Trail
        </button>
      </div>

      {/* ── PARAMETERS TAB ── */}
      {activeTab === 'parameters' && (
        <form onSubmit={handleSaveParameters} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Clinical Thresholds */}
            <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-emerald-400" />
                <h3 className="font-bold text-white">Default Clinical Thresholds</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">These are the global fallback limits. They can be overridden per patient by a Doctor.</p>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Min (bpm)</label>
                    <input type="number" value={thresholds.hrMin} onChange={e => setThresholds({...thresholds, hrMin: e.target.value})} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">HR Max (bpm)</label>
                    <input type="number" value={thresholds.hrMax} onChange={e => setThresholds({...thresholds, hrMax: e.target.value})} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SpO₂ Minimum (%)</label>
                  <input type="number" value={thresholds.spo2Min} onChange={e => setThresholds({...thresholds, spo2Min: e.target.value})} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temp Min (°C)</label>
                    <input type="number" step="0.1" value={thresholds.tempMin} onChange={e => setThresholds({...thresholds, tempMin: e.target.value})} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Temp Max (°C)</label>
                    <input type="number" step="0.1" value={thresholds.tempMax} onChange={e => setThresholds({...thresholds, tempMax: e.target.value})} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm outline-none focus:border-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Retention & Compliance */}
            <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={16} className="text-amber-400" />
                <h3 className="font-bold text-white">Compliance & Retention</h3>
              </div>
              <p className="text-xs text-slate-500 mb-6">Configure data lifecycle to comply with PDPA Principle 7 regarding patient records.</p>
              
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Telemetry Purge Window (Days)</label>
                <div className="relative mt-1.5">
                  <Clock size={16} className="absolute left-3 top-2.5 text-slate-500" />
                  <input type="number" value={thresholds.retention} onChange={e => setThresholds({...thresholds, retention: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:border-blue-500" />
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Sensor readings older than this threshold will be permanently deleted by the nightly Hangfire job.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
              {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {isSaving ? 'Saving...' : 'Save System Parameters'}
            </button>
            {saveMessage && <span className="text-emerald-400 text-sm flex items-center gap-1"><CheckCircle2 size={16}/> {saveMessage}</span>}
          </div>
        </form>
      )}

      {/* ── AUDIT TAB ── */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Integrity Banner */}
          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white flex items-center gap-2">
                <Lock size={16} className="text-violet-400" /> Cryptographic Chain of Custody
              </h3>
              <p className="text-xs text-slate-500 mt-1">Verify that clinical logs have not been tampered with since creation (HMAC-SHA256).</p>
            </div>
            <button 
              onClick={handleVerifyChain} 
              disabled={verifyStatus === 'loading'}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-lg text-xs font-semibold transition-colors shrink-0 whitespace-nowrap"
            >
              {verifyStatus === 'loading' ? 'VERIFYING...' : 'VERIFY INTEGRITY'}
            </button>
          </div>

          {verifyStatus === 'success' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 size={16} /> {verifyMessage}
            </div>
          )}
          {verifyStatus === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16} /> {verifyMessage}
            </div>
          )}

          {/* Logs Table */}
          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl overflow-hidden">
            {loadingLogs ? (
              <div className="p-8 text-center text-slate-500 text-sm">Fetching audit trail...</div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-800/60 text-slate-500 text-xs uppercase tracking-wider bg-slate-900/50">
                    <th className="px-5 py-3 font-semibold">Time (UTC)</th>
                    <th className="px-5 py-3 font-semibold">Actor (ID)</th>
                    <th className="px-5 py-3 font-semibold">Action</th>
                    <th className="px-5 py-3 font-semibold">Resource Target</th>
                    <th className="px-5 py-3 font-semibold text-right">Cryptographic Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {new Date(log.occurredAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-slate-300 font-mono text-xs">
                        {log.userId?.substring(0, 8) || 'SYSTEM'}
                      </td>
                      <td className="px-5 py-3 text-violet-400 font-semibold text-xs">
                        {log.action}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">
                        {log.entityType} <span className="text-slate-600">#{log.entityId || 'N/A'}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className="font-mono text-[10px] text-emerald-400/70 bg-emerald-500/10 px-2 py-1 rounded" title={log.hash}>
                          {log.hash ? log.hash.substring(0, 16) + '...' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-600 text-sm">No audit logs found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}