import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, Users, UserCheck, Edit3, Trash2, Tag, X, Loader2, Mail, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const DepartmentsPage: React.FC = () => {
  const { selectedBranchId, user } = useAuth();
  const toast = useToast();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const isBranchAdmin = isSuperAdmin || user?.adminLevel === 'branch_admin';
  const canAddDepartment = isBranchAdmin;
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [positionsModalOpen, setPositionsModalOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Positions state
  const [positions, setPositions] = useState<any[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');
  const [newPositionDesc, setNewPositionDesc] = useState('');

  // Department Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hodName: '',
    hodEmail: '',
    status: 'active'
  });

  // HOD Email Lookup & Validation State
  const [hodSuggestions, setHodSuggestions] = useState<any[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [hodLookupLoading, setHodLookupLoading] = useState(false);
  const [hodValidation, setHodValidation] = useState<{
    checked: boolean;
    eligible: boolean;
    error?: string;
    member?: any;
  } | null>(null);
  const lookupTimerRef = useRef<any>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await api.getDepartments(selectedBranchId, true);
      setDepartments(data || []);
    } catch (err) {
      console.error('Failed to load departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    const handleMutation = (e: any) => {
      if (e?.detail?.entityType?.includes('department')) {
        fetchDepartments();
      }
    };
    window.addEventListener('fpm:data-mutation', handleMutation);
    return () => window.removeEventListener('fpm:data-mutation', handleMutation);
  }, [selectedBranchId]);

  const fetchHodSuggestions = async (query: string) => {
    try {
      const data = await api.getEligibleHods(query, selectedBranchId || selectedDept?.branchId);
      setHodSuggestions(data || []);
    } catch {
      setHodSuggestions([]);
    }
  };

  const handleHodEmailChange = (val: string) => {
    setFormData(prev => ({ ...prev, hodEmail: val }));
    if (!val.trim()) {
      setHodValidation(null);
      setHodSuggestions([]);
      setSuggestionsOpen(false);
      setFormData(prev => ({ ...prev, hodName: '' }));
      return;
    }

    setSuggestionsOpen(true);
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current);

    lookupTimerRef.current = setTimeout(async () => {
      fetchHodSuggestions(val);

      if (val.includes('@') && val.includes('.')) {
        setHodLookupLoading(true);
        try {
          const res = await api.lookupHod(val, selectedBranchId || selectedDept?.branchId);
          if (res.success && res.eligible) {
            setHodValidation({
              checked: true,
              eligible: true,
              member: res.member
            });
            setFormData(prev => ({ ...prev, hodName: res.member.fullName }));
          } else {
            setHodValidation({
              checked: true,
              eligible: false,
              error: res.error,
              member: res.member
            });
          }
        } catch (err: any) {
          setHodValidation({
            checked: true,
            eligible: false,
            error: err.message || 'Error validating HOD email.'
          });
        } finally {
          setHodLookupLoading(false);
        }
      }
    }, 300);
  };

  const handleSelectSuggestion = (item: any) => {
    setFormData(prev => ({
      ...prev,
      hodEmail: item.email,
      hodName: item.fullName
    }));
    setSuggestionsOpen(false);
    if (item.isEligible) {
      setHodValidation({
        checked: true,
        eligible: true,
        member: item
      });
    } else {
      setHodValidation({
        checked: true,
        eligible: false,
        error: item.ineligibilityReason || `Member does not have the HOD role (current role: ${item.roleName}).`,
        member: item
      });
    }
  };

  const handleClearHod = () => {
    setFormData(prev => ({ ...prev, hodEmail: '', hodName: '' }));
    setHodValidation(null);
    setHodSuggestions([]);
    setSuggestionsOpen(false);
  };

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      hodName: '',
      hodEmail: '',
      status: 'active'
    });
    setHodValidation(null);
    setHodSuggestions([]);
    setSuggestionsOpen(false);
    setModalOpen(true);
  };

  const openEditModal = (d: any) => {
    setSelectedDept(d);
    setFormData({
      name: d.name || '',
      code: d.code || '',
      description: d.description || '',
      hodName: d.hodName || '',
      hodEmail: d.hodEmail || '',
      status: d.status || 'active'
    });
    if (d.hodEmail) {
      setHodValidation({
        checked: true,
        eligible: true,
        member: {
          fullName: d.hodName,
          email: d.hodEmail,
          roleName: 'HOD'
        }
      });
    } else {
      setHodValidation(null);
    }
    setHodSuggestions([]);
    setSuggestionsOpen(false);
    setEditModalOpen(true);
  };

  const openPositionsModal = async (d: any) => {
    setSelectedDept(d);
    setPositionsModalOpen(true);
    setPositionsLoading(true);
    setNewPositionName('');
    setNewPositionDesc('');
    try {
      const data = await api.getPositions(d.id);
      setPositions(data || []);
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setPositionsLoading(false);
    }
  };

  const openArchiveDialog = (d: any) => {
    setSelectedDept(d);
    setConfirmArchiveOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.hodEmail && hodValidation && !hodValidation.eligible) {
      toast.error(hodValidation.error || 'Cannot assign ineligible member as Head of Department.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.createDepartment({
        ...formData,
        branchId: selectedBranchId || undefined
      });
      setModalOpen(false);
      // Immediately reflect creation in local state
      if (res?.department) {
        setDepartments(prev => [res.department, ...prev]);
      }
      toast.success('Department created successfully');
      await fetchDepartments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    const targetId = selectedDept.id;
    if (formData.hodEmail && hodValidation && !hodValidation.eligible) {
      toast.error(hodValidation.error || 'Cannot assign ineligible member as Head of Department.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.updateDepartment(targetId, formData);
      setEditModalOpen(false);
      // Immediately reflect update in local state
      setDepartments(prev => prev.map(d => (d.id === targetId ? { ...d, ...formData, ...(res?.department || {}) } : d)));
      toast.success('Department updated successfully');
      await fetchDepartments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveOrDelete = async () => {
    if (!selectedDept) return;
    const targetId = selectedDept.id;
    setActionLoading(true);
    try {
      const res = await api.deleteDepartment(targetId);
      setConfirmArchiveOpen(false);
      // Immediately reflect deletion in local state
      setDepartments(prev => prev.filter(d => d.id !== targetId));
      await fetchDepartments();
      toast.success(res?.message || 'Department archived successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !newPositionName.trim()) return;
    try {
      const created = await api.createPosition(selectedDept.id, {
        name: newPositionName.trim(),
        description: newPositionDesc.trim()
      });
      setPositions([...positions, created]);
      setNewPositionName('');
      setNewPositionDesc('');
      toast.success('Position added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add position');
    }
  };

  const handleDeletePosition = async (posId: string) => {
    if (!selectedDept) return;
    try {
      await api.deletePosition(selectedDept.id, posId);
      setPositions(positions.filter(p => p.id !== posId));
      toast.success('Position deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete position');
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">Church Departments & Ministries</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure service departments, assign Heads of Department (HODs), positions, and active status.
          </p>
        </div>
        {canAddDepartment && (
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto justify-center px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Department</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading departments...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(d => {
            const isHodOfThisDept = d.hodId === user?.userId || (user?.roleCode === 'HOD' && user?.workerDetails?.departmentId === d.id);
            const canEditDept = isBranchAdmin || isHodOfThisDept;
            const canDeleteDept = isBranchAdmin;

            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-100">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">{d.name}</h3>
                        <span className="font-mono text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                          {d.code}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      d.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      d.status === 'archived' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                    {d.description || 'No description provided.'}
                  </p>

                  <div className="pt-2 border-t border-slate-100 text-xs flex flex-col gap-0.5 text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">HOD: <strong className="text-slate-800">{d.hodName || 'Unassigned'}</strong></span>
                    </div>
                    {d.hodEmail && (
                      <span className="text-[11px] text-slate-400 pl-5 truncate">{d.hodEmail}</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openPositionsModal(d)}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3 h-3" />
                    <span>Positions</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    {canEditDept && (
                      <button
                        onClick={() => openEditModal(d)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title={isHodOfThisDept && !isBranchAdmin ? "Edit Your Department" : "Edit Department"}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canDeleteDept && (
                      <button
                        onClick={() => openArchiveDialog(d)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Archive / Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Create Church Department</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Media & Technology"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. MEDIA"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Responsibilities, mandate, and team overview..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    HOD Email Address
                  </label>
                  {formData.hodEmail && (
                    <button
                      type="button"
                      onClick={handleClearHod}
                      className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={formData.hodEmail}
                    onChange={e => handleHodEmailChange(e.target.value)}
                    onFocus={() => {
                      if (formData.hodEmail) {
                        fetchHodSuggestions(formData.hodEmail);
                        setSuggestionsOpen(true);
                      }
                    }}
                    placeholder="Enter member's registered email (e.g. hod.choir@fpmchurch.org)"
                    className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs transition-colors ${
                      hodValidation?.checked
                        ? hodValidation.eligible
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-red-400 bg-red-50/20'
                        : 'border-slate-200 focus:border-blue-500'
                    }`}
                  />
                  {hodLookupLoading && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Autocomplete Suggestions Dropdown */}
                {suggestionsOpen && hodSuggestions.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Matching Members
                    </div>
                    {hodSuggestions.map(sug => (
                      <button
                        key={sug.userId}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{sug.fullName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{sug.email}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              sug.isEligible
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sug.isEligible ? 'Eligible HOD' : sug.roleName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Live Eligibility / Confirmation Feedback Card */}
                {hodValidation?.checked && (
                  <div
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                      hodValidation.eligible
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50/80 border-amber-200 text-amber-900'
                    }`}
                  >
                    {hodValidation.eligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      {hodValidation.eligible ? (
                        <>
                          <p className="font-bold text-emerald-950">
                            Confirmed HOD: {hodValidation.member?.fullName || formData.hodName}
                          </p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            Active member with HOD role. Ready to assign to this department.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-amber-950">
                            {hodValidation.member ? `Ineligible: ${hodValidation.member.fullName}` : 'HOD Ineligible'}
                          </p>
                          <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                            {hodValidation.error}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!formData.hodEmail && (
                  <p className="text-[11px] text-slate-400">
                    Enter the registered email of an active member holding the HOD role.
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {editModalOpen && selectedDept && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Department: {selectedDept.name}</h3>
              <p className="text-[11px] text-slate-400">
                {!isBranchAdmin ? "As Head of Department, you can update your department's details." : "Update department information and leadership assignment."}
              </p>
            </div>

            {/* Single HOD Policy Banner */}
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start space-x-2">
              <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Single HOD Policy:</span>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  A department can only have one Head of Department. Assigning a new HOD supersedes any prior departmental head.
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Code</label>
                  <input
                    type="text"
                    required
                    disabled={!isBranchAdmin}
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase ${!isBranchAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    disabled={!isBranchAdmin}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className={`w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl ${!isBranchAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                {isBranchAdmin ? (
                  <div className="space-y-1.5 relative">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                        HOD Email Address
                      </label>
                      {formData.hodEmail && (
                        <button
                          type="button"
                          onClick={handleClearHod}
                          className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                        >
                          Remove HOD
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={formData.hodEmail}
                        onChange={e => handleHodEmailChange(e.target.value)}
                        onFocus={() => {
                          if (formData.hodEmail) {
                            fetchHodSuggestions(formData.hodEmail);
                            setSuggestionsOpen(true);
                          }
                        }}
                        placeholder="Enter member's registered email (e.g. hod.choir@fpmchurch.org)"
                        className={`w-full pl-9 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs transition-colors ${
                          hodValidation?.checked
                            ? hodValidation.eligible
                              ? 'border-emerald-500 bg-emerald-50/20'
                              : 'border-red-400 bg-red-50/20'
                            : 'border-slate-200 focus:border-blue-500'
                        }`}
                      />
                      {hodLookupLoading && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Autocomplete Suggestions Dropdown */}
                    {suggestionsOpen && hodSuggestions.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                        <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Matching Members
                        </div>
                        {hodSuggestions.map(sug => (
                          <button
                            key={sug.userId}
                            type="button"
                            onClick={() => handleSelectSuggestion(sug)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50/60 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{sug.fullName}</p>
                              <p className="text-[11px] text-slate-500 truncate">{sug.email}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span
                                className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                  sug.isEligible
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sug.isEligible ? 'Eligible HOD' : sug.roleName}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Live Eligibility / Confirmation Feedback Card */}
                    {hodValidation?.checked ? (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                          hodValidation.eligible
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                            : 'bg-amber-50/80 border-amber-200 text-amber-900'
                        }`}
                      >
                        {hodValidation.eligible ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          {hodValidation.eligible ? (
                            <>
                              <p className="font-bold text-emerald-950">
                                Confirmed HOD: {hodValidation.member?.fullName || formData.hodName}
                              </p>
                              <p className="text-[11px] text-emerald-800 mt-0.5">
                                Active member with HOD role. Ready to assign to this department.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-amber-950">
                                {hodValidation.member ? `Ineligible: ${hodValidation.member.fullName}` : 'HOD Ineligible'}
                              </p>
                              <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                                {hodValidation.error}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : selectedDept?.hodEmail && !formData.hodEmail ? (
                      <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
                        <span>HOD will be removed upon saving changes.</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, hodEmail: selectedDept.hodEmail, hodName: selectedDept.hodName }));
                            setHodValidation({ checked: true, eligible: true, member: { fullName: selectedDept.hodName, email: selectedDept.hodEmail } });
                          }}
                          className="text-[10px] text-red-600 underline font-bold cursor-pointer"
                        >
                          Undo
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 flex flex-col gap-0.5">
                    <span className="font-semibold text-xs">{formData.hodName || 'You (HOD)'}</span>
                    {formData.hodEmail && <span className="text-[11px] text-slate-500">{formData.hodEmail}</span>}
                    <span className="text-[10px] text-slate-400 mt-1">Contact Branch Administrator to reassign</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
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

      {/* Positions Manager Modal */}
      {positionsModalOpen && selectedDept && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50">
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Positions in {selectedDept.name}</h3>
                <p className="text-xs text-slate-500">Define departmental roles (e.g. Lead Vocalist, Camera Operator)</p>
              </div>
              <button
                onClick={() => setPositionsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add Position Form */}
            <form onSubmit={handleAddPosition} className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Position</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Position Name (e.g. Soloist)"
                  value={newPositionName}
                  onChange={e => setNewPositionName(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Brief description (optional)"
                  value={newPositionDesc}
                  onChange={e => setNewPositionDesc(e.target.value)}
                  className="p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>

            {/* Existing Positions List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configured Positions</h4>
              {positionsLoading ? (
                <div className="text-center py-4 text-xs text-slate-400">Loading positions...</div>
              ) : positions.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No positions defined for this department yet.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {positions.map(p => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{p.name}</div>
                        {p.description && <div className="text-slate-500 text-[11px]">{p.description}</div>}
                      </div>
                      <button
                        onClick={() => handleDeletePosition(p.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete position"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPositionsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Archive / Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmArchiveOpen}
        title={`Archive Department: ${selectedDept?.name}`}
        message="Are you sure you want to remove or archive this department? If active workers are currently assigned to this department, it will be safely archived to protect organizational history."
        confirmText="Archive Department"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleArchiveOrDelete}
        onClose={() => setConfirmArchiveOpen(false)}
      />
    </div>
  );
};
