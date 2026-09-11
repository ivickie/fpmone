import React, { useState, useEffect } from 'react';
import { Clock, Plus, Calendar, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const ServicesPage: React.FC = () => {
  const { selectedBranchId, user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [services, setServices] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    dayOfWeek: 'Sunday',
    startTime: '08:00',
    expectedEndTime: '10:30',
    gracePeriodMinutes: 15,
    attendanceDurationHours: 4.0,
    status: 'active'
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const [svcData, brData] = await Promise.all([
        api.getServices(selectedBranchId, true),
        api.getBranches()
      ]);
      setServices(svcData || []);
      setBranches(brData || []);
      if (brData && brData.length > 0 && !formData.branchId) {
        setFormData(prev => ({ ...prev, branchId: selectedBranchId || brData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [selectedBranchId]);

  const openCreateModal = () => {
    setFormData({
      branchId: selectedBranchId || (branches[0]?.id || ''),
      name: '',
      dayOfWeek: 'Sunday',
      startTime: '08:00',
      expectedEndTime: '10:30',
      gracePeriodMinutes: 15,
      attendanceDurationHours: 4.0,
      status: 'active'
    });
    setCreateModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setSelectedService(s);
    setFormData({
      branchId: s.branchId || '',
      name: s.name || '',
      dayOfWeek: s.dayOfWeek || 'Sunday',
      startTime: s.startTime?.substring(0, 5) || '08:00',
      expectedEndTime: s.expectedEndTime?.substring(0, 5) || '10:30',
      gracePeriodMinutes: s.gracePeriodMinutes || 15,
      attendanceDurationHours: s.attendanceDurationHours || 4.0,
      status: s.status || 'active'
    });
    setEditModalOpen(true);
  };

  const openArchiveDialog = (s: any) => {
    setSelectedService(s);
    setConfirmArchiveOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createService({
        ...formData,
        startTime: `${formData.startTime}:00`,
        expectedEndTime: `${formData.expectedEndTime}:00`,
        gracePeriodMinutes: Number(formData.gracePeriodMinutes),
        attendanceDurationHours: Number(formData.attendanceDurationHours)
      });
      setCreateModalOpen(false);
      await fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to create service schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setActionLoading(true);
    try {
      await api.updateService(selectedService.id, {
        ...formData,
        startTime: `${formData.startTime}:00`,
        expectedEndTime: `${formData.expectedEndTime}:00`,
        gracePeriodMinutes: Number(formData.gracePeriodMinutes),
        attendanceDurationHours: Number(formData.attendanceDurationHours)
      });
      setEditModalOpen(false);
      await fetchServices();
    } catch (err: any) {
      alert(err.message || 'Failed to update service schedule');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveOrDelete = async () => {
    if (!selectedService) return;
    setActionLoading(true);
    try {
      const res = await api.deleteService(selectedService.id);
      setConfirmArchiveOpen(false);
      await fetchServices();
      if (res.message) alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Failed to archive or delete service');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Recurring Service Schedules</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure weekly church services, start times, grace periods, and attendance windows.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Service Schedule</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading services...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {services.map(s => {
            const branch = branches.find(b => b.id === s.branchId);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900">{s.name}</h3>
                        <p className="text-xs font-semibold text-blue-600 mt-0.5">
                          {s.dayOfWeek}s • {s.startTime?.substring(0, 5)} - {s.expectedEndTime?.substring(0, 5)}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                      s.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      s.status === 'archived' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Grace Period</span>
                      <span className="font-extrabold text-slate-800 text-sm">{s.gracePeriodMinutes} Minutes</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Present up to {s.gracePeriodMinutes}m after start</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Auto Clock-Out</span>
                      <span className="font-extrabold text-slate-800 text-sm">{s.attendanceDurationHours} Hours</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">Automated timeout ceiling</p>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                    <span>Branch: <strong className="text-slate-800">{branch?.name || 'Assigned Branch'}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition"
                    title="Edit Service"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openArchiveDialog(s)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                    title="Archive / Delete Service"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Service Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Add Service Schedule</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Church Branch</label>
                <select
                  value={formData.branchId}
                  onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Service Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sunday Celebration of Praise"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Friday">Friday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.expectedEndTime}
                    onChange={e => setFormData({ ...formData, expectedEndTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.gracePeriodMinutes}
                    onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auto Clock-Out (Hours)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={12}
                    value={formData.attendanceDurationHours}
                    onChange={e => setFormData({ ...formData, attendanceDurationHours: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
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
                  {actionLoading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editModalOpen && selectedService && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Service Schedule</h3>
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Service Name</label>
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
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Day of Week</label>
                  <select
                    value={formData.dayOfWeek}
                    onChange={e => setFormData({ ...formData, dayOfWeek: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Sunday">Sunday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Friday">Friday</option>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Saturday">Saturday</option>
                  </select>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.expectedEndTime}
                    onChange={e => setFormData({ ...formData, expectedEndTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Grace Period (Minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.gracePeriodMinutes}
                    onChange={e => setFormData({ ...formData, gracePeriodMinutes: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auto Clock-Out (Hours)
                  </label>
                  <input
                    type="number"
                    step={0.5}
                    min={1}
                    max={12}
                    value={formData.attendanceDurationHours}
                    onChange={e => setFormData({ ...formData, attendanceDurationHours: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
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

      {/* Confirm Archive / Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmArchiveOpen}
        title={`Archive Service: ${selectedService?.name}`}
        message="Are you sure you want to remove or archive this service schedule? If attendance records exist for this service, it will be safely archived to protect historical attendance data."
        confirmText="Archive Service"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleArchiveOrDelete}
        onClose={() => setConfirmArchiveOpen(false)}
      />
    </div>
  );
};
