import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, UserCog, Building2, Clock, Calendar,
  HeartHandshake, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { selectedBranchId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [testimonies, setTestimonies] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [apprRes, memRes, brRes, evRes, testRes, attRes] = await Promise.all([
          api.getApprovals(selectedBranchId),
          api.getMembers({ branchId: selectedBranchId }),
          api.getBranches(),
          api.getEvents(selectedBranchId),
          api.getTestimoniesQueue(),
          api.getAttendanceDashboard(selectedBranchId)
        ]);

        setApprovals(apprRes || []);
        setMembers(memRes || []);
        setBranches(brRes || []);
        setEvents(evRes || []);
        setTestimonies(testRes || []);
        setAttendance(attRes || null);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [selectedBranchId]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const activeWorkersCount = members.filter(m => m.isWorker && m.accountStatus === 'active').length;
  const pendingTestimoniesCount = testimonies.filter(t => t.status === 'pending_review').length;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Pending Approvals Alert Banner (if any) */}
      {approvals.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/20">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black">
              {approvals.length}
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight">New Member Registration Approvals Pending</h3>
              <p className="text-xs font-medium text-slate-900/80">
                {approvals.length} applicant(s) are awaiting background review and account activation.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('approvals')}
            className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto shrink-0 shadow"
          >
            Review Applications
          </button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Church Members"
          value={members.length}
          subtitle="Registered across chapters"
          icon={Users}
          color="blue"
          trend="+12% this month"
        />
        <StatCard
          title="Pending Approvals"
          value={approvals.length}
          subtitle="Awaiting administrative review"
          icon={UserCheck}
          color="amber"
          badge={approvals.length > 0 ? `${approvals.length} Action Needed` : 'Up to Date'}
        />
        <StatCard
          title="Active Workers"
          value={activeWorkersCount}
          subtitle="Serving in departments"
          icon={UserCog}
          color="emerald"
        />
        <StatCard
          title="Global Branches"
          value={branches.length}
          subtitle="Active worship centers"
          icon={Building2}
          color="purple"
        />
      </div>

      {/* Attendance & Ministry Live Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance Overview */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Today's Worker Attendance & Punctuality
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authoritative server-side tracking for scheduled service sessions
              </p>
            </div>
            <button
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Live Attendance Console</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expected</span>
              <p className="text-xl font-extrabold text-slate-800 mt-1">{attendance?.totalExpected || 0}</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center justify-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Present</span>
              </span>
              <p className="text-xl font-extrabold text-emerald-700 mt-1">{attendance?.present || 0}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>Late</span>
              </span>
              <p className="text-xl font-extrabold text-amber-700 mt-1">{attendance?.late || 0}</p>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
              <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center justify-center space-x-1">
                <XCircle className="w-3 h-3" />
                <span>Absent</span>
              </span>
              <p className="text-xl font-extrabold text-rose-700 mt-1">{attendance?.absent || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center justify-center space-x-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Excused</span>
              </span>
              <p className="text-xl font-extrabold text-blue-700 mt-1">{attendance?.excused || 0}</p>
            </div>
          </div>

          {/* Attendance Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold text-slate-700">
              <span>Overall Worker Turnout</span>
              <span className="text-blue-600">{attendance?.attendanceRate || 0}% Attendance Rate</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${Math.min(100, attendance?.attendanceRate || 0)}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
            <button
              onClick={() => onNavigate('attendance')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition"
            >
              Clock In Worker
            </button>
            <button
              onClick={() => onNavigate('reports')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition"
            >
              Download Attendance Matrix
            </button>
            <button
              onClick={() => onNavigate('notifications')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition"
            >
              Broadcast Notification
            </button>
          </div>
        </div>

        {/* Quick Ministry Highlights */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Ministry Highlights</h3>

          <div className="space-y-4">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Upcoming Events</h4>
                  <p className="text-[11px] text-slate-500">{events.length} published events</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('events')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                View
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <HeartHandshake className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Testimonies Queue</h4>
                  <p className="text-[11px] text-slate-500">{pendingTestimoniesCount} pending moderation</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('testimonies')}
                className="text-xs font-bold text-amber-600 hover:underline"
              >
                Moderate
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Branches</h4>
                  <p className="text-[11px] text-slate-500">{branches.length} locations operational</p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('branches')}
                className="text-xs font-bold text-purple-600 hover:underline"
              >
                Manage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
