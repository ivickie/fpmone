import React, { useState, useEffect } from 'react';
import { Building2, Plus, Phone, Mail, MapPin, Edit3, Trash2, Archive, Users, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    branchCode: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
    phone: '',
    email: '',
    branchPastorName: '',
    logoUrl: '',
    status: 'active'
  });

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const data = await api.getBranches();
      setBranches(data || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openCreateModal = () => {
    setFormData({
      name: '',
      branchCode: '',
      address: '',
      city: '',
      state: '',
      country: 'Nigeria',
      phone: '',
      email: '',
      branchPastorName: '',
      logoUrl: '',
      status: 'active'
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (b: any) => {
    setSelectedBranch(b);
    setFormData({
      name: b.name || '',
      branchCode: b.branchCode || '',
      address: b.address || '',
      city: b.city || '',
      state: b.state || '',
      country: b.country || 'Nigeria',
      phone: b.phone || '',
      email: b.email || '',
      branchPastorName: b.branchPastorName || '',
      logoUrl: b.logoUrl || '',
      status: b.status || 'active'
    });
    setEditModalOpen(true);
  };

  const openArchiveDialog = (b: any) => {
    setSelectedBranch(b);
    setConfirmArchiveOpen(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createBranch(formData);
      setCreateModalOpen(false);
      await fetchBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to create branch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    setActionLoading(true);
    try {
      await api.updateBranch(selectedBranch.id, formData);
      setEditModalOpen(false);
      await fetchBranches();
    } catch (err: any) {
      alert(err.message || 'Failed to update branch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveOrDelete = async () => {
    if (!selectedBranch) return;
    setActionLoading(true);
    try {
      const res = await api.deleteBranch(selectedBranch.id);
      setConfirmArchiveOpen(false);
      await fetchBranches();
      if (res.message) {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove or archive branch');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">FPM Branches & Chapters</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage church locations, chapter pastors, contact details, branch logos, and operational status.
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Branch</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading branches...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {branches.map(b => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  {b.logoUrl ? (
                    <img
                      src={b.logoUrl}
                      alt={b.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                    />
                  ) : (
                    <img
                      src="/church-logo.png"
                      alt={b.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white"
                    />
                  )}
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{b.name}</h3>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {b.branchCode}
                      </span>
                      {b.isHeadquarters && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                          Headquarters
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  b.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                  b.status === 'archived' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {b.status}
                </span>
              </div>

              <div className="text-xs space-y-2 pt-2 border-t border-slate-100 text-slate-600">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate">{b.address}, {b.city}, {b.country}</span>
                </div>
                {b.branchPastorName && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>Resident Pastor: <strong className="text-slate-900">{b.branchPastorName}</strong></span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{b.email}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                {(isSuperAdmin || user?.branchId === b.id) && (
                  <button
                    onClick={() => openEditModal(b)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                {isSuperAdmin && !b.isHeadquarters && (
                  <button
                    onClick={() => openArchiveDialog(b)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Archive / Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Branch Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Add New Church Branch / Chapter</h3>
            <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
              <ImageUpload
                label="Branch Logo / Banner"
                value={formData.logoUrl}
                onChange={url => setFormData({ ...formData, logoUrl: url })}
                entityType="church-asset"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Lekki City of Praise"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branchCode}
                    onChange={e => setFormData({ ...formData, branchCode: e.target.value })}
                    placeholder="e.g. FPM-LEK"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Plot 15 Admiralty Way, Lekki Phase 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lagos"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Lagos State"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Nigeria"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Resident Pastor Name</label>
                  <input
                    type="text"
                    value={formData.branchPastorName}
                    onChange={e => setFormData({ ...formData, branchPastorName: e.target.value })}
                    placeholder="Pastor Emmanuel Okafor"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="chapter@faithpreachers.org"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
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
                  {actionLoading ? 'Creating...' : 'Create Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {editModalOpen && selectedBranch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Edit Branch: {selectedBranch.name}</h3>
            <form onSubmit={handleUpdateBranch} className="space-y-4 text-xs">
              <ImageUpload
                label="Branch Logo / Banner"
                value={formData.logoUrl}
                onChange={url => setFormData({ ...formData, logoUrl: url })}
                entityType="church-asset"
                branchId={selectedBranch.id}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Branch Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
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
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Country</label>
                  <input
                    type="text"
                    required
                    value={formData.country}
                    onChange={e => setFormData({ ...formData, country: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Resident Pastor Name</label>
                  <input
                    type="text"
                    value={formData.branchPastorName}
                    onChange={e => setFormData({ ...formData, branchPastorName: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
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

      {/* Confirm Archive / Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmArchiveOpen}
        title={`Archive Branch: ${selectedBranch?.name}`}
        message="Are you sure you want to remove or archive this branch? If this branch has active members, scheduled services, or historical attendance, it will be safely archived to preserve relational data integrity."
        confirmText="Archive Branch"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleArchiveOrDelete}
        onClose={() => setConfirmArchiveOpen(false)}
      />
    </div>
  );
};
