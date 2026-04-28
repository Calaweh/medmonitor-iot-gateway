import React, { useState } from 'react';
import { 
  Shield, Users, FolderTree, UserPlus, Lock, Check, 
  Plus, Trash2, Edit2, Search, Building2
} from 'lucide-react';

export default function AccessManagement() {
  const [activeTab, setActiveTab] = useState('users'); // users | roles | groups
  
  // --- MOCK DATA (Connect this to your API endpoints in the next step) ---
  const [users] = useState([
    { id: '1', name: 'Dr. Sarah Lim', email: 'sarah.lim@medmonitor.local', role: 'Doctor', dept: 'ICU', status: 'Active' },
    { id: '2', name: 'Nurse John Doe', email: 'john.doe@medmonitor.local', role: 'Nurse', dept: 'ICU', status: 'Active' },
    { id: '3', name: 'Sys Admin', email: 'admin@medmonitor.local', role: 'Admin', dept: 'All', status: 'Active' },
  ]);

  const [roles, setRoles] = useState([
    { id: 'r1', name: 'Nurse', description: 'Clinical staff for monitoring and resolution', perms: ['alerts:view', 'alerts:resolve', 'reports:download'] },
    { id: 'r2', name: 'Doctor', description: 'Medical officers with full clinical authority', perms: ['alerts:view', 'alerts:resolve', 'patients:view', 'patients:admit', 'patients:threshold', 'reports:download'] },
    { id: 'r3', name: 'Admin', description: 'System administrators with full access', perms: ['alerts:view', 'patients:view', 'audit:view', 'users:manage', 'rbac:manage'] },
  ]);

  const [permissions] = useState([
    { id: 'alerts:view', resource: 'alerts', action: 'view', desc: 'View real-time telemetry alerts' },
    { id: 'alerts:resolve', resource: 'alerts', action: 'resolve', desc: 'Resolve alerts in assigned ward' },
    { id: 'patients:view', resource: 'patients', action: 'view', desc: 'View patient medical records' },
    { id: 'patients:admit', resource: 'patients', action: 'admit', desc: 'Admit/Discharge patients' },
    { id: 'patients:export', resource: 'patients', action: 'export', desc: 'Export PHI (PDPA Consent required)' },
    { id: 'reports:download', resource: 'reports', action: 'download', desc: 'Generate shift handover PDFs' },
    { id: 'audit:view', resource: 'audit', action: 'view', desc: 'View security audit logs' },
    { id: 'rbac:manage', resource: 'rbac', action: 'manage', desc: 'Manage roles and groups' },
  ]);

  const [groups] = useState([
    { id: 'g1', name: 'ICU Night Shift Team A', dept: 'ICU', roles: ['Nurse', 'Doctor'] },
    { id: 'g2', name: 'Pediatrics Day Shift', dept: 'Pediatrics', roles: ['Nurse'] },
  ]);

  const [selectedRole, setSelectedRole] = useState(roles[0]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 text-slate-200">
      <header className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Lock className="text-emerald-400" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-white">Access Management Center</h2>
            <p className="text-xs text-slate-500 mt-1">Configure clinical permissions, roles, and department isolation (HSA CLS-MD Level 2 Compliant)</p>
          </div>
        </div>
      </header>

      {/* NAVIGATION TABS */}
      <div className="flex gap-4 border-b border-slate-800">
        <TabButton id="users" label="User Provisioning" icon={<Users size={16} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="roles" label="Role Editor" icon={<Shield size={16} />} activeTab={activeTab} setActiveTab={setActiveTab} />
        <TabButton id="groups" label="Groups & Departments" icon={<FolderTree size={16} />} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      <div className="py-4">
        {/* TAB 1: USER PROVISIONING */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4 h-fit">
              <h3 className="text-sm font-semibold text-slate-400 uppercase mb-2 flex items-center gap-2">
                <UserPlus size={14} /> Provision New User
              </h3>
              <div>
                <label className="text-xs text-slate-500">Full Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 focus:outline-none" placeholder="Enter full name..." />
              </div>
              <div>
                <label className="text-xs text-slate-500">Email Address</label>
                <input type="email" className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 focus:outline-none" placeholder="Enter email..." />
              </div>
              <div>
                <label className="text-xs text-slate-500">Primary Role</label>
                <select className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 focus:outline-none">
                  {roles.map(r => <option key={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Department Assignation</label>
                <select className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg p-2 text-sm mt-1 focus:border-emerald-500 focus:outline-none">
                  <option>ICU</option>
                  <option>General Ward</option>
                  <option>Pediatrics</option>
                </select>
              </div>
              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 transition rounded-lg text-sm font-semibold text-white mt-2">
                Create User & Generate 2FA
              </button>
            </div>

            {/* Table */}
            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Active Users</h3>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-600" />
                  <input type="text" className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-8 p-1.5 text-xs focus:border-emerald-500 focus:outline-none" placeholder="Search users..." />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800">
                    <th className="text-left pb-2 font-medium">Name</th>
                    <th className="text-left pb-2 font-medium">Role</th>
                    <th className="text-left pb-2 font-medium">Department</th>
                    <th className="text-right pb-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-800/50 text-slate-300">
                      <td className="py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-slate-600">{u.email}</div>
                      </td>
                      <td className="py-3"><span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                      <td className="py-3 text-slate-400">{u.dept}</td>
                      <td className="py-3 text-right space-x-2">
                        <button className="p-1.5 hover:bg-slate-800 rounded-md transition text-slate-500 hover:text-white"><Edit2 size={14} /></button>
                        <button className="p-1.5 hover:bg-slate-800 rounded-md transition text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ROLE EDITOR */}
        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Configured Roles</h3>
                <button className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                  <Plus size={12} /> Add Role
                </button>
              </div>
              {roles.map(r => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRole(r)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedRole.id === r.id 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'border-transparent hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium text-sm text-slate-200">{r.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{r.description}</div>
                </button>
              ))}
            </div>

            {/* Permissions Matrix */}
            <div className="lg:col-span-2 bg-slate-900 p-6 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Permissions for {selectedRole.name}</h3>
                  <p className="text-xs text-slate-500">Toggling a permission updates access immediately on next token refresh.</p>
                </div>
                <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">{selectedRole.perms.length} active claims</span>
              </div>
              
              <div className="space-y-2">
                {permissions.map(p => {
                  const isChecked = selectedRole.perms.includes(p.id);
                  return (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isChecked ? 'bg-slate-800/50 border-slate-700' : 'border-transparent hover:border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          <span className="font-mono text-emerald-400 text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded">{p.id}</span>
                          {p.action} on {p.resource}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{p.desc}</div>
                      </div>
                      <button 
                        className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                          isChecked ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 bg-white rounded-full shadow-md flex items-center justify-center">
                          {isChecked && <Check size={10} className="text-emerald-600" />}
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GROUPS & DEPARTMENTS */}
        {activeTab === 'groups' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 uppercase">Departmental Teams</h3>
                <p className="text-xs text-slate-500">Groups enforce RLS boundaries. Users inherit all roles assigned to their group.</p>
              </div>
              <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-md text-xs font-semibold text-white flex items-center gap-2 transition">
                <Building2 size={12} /> New Department Group
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map(g => (
                <div key={g.id} className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white">{g.name}</h4>
                      <p className="text-xs text-slate-600">Scope: {g.dept} Department</p>
                    </div>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400">Team</span>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Inherited Roles</p>
                    <div className="flex gap-1">
                      {g.roles.map(r => <span key={r} className="text-xs bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">{r}</span>)}
                    </div>
                  </div>

                  <button className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors">
                    Manage Members
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for Tabs
function TabButton({ id, label, icon, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
        isActive 
          ? 'text-emerald-400 border-emerald-500' 
          : 'text-slate-500 border-transparent hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}