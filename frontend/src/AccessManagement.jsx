import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield, Users, FolderTree, Plus, Lock, Building2,
  Edit2, Trash2, Search, UserPlus, X
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

export default function AccessManagement({ token }) {
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

        try {
          const resUsers = await axios.get(`${BACKEND_URL}/api/Auth/users`);
          setUsers(resUsers.data);
        } catch { 
            // Fallback for demo if users endpoint is missing
            setUsers([]); 
        }
        
        try {
            const resGroups = await axios.get(`${BACKEND_URL}/api/AccessManagement/groups`);
            setGroups(resGroups.data);
        } catch {
            setGroups([]);
        }
      } catch (err) {
        console.error("Failed to load access management data", err);
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
    } catch (err) {
      console.error("Failed to toggle permission", err);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BACKEND_URL}/api/AccessManagement/roles`, newRole);
      const created = { ...res.data, permissions: [] };
      setRoles(prev => [...prev, created]);
      setSelectedRole(created);
      setIsModalOpen(false);
      setNewRole({ name: '', description: '' });
    } catch (err) {
      console.error("Failed to create role", err);
    }
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

      <div className="flex gap-1 bg-slate-900/50 border border-slate-800/60 rounded-xl p-1 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                active ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'roles' && (
        <div className="grid grid-cols-12 gap-5">
          <div className="col-span-3 space-y-2">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Roles</span>
              <button onClick={() => setIsModalOpen(true)} className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                <Plus size={11} /> New
              </button>
            </div>
            {roles.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  selectedRole?.id === r.id ? 'bg-violet-500/10 border-violet-500/25 text-violet-300' : 'border-slate-800/60 hover:border-slate-700 bg-[#0c1220] text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <div className="flex items-center gap-1.5">
                    {r.isSystemRole && <Lock size={10} className="text-amber-500 opacity-60" title="System Role — locked" />}
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">{r.permissions?.length ?? 0}</span>
                  </div>
                </div>
                {r.description && <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">{r.description}</p>}
              </button>
            ))}
          </div>

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
                {Object.entries(
                  permissions.reduce((acc, p) => {
                    if (!acc[p.resource]) acc[p.resource] = [];
                    acc[p.resource].push(p);
                    return acc;
                  }, {})
                ).map(([resource, perms]) => (
                  <div key={resource} className="mb-5">
                    <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 px-1">{resource}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {perms.map(p => {
                        const has = selectedRole.permissions?.some(rp => rp.id === p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => togglePermission(selectedRole.id, p.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              has ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300' : 'border-slate-800/60 text-slate-500 hover:border-slate-700'
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

      {activeTab === 'groups' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">Groups enforce RLS boundaries. Members inherit all role permissions assigned to their group.</p>
            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold text-white flex items-center gap-2 transition-colors">
              <Plus size={12} /> New Group
            </button>
          </div>
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
                        {g.roles?.map(r => (
                          <span key={r} className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-md font-medium">{r}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4"><span className="text-xs text-slate-400">{g.memberCount} members</span></td>
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
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 uppercase shrink-0">{u.fullName?.[0] || '?'}</div>
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
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{u.dept || '—'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${u.isActive !== false ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0c1220] border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Define New Clinical Role</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Role Name</label>
                <input required type="text" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-violet-500 outline-none transition-colors" placeholder="e.g. Senior Charge Nurse" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Description</label>
                <textarea value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-violet-500 outline-none h-20 transition-colors resize-none" placeholder="Clinical responsibilities and scope..." />
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