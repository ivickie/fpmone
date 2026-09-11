import React, { useState, useEffect } from 'react';
import {
  UserCheck, Check, X, RefreshCw, AlertCircle, Phone, Mail,
  MapPin, Calendar, ShieldCheck, HeartPulse, User
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ApprovalsPage: React.FC = () => {
  const { selectedBranchId } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState<any | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [changesModalOpen, setChangesModalOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.getApprovals(selectedBranchId);
      setApprovals(data || []);
      if (data && data.length > 0) {
        setSelectedApplicant(data[0]);
      } else {
        setSelectedApplicant(null);
      }
    } catch (err) {
      console.error('Failed to fetch approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [selectedBranchId]);

  const handleApprove = async (userId: string) => {
    setActionLoading(true);
    try {
      const res = await api.approveMember(userId);
      setSuccessMessage(`Applicant approved successfully!${res.workerCode ? ` Unique Worker ID: ${res.workerCode}` : ''}`);
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to approve applicant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !reason) return;
    setActionLoading(true);
    try {
      await api.rejectMember(selectedApplicant.userId, reason);
      setSuccessMessage('Applicant has been marked as rejected.');
      setRejectModalOpen(false);
      setReason('');
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to reject applicant');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant || !notes) return;
    setActionLoading(true);
    try {
      await api.requestChanges(selectedApplicant.userId, notes);
      setSuccessMessage('Feedback sent to applicant requesting information changes.');
      setChangesModalOpen(false);
      setNotes('');
      await fetchApprovals();
    } catch (err: any) {
      alert(err.message || 'Failed to request changes');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-900 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Header and counter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Member Registrations Awaiting Approval</span>
            <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
              {approvals.length} Pending
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Review onboarding requests, verify branch assignment, and approve workers.
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition cursor-pointer"
          title="Refresh Queue"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {approvals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-sm max-w-lg mx-auto">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">All Approvals Are Up to Date</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are no pending member or worker registrations awaiting review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Applications List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[650px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Pending Applicants ({approvals.length})
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {approvals.map(app => {
                const isSelected = selectedApplicant?.userId === app.userId;
                return (
                  <button
                    key={app.userId}
                    onClick={() => setSelectedApplicant(app)}
                    className={`w-full text-left p-4 transition-all flex items-start space-x-3 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300 flex items-center justify-center text-slate-600 font-bold">
                      {app.profilePictureUrl ? (
                        <img src={app.profilePictureUrl} alt={app.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{app.fullName}</h4>
                        <span className="text-[10px] text-slate-400">
                          {new Date(app.registrationDate).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{app.branchName}</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                          {app.roleName}
                        </span>
                        {app.isWorker && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            Worker Request
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Review Card */}
          {selectedApplicant && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 flex flex-col justify-between">
              <div className="space-y-6 overflow-y-auto">
                {/* Header with Photo & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border-2 border-slate-200 shadow-sm shrink-0">
                      {selectedApplicant.profilePictureUrl ? (
                        <img
                          src={selectedApplicant.profilePictureUrl}
                          alt={selectedApplicant.fullName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                          {selectedApplicant.firstName?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{selectedApplicant.fullName}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                        <span className="font-semibold text-blue-600">{selectedApplicant.branchName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">Role: {selectedApplicant.roleName}</span>
                        {selectedApplicant.isWorker && (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Worker Application
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleApprove(selectedApplicant.userId)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve & Activate</span>
                    </button>
                    <button
                      onClick={() => setRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setChangesModalOpen(true)}
                      disabled={actionLoading}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      title="Request Changes"
                    >
                      Request Changes
                    </button>
                  </div>
                </div>

                {/* Information Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Account & Contact */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>Account & Contact</span>
                    </h4>
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="text-slate-400">Email:</span>
                        <p className="font-semibold text-slate-800">{selectedApplicant.email}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Phone:</span>
                        <p className="font-semibold text-slate-800">{selectedApplicant.phone}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Gender & DOB:</span>
                        <p className="font-semibold text-slate-800">
                          {selectedApplicant.gender || 'Not specified'} • {selectedApplicant.dateOfBirth || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Church & Ministry */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Church Assignment</span>
                    </h4>
                    <div className="text-xs space-y-2">
                      <div>
                        <span className="text-slate-400">Primary Branch:</span>
                        <p className="font-semibold text-slate-800">{selectedApplicant.branchName}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Ministry Role:</span>
                        <p className="font-semibold text-slate-800">{selectedApplicant.roleName}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Worker Enlistment:</span>
                        <p className="font-semibold text-slate-800">
                          {selectedApplicant.isWorker ? 'Yes - Dedicated Worker' : 'No - Regular Member'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Residential Address</span>
                    </h4>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedApplicant.residentialAddress || 'No residential address entered.'}
                    </p>
                  </div>

                  {/* Emergency Contact */}
                  <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                      <span>Emergency Contact</span>
                    </h4>
                    <div className="text-xs space-y-1">
                      <p className="font-semibold text-slate-800">
                        {selectedApplicant.emergencyContactName || 'None listed'}
                      </p>
                      {selectedApplicant.emergencyContactPhone && (
                        <p className="text-slate-500">{selectedApplicant.emergencyContactPhone}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between">
                <span>Application Reference ID: {selectedApplicant.userId}</span>
                <span>Submitted: {new Date(selectedApplicant.registrationDate).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Application</h3>
            <p className="text-xs text-slate-500">
              Please enter the official reason for rejecting this member's registration. This will be recorded in the audit logs.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Duplicate account identified / Incomplete contact information..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Changes Modal */}
      {changesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Request Information Changes</h3>
            <p className="text-xs text-slate-500">
              Enter specific notes explaining what details the applicant needs to update before their account can be approved.
            </p>
            <form onSubmit={handleChangesSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Please upload a clear portrait photo and provide a valid emergency contact..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setChangesModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
