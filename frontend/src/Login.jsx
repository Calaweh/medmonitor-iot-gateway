import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Lock, Mail, Loader2 } from 'lucide-react';

export default function Login({ setAuth, backendUrl }) {
  const [email, setEmail] = useState('admin@medmonitor.local');
  const [password, setPassword] = useState('Admin123!');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = { email, password };
      if (needs2FA) payload.twoFactorCode = twoFactorCode;

      const res = await axios.post(`${backendUrl}/api/Auth/login`, payload);
      
      // Pass the token and user data up to the main App
      setAuth(res.data.token, res.data.user);
    } catch (err) {
      const serverError = err.response?.data?.error;
      const serverMessage = err.response?.data?.message;

      if (serverError === '2FA_REQUIRED') {
        setNeeds2FA(true);
        setError(''); // Clear error to show 2FA screen cleanly
      } else {
        setError(serverMessage || serverError || 'Failed to connect to server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-emerald-400">
          <Activity size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">MedMonitor Command Center</h2>
        <p className="mt-2 text-center text-sm text-slate-400">Restricted Clinical Access System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-800">
          <form className="space-y-6" onSubmit={handleLogin}>
            {!needs2FA ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Email address</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5 sm:text-sm"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300">Password</label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5 sm:text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-sm font-medium text-slate-300">Authenticator Code</label>
                <p className="text-xs text-slate-500 mb-3 mt-1">Please enter the 6-digit code from your authenticator app.</p>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-emerald-500" />
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    pattern="\d{6}"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    placeholder="000000"
                    className="bg-slate-950 border border-slate-700 text-emerald-400 font-mono tracking-widest text-center text-lg rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full pl-10 p-2.5"
                    required
                    autoFocus
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => { setNeeds2FA(false); setTwoFactorCode(''); }}
                  className="mt-4 text-xs text-slate-400 hover:text-white transition w-full text-center"
                >
                  &larr; Back to password
                </button>
              </div>
            )}

            {error && <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-900/50">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}