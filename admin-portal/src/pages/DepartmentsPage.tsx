import React, { useState, useEffect } from 'react';
import { Layers, Plus, Users, UserCheck, Edit3, Trash2, Tag, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const DepartmentsPage: React.FC = () => {
  const { selectedBranchId, user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
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
    status: 'active'
  });

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
  }, [selectedBranchId]);

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      hodName: '',
      status: 'active'
    });
    setModalOpen(true);
  };

  const openEditModal = (d: any) => {
    setSelectedDept(d);
    setFormData({
      name: d.name || '',
      code: d.code || '',
      description: d.description || '',
      hodName: d.hodName || '',
      status: d.status || 'active'
    });
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
    setActionLoading(true);
    try {
      await api.createDepartment({
        ...formData,
        branchId: selectedBranchId || undefined
      });
      setModalOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to create department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    setActionLoading(true);
    try {
      await api.updateDepartment(selectedDept.id, formData);
      setEditModalOpen(false);
      await fetchDepartments();
    } catch (err: any) {
      alert(err.message || 'Failed to update department');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveOrDelete = async () => {
    if (!selectedDept) return;
    setActionLoading(true);
    try {
      const res = await api.deleteDepartment(selectedDept.id);
      setConfirmArchiveOpen(false);
      await fetchDepartments();
      if (res.message) alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to delete department');
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
    } catch (err: any) {
      alert(err.message || 'Failed to add position');
    }
  };

  const handleDeletePosition = async (posId: string) => {
    if (!selectedDept) return;
    try {
      await api.deletePosition(selectedDept.id, posId);
      setPositions(positions.filter(p => p.id !== posId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete position');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Church Departments & Ministries</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure service departments, assign Heads of Department (HODs), positions, and active status.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Department</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading departments...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between">
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

                <div className="pt-2 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>HOD: <strong className="text-slate-800">{d.hodName || 'Unassigned'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openPositionsModal(d)}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  <span>Positions</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(d)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Department"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openArchiveDialog(d)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Archive / Delete Department"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Department Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
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

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">HOD Name</label>
                <input
                  type="text"
                  value={formData.hodName}
                  onChange={e => setFormData({ ...formData, hodName: e.target.value })}
                  placeholder="e.g. Brother John Mensah"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Department: {selectedDept.name}</h3>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
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
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">HOD Name</label>
                <input
                  type="text"
                  value={formData.hodName}
                  onChange={e => setFormData({ ...formData, hodName: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
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

      {/* Positions Manager Modal */}
      {positionsModalOpen && selectedDept && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
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
