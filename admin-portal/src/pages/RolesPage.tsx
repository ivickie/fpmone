import React, { useState, useEffect } from 'react';
import { Shield, Check, Lock, Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const RolesPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    hierarchyLevel: 7,
    permissions: [] as string[],
    isActive: true
  });
  const [permissionInput, setPermissionInput] = useState('');

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.getRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to load roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      hierarchyLevel: 7,
      permissions: ['feed:read', 'events:read'],
      isActive: true
    });
    setPermissionInput('');
    setCreateModalOpen(true);
  };

  const openEditModal = (r: any) => {
    setSelectedRole(r);
    setFormData({
      name: r.name || '',
      code: r.code || '',
      description: r.description || '',
      hierarchyLevel: r.hierarchyLevel || 7,
      permissions: [...(r.permissions || [])],
      isActive: r.isActive !== false
    });
    setPermissionInput('');
    setEditModalOpen(true);
  };

  const openDeleteDialog = (r: any) => {
    setSelectedRole(r);
    setConfirmDeleteOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createRole(formData);
      setCreateModalOpen(false);
      await fetchRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to create role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      await api.updateRole(selectedRole.id, formData);
      setEditModalOpen(false);
      await fetchRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      await api.deleteRole(selectedRole.id);
      setConfirmDeleteOpen(false);
      await fetchRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role');
    } finally {
      setActionLoading(false);
    }
  };

  const addPermission = () => {
    const perm = permissionInput.trim().toLowerCase();
    if (perm && !formData.permissions.includes(perm)) {
      setFormData({ ...formData, permissions: [...formData.permissions, perm] });
      setPermissionInput('');
    }
  };

  const removePermission = (perm: string) => {
    setFormData({ ...formData, permissions: formData.permissions.filter(p => p !== perm) });
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Ministry Roles & RBAC</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Role-based access control and hierarchical ministry positions across Faith Preachers Ministry.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Role</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading roles...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 flex flex-col justify-between hover:shadow-md transition">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-extrabold text-slate-900">{r.name}</h3>
                        {r.isSystemRole && (
                          <span title="System Protected Role" className="text-amber-600">
                            <Lock className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                        {r.code}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Level {r.hierarchyLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed min-h-[36px]">
                  {r.description || 'No description provided.'}
                </p>

                <div className="pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Permissions Scope
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {r.permissions.map((p: string, idx: number) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded font-mono">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {isSuperAdmin && (
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(r)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition"
                    title="Edit Role"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!r.isSystemRole && (
                    <button
                      onClick={() => openDeleteDialog(r)}
                      className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                      title="Delete Custom Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Custom Role Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create Custom Ministry Role</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Outreach Coordinator"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Role Code</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. OUTREACH_COORD"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Hierarchy Level</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formData.hierarchyLevel}
                    onChange={e => setFormData({ ...formData, hierarchyLevel: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Responsibilities and purpose of this role..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Permissions Scope</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. events:manage"
                    value={permissionInput}
                    onChange={e => setPermissionInput(e.target.value)}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={addPermission}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.permissions.map(p => (
                    <span key={p} className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                      {p}
                      <button type="button" onClick={() => removePermission(p)} className="text-slate-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {editModalOpen && selectedRole && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Role: {selectedRole.name}
            </h3>
            {selectedRole.isSystemRole && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>System role hierarchy and core privileges are protected to maintain system integrity.</span>
              </div>
            )}
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Role Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              {!selectedRole.isSystemRole && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Hierarchy Level</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.hierarchyLevel}
                    onChange={e => setFormData({ ...formData, hierarchyLevel: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Permissions Scope</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. new:permission"
                    value={permissionInput}
                    onChange={e => setPermissionInput(e.target.value)}
                    className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                  <button
                    type="button"
                    onClick={addPermission}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.permissions.map(p => (
                    <span key={p} className="bg-slate-100 text-slate-800 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                      {p}
                      <button type="button" onClick={() => removePermission(p)} className="text-slate-400 hover:text-red-600">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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

      {/* Confirm Delete Role Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title={`Delete Role: ${selectedRole?.name}`}
        message="Are you sure you want to permanently delete this ministry role? If members are currently assigned to this role, the server will block deletion until they are reassigned."
        confirmText="Delete Role"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
