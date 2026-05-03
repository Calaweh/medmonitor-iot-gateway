import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useVitals } from './hooks/useVitals';
import Login from './Login';
import SystemSettings from './SystemSettings';
import AccessManagement from './AccessManagement';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed,
  Building2, LogOut, Lock, Shield, Users, Edit2, Plus, ChevronRight,
  ChevronDown, Settings, BarChart2, Layers, Trash2, Search,
  UserPlus, FolderTree, Check, X, Monitor, MapPin, Hash,
  History, FileSearch, Download, Archive, Calendar, ListOrdered, 
  FileText, PenLine, PlusCircle
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

// ─── NAV CONFIG ────────────────────────────────────────────────────────────────
// Add new top-level views here for scalability
const NAV_ITEMS =[
  {
    id: 'monitoring',
    label: 'Patient Monitoring',
    icon: Activity,
    roles: ['nurse', 'doctor', 'admin'],
  },
  { 
    id: 'records', 
    label: 'Patient Records', 
    icon: FileSearch, 
    roles:['nurse', 'doctor', 'admin'] },
  {
    id: 'access',
    label: 'Access Management',
    icon: Shield,
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'System & Audit Logs', // UPDATED LABEL
    icon: Settings,
    roles: ['admin'],
    // REMOVED `badge: 'Soon'`
  },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_data') || 'null'));
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [currentView, setCurrentView] = useState('monitoring');
  const [viewContext, setViewContext] = useState(null); 

  const navigateTo = (viewId, context = null) => {
    setCurrentView(viewId);
    setViewContext(context);
    if (viewId !== 'monitoring') setSelectedDevice(null);
  };

  const handleAuth = (jwt, userData) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    setToken(jwt);
    setUser(userData);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSelectedDevice(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('jwt', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('jwt');
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user_data', JSON.stringify(user));
    else localStorage.removeItem('user_data');
  }, [user]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${BACKEND_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setDevices(res.data))
      .catch(err => {
        if (err.response?.status === 401) handleLogout();
      }); 
  }, [token]);

  const hierarchy = useMemo(() => {
    const tree = {};
    devices.forEach(d => {
      const site = d.site || 'Unassigned Site';
      const dept = d.department || 'General';
      const room = d.room || 'Unassigned Room';
      if (!tree[site]) tree[site] = {};
      if (!tree[site][dept]) tree[site][dept] = {};
      if (!tree[site][dept][room]) tree[site][dept][room] = [];
      tree[site][dept][room].push(d);
    });
    return tree;
  }, [devices]);

  if (!token) return <Login setAuth={handleAuth} backendUrl={BACKEND_URL} />;

  const allowedNav = NAV_ITEMS.filter(n => n.roles.includes(user?.role));

  return (
    <div className="flex h-screen overflow-hidden bg-[#080c14] text-slate-200 font-sans">
      {/* ── PRIMARY SIDEBAR ── */}
      <PrimarySidebar
        user={user}
        navItems={allowedNav}
        currentView={currentView}
        onNav={(id) => { setCurrentView(id); setSelectedDevice(null); }}
        onLogout={handleLogout}
      />

      {/* ── SECONDARY SIDEBAR (context-sensitive) ── */}
      {currentView === 'monitoring' && (
        <MonitoringSidebar
          hierarchy={hierarchy}
          selectedDevice={selectedDevice}
          onSelect={setSelectedDevice}
        />
      )}

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto bg-[#080c14]">
        {currentView === 'monitoring' && (
          selectedDevice
            ? <PatientDetail
                deviceCode={selectedDevice}
                token={token}
                patientInfo={devices.find(d => d.deviceCode === selectedDevice)?.currentAssignment}
                onNavigateToHistory={() => navigateTo('records', { deviceCode: selectedDevice })}
              />
            : <MonitoringLanding />
        )}
        {currentView === 'records' && (
          <PatientRecordsPage 
            backendUrl={BACKEND_URL} 
            initialContext={viewContext} 
            onClearContext={() => setViewContext(null)} 
          />
        )}
        {currentView === 'access' && <AccessManagement token={token} />}
        {currentView === 'settings' && <SystemSettings backendUrl={BACKEND_URL} token={token} />}
      </main>
    </div>
  );
}

// ─── PRIMARY SIDEBAR ───────────────────────────────────────────────────────────
function PrimarySidebar({ user, navItems, currentView, onNav, onLogout }) {
  return (
    <aside className="w-[72px] bg-[#0c1220] border-r border-slate-800/60 flex flex-col items-center py-4 gap-1 z-10 shrink-0">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <Activity size={20} className="text-emerald-400" />
      </div>

      <div className="flex-1 flex flex-col gap-1 w-full px-2">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => !item.badge && onNav(item.id)}
              title={item.label}
              className={`
                relative group w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all
                ${active
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : item.badge
                    ? 'text-slate-600 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/60'
                }
              `}
            >
              <Icon size={18} />
              {item.badge && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-slate-700 text-slate-400 px-1 rounded">
                  {item.badge}
                </span>
              )}
              {/* Tooltip */}
              <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* User + logout */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase">
          {user?.fullName?.[0] || user?.role?.[0] || '?'}
        </div>
        <button
          onClick={onLogout}
          title="Log out"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

// ─── MONITORING SIDEBAR ────────────────────────────────────────────────────────
function MonitoringSidebar({ hierarchy, selectedDevice, onSelect }) {
  const [expandedSites, setExpandedSites] = useState({});
  const [expandedDepts, setExpandedDepts] = useState({});

  // Auto-expand all on mount
  useEffect(() => {
    const sites = {}, depts = {};
    Object.keys(hierarchy).forEach(s => {
      sites[s] = true;
      Object.keys(hierarchy[s]).forEach(d => { depts[`${s}::${d}`] = true; });
    });
    setExpandedSites(sites);
    setExpandedDepts(depts);
  }, [hierarchy]);

  const toggleSite = s => setExpandedSites(p => ({ ...p, [s]: !p[s] }));
  const toggleDept = k => setExpandedDepts(p => ({ ...p, [k]: !p[k] }));

  return (
    <aside className="w-64 bg-[#0c1220] border-r border-slate-800/60 flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-slate-800/60">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Ward Overview</h2>
      </div>
      <div className="overflow-y-auto flex-1 py-2">
        {Object.entries(hierarchy).map(([site, depts]) => (
          <div key={site} className="mb-1">
            {/* Site */}
            <button
              onClick={() => toggleSite(site)}
              className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors"
            >
              {expandedSites[site] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Building2 size={12} />
              <span className="truncate">{site}</span>
            </button>

            {expandedSites[site] && Object.entries(depts).map(([dept, rooms]) => {
              const deptKey = `${site}::${dept}`;
              return (
                <div key={dept} className="ml-2">
                  {/* Department */}
                  <button
                    onClick={() => toggleDept(deptKey)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {expandedDepts[deptKey] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    <Layers size={11} />
                    <span className="truncate">{dept}</span>
                  </button>

                  {expandedDepts[deptKey] && Object.entries(rooms).map(([room, beds]) => (
                    <div key={room} className="ml-2">
                      {/* Room label */}
                      <div className="flex items-center gap-2 px-4 py-1 text-[10px] text-slate-600">
                        <MapPin size={9} />
                        <span>{room}</span>
                      </div>

                      {/* Beds */}
                      {beds.map(bed => {
                        const active = selectedDevice === bed.deviceCode;
                        const admitted = !!bed.currentAssignment;
                        return (
                          <button
                            key={bed.deviceCode}
                            onClick={() => onSelect(bed.deviceCode)}
                            className={`
                              w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all ml-1
                              ${active
                                ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-300'
                                : 'border-l-2 border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                              }
                            `}
                          >
                            <Bed size={13} className="shrink-0" />
                            <div className="flex-1 text-left min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-xs truncate">{bed.deviceCode}</span>
                                {admitted && (
                                  <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1 rounded font-bold uppercase">
                                    ADM
                                  </span>
                                )}
                              </div>
                              {admitted && (
                                <div className="text-[10px] text-slate-600 truncate mt-0.5">
                                  {bed.currentAssignment?.patient?.fullName}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}




// ─── MONITORING LANDING ────────────────────────────────────────────────────────
function MonitoringLanding() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-4">
      <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <Monitor size={36} className="opacity-30" />
      </div>
      <p className="text-sm text-slate-500">Select a bed from the ward tree to view telemetry</p>
    </div>
  );
}

// ─── PATIENT DETAIL ────────────────────────────────────────────────────────────
function PatientDetail({ deviceCode, token, patientInfo, onNavigateToHistory }) { 
  const { readings, latestReading, alerts } = useVitals(BACKEND_URL, deviceCode, token);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notes, setNotes] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({ subjective: '', objective: '', assessment: '', plan: '' });


  useEffect(() => {
    if (patientInfo?.patientId) {
      axios.get(`${BACKEND_URL}/api/patients/${patientInfo.patientId}/notes`)
        .then(res => setNotes(res.data))
        .catch(err => console.error("Failed to load notes", err));
    } else {
      setNotes([]); 
    }
  }, [patientInfo?.patientId, deviceCode]); 

  const downloadShiftReport = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.get(`${BACKEND_URL}/api/shiftreport/${deviceCode}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ShiftReport_${deviceCode}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate report.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNote = async () => {
      if (!patientInfo?.patientId) {
          alert("Cannot save notes for an unassigned bed.");
          return;
      }

      try {
          await axios.post(`${BACKEND_URL}/api/patients/${patientInfo.patientId}/notes`, newNote);
          setIsAddingNote(false);
          setNewNote({ subjective: '', objective: '', assessment: '', plan: '' });
          
          const res = await axios.get(`${BACKEND_URL}/api/patients/${patientInfo.patientId}/notes`);
          setNotes(res.data);
      } catch (err) {
          console.error(err);
          alert("Failed to save note.");
      }
  };

  const payload = latestReading?.payload || {};
  const alertState = useMemo(() => {
    const hr = payload.heart_rate;
    const spo2 = payload.spo2;
    if ((hr && (hr > 120 || hr < 40)) || (spo2 && spo2 < 90)) {
      return { status: 'CRITICAL', color: 'red', text: 'Abnormal vitals detected. Immediate attention required.' };
    }
    return { status: 'STABLE', color: 'emerald', text: 'All parameters within acceptable range.' };
  }, [payload]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-start border-b border-slate-800/60 pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">
              {patientInfo?.patient?.fullName || 'Unassigned Bed'}
            </h2>
            <span className="text-xs px-2 py-1 bg-slate-900 rounded-md text-slate-400 font-mono border border-slate-800">
              {deviceCode}
            </span>
            <span className={`text-xs px-2 py-1 rounded-md font-bold border ${
              alertState.status === 'CRITICAL'
                ? 'bg-red-500/10 text-red-400 border-red-500/25'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            }`}>{alertState.status}</span>
          </div>
          
          {patientInfo ? (
            <div className="flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Hash size={10} /> MRN: <span className="text-slate-300 ml-1">{patientInfo.patient?.mrn}</span></span>
              <span>•</span>
              <span>Dx: <span className="text-slate-300 ml-1">{patientInfo.diagnosis}</span></span>
              <span>•</span>
              <span>Physician: <span className="text-slate-300 ml-1">{patientInfo.attendingPhysician || '—'}</span></span>
            </div>
          ) : (
            <p className="text-xs text-slate-600 italic">No active patient assignment.</p>
          )}

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={downloadShiftReport}
              disabled={isGenerating}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-400 text-[11px] tracking-wider font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-800"
            >
              <BarChart2 size={13} />
              {isGenerating ? 'GENERATING...' : 'SHIFT REPORT'}
            </button>
            
            {/* - */}
            <button
              onClick={onNavigateToHistory} 
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-violet-400 text-[11px] tracking-wider font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-800"
            >
              <History size={13} />
              PREVIOUS PATIENTS
            </button>

            <button
              onClick={() => setIsThresholdModalOpen(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-[11px] tracking-wider font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-800"
            >
              <Settings size={13} />
              SET THRESHOLDS
            </button>
          </div>
        </div>


        <div className="flex gap-3">
          <VitalCard label="Heart Rate" value={payload.heart_rate} unit="bpm" warn={payload.heart_rate > 120 || payload.heart_rate < 40} icon={<Heart size={14} />} color="emerald" />
          <VitalCard label="SpO₂" value={payload.spo2} unit="%" warn={payload.spo2 < 90} icon={<Activity size={14} />} color="blue" />
          
          {/* MEWS CARD */}
          <div className={`border rounded-xl px-4 py-3 min-w-[110px] transition-all ${
            latestReading?.mewsScore >= 4 
              ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
              : latestReading?.mewsScore >= 2
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-slate-900/50 border-slate-800 text-slate-400'
          }`}>
            <div className="flex items-center gap-1.5 mb-1 opacity-70">
                <Activity size={14} />
                <span className="text-[9px] uppercase font-bold tracking-wider">MEWS Score</span>
            </div>
            <div className="text-2xl font-bold tabular-nums">
                {latestReading?.mewsScore ?? '—'}
                <span className="text-[10px] font-normal opacity-50 ml-1">/ 14</span>
            </div>
          </div>

          <VitalCard label="Temp" value={payload.temperature} unit="°C" warn={false} icon={<Thermometer size={14} />} color="orange" />
          <VitalCard label="Resp Rate" value={payload.respiration} unit="br/m" warn={false} icon={<Activity size={14} />} color="violet" />
        </div>
      </header>

      {/* BODY (Live Vitals Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
        <div className="lg:col-span-2 bg-[#0c1220] border border-slate-800/60 rounded-2xl p-5 h-80 flex flex-col">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Live Trend — HR & SpO₂</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="recordedAt" hide />
                <YAxis domain={['auto', 'auto']} stroke="#334155" tick={{ fontSize: 10 }} width={32} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="payload.heart_rate" name="HR" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="payload.spo2" name="SpO₂" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Recent Alerts Column */}
        <div className="flex flex-col gap-4">
          <div className={`bg-[#0c1220] border rounded-2xl p-4 ${alertState.status === 'CRITICAL' ? 'border-red-500/30' : 'border-emerald-500/20'}`}>
            <div className={`flex items-center gap-2 mb-2 ${alertState.status === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'}`}>
              {alertState.status === 'CRITICAL' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span className="text-sm font-bold">{alertState.status}</span>
            </div>
            <p className="text-xs text-slate-500">{alertState.text}</p>
          </div>
          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl p-4 flex-1 flex flex-col overflow-hidden">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Alerts</h3>
            <div className="overflow-y-auto space-y-2 flex-1">
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-600 italic">No active alerts.</p>
              ) : alerts.map((a, i) => (
                <div key={i} className={`text-xs p-2.5 rounded-lg border transition-all ${
                  a.acknowledgedAt 
                    ? 'bg-amber-500/5 border-amber-500/20 text-amber-200/80' 
                    : 'bg-red-500/8 border-red-500/20 text-red-200'
                }`}>
                  <div className="flex justify-between mb-1 opacity-60">
                    <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                    <span className="font-bold">{a.severity}</span>
                  </div>
                  <p className="text-slate-300 mb-2">{a.message}</p>
                  
                  <div className="flex gap-2">
                    {!a.acknowledgedAt && (
                      <button 
                        onClick={async () => {
                          try {
                            await axios.post(`${BACKEND_URL}/api/alerts/${a.id}/acknowledge`);
                            // Usually we rely on useVitals to refetch, but we can optimistically update here if we want
                          } catch (err) { alert("Failed to acknowledge alert"); }
                        }}
                        className="flex-1 py-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/20 rounded font-bold transition-all"
                      >
                        ACKNOWLEDGE
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        try {
                          await axios.post(`${BACKEND_URL}/api/alerts/${a.id}/resolve`);
                        } catch (err) { alert("Failed to resolve alert"); }
                      }}
                      className="flex-1 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded font-bold transition-all"
                    >
                      RESOLVE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SOAP Notes Section (Only show if bed is occupied) */}
      {patientInfo && (
          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl p-6 mt-6">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <FileText size={16} /> Clinical Notes (SOAP)
                  </h3>
                  <button 
                      onClick={() => setIsAddingNote(true)}
                      className="flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                      <PlusCircle size={14} /> NEW ENTRY
                  </button>
              </div>

              {isAddingNote && (
                  <div className="mb-8 p-4 bg-slate-900/50 border border-slate-700 rounded-xl space-y-4 animate-in fade-in">
                      <div className="grid grid-cols-2 gap-4">
                          <textarea placeholder="Subjective..." className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs h-24 outline-none focus:border-emerald-500 text-slate-200" value={newNote.subjective} onChange={e => setNewNote({...newNote, subjective: e.target.value})} />
                          <textarea placeholder="Objective..." className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs h-24 outline-none focus:border-emerald-500 text-slate-200" value={newNote.objective} onChange={e => setNewNote({...newNote, objective: e.target.value})} />
                          <textarea placeholder="Assessment..." className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs h-24 outline-none focus:border-emerald-500 text-slate-200" value={newNote.assessment} onChange={e => setNewNote({...newNote, assessment: e.target.value})} />
                          <textarea placeholder="Plan..." className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs h-24 outline-none focus:border-emerald-500 text-slate-200" value={newNote.plan} onChange={e => setNewNote({...newNote, plan: e.target.value})} />
                      </div>
                      <div className="flex justify-end gap-3">
                          <button onClick={() => setIsAddingNote(false)} className="text-xs text-slate-500 font-bold px-4 py-2 hover:text-slate-300">CANCEL</button>
                          <button onClick={handleSaveNote} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-lg transition-colors">SAVE NOTE</button>
                      </div>
                  </div>
              )}

              <div className="space-y-4">
                  {notes.length === 0 ? (
                      <p className="text-xs text-slate-600 italic text-center py-4">No clinical notes recorded for this admission.</p>
                  ) : notes.map(note => (
                      <div key={note.id} className="p-4 border-l-2 border-emerald-500/30 bg-slate-900/20 rounded-r-xl">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{note.authorName} • {new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-4">
                              <div><span className="text-[9px] font-bold text-emerald-500 block mb-1">SUBJECTIVE</span><p className="text-xs text-slate-300 leading-relaxed">{note.subjective || '—'}</p></div>
                              <div><span className="text-[9px] font-bold text-emerald-500 block mb-1">OBJECTIVE</span><p className="text-xs text-slate-300 leading-relaxed">{note.objective || '—'}</p></div>
                              <div><span className="text-[9px] font-bold text-emerald-500 block mb-1">ASSESSMENT</span><p className="text-xs text-slate-300 leading-relaxed">{note.assessment || '—'}</p></div>
                              <div><span className="text-[9px] font-bold text-emerald-500 block mb-1">PLAN</span><p className="text-xs text-slate-300 leading-relaxed">{note.plan || '—'}</p></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}
      <ThresholdModal 
        isOpen={isThresholdModalOpen} 
        onClose={() => setIsThresholdModalOpen(false)} 
        patientId={patientInfo?.patientId} 
        token={token} 
      />
    </div>
  );
}

// ─── THRESHOLD MODAL ─────────────────────────────────────────────────────────
function ThresholdModal({ isOpen, onClose, patientId, token }) {
  const [thresholds, setThresholds] = useState([
    { vitalSign: 'heart_rate', minValue: 40, maxValue: 120 },
    { vitalSign: 'spo2', minValue: 90, maxValue: 100 },
    { vitalSign: 'temperature', minValue: 35, maxValue: 39 },
  ]);

  useEffect(() => {
    if (isOpen && patientId) {
      axios.get(`${BACKEND_URL}/api/patients/${patientId}/thresholds`)
        .then(res => { if (res.data.length) setThresholds(res.data); })
        .catch(err => console.error("Failed to load thresholds", err));
    }
  }, [isOpen, patientId]);

  const handleSave = async () => {
    try {
      await Promise.all(thresholds.map(t => 
        axios.post(`${BACKEND_URL}/api/patients/${patientId}/thresholds`, t)
      ));
      onClose();
    } catch (err) {
      alert("Failed to save thresholds. Ensure you have 'patients:threshold:write' permission.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#0c1220] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-white">Clinical Alarm Thresholds</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {thresholds.map((t, i) => (
            <div key={t.vitalSign} className="grid grid-cols-3 gap-3 items-center">
              <span className="text-xs font-bold text-slate-400 uppercase">{t.vitalSign.replace('_', ' ')}</span>
              <input 
                type="number" 
                placeholder="Min" 
                value={t.minValue || ''} 
                onChange={e => {
                  const next = [...thresholds];
                  next[i].minValue = parseFloat(e.target.value);
                  setThresholds(next);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
              <input 
                type="number" 
                placeholder="Max" 
                value={t.maxValue || ''} 
                onChange={e => {
                  const next = [...thresholds];
                  next[i].maxValue = parseFloat(e.target.value);
                  setThresholds(next);
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold">CANCEL</button>
          <button onClick={handleSave} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">SAVE LIMITS</button>
        </div>
      </div>
    </div>
  );
}


export function DeviceHistory({ deviceCode, backendUrl }) {
  const [activeTab, setActiveTab] = useState('admissions'); // 'admissions' | 'telemetry'
  
  // Admissions State
  const [admissions, setAdmissions] = useState([]);
  const[loadingAdmissions, setLoadingAdmissions] = useState(false);

  // Telemetry Search State
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const[historicalReadings, setHistoricalReadings] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  useEffect(() => {
    if (activeTab === 'admissions') {
      setLoadingAdmissions(true);
      axios.get(`${backendUrl}/api/devices/assignments/${deviceCode}`)
        .then(res => setAdmissions(res.data))
        .catch(err => console.error("Failed to fetch historical assignments", err))
        .finally(() => setLoadingAdmissions(false));
    }
  },[activeTab, deviceCode, backendUrl]);

  const fetchTelemetry = (e) => {
    e?.preventDefault();
    setLoadingTelemetry(true);
    let url = `${backendUrl}/api/readings/${deviceCode}/history?limit=2000`;
    if (startTime) url += `&start=${new Date(startTime).toISOString()}`;
    if (endTime)   url += `&end=${new Date(endTime).toISOString()}`;
    
    axios.get(url)
      .then(res => setHistoricalReadings(res.data))
      .catch(err => console.error("Failed to fetch telemetry", err))
      .finally(() => setLoadingTelemetry(false));
  };

  return (
    <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl flex flex-col animate-in slide-in-from-bottom-2 duration-300 min-h-[450px]">
      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 p-4 gap-2">
        <button
          onClick={() => setActiveTab('admissions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'admissions' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <ListOrdered size={14} /> Past Admissions
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'telemetry' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Activity size={14} /> Telemetry Archive
        </button>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {/* Past Admissions View */}
        {activeTab === 'admissions' && (
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Historical Patient Log</h3>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 text-xs uppercase tracking-wider bg-slate-900/50">
                  <th className="px-5 py-3 font-semibold">Patient Name</th>
                  <th className="px-5 py-3 font-semibold">MRN</th>
                  <th className="px-5 py-3 font-semibold">Diagnosis</th>
                  <th className="px-5 py-3 font-semibold">Admitted At</th>
                  <th className="px-5 py-3 font-semibold">Discharged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {loadingAdmissions ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Loading admissions...</td></tr>
                ) : admissions.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-600">No previous patients recorded for this bed.</td></tr>
                ) : admissions.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white text-xs">{adm.patientName}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs font-mono">{adm.mrn}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{adm.diagnosis || '—'}</td>
                    <td className="px-5 py-4 text-emerald-400/80 text-xs">{new Date(adm.admittedAt).toLocaleString()}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {adm.dischargedAt ? new Date(adm.dischargedAt).toLocaleString() : <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">CURRENTLY ADMITTED</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Telemetry Archive View */}
        {activeTab === 'telemetry' && (
          <div className="flex flex-col h-full">
            <form onSubmit={fetchTelemetry} className="flex flex-wrap items-end gap-4 mb-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Start Date/Time</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-violet-500 outline-none transition-colors[color-scheme:dark]" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">End Date/Time</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:border-violet-500 outline-none transition-colors [color-scheme:dark]" />
                </div>
              </div>
              <button type="submit" disabled={loadingTelemetry} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors">
                {loadingTelemetry ? 'FETCHING...' : 'SEARCH LOGS'}
              </button>
            </form>

            <div className="flex-1 min-h-[300px]">
              {historicalReadings.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-800 rounded-xl">
                  <p className="text-slate-600 text-sm italic">Select a date range and click Search Logs.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <LineChart data={historicalReadings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="recordedAt" stroke="#475569" tick={{ fontSize: 10 }} tickFormatter={(val) => new Date(val).toLocaleTimeString()} />
                    <YAxis domain={['auto', 'auto']} stroke="#475569" tick={{ fontSize: 10 }} width={32} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} 
                      labelFormatter={(label) => new Date(label).toLocaleString()} 
                    />
                    <Line type="monotone" dataKey="payload.heart_rate" name="HR" stroke="#10b981" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="payload.spo2" name="SpO₂" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VitalCard({ label, value, unit, warn, icon, color }) {
  const colors = {
    emerald: warn ? 'text-red-400 border-red-500/30 bg-red-500/8' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/8',
    blue: warn ? 'text-red-400 border-red-500/30 bg-red-500/8' : 'text-blue-400 border-blue-500/20 bg-blue-500/8',
    orange: 'text-orange-400 border-orange-500/20 bg-orange-500/8',
    violet: 'text-violet-400 border-violet-500/20 bg-violet-500/8',
  };
  return (
    <div className={`border rounded-xl px-4 py-3 min-w-[110px] ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[9px] uppercase font-bold tracking-wider">{label}</span></div>
      <div className="text-2xl font-bold tabular-nums">{value ?? '—'}<span className="text-xs font-normal opacity-50 ml-1">{unit}</span></div>
    </div>
  );
}

// ─── ACCESS MANAGEMENT ─────────────────────────────────────────────────────────




function PatientRecordsPage({ backendUrl, initialContext, onClearContext }) {
  const [admissions, setAdmissions] = useState([]);
  const[loading, setLoading] = useState(false);
  const [deviceFilter, setDeviceFilter] = useState(initialContext?.deviceCode || '');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAdmissions(deviceFilter);
  }, [deviceFilter, backendUrl]);

  const fetchAdmissions = (deviceCode) => {
    setLoading(true);
    let url = `${backendUrl}/api/Patients/admissions`;
    if (deviceCode) url += `?deviceCode=${deviceCode}`;
    
    axios.get(url)
      .then(res => setAdmissions(res.data))
      .catch(err => console.error("Failed to fetch historical patients", err))
      .finally(() => setLoading(false));
  };

  const handleClearFilter = () => {
    setDeviceFilter('');
    onClearContext(); // Clears the viewContext in App.js
  };

  const downloadPDPAExport = async (patientId) => {
    try {
      const res = await axios.get(`${backendUrl}/api/Patients/${patientId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PHI_Export_${patientId}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      if(err.response?.status === 403) {
        alert("Action Denied: Patient has not provided explicit PDPA consent for data export.");
      } else {
        alert("Failed to export patient data.");
      }
    }
  };

  const filteredAdmissions = admissions.filter(a => 
    a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.mrn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-200 animate-in fade-in duration-300">
      <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FileSearch size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Patient Records & Admissions</h2>
            <p className="text-xs text-slate-500 mt-0.5">Historical patient log spanning all departments</p>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-between bg-[#0c1220] border border-slate-800/60 rounded-2xl p-4">
        <div className="flex gap-4 items-center">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search by name or MRN..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-violet-500 outline-none w-64 transition-colors"
            />
          </div>
          
          {deviceFilter && (
            <div className="flex items-center gap-2 text-xs bg-violet-500/10 border border-violet-500/30 text-violet-300 px-3 py-2 rounded-lg">
              <span className="font-semibold">Filtered by Bed: {deviceFilter}</span>
              <button onClick={handleClearFilter} className="hover:text-white transition-colors"><X size={14}/></button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl overflow-hidden min-h-[400px]">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-slate-800/60 text-slate-500 text-xs uppercase tracking-wider bg-slate-900/50">
              <th className="px-5 py-3 font-semibold">Patient Name</th>
              <th className="px-5 py-3 font-semibold">MRN</th>
              <th className="px-5 py-3 font-semibold">Assigned Bed</th>
              <th className="px-5 py-3 font-semibold">Admitted At</th>
              <th className="px-5 py-3 font-semibold">Discharged At</th>
              <th className="px-5 py-3 font-semibold text-right">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-500">Loading admissions history...</td></tr>
            ) : filteredAdmissions.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-slate-600">No records found.</td></tr>
            ) : filteredAdmissions.map((adm) => (
              <tr key={adm.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-4 font-semibold text-white text-xs">{adm.patientName}</td>
                <td className="px-5 py-4 text-slate-400 text-xs font-mono">{adm.mrn}</td>
                <td className="px-5 py-4 text-violet-400 font-semibold text-xs">{adm.deviceCode}</td>
                <td className="px-5 py-4 text-emerald-400/80 text-xs">{new Date(adm.admittedAt).toLocaleString()}</td>
                <td className="px-5 py-4 text-slate-500 text-xs">
                  {adm.dischargedAt ? new Date(adm.dischargedAt).toLocaleString() : <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded">CURRENTLY ADMITTED</span>}
                </td>
                <td className="px-5 py-4 text-right">
                  <button 
                    onClick={() => downloadPDPAExport(adm.patientId)}
                    title="Export Patient Record (Requires Consent)"
                    className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                  >
                    <Download size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
