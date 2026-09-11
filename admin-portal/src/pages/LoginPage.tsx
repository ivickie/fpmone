import React, { useState } from 'react';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@fpmchurch.org');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A192F] via-[#0F274A] to-[#1E3A8A] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Ministry Branding */}
        <div className="text-center mb-8">
          <img
            src="/church-logo.png"
            alt="Faith Preachers Ministry"
            className="w-20 h-20 rounded-full object-cover ring-4 ring-amber-400/50 shadow-2xl shadow-amber-500/20 mx-auto mb-4 bg-white"
          />
          <h1 className="text-2xl font-black text-white tracking-tight">FPM ONE</h1>
          <p className="text-sm text-slate-300 font-medium mt-1">Faith Preachers Ministry • Admin Portal</p>
          <div className="inline-flex items-center space-x-1.5 bg-blue-900/60 border border-blue-700/50 rounded-full px-3 py-1 mt-3 text-xs text-blue-200">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Authorized Personnel & Pastoral Access Only</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Email Address or Phone
              </label>
              <input
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@fpmchurch.org"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Admin Portal</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
              Quick Switch Demo Roles
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('admin@fpmchurch.org')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 font-semibold text-left transition"
              >
                <div className="text-slate-900 font-bold">Super Admin</div>
                <div className="text-[10px] text-slate-500">Global Oversight</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('pastor.david@fpmchurch.org')}
                className="p-2.5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 font-semibold text-left transition"
              >
                <div className="text-slate-900 font-bold">Branch Pastor</div>
                <div className="text-[10px] text-slate-500">HQ Chapter</div>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Faith Preachers Ministry &copy; {new Date().getFullYear()}. All Rights Reserved.
        </p>
      </div>
    </div>
  );
};
