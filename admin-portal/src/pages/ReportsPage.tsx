import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Filter, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReportsPage: React.FC = () => {
  const { selectedBranchId } = useAuth();
  const [matrixData, setMatrixData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState('2026-03');

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendanceMatrix(selectedBranchId, month);
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [selectedBranchId, month]);

  const handleExportCsv = () => {
    const exportUrl = api.getAttendanceExportUrl(selectedBranchId, month);
    window.open(exportUrl, '_blank');
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Monthly Attendance Matrix & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Worker punctuality rate, attendance status matrix (✓ Present, L Late, A Absent, E Excused), and total hours.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
            <Calendar className="w-4 h-4 text-blue-600" />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Legend Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider">Matrix Legend:</span>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">✓</span>
            <span className="font-semibold text-slate-700">Present (On Time)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[11px]">L</span>
            <span className="font-semibold text-slate-700">Late (After Grace Period)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-rose-100 text-rose-800 font-bold flex items-center justify-center text-[11px]">A</span>
            <span className="font-semibold text-slate-700">Absent</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[11px]">E</span>
            <span className="font-semibold text-slate-700">Excused</span>
          </div>
        </div>

        <span className="text-slate-400 text-[11px]">Reporting Month: <strong>{month}</strong></span>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10">Worker</th>
                <th className="py-3 px-4">Department & Position</th>
                {matrixData?.dates?.map((d: string) => (
                  <th key={d} className="py-3 px-2 text-center whitespace-nowrap">
                    {d.substring(5)}
                  </th>
                ))}
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Late</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-3 text-center">Excused</th>
                <th className="py-3 px-3 text-center">Rate</th>
                <th className="py-3 px-4 text-right">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">Loading attendance matrix...</td>
                </tr>
              ) : !matrixData?.rows || matrixData.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">No worker records found for this period.</td>
                </tr>
              ) : (
                matrixData.rows.map((row: any) => (
                  <tr key={row.workerId} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 sticky left-0 bg-white z-10">
                      <div>
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">
                          {row.workerCode}
                        </span>
                        <p className="font-bold text-slate-900 mt-0.5">{row.workerName}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <p className="font-semibold text-slate-800">{row.department}</p>
                      <p className="text-[10px] text-slate-400">{row.position}</p>
                    </td>

                    {/* Matrix symbols per service date */}
                    {matrixData.dates?.map((d: string) => {
                      const item = row.serviceDates[d];
                      const symbol = item?.symbol || 'A';
                      const colorClass = 
                        symbol === '✓' ? 'bg-emerald-100 text-emerald-800' :
                        symbol === 'L' ? 'bg-amber-100 text-amber-800' :
                        symbol === 'E' ? 'bg-blue-100 text-blue-800' :
                        'bg-rose-100 text-rose-800';

                      return (
                        <td key={d} className="py-3 px-2 text-center">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-bold text-xs ${colorClass}`} title={item?.clockIn ? `Clocked in at: ${item.clockIn}` : undefined}>
                            {symbol}
                          </span>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-center font-bold text-emerald-700">{row.present}</td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700">{row.late}</td>
                    <td className="py-3 px-3 text-center font-bold text-rose-700">{row.absent}</td>
                    <td className="py-3 px-3 text-center font-bold text-blue-700">{row.excused}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                        row.attendanceRate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        row.attendanceRate >= 50 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {row.attendanceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {row.totalHours} hrs
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
