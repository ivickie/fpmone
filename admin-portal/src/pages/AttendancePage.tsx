import React, { useState, useEffect } from 'react';
import {
  UserCog, Clock, CheckCircle2, AlertTriangle, XCircle, LogOut,
  Plus, RefreshCw, ShieldCheck, QrCode, Key, Fingerprint
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const AttendancePage: React.FC = () => {
  const { selectedBranchId } = useAuth();
  const [data, setData] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick Clock-In Test modal
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [workerIdentifier, setWorkerIdentifier] = useState('FPM-0001');
  const [serviceId, setServiceId] = useState('');
  const [method, setMethod] = useState<'pin' | 'qr' | 'biometric'>('pin');
  const [pin, setPin] = useState('1234');
  const [clockInMsg, setClockInMsg] = useState<string | null>(null);

  // Excuse Absence modal
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [excuseReason, setExcuseReason] = useState('');

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const [dashRes, svcRes] = await Promise.all([
        api.getAttendanceDashboard(selectedBranchId),
        api.getServices(selectedBranchId)
      ]);
      setData(dashRes);
      setServices(svcRes || []);
      if (svcRes && svcRes.length > 0 && !serviceId) {
        setServiceId(svcRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedBranchId]);

  const handleManualClockOut = async (attendanceId: string) => {
    try {
      await api.clockOut(attendanceId, 'admin');
      await fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Clock out failed');
    }
  };

  const handleClockInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClockInMsg(null);
    try {
      const res = await api.clockIn({
        workerIdentifier,
        serviceId,
        method,
        pin: method === 'pin' ? pin : undefined
      });
      setClockInMsg(`Clock-in successful! Recorded status: ${res.record.status.toUpperCase()} at ${new Date(res.record.clockInTime).toLocaleTimeString()}`);
      await fetchAttendance();
    } catch (err: any) {
      setClockInMsg(`Error: ${err.message}`);
    }
  };

  const handleExcuseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.excuseAbsence(selectedRecordId, excuseReason);
      setExcuseModalOpen(false);
      setExcuseReason('');
      await fetchAttendance();
    } catch (err: any) {
      alert(err.message || 'Failed to excuse absence');
    }
  };

  const handleTriggerAutoClockOut = async () => {
    try {
      const res = await api.autoClockOut();
      alert(`Automated timeout job executed: ${res.clockedOutCount} expired worker session(s) closed.`);
      await fetchAttendance();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Live Worker Attendance & Clock-In Console</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Strict server-side authoritative timestamps, grace periods, and automated 4-hour clock-outs.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setClockInModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Clock-In</span>
          </button>
          <button
            onClick={handleTriggerAutoClockOut}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            title="Run background auto clock-out"
          >
            Run Auto-Timeout
          </button>
          <button
            onClick={fetchAttendance}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-600 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Expected</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{data?.totalExpected || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center space-x-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Present</span>
          </span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{data?.present || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center justify-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Late</span>
          </span>
          <p className="text-2xl font-black text-amber-700 mt-1">{data?.late || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center justify-center space-x-1">
            <XCircle className="w-3 h-3" />
            <span>Absent</span>
          </span>
          <p className="text-2xl font-black text-rose-700 mt-1">{data?.absent || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs text-center">
          <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center justify-center space-x-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Excused</span>
          </span>
          <p className="text-2xl font-black text-blue-700 mt-1">{data?.excused || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs text-center bg-gradient-to-tr from-blue-50 to-white">
          <span className="text-[10px] font-bold text-blue-600 uppercase">Live Clocked In</span>
          <p className="text-2xl font-black text-blue-700 mt-1">{data?.currentlyClockedIn || 0}</p>
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Today's Recorded Worker Sessions
          </h3>
          <span className="text-xs text-slate-400">
            {data?.recentRecords?.length || 0} Records logged
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Worker ID & Name</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Clock-In Time</th>
                <th className="py-3 px-4">Clock-Out Time</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Punctuality</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading attendance data...</td>
                </tr>
              ) : !data?.recentRecords || data.recentRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No attendance records for today yet. Workers can clock in via mobile or administrator console.
                  </td>
                </tr>
              ) : (
                data.recentRecords.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                          {r.workerCode || 'FPM-XXXX'}
                        </span>
                        <span className="font-bold text-slate-900">{r.workerName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{r.departmentName}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{r.serviceName}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-bold text-slate-500">
                      {r.clockInMethod ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded">
                          {r.clockInMethod}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {r.clockOutTime ? (
                        <span className="flex items-center space-x-1">
                          <span>{new Date(r.clockOutTime).toLocaleTimeString()}</span>
                          {r.isAutoClockOut && (
                            <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1 rounded">AUTO</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">ACTIVE NOW</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {r.durationMinutes ? `${r.durationMinutes} min` : 'In Progress'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                        r.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : r.status === 'excused'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.clockInTime && !r.clockOutTime ? (
                        <button
                          onClick={() => handleManualClockOut(r.id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                        >
                          Clock Out
                        </button>
                      ) : r.status === 'late' || r.status === 'absent' ? (
                        <button
                          onClick={() => { setSelectedRecordId(r.id); setExcuseModalOpen(true); }}
                          className="px-2 py-1 text-blue-600 hover:underline text-[11px] font-semibold cursor-pointer"
                        >
                          Excuse
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Clock-In Modal */}
      {clockInModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Record Worker Clock-In</h3>
            <p className="text-xs text-slate-500">
              Timestamps are generated strictly on the server database. Punctuality is evaluated automatically based on service start time and grace period.
            </p>

            {clockInMsg && (
              <div className={`p-3 rounded-xl text-xs font-semibold ${
                clockInMsg.startsWith('Error') ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {clockInMsg}
              </div>
            )}

            <form onSubmit={handleClockInSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Worker ID Code</label>
                <input
                  type="text"
                  required
                  value={workerIdentifier}
                  onChange={e => setWorkerIdentifier(e.target.value)}
                  placeholder="e.g. FPM-0001"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Service Schedule</label>
                <select
                  value={serviceId}
                  onChange={e => setServiceId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime.substring(0, 5)} - {s.expectedEndTime.substring(0, 5)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Authentication Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('pin')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${
                      method === 'pin' ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    <span>PIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('qr')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${
                      method === 'qr' ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QR Code</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('biometric')}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 ${
                      method === 'biometric' ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>Biometric</span>
                  </button>
                </div>
              </div>

              {method === 'pin' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Worker PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    placeholder="1234"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl tracking-widest text-center font-bold"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClockInModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Authoritative Clock-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excuse Absence Modal */}
      {excuseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Mark Absence as Excused</h3>
            <p className="text-xs text-slate-500">
              Provide pastoral or medical excuse notes. The original attendance record is preserved in the audit trail.
            </p>
            <form onSubmit={handleExcuseSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Excuse Reason / Notes</label>
                <textarea
                  required
                  rows={3}
                  value={excuseReason}
                  onChange={e => setExcuseReason(e.target.value)}
                  placeholder="e.g. Official ministry outreach assignment approved by Pastor David..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setExcuseModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirm Excuse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
