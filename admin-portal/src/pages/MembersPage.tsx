import React, { useState, useEffect } from 'react';
import {
  Search, UserCheck, Shield, Building2, Eye,
  Edit2, Ban, CheckCircle, Archive, QrCode, Phone, Mail, MapPin, AlertCircle, X, Users, User, UserPlus, Plus
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const MembersPage: React.FC = () => {
  const { selectedBranchId, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'workers'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState(selectedBranchId || '');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sync with global header branch switcher
  useEffect(() => {
    setBranchFilter(selectedBranchId || '');
  }, [selectedBranchId]);

  // Modals
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editAssignmentOpen, setEditAssignmentOpen] = useState(false);
  const [editWorkerOpen, setEditWorkerOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [confirmStatusOpen, setConfirmStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ userId: string; status: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Add Member Form state
  const [addMemberForm, setAddMemberForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    residentialAddress: '',
    primaryBranchId: '',
    primaryRoleId: '',
    departmentId: '',
    positionName: '',
    isWorker: false,
    status: 'active',
    password: 'Password123!'
  });

  // Edit Profile Form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: 'Male',
    dateOfBirth: '',
    residentialAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profilePictureUrl: ''
  });

  // Edit Assignment Form state
  const [assignmentForm, setAssignmentForm] = useState({
    branchId: '',
    roleId: '',
    departmentId: '',
    positionName: ''
  });

  // Edit Worker Form state
  const [workerForm, setWorkerForm] = useState({
    departmentId: '',
    positionName: '',
    workerStatus: 'active'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeBranch = branchFilter || undefined;
      const [mems, wrks, brs, rols, depts] = await Promise.all([
        api.getMembers({
          search: search || undefined,
          branchId: activeBranch,
          roleId: roleFilter || undefined,
          departmentId: deptFilter || undefined,
          status: statusFilter || undefined
        }),
        api.getWorkers({
          search: search || undefined,
          branchId: activeBranch,
          departmentId: deptFilter || undefined,
          status: statusFilter || undefined
        }),
        api.getBranches(),
        api.getRoles(),
        api.getDepartments(activeBranch)
      ]);
      setMembers(mems || []);
      setWorkers(wrks || []);
      setBranches(brs || []);
      setRoles(rols || []);
      setDepartments(depts || []);
    } catch (err) {
      console.error('Failed to load members or workers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [branchFilter, roleFilter, deptFilter, statusFilter]);

  const openAddMember = () => {
    const defaultBranch = branchFilter || selectedBranchId || (branches[0]?.id || '');
    const defaultRole = roles.find(r => r.code === 'MEMBER')?.id || roles[0]?.id || '';
    setAddMemberForm({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      gender: 'Male',
      dateOfBirth: '',
      residentialAddress: '',
      primaryBranchId: defaultBranch,
      primaryRoleId: defaultRole,
      departmentId: '',
      positionName: '',
      isWorker: false,
      status: 'active',
      password: 'Password123!'
    });
    setAddMemberOpen(true);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createMember(addMemberForm);
      setAddMemberOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to enroll new member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openViewDetails = async (m: any) => {
    try {
      const detailed = await api.getMemberById(m.id);
      setSelectedMember(detailed);
      setViewDetailsOpen(true);
    } catch (err: any) {
      setSelectedMember(m);
      setViewDetailsOpen(true);
    }
  };

  const openEditProfile = (m: any) => {
    setSelectedMember(m);
    setProfileForm({
      firstName: m.firstName || '',
      middleName: m.middleName || '',
      lastName: m.lastName || '',
      email: m.email || '',
      phone: m.phone || '',
      gender: m.gender || 'Male',
      dateOfBirth: m.dateOfBirth || '',
      residentialAddress: m.residentialAddress || '',
      emergencyContactName: m.emergencyContactName || '',
      emergencyContactPhone: m.emergencyContactPhone || '',
      profilePictureUrl: m.profilePictureUrl || ''
    });
    setEditProfileOpen(true);
  };

  const openEditAssignment = (m: any) => {
    setSelectedMember(m);
    setAssignmentForm({
      branchId: m.primaryBranchId || m.branchId || '',
      roleId: m.primaryRoleId || m.roleId || '',
      departmentId: m.workerDetails?.departmentId || '',
      positionName: m.workerDetails?.positionName || ''
    });
    setEditAssignmentOpen(true);
  };

  const openEditWorker = (w: any) => {
    setSelectedWorker(w);
    setWorkerForm({
      departmentId: w.departmentId || '',
      positionName: w.positionName || '',
      workerStatus: w.workerStatus || 'active'
    });
    setEditWorkerOpen(true);
  };

  const promptStatusChange = (userId: string, status: string, name: string) => {
    setStatusTarget({ userId, status, name });
    setConfirmStatusOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!statusTarget) return;
    setActionLoading(true);
    try {
      await api.updateMemberStatus(statusTarget.userId, statusTarget.status);
      setConfirmStatusOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member account status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      await api.updateMember(selectedMember.id, profileForm);
      setEditProfileOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member profile');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setActionLoading(true);
    try {
      await api.updateMemberAssignment(selectedMember.id, assignmentForm);
      setEditAssignmentOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member assignments');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setActionLoading(true);
    try {
      await api.updateWorker(selectedWorker.id, workerForm);
      setEditWorkerOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update worker');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header with Tab switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Church Registry & Directory</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer church members, ordained ministers, department workers, badges, and account lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'members'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'workers'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Church Workers ({workers.length})
            </button>
          </div>

          <button
            onClick={openAddMember}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, or Worker ID (e.g. FPM-0001)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={branchFilter}
              onChange={e => setBranchFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Branches</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.branchCode})</option>
              ))}
            </select>
            {activeTab === 'members' && (
              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="">All Roles</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Tab Content: Members View */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Worker ID</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Ministry Role</th>
                  <th className="py-3.5 px-4">Department & Position</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading members...</td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No members match the criteria.</td>
                  </tr>
                ) : (
                  members.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                            {m.profilePictureUrl ? (
                              <img src={m.profilePictureUrl} alt={m.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xs">
                                {m.firstName?.charAt(0) || 'M'}
                              </div>
                            )}
                          </div>
                          <div>
                            <button
                              onClick={() => openViewDetails(m)}
                              className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                            >
                              {m.fullName}
                            </button>
                            <p className="text-[11px] text-slate-400">{m.email} • {m.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {m.workerDetails ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                              {m.workerDetails.workerCode}
                            </span>
                            <button
                              onClick={() => { setSelectedMember(m); setQrModalOpen(true); }}
                              title="View Worker Badge QR"
                              className="text-slate-400 hover:text-blue-600 p-1"
                            >
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">Non-worker</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">{m.branchName}</td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                          {m.roleName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {m.workerDetails ? (
                          <div>
                            <p className="font-semibold text-slate-800">{m.workerDetails.departmentName}</p>
                            <p className="text-[10px] text-slate-500">{m.workerDetails.positionName}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          m.accountStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          m.accountStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                          m.accountStatus === 'suspended' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {m.accountStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openViewDetails(m)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition"
                            title="View Full Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditProfile(m)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition"
                            title="Edit Personal Information"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditAssignment(m)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-amber-600 rounded-lg transition"
                            title="Edit Role & Assignment"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                          {m.accountStatus === 'active' ? (
                            <button
                              onClick={() => promptStatusChange(m.userId, 'suspended', m.fullName)}
                              className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Suspend Account"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => promptStatusChange(m.userId, 'active', m.fullName)}
                              className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition"
                              title="Activate Account"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => promptStatusChange(m.userId, 'archived', m.fullName)}
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition"
                            title="Archive Account"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Workers View */}
      {activeTab === 'workers' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Worker Code</th>
                  <th className="py-3.5 px-4">Full Name</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Position</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Worker Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">Loading workers...</td>
                  </tr>
                ) : workers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No workers found.</td>
                  </tr>
                ) : (
                  workers.map(w => (
                    <tr key={w.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                          {w.workerIdCode}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{w.fullName}</p>
                          <p className="text-[11px] text-slate-400">{w.email} • {w.phone}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{w.departmentName}</td>
                      <td className="py-3 px-4 text-slate-600">{w.positionName}</td>
                      <td className="py-3 px-4 text-slate-700">{w.branchName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          w.workerStatus === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          w.workerStatus === 'suspended' ? 'bg-rose-100 text-rose-800' :
                          w.workerStatus === 'inactive' ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {w.workerStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditWorker(w)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Member Details Modal */}
      {viewDetailsOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Member Dossier & Profile</h3>
              <button
                onClick={() => setViewDetailsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                {selectedMember.profilePictureUrl ? (
                  <img src={selectedMember.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-xl">
                    {selectedMember.firstName?.charAt(0) || 'M'}
                  </div>
                )}
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-900">
                  {selectedMember.firstName} {selectedMember.middleName} {selectedMember.lastName}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-full border border-blue-100">
                    {selectedMember.roleName || 'Member'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{selectedMember.branchName}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-slate-400 block mb-0.5">Email</span>
                <span className="font-semibold text-slate-800">{selectedMember.email || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Phone Number</span>
                <span className="font-semibold text-slate-800">{selectedMember.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Gender</span>
                <span className="font-semibold text-slate-800">{selectedMember.gender || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Date of Birth</span>
                <span className="font-semibold text-slate-800">{selectedMember.dateOfBirth || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block mb-0.5">Residential Address</span>
                <span className="font-semibold text-slate-800">{selectedMember.residentialAddress || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Emergency Contact</span>
                <span className="font-semibold text-slate-800">{selectedMember.emergencyContactName || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Emergency Phone</span>
                <span className="font-semibold text-slate-800">{selectedMember.emergencyContactPhone || '—'}</span>
              </div>
            </div>

            {selectedMember.worker && (
              <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-indigo-900 uppercase tracking-wider">Worker Service Details</h5>
                  <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {selectedMember.worker.workerIdCode}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                  <div>Department: <strong className="text-slate-900">{selectedMember.worker.departmentName}</strong></div>
                  <div>Position: <strong className="text-slate-900">{selectedMember.worker.positionName}</strong></div>
                  <div>Serving Since: <strong className="text-slate-900">{selectedMember.worker.dateStartedServing?.split('T')[0] || '2024'}</strong></div>
                  <div>Status: <strong className="text-slate-900 uppercase">{selectedMember.worker.workerStatus}</strong></div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewDetailsOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Personal Information Modal */}
      {editProfileOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              Edit Profile: {selectedMember.fullName}
            </h3>
            <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
              <ImageUpload
                label="Member Photo"
                value={profileForm.profilePictureUrl}
                onChange={url => setProfileForm({ ...profileForm, profilePictureUrl: url })}
                entityType="profile"
                entityId={selectedMember.id}
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.firstName}
                    onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Middle Name</label>
                  <input
                    type="text"
                    value={profileForm.middleName}
                    onChange={e => setProfileForm({ ...profileForm, middleName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={profileForm.lastName}
                    onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                  <select
                    value={profileForm.gender}
                    onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={e => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
                <input
                  type="text"
                  value={profileForm.residentialAddress}
                  onChange={e => setProfileForm({ ...profileForm, residentialAddress: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Emergency Contact Name</label>
                  <input
                    type="text"
                    value={profileForm.emergencyContactName}
                    onChange={e => setProfileForm({ ...profileForm, emergencyContactName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Emergency Phone</label>
                  <input
                    type="text"
                    value={profileForm.emergencyContactPhone}
                    onChange={e => setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role & Assignment Modal */}
      {editAssignmentOpen && selectedMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Assignments: {selectedMember.fullName}
            </h3>
            <form onSubmit={handleAssignmentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Branch
                </label>
                <select
                  value={assignmentForm.branchId}
                  onChange={e => setAssignmentForm({ ...assignmentForm, branchId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ministry Role
                </label>
                <select
                  value={assignmentForm.roleId}
                  onChange={e => setAssignmentForm({ ...assignmentForm, roleId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {selectedMember.isWorker && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <select
                      value={assignmentForm.departmentId}
                      onChange={e => setAssignmentForm({ ...assignmentForm, departmentId: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <option value="">Select Department</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Department Position
                    </label>
                    <input
                      type="text"
                      value={assignmentForm.positionName}
                      onChange={e => setAssignmentForm({ ...assignmentForm, positionName: e.target.value })}
                      placeholder="e.g. Lead Keyboardist, Camera Operator"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditAssignmentOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {editWorkerOpen && selectedWorker && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Worker: {selectedWorker.fullName} ({selectedWorker.workerIdCode})
            </h3>
            <form onSubmit={handleWorkerSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Department
                </label>
                <select
                  value={workerForm.departmentId}
                  onChange={e => setWorkerForm({ ...workerForm, departmentId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Position Name
                </label>
                <input
                  type="text"
                  value={workerForm.positionName}
                  onChange={e => setWorkerForm({ ...workerForm, positionName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Worker Status
                </label>
                <select
                  value={workerForm.workerStatus}
                  onChange={e => setWorkerForm({ ...workerForm, workerStatus: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditWorkerOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Update Worker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll New Member Modal */}
      {addMemberOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enroll New Church Member</h3>
                <p className="text-[11px] text-slate-500">Directly onboard and register a member into the church directory</p>
              </div>
              <button
                type="button"
                onClick={() => setAddMemberOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs p-6 overflow-y-auto flex-1">
              {/* Personal Details */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2.5">1. Personal Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={addMemberForm.firstName}
                      onChange={e => setAddMemberForm({ ...addMemberForm, firstName: e.target.value })}
                      placeholder="e.g. Grace"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={addMemberForm.lastName}
                      onChange={e => setAddMemberForm({ ...addMemberForm, lastName: e.target.value })}
                      placeholder="e.g. Adeleke"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={addMemberForm.middleName}
                      onChange={e => setAddMemberForm({ ...addMemberForm, middleName: e.target.value })}
                      placeholder="e.g. Oluwaseun"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Gender</label>
                    <select
                      value={addMemberForm.gender}
                      onChange={e => setAddMemberForm({ ...addMemberForm, gender: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={addMemberForm.dateOfBirth}
                      onChange={e => setAddMemberForm({ ...addMemberForm, dateOfBirth: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2.5">2. Contact Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={addMemberForm.email}
                      onChange={e => setAddMemberForm({ ...addMemberForm, email: e.target.value })}
                      placeholder="member@fpmchurch.org"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={addMemberForm.phone}
                      onChange={e => setAddMemberForm({ ...addMemberForm, phone: e.target.value })}
                      placeholder="+234 800 000 0000"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={addMemberForm.residentialAddress}
                    onChange={e => setAddMemberForm({ ...addMemberForm, residentialAddress: e.target.value })}
                    placeholder="e.g. 15 Victory Way, Ikeja, Lagos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Church Assignment */}
              <div className="border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2.5">3. Church & Ministry Assignment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Church Branch *</label>
                    <select
                      required
                      value={addMemberForm.primaryBranchId}
                      onChange={e => setAddMemberForm({ ...addMemberForm, primaryBranchId: e.target.value })}
                      disabled={user?.adminLevel !== 'super_admin'}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer disabled:opacity-60"
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.branchCode})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Ministry Role *</label>
                    <select
                      required
                      value={addMemberForm.primaryRoleId}
                      onChange={e => {
                        const selectedRoleId = e.target.value;
                        const r = roles.find(role => role.id === selectedRoleId);
                        const isWorkerRole = r && r.code !== 'MEMBER';
                        setAddMemberForm({
                          ...addMemberForm,
                          primaryRoleId: selectedRoleId,
                          isWorker: isWorkerRole || addMemberForm.isWorker
                        });
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isWorkerCheckbox"
                    checked={addMemberForm.isWorker}
                    onChange={e => setAddMemberForm({ ...addMemberForm, isWorker: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isWorkerCheckbox" className="font-semibold text-slate-800 cursor-pointer">
                    Designate as Active Ministry Worker (Enables Service Clock-In & Digital Badge)
                  </label>
                </div>

                {addMemberForm.isWorker && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100">
                    <div>
                      <label className="block font-bold text-blue-900 uppercase tracking-wider mb-1">Department</label>
                      <select
                        value={addMemberForm.departmentId}
                        onChange={e => setAddMemberForm({ ...addMemberForm, departmentId: e.target.value })}
                        className="w-full p-2.5 bg-white border border-blue-200 rounded-xl cursor-pointer"
                      >
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-blue-900 uppercase tracking-wider mb-1">Position Title</label>
                      <input
                        type="text"
                        value={addMemberForm.positionName}
                        onChange={e => setAddMemberForm({ ...addMemberForm, positionName: e.target.value })}
                        placeholder="e.g. Lead Vocalist / Usher"
                        className="w-full p-2.5 bg-white border border-blue-200 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Account Credentials & Status */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2.5">4. Account Credentials & Status</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Initial Status</label>
                    <select
                      value={addMemberForm.status}
                      onChange={e => setAddMemberForm({ ...addMemberForm, status: e.target.value as any })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <option value="active">Active (Pre-Approved)</option>
                      <option value="pending">Pending Background Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Temporary Password</label>
                    <input
                      type="text"
                      value={addMemberForm.password}
                      onChange={e => setAddMemberForm({ ...addMemberForm, password: e.target.value })}
                      placeholder="Password123!"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddMemberOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {actionLoading ? 'Enrolling...' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Digital Badge Modal */}
      {qrModalOpen && selectedMember?.workerDetails && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-4 border border-slate-200">
            <img
              src="/church-logo.png"
              alt="Faith Preachers Ministry"
              className="w-14 h-14 rounded-full object-cover ring-2 ring-amber-400 mx-auto shadow-md bg-white"
            />
            <div>
              <h3 className="font-extrabold text-base text-slate-900">{selectedMember.fullName}</h3>
              <p className="text-xs text-blue-600 font-semibold">{selectedMember.workerDetails.workerCode}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {selectedMember.workerDetails.departmentName} • {selectedMember.workerDetails.positionName}
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl inline-block">
              <div className="w-48 h-48 bg-white border border-slate-200 flex flex-col items-center justify-center p-2 rounded-xl">
                <QrCode className="w-32 h-32 text-slate-800" />
                <span className="font-mono text-[10px] text-slate-500 mt-2 truncate max-w-[170px]">
                  {selectedMember.workerDetails.qrCodeToken}
                </span>
              </div>
            </div>

            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Badge
            </button>
          </div>
        </div>
      )}

      {/* Confirm Status Change Dialog */}
      <ConfirmDialog
        isOpen={confirmStatusOpen}
        title={`Confirm Status Change: ${statusTarget?.name}`}
        message={`Are you sure you want to transition this account status to '${statusTarget?.status}'? This will immediately take effect on permissions and mobile access.`}
        confirmText={`Set to ${statusTarget?.status}`}
        variant={statusTarget?.status === 'suspended' ? 'danger' : 'warning'}
        isLoading={actionLoading}
        onConfirm={handleConfirmStatusChange}
        onClose={() => setConfirmStatusOpen(false)}
      />
    </div>
  );
};
