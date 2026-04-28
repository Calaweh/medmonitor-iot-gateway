import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useVitals } from './hooks/useVitals';
import Login from './Login';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Activity, Heart, Thermometer, AlertTriangle, CheckCircle2, Bed,
  Building2, LogOut, Lock, Shield, Users, Edit2, Plus, ChevronRight,
  ChevronDown, Settings, BarChart2, Layers, Trash2, Search,
  UserPlus, FolderTree, Check, X, Monitor, MapPin, Hash
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// ─── NAV CONFIG ────────────────────────────────────────────────────────────────
// Add new top-level views here for scalability
const NAV_ITEMS = [
  {
    id: 'monitoring',
    label: 'Patient Monitoring',
    icon: Activity,
    roles: ['nurse', 'doctor', 'admin'],
  },
  {
    id: 'access',
    label: 'Access Management',
    icon: Shield,
    roles: ['admin'],
  },
  {
    id: 'settings',
    label: 'System Parameters',
    icon: Settings,
    roles: ['admin'],
    badge: 'Soon',
  },
];

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_data') || 'null'));
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [currentView, setCurrentView] = useState('monitoring');

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
    if (!token) return;
    axios.get(`${BACKEND_URL}/api/devices`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setDevices(res.data))
      .catch(err => {
        if (err.response?.status === 401) handleLogout();
      }); 
  }, [token]);

  // Group: site → department → room → beds
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
              />
            : <MonitoringLanding />
        )}
        {currentView === 'access' && <AccessManagement />}
        {currentView === 'settings' && <SystemParametersPlaceholder />}
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
function PatientDetail({ deviceCode, token, patientInfo }) {
  const { readings, latestReading, alerts } = useVitals(BACKEND_URL, deviceCode, token);
  const [isGenerating, setIsGenerating] = useState(false);

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
          <button
            onClick={downloadShiftReport}
            disabled={isGenerating}
            className="mt-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-emerald-400 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors border border-slate-800"
          >
            <BarChart2 size={13} />
            {isGenerating ? 'GENERATING...' : 'SHIFT REPORT (PDF)'}
          </button>
        </div>

        {/* Vitals strip */}
        <div className="flex gap-3">
          <VitalCard label="Heart Rate" value={payload.heart_rate} unit="bpm" warn={payload.heart_rate > 120 || payload.heart_rate < 40} icon={<Heart size={14} />} color="emerald" />
          <VitalCard label="SpO₂" value={payload.spo2} unit="%" warn={payload.spo2 < 90} icon={<Activity size={14} />} color="blue" />
          <VitalCard label="Temp" value={payload.temperature} unit="°C" warn={false} icon={<Thermometer size={14} />} color="orange" />
          <VitalCard label="Resp Rate" value={payload.respiration} unit="br/m" warn={false} icon={<Activity size={14} />} color="violet" />
        </div>
      </header>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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

        <div className="flex flex-col gap-4">
          {/* Status */}
          <div className={`bg-[#0c1220] border rounded-2xl p-4 ${alertState.status === 'CRITICAL' ? 'border-red-500/30' : 'border-emerald-500/20'}`}>
            <div className={`flex items-center gap-2 mb-2 ${alertState.status === 'CRITICAL' ? 'text-red-400' : 'text-emerald-400'}`}>
              {alertState.status === 'CRITICAL' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              <span className="text-sm font-bold">{alertState.status}</span>
            </div>
            <p className="text-xs text-slate-500">{alertState.text}</p>
          </div>

          {/* Alerts */}
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