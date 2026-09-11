import React, { useState, useEffect } from 'react';
import { Settings, Save, ShieldCheck, Database, Server } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [gracePeriod, setGracePeriod] = useState(15);
  const [autoClockOutHours, setAutoClockOutHours] = useState(4.0);
  const [manualClockOutEnabled, setManualClockOutEnabled] = useState(true);
  const [earliestClockInMinutes, setEarliestClockInMinutes] = useState(60);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await api.getSettings();
        setSettings(data);
        if (data) {
          setGracePeriod(data.defaultGracePeriodMinutes || 15);
          setAutoClockOutHours(data.autoClockOutHours || 4.0);
          setManualClockOutEnabled(data.manualClockOutEnabled !== false);
          setEarliestClockInMinutes(data.earliestClockInMinutes || 60);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      await api.updateSettings({
        defaultGracePeriodMinutes: Number(gracePeriod),
        autoClockOutHours: Number(autoClockOutHours),
        manualClockOutEnabled,
        earliestClockInMinutes: Number(earliestClockInMinutes)
      });
      setSuccessMsg('Attendance rules and system policies saved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">System & Ministry Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure default attendance policies, grace periods, automated background workers, and security settings.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-900 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Attendance Policy Form */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-6">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Settings className="w-4 h-4 text-blue-600" />
          <span>Attendance Engine Rules</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Default Grace Period (Minutes)
              </label>
              <input
                type="number"
                min={1}
                max={60}
                value={gracePeriod}
                onChange={e => setGracePeriod(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Workers arriving within this window after service start are marked Present; thereafter marked Late.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Automatic Clock-Out Timeout (Hours)
              </label>
              <input
                type="number"
                step={0.5}
                min={1}
                max={12}
                value={autoClockOutHours}
                onChange={e => setAutoClockOutHours(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Default 4 hours. Unclosed attendance records are automatically clocked out by the backend scheduled worker.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Earliest Allowed Clock-In (Minutes Before Start)
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={earliestClockInMinutes}
                onChange={e => setEarliestClockInMinutes(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Prevents workers from prematurely clocking in hours before pre-service setup commences.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                Manual Worker Clock-Out Enabled
              </label>
              <div className="flex items-center space-x-3 mt-3">
                <input
                  type="checkbox"
                  id="manualClockOut"
                  checked={manualClockOutEnabled}
                  onChange={e => setManualClockOutEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="manualClockOut" className="font-semibold text-slate-800 cursor-pointer">
                  Allow workers to manually tap "Clock Out" on mobile
                </label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Policies</span>
            </button>
          </div>
        </form>
      </div>

      {/* Backend & Database Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-4 text-xs">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
          <Server className="w-4 h-4 text-emerald-600" />
          <span>Backend & Database Architecture</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">API Engine</span>
            <span className="font-bold text-slate-800">Node / TypeScript REST API</span>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Online • localhost:5000</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Database Engine</span>
            <span className="font-bold text-slate-800">PostgreSQL / Supabase Schema</span>
            <p className="text-[10px] text-blue-600 font-semibold mt-0.5">RLS & Stored Functions Ready</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Scheduled Cron</span>
            <span className="font-bold text-slate-800">Auto Clock-Out Worker</span>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active (Interval 10m)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
