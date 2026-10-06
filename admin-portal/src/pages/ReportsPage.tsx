import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, Download, Calendar, FileText, Plus, Eye, 
  CheckCircle2, Clock, AlertCircle, Trash2, Building2, User, 
  Filter, Search, MessageSquare, Check, X, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface DepartmentReportItem {
  id: string;
  departmentId: string;
  departmentName?: string;
  branchId: string;
  branchName?: string;
  title: string;
  reportType: 'weekly' | 'monthly' | 'service' | 'special_event';
  reportDate: string;
  attendanceCount?: number;
  summary: string;
  achievements?: string;
  challenges?: string;
  prayerRequests?: string;
  budgetNotes?: string;
  status: 'submitted' | 'reviewed' | 'acknowledged';
  submittedBy: string;
  submittedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export const ReportsPage: React.FC = () => {
  const { user, selectedBranchId } = useAuth();
  const toast = useToast();

  // Tab State
  const [activeTab, setActiveTab] = useState<'department_reports' | 'attendance_matrix'>('department_reports');

  // --- Department Reports State ---
  const [reports, setReports] = useState<DepartmentReportItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  // Modals State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<DepartmentReportItem | null>(null);
  const [reviewingReport, setReviewingReport] = useState<DepartmentReportItem | null>(null);

  // New Report Form
  const [newReport, setNewReport] = useState({
    departmentId: '',
    title: '',
    reportType: 'weekly' as 'weekly' | 'monthly' | 'service' | 'special_event',
    reportDate: new Date().toISOString().split('T')[0],
    attendanceCount: '',
    summary: '',
    achievements: '',
    challenges: '',
    prayerRequests: '',
    budgetNotes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pastoral Review Form
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'reviewed' | 'acknowledged'>('reviewed');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // --- Attendance Matrix State ---
  const [matrixData, setMatrixData] = useState<any>(null);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [month, setMonth] = useState('2026-03');

  // Permissions
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const isBranchPastor = isSuperAdmin || user?.adminLevel === 'branch_admin' || 
    ['BRANCH_PASTOR', 'PASTOR', 'ASSOCIATE_PASTOR', 'SENIOR_PASTOR'].includes(user?.roleCode?.toUpperCase() || '');

  // 1. Fetch Department Reports
  const fetchReports = async () => {
    setReportsLoading(true);
    try {
      const data = await api.getDepartmentReports({
        branchId: selectedBranchId || undefined,
        departmentId: selectedDeptFilter || undefined,
        status: selectedStatusFilter || undefined,
        reportType: selectedTypeFilter || undefined
      });
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load department reports:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  // 2. Fetch Departments for Dropdown
  const fetchDepartments = async () => {
    try {
      const depts = await api.getDepartments(selectedBranchId || undefined);
      setDepartments(Array.isArray(depts) ? depts : []);
      if (depts.length > 0 && !newReport.departmentId) {
        setNewReport(prev => ({ ...prev, departmentId: depts[0].id }));
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // 3. Fetch Attendance Matrix
  const fetchMatrix = async () => {
    setMatrixLoading(true);
    try {
      const data = await api.getAttendanceMatrix(selectedBranchId, month);
      setMatrixData(data);
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setMatrixLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [selectedBranchId]);

  useEffect(() => {
    if (activeTab === 'department_reports') {
      fetchReports();
    } else {
      fetchMatrix();
    }

    const handleMutation = (e: any) => {
      if (e?.detail?.entityType?.includes('report')) {
        if (activeTab === 'department_reports') {
          fetchReports();
        } else {
          fetchMatrix();
        }
      }
    };
    window.addEventListener('fpm:data-mutation', handleMutation);
    return () => window.removeEventListener('fpm:data-mutation', handleMutation);
  }, [activeTab, selectedBranchId, selectedDeptFilter, selectedStatusFilter, selectedTypeFilter, month]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const exportUrl = api.getAttendanceExportUrl(selectedBranchId, month);
    window.open(exportUrl, '_blank');
  };

  // Handle Create Report Submit
  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReport.title.trim() || !newReport.summary.trim()) {
      toast.warning('Please fill in the title and executive summary.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await api.createDepartmentReport({
        departmentId: newReport.departmentId || departments[0]?.id,
        title: newReport.title.trim(),
        reportType: newReport.reportType,
        reportDate: newReport.reportDate,
        attendanceCount: newReport.attendanceCount ? Number(newReport.attendanceCount) : undefined,
        summary: newReport.summary.trim(),
        achievements: newReport.achievements.trim() || undefined,
        challenges: newReport.challenges.trim() || undefined,
        prayerRequests: newReport.prayerRequests.trim() || undefined,
        budgetNotes: newReport.budgetNotes.trim() || undefined
      });
      setIsSubmitModalOpen(false);
      // Immediately reflect creation in local state
      if (res?.report) {
        setReports(prev => [res.report, ...prev]);
      }
      setNewReport({
        departmentId: departments[0]?.id || '',
        title: '',
        reportType: 'weekly',
        reportDate: new Date().toISOString().split('T')[0],
        attendanceCount: '',
        summary: '',
        achievements: '',
        challenges: '',
        prayerRequests: '',
        budgetNotes: ''
      });
      toast.success('Department report submitted successfully');
      await fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit department report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Pastoral Review Submit
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingReport) return;
    const targetId = reviewingReport.id;
    setIsSubmittingReview(true);
    try {
      const res = await api.reviewDepartmentReport(targetId, {
        status: reviewStatus,
        reviewNotes: reviewNotes.trim() || undefined
      });
      setReviewingReport(null);
      setReviewNotes('');
      // Immediately reflect review status change in local state
      setReports(prev => prev.map(r => (r.id === targetId ? { ...r, status: reviewStatus, reviewNotes: reviewNotes.trim(), ...(res?.report || {}) } : r)));
      toast.success('Pastoral review saved successfully');
      await fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save pastoral review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Delete Report
  const handleDeleteReport = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete report "${title}"?`)) return;
    try {
      await api.deleteDepartmentReport(id);
      // Immediately reflect deletion in local state
      setReports(prev => prev.filter(r => r.id !== id));
      toast.success('Report deleted successfully');
      await fetchReports();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete report.');
    }
  };

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.departmentName && r.departmentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.submittedByName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.summary.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Stats calculation
  const totalReportsCount = reports.length;
  const pendingReviewCount = reports.filter(r => r.status === 'submitted').length;
  const reviewedCount = reports.filter(r => r.status === 'reviewed').length;
  const acknowledgedCount = reports.filter(r => r.status === 'acknowledged').length;

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              Ministry Intelligence
            </span>
            <span className="text-xs text-slate-400 font-semibold">• FPM Global</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Reports & Ministry Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Head of Department operational reports, pastoral reviews, and monthly worker attendance matrices.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab('department_reports')}
            className={`flex-1 lg:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'department_reports'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Department Reports</span>
            {pendingReviewCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                {pendingReviewCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('attendance_matrix')}
            className={`flex-1 lg:flex-none justify-center px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'attendance_matrix'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span className="truncate">Attendance Matrix</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEPARTMENT REPORTS */}
      {/* ========================================================================= */}
      {activeTab === 'department_reports' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Reports</span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{totalReportsCount}</p>
              <span className="text-[10px] text-slate-500">All submitted reports</span>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-amber-200/80 bg-amber-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Review</span>
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-amber-700 mt-1">{pendingReviewCount}</p>
              <span className="text-[10px] text-amber-600 font-medium">Awaiting Pastoral notes</span>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-600">Pastoral Reviewed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">{reviewedCount}</p>
              <span className="text-[10px] text-emerald-600 font-medium">Guidance provided</span>
            </div>
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-blue-200/80 bg-blue-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-blue-600">Acknowledged</span>
                <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-blue-700 mt-1">{acknowledgedCount}</p>
              <span className="text-[10px] text-blue-600 font-medium">Confirmed by Leadership</span>
            </div>
          </div>

          {/* Action & Filter Toolbar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            {/* Search & Select Filters */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1">
              <div className="relative flex-1 min-w-[180px] sm:min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search report title, summary..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={selectedDeptFilter}
                onChange={e => setSelectedDeptFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {/* Report Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={e => setSelectedTypeFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Report Types</option>
                <option value="weekly">Weekly Report</option>
                <option value="monthly">Monthly Report</option>
                <option value="service">Service Report</option>
                <option value="special_event">Special Event</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Statuses</option>
                <option value="submitted">Pending Review</option>
                <option value="reviewed">Reviewed</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
            </div>

            {/* Create Report Button */}
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="w-full md:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Write Department Report</span>
            </button>
          </div>

          {/* Reports Card List */}
          {reportsLoading ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold">Loading departmental reports...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Departmental Reports Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No reports match your current filters. Click "Write Department Report" above to file an operational report.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredReports.map(report => (
                <div
                  key={report.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center space-x-1">
                          <Building2 className="w-3 h-3" />
                          <span>{report.departmentName || 'Department'}</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 capitalize">
                          {report.reportType.replace('_', ' ')}
                        </span>

                        {report.attendanceCount !== undefined && report.attendanceCount !== null && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            👥 {report.attendanceCount} Workers Present
                          </span>
                        )}

                        {isSuperAdmin && report.branchName && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {report.branchName}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight">
                        {report.title}
                      </h3>

                      <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-medium">
                        <span className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5" />
                          <span>Submitted by <strong>{report.submittedByName}</strong></span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Report Date: <strong>{report.reportDate}</strong></span>
                        </span>
                      </div>
                    </div>

                    {/* Status Pill & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {report.status === 'submitted' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Pending Review</span>
                        </span>
                      )}
                      {report.status === 'reviewed' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Reviewed</span>
                        </span>
                      )}
                      {report.status === 'acknowledged' && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Acknowledged</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        {/* View Details */}
                        <button
                          onClick={() => setViewingReport(report)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition cursor-pointer"
                          title="View Full Report"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Pastoral Review Action */}
                        {isBranchPastor && (
                          <button
                            onClick={() => {
                              setReviewingReport(report);
                              setReviewNotes(report.reviewNotes || '');
                              setReviewStatus(report.status === 'acknowledged' ? 'acknowledged' : 'reviewed');
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-xl border border-amber-200 flex items-center space-x-1 transition cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>{report.status === 'submitted' ? 'Review & Advise' : 'Edit Review'}</span>
                          </button>
                        )}

                        {/* Delete Action */}
                        {(isSuperAdmin || (report.submittedBy === user?.userId && report.status === 'submitted')) && (
                          <button
                            onClick={() => handleDeleteReport(report.id, report.title)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Snippet */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
                    <p className="line-clamp-2">{report.summary}</p>
                  </div>

                  {/* Pastoral Review Note Box if Present */}
                  {report.reviewNotes && (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl flex items-start space-x-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-xs space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-emerald-950">Pastoral Direction / Notes:</span>
                          <span className="text-[10px] text-emerald-700">by {report.reviewedByName || 'Branch Pastor'}</span>
                        </div>
                        <p className="text-slate-700 italic">"{report.reviewNotes}"</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ATTENDANCE MATRIX & ANALYTICS */}
      {/* ========================================================================= */}
      {activeTab === 'attendance_matrix' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Monthly Attendance Matrix & Analytics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Worker punctuality rate, attendance status matrix (✓ Present, L Late, A Absent, E Excused), and total hours.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs shadow-2xs">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer w-full"
                />
              </div>

              <button
                onClick={handleExportCsv}
                className="w-full sm:w-auto justify-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Legend Card */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 sm:gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
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
              <table className="w-full text-left text-xs min-w-[850px]">
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
                  {matrixLoading ? (
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SUBMIT NEW DEPARTMENT REPORT */}
      {/* ========================================================================= */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Write Department Report</h3>
                <p className="text-xs text-slate-400">File an operational update for pastoral review and record.</p>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department *</label>
                  <select
                    value={newReport.departmentId}
                    onChange={e => setNewReport(prev => ({ ...prev, departmentId: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Report Type *</label>
                  <select
                    value={newReport.reportType}
                    onChange={e => setNewReport(prev => ({ ...prev, reportType: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  >
                    <option value="weekly">Weekly Operational Report</option>
                    <option value="monthly">Monthly Departmental Review</option>
                    <option value="service">Sunday / Midweek Service Report</option>
                    <option value="special_event">Special Event / Program Report</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Report Date *</label>
                  <input
                    type="date"
                    value={newReport.reportDate}
                    onChange={e => setNewReport(prev => ({ ...prev, reportDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Worker Attendance Count</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15"
                    value={newReport.attendanceCount}
                    onChange={e => setNewReport(prev => ({ ...prev, attendanceCount: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Report Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Sunday Choir Ministry & Rehearsal Summary"
                  value={newReport.title}
                  onChange={e => setNewReport(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Executive Summary *</label>
                <textarea
                  rows={3}
                  placeholder="Summarize departmental activities, member turnouts, ministry assignments, or service delivery..."
                  value={newReport.summary}
                  onChange={e => setNewReport(prev => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Key Achievements & Highlights</label>
                  <textarea
                    rows={2}
                    placeholder="Victories, new songs introduced, souls touched, gear fixed..."
                    value={newReport.achievements}
                    onChange={e => setNewReport(prev => ({ ...prev, achievements: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Challenges & Pain Points</label>
                  <textarea
                    rows={2}
                    placeholder="Shortages, equipment faults, lateness, scheduling conflicts..."
                    value={newReport.challenges}
                    onChange={e => setNewReport(prev => ({ ...prev, challenges: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prayer Requests</label>
                  <textarea
                    rows={2}
                    placeholder="Spiritual burdens or specific prayer support needed..."
                    value={newReport.prayerRequests}
                    onChange={e => setNewReport(prev => ({ ...prev, prayerRequests: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Budget / Financial Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Expense requisitions, petty cash spent, gear replacement budget..."
                    value={newReport.budgetNotes}
                    onChange={e => setNewReport(prev => ({ ...prev, budgetNotes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer text-center"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VIEW FULL REPORT DETAILS */}
      {/* ========================================================================= */}
      {viewingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-2xl my-4 sm:my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                    {viewingReport.departmentName || 'Department'}
                  </span>
                  <span className="text-xs text-slate-400 capitalize">
                    {viewingReport.reportType.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  {viewingReport.title}
                </h3>
              </div>
              <button
                onClick={() => setViewingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Submitted By</span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingReport.submittedByName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Report Date</span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingReport.reportDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Workers Count</span>
                  <p className="font-bold text-slate-800 mt-0.5">{viewingReport.attendanceCount ?? 'N/A'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                  <p className="font-bold text-blue-700 capitalize mt-0.5">{viewingReport.status}</p>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="font-black text-slate-800 mb-1 uppercase tracking-wider text-[11px]">Executive Summary</h4>
                <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {viewingReport.summary}
                </div>
              </div>

              {/* Achievements & Challenges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {viewingReport.achievements && (
                  <div>
                    <h4 className="font-black text-emerald-800 mb-1 uppercase tracking-wider text-[11px]">Key Achievements</h4>
                    <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {viewingReport.achievements}
                    </div>
                  </div>
                )}

                {viewingReport.challenges && (
                  <div>
                    <h4 className="font-black text-rose-800 mb-1 uppercase tracking-wider text-[11px]">Challenges & Pain Points</h4>
                    <div className="p-3 bg-rose-50/30 border border-rose-100 rounded-xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {viewingReport.challenges}
                    </div>
                  </div>
                )}
              </div>

              {/* Prayer Requests & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {viewingReport.prayerRequests && (
                  <div>
                    <h4 className="font-black text-purple-800 mb-1 uppercase tracking-wider text-[11px]">Prayer Requests</h4>
                    <div className="p-3 bg-purple-50/30 border border-purple-100 rounded-xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {viewingReport.prayerRequests}
                    </div>
                  </div>
                )}

                {viewingReport.budgetNotes && (
                  <div>
                    <h4 className="font-black text-amber-800 mb-1 uppercase tracking-wider text-[11px]">Budget & Financials</h4>
                    <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {viewingReport.budgetNotes}
                    </div>
                  </div>
                )}
              </div>

              {/* Pastoral Review Section */}
              {viewingReport.reviewNotes && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-950 uppercase tracking-wider text-[11px]">Pastoral Counsel & Feedback</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Reviewed by {viewingReport.reviewedByName}</span>
                  </div>
                  <p className="text-slate-800 italic leading-relaxed whitespace-pre-wrap">"{viewingReport.reviewNotes}"</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-4">
              <button
                onClick={() => setViewingReport(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PASTORAL REVIEW */}
      {/* ========================================================================= */}
      {reviewingReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Pastoral Review</h3>
                <p className="text-xs text-slate-400">Provide pastoral counsel, instructions, or acknowledgment.</p>
              </div>
              <button
                onClick={() => setReviewingReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-900 block">{reviewingReport.title}</span>
                <span className="text-[11px] text-slate-500">
                  {reviewingReport.departmentName} • Submitted by {reviewingReport.submittedByName}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Decision *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewStatus('reviewed')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      reviewStatus === 'reviewed'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Mark Reviewed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewStatus('acknowledged')}
                    className={`py-2 px-3 rounded-xl border font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                      reviewStatus === 'acknowledged'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Acknowledge</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pastoral Feedback, Counsel, or Directives
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter comments, appreciation, instructions, or logistical follow-up for the HOD..."
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingReport(null)}
                  className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-bold transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer text-center"
                >
                  {isSubmittingReview ? 'Saving...' : 'Submit Pastoral Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
