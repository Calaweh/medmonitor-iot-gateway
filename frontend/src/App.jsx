import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useVitals } from './hooks/useVitals';
import Login from './Login';
import SystemSettings from './SystemSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed,
  Building2, LogOut, Lock, Shield, Users, Edit2, Plus, ChevronRight,
  ChevronDown, Settings, BarChart2, Layers, Trash2, Search,
  UserPlus, FolderTree, Check, X, Monitor, MapPin, Hash,
  History, FileSearch, Download, Archive, Calendar, ListOrdered, 
  FileText, PenLine, PlusCircle
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

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
        {currentView === 'access' && <AccessManagement />}
        {currentView === 'settings' && <SystemSettings backendUrl={BACKEND_URL} />}
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
  const [showHistory, setShowHistory] = useState(false);
  const [notes, setNotes] = useState([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
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

  useEffect(() => {
    setShowHistory(false);
  }, [deviceCode]);

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
            <ResponsiveContainer width="100%" height="100%">
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
                <div key={i} className="text-xs p-2.5 rounded-lg bg-red-500/8 border border-red-500/20 text-red-200">
                  <div className="flex justify-between mb-1 text-red-400/60">
                    <span>{new Date(a.createdAt).toLocaleTimeString()}</span>
                    <span className="font-bold">{a.severity}</span>
                  </div>
                  <p className="text-slate-300">{a.message}</p>
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
    </div>
  );
}

function DeviceHistory({ deviceCode, backendUrl }) {
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
                <ResponsiveContainer width="100%" height="100%">
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
function AccessManagement() {
  const [activeTab, setActiveTab] = useState('roles');
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [resRoles, resPerms] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/AccessManagement/roles`),
          axios.get(`${BACKEND_URL}/api/AccessManagement/permissions`),
        ]);
        setRoles(resRoles.data);
        setPermissions(resPerms.data);
        if (resRoles.data.length) setSelectedRole(resRoles.data[0]);

        // Users & groups — graceful fallback if endpoints not yet live
        try {
          const resUsers = await axios.get(`${BACKEND_URL}/api/Auth/users`);
          setUsers(resUsers.data);
        } catch { setUsers(MOCK_USERS); }

        setGroups(MOCK_GROUPS);
      } catch {
        setRoles(MOCK_ROLES);
        setPermissions(MOCK_PERMISSIONS);
        setSelectedRole(MOCK_ROLES[0]);
        setUsers(MOCK_USERS);
        setGroups(MOCK_GROUPS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const togglePermission = async (roleId, permId) => {
    if (selectedRole?.isSystemRole) return;
    try {
      await axios.post(`${BACKEND_URL}/api/AccessManagement/roles/${roleId}/permissions`, permId, {
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await axios.get(`${BACKEND_URL}/api/AccessManagement/roles`);
      setRoles(res.data);
      setSelectedRole(res.data.find(r => r.id === roleId));
    } catch {
      // Optimistic update for demo
      setRoles(prev => prev.map(r => {
        if (r.id !== roleId) return r;
        const hasPerm = r.permissions?.some(p => p.id === permId);
        return {
          ...r,
          permissions: hasPerm
            ? r.permissions.filter(p => p.id !== permId)
            : [...(r.permissions || []), permissions.find(p => p.id === permId)],
        };
      }));
      setSelectedRole(prev => {
        const hasPerm = prev.permissions?.some(p => p.id === permId);
        return {
          ...prev,
          permissions: hasPerm
            ? prev.permissions.filter(p => p.id !== permId)
            : [...(prev.permissions || []), permissions.find(p => p.id === permId)],
        };
      });
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BACKEND_URL}/api/AccessManagement/roles`, newRole);
      const created = { ...res.data, permissions: [] };
      setRoles(prev => [...prev, created]);
      setSelectedRole(created);
    } catch {
      const mock = { id: Date.now().toString(), ...newRole, isSystemRole: false, permissions: [] };
      setRoles(prev => [...prev, mock]);
      setSelectedRole(mock);
    }
    setIsModalOpen(false);
    setNewRole({ name: '', description: '' });
  };

  const filteredUsers = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'groups', label: 'Groups & Departments', icon: FolderTree },
    { id: 'users', label: 'User Provisioning', icon: Users },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-3">
      <div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-400 rounded-full animate-spin" />
      Synchronising security schema…
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800/60 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Shield size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Access Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">Dynamic RBAC — HSA CLS-MD Level 2 Compliant</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── ROLES & PERMISSIONS TAB ── */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-12 gap-5">
          {/* Role list */}
          <div className="col-span-3 space-y-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Roles</span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                <Plus size={11} /> New
              </button>
            </div>

            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedRole?.id === r.id
                    ? 'bg-violet-500/10 border-violet-500/25 text-violet-300'
                    : 'border-slate-800/60 hover:border-slate-700 bg-[#0c1220] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <div className="flex items-center gap-1.5">
                    {r.isSystemRole && <Lock size={10} className="text-amber-500 opacity-60" title="System Role — locked" />}
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                      {r.permissions?.length ?? 0}
                    </span>
                  </div>
                </div>
                {r.description && (
                  <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{r.description}</p>
                )}
              </button>
            ))}
          </div>

          {/* Permissions matrix */}
          <div className="col-span-9 bg-[#0c1220] border border-slate-800/60 rounded-2xl p-6">
            {selectedRole ? (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-white">{selectedRole.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedRole.permissions?.length ?? 0} active permissions
                      {selectedRole.isSystemRole && ' · System role — read only'}
                    </p>
                  </div>
                </div>

                {/* Group by resource */}
                {Object.entries(
                  permissions.reduce((acc, p) => {
                    if (!acc[p.resource]) acc[p.resource] = [];
                    acc[p.resource].push(p);
                    return acc;
                  }, {})
                ).map(([resource, perms]) => (
                  <div key={resource} className="mb-5">
                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-1">
                      {resource}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map(p => {
                        const has = selectedRole.permissions?.some(rp => rp.id === p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePermission(selectedRole.id, p.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              has
                                ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300'
                                : 'border-slate-800/60 text-slate-500 hover:border-slate-700'
                            } ${selectedRole.isSystemRole ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <div>
                              <div className="text-xs font-mono font-bold">{p.resource}:{p.action}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{p.description}</div>
                            </div>
                            <div className={`w-9 h-5 rounded-full flex items-center px-0.5 transition-all ${has ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'}`}>
                              <div className="w-4 h-4 bg-white rounded-full shadow" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-slate-600 text-sm">Select a role to configure permissions.</p>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS TAB ── */}
      {activeTab === 'groups' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Groups enforce RLS boundaries. Members inherit all role permissions assigned to their group.</p>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-colors">
              <Plus size={12} /> New Group
            </button>
          </div>

          {/* Groups table */}
          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 text-xs">
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Group Name</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Inherited Roles</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Members</th>
                  <th className="text-right px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={g.id} className={`border-b border-slate-800/40 text-slate-300 hover:bg-slate-800/20 transition-colors ${i === groups.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{g.name}</div>
                      <div className="text-[10px] text-slate-600 mt-0.5">{g.description}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded-lg text-slate-400">
                        <Building2 size={10} /> {g.dept}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {g.roles.map(r => (
                          <span key={r} className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-md font-medium">
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-slate-400">{g.memberCount} members</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><Edit2 size={13} /></button>
                        <button className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="bg-[#0c1220] border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:border-violet-500 outline-none w-64 transition-colors"
              />
            </div>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-colors">
              <UserPlus size={12} /> Provision User
            </button>
          </div>

          <div className="bg-[#0c1220] border border-slate-800/60 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-slate-500 text-xs">
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Clinician</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3 font-semibold uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => (
                  <tr key={u.id} className={`border-b border-slate-800/40 text-slate-300 hover:bg-slate-800/20 transition-colors ${i === filteredUsers.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase shrink-0">
                          {u.fullName?.[0] || '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-white text-sm">{u.fullName}</div>
                          <div className="text-[10px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                        u.role === 'admin' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : u.role === 'doctor' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{u.dept || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                        u.isActive !== false
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-slate-700 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive !== false ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all"><Edit2 size={13} /></button>
                        <button className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-600 text-sm">No users match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0c1220] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Define New Clinical Role</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Role Name</label>
                <input
                  required
                  type="text"
                  value={newRole.name}
                  onChange={e => setNewRole({ ...newRole, name: e.target.value })}
                  className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-violet-500 outline-none transition-colors"
                  placeholder="e.g. Senior Charge Nurse"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Description</label>
                <textarea
                  value={newRole.description}
                  onChange={e => setNewRole({ ...newRole, description: e.target.value })}
                  className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-violet-500 outline-none h-20 transition-colors resize-none"
                  placeholder="Clinical responsibilities and scope..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-semibold transition-colors">Register Role</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SYSTEM PARAMETERS PLACEHOLDER ────────────────────────────────────────────
function SystemParametersPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 text-slate-600">
      <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center">
        <Settings size={36} className="opacity-30" />
      </div>
      <div className="text-center">
        <p className="text-slate-400 font-semibold text-sm">System Parameters</p>
        <p className="text-xs mt-1">Alert thresholds, retention policies, integrations — coming in Phase 5</p>
      </div>
    </div>
  );
}

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

// ─── MOCK DATA FOR ACCESS MANAGEMENT ──────────────────────────────────────────
const MOCK_ROLES = [
  { id: 'admin', name: 'Administrator', description: 'Full system access and security management', isSystemRole: true, permissions: [] },
  { id: 'doctor', name: 'Medical Officer', description: 'Full clinical access and patient management', isSystemRole: false, permissions: [] },
  { id: 'nurse', name: 'Registered Nurse', description: 'Patient monitoring and bedside care', isSystemRole: false, permissions: [] },
];

const MOCK_PERMISSIONS = [
  { id: '1', resource: 'Patients', action: 'View', description: 'Access patient records' },
  { id: '2', resource: 'Patients', action: 'Edit', description: 'Modify patient information' },
  { id: '3', resource: 'Devices', action: 'Monitor', description: 'View live telemetry' },
  { id: '4', resource: 'System', action: 'Configure', description: 'Change system settings' },
];

const MOCK_USERS = [
  { id: '1', fullName: 'Dr. Sarah Lim', email: 'sarah.lim@medmonitor.local', role: 'doctor', dept: 'ICU', isActive: true },
  { id: '2', fullName: 'Nurse John Doe', email: 'john.doe@medmonitor.local', role: 'nurse', dept: 'ICU', isActive: true },
  { id: '3', fullName: 'Admin User', email: 'admin@medmonitor.local', role: 'admin', dept: 'IT', isActive: true },
];

const MOCK_GROUPS = [
  { id: 'g1', name: 'ICU Team A', description: 'Intensive Care Unit - Morning Shift', dept: 'ICU', roles: ['doctor', 'nurse'], memberCount: 12 },
  { id: 'g2', name: 'Pediatrics B', description: 'Pediatrics Ward - Night Shift', dept: 'Pediatrics', roles: ['nurse'], memberCount: 8 },
];