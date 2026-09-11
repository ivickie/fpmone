import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MapPin, Users, User, Edit2, Trash2, Eye, X, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const EventsPage: React.FC = () => {
  const { selectedBranchId, user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [registrationsModalOpen, setRegistrationsModalOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Registrations state
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [regLoading, setRegLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bannerUrl: '',
    startDate: '',
    endDate: '',
    location: '',
    speaker: '',
    category: 'Conference',
    capacity: 500,
    status: 'published'
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await api.getEvents(selectedBranchId, true);
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedBranchId]);

  const openCreateModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      title: '',
      description: '',
      bannerUrl: '',
      startDate: `${today}T09:00`,
      endDate: `${today}T17:00`,
      location: '',
      speaker: '',
      category: 'Conference',
      capacity: 500,
      status: 'published'
    });
    setModalOpen(true);
  };

  const openEditModal = (ev: any) => {
    setSelectedEvent(ev);
    const start = ev.startDatetime ? ev.startDatetime.substring(0, 16) : '';
    const end = ev.endDatetime ? ev.endDatetime.substring(0, 16) : '';
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      bannerUrl: ev.bannerUrl || '',
      startDate: start,
      endDate: end,
      location: ev.location || '',
      speaker: ev.speaker || '',
      category: ev.category || 'Conference',
      capacity: ev.registrationCapacity || 500,
      status: ev.status || 'published'
    });
    setEditModalOpen(true);
  };

  const openRegistrationsModal = async (ev: any) => {
    setSelectedEvent(ev);
    setRegistrationsModalOpen(true);
    setRegLoading(true);
    try {
      const data = await api.getEventRegistrations(ev.id);
      setRegistrations(data || []);
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
    } finally {
      setRegLoading(false);
    }
  };

  const openArchiveDialog = (ev: any) => {
    setSelectedEvent(ev);
    setConfirmArchiveOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createEvent({
        title: formData.title,
        description: formData.description,
        bannerUrl: formData.bannerUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
        startDatetime: new Date(formData.startDate).toISOString(),
        endDatetime: new Date(formData.endDate).toISOString(),
        location: formData.location,
        speaker: formData.speaker,
        category: formData.category,
        registrationRequired: !!formData.capacity,
        registrationCapacity: formData.capacity ? Number(formData.capacity) : undefined,
        branchId: selectedBranchId || undefined
      });
      setModalOpen(false);
      await fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await api.updateEvent(selectedEvent.id, {
        title: formData.title,
        description: formData.description,
        bannerUrl: formData.bannerUrl,
        startDatetime: new Date(formData.startDate).toISOString(),
        endDatetime: new Date(formData.endDate).toISOString(),
        location: formData.location,
        speaker: formData.speaker,
        category: formData.category,
        registrationRequired: !!formData.capacity,
        registrationCapacity: formData.capacity ? Number(formData.capacity) : undefined,
        status: formData.status
      });
      setEditModalOpen(false);
      await fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to update event');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);
    try {
      await api.deleteEvent(selectedEvent.id);
      setConfirmArchiveOpen(false);
      await fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to archive event');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Church Events & Conventions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize conferences, retreats, youth rallies, banners, and registrations.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Event</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading events...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={ev.bannerUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800'}
                    alt={ev.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                      {ev.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      ev.status === 'published' ? 'bg-emerald-100 text-emerald-800' :
                      ev.status === 'archived' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {ev.status}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">{ev.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{ev.description}</p>

                  <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{new Date(ev.startDatetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{ev.location}</span>
                    </div>
                    {ev.speaker && (
                      <div className="flex items-center space-x-2">
                        <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{ev.speaker}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => openRegistrationsModal(ev)}
                    className="text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>{ev.currentRegistrationsCount || 0} Registered</span>
                  </button>
                  <span className="font-bold text-emerald-600">
                    {ev.registrationCapacity ? `${ev.registrationCapacity} Cap` : 'Open Entry'}
                  </span>
                </div>

                {/* Actions */}
                <div className="px-5 py-2.5 bg-white border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(ev)}
                    className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-lg transition"
                    title="Edit Event"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openArchiveDialog(ev)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                    title="Archive Event"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Publish Church Event</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <ImageUpload
                label="Event Banner / Artwork"
                value={formData.bannerUrl}
                onChange={url => setFormData({ ...formData, bannerUrl: url })}
                entityType="event"
                branchId={selectedBranchId}
              />

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Annual Holy Ghost Convocation 2026"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Theme, spiritual objectives, expectations..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Location / Venue</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Cathedral Main Auditorium"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Guest Minister / Speaker</label>
                  <input
                    type="text"
                    value={formData.speaker}
                    onChange={e => setFormData({ ...formData, speaker: e.target.value })}
                    placeholder="e.g. Bishop David Adeleke"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Conference">Conference</option>
                    <option value="Retreat">Retreat</option>
                    <option value="Revival">Revival</option>
                    <option value="Concert">Concert</option>
                    <option value="Youth Rally">Youth Rally</option>
                    <option value="Outreach">Outreach</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Capacity Limit</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    placeholder="e.g. 500"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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
                  {actionLoading ? 'Publishing...' : 'Publish Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Event Modal */}
      {editModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Edit Event</h3>
            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <ImageUpload
                label="Event Banner / Artwork"
                value={formData.bannerUrl}
                onChange={url => setFormData({ ...formData, bannerUrl: url })}
                entityType="event"
                entityId={selectedEvent.id}
                branchId={selectedBranchId}
              />

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Location / Venue</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Guest Minister / Speaker</label>
                  <input
                    type="text"
                    value={formData.speaker}
                    onChange={e => setFormData({ ...formData, speaker: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="Conference">Conference</option>
                    <option value="Retreat">Retreat</option>
                    <option value="Revival">Revival</option>
                    <option value="Concert">Concert</option>
                    <option value="Youth Rally">Youth Rally</option>
                    <option value="Outreach">Outreach</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="archived">Archived</option>
                  </select>
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

      {/* View Event Registrations Modal */}
      {registrationsModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrations: {selectedEvent.title}</h3>
                <p className="text-xs text-slate-500">
                  {registrations.length} registered out of {selectedEvent.registrationCapacity || 'Unlimited'} capacity
                </p>
              </div>
              <button
                onClick={() => setRegistrationsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {regLoading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading registrations...</div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No member registrations recorded yet for this event.</div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {registrations.map(r => (
                  <div key={r.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{r.fullName}</div>
                      <div className="text-slate-500 text-[11px]">{r.email} • {r.phone}</div>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(r.registeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRegistrationsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={confirmArchiveOpen}
        title={`Archive Event: ${selectedEvent?.title}`}
        message="Are you sure you want to archive this event? It will no longer appear on the mobile member calendar."
        confirmText="Archive Event"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleArchive}
        onClose={() => setConfirmArchiveOpen(false)}
      />
    </div>
  );
};
