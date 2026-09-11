import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Quote, BookOpen, User, CheckCircle2, Edit2, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const HighlightsPage: React.FC = () => {
  const { user, selectedBranchId } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [summary, setSummary] = useState('');
  const [scripture, setScripture] = useState('');
  const [quote, setQuote] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const fetchHighlights = async () => {
    setLoading(true);
    try {
      const data = await api.getHighlights();
      setHighlights(data || []);
    } catch (err) {
      console.error('Failed to load highlights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHighlights();
  }, []);

  const openCreateModal = () => {
    setTitle('');
    setSpeaker('');
    setSummary('');
    setScripture('');
    setQuote('');
    setKeyPointsText('');
    setPhotoUrl('');
    setModalOpen(true);
  };

  const openEditModal = (h: any) => {
    setSelectedHighlight(h);
    setTitle(h.title || '');
    setSpeaker(h.speaker || '');
    setSummary(h.summary || '');
    setScripture(h.scripture || '');
    setQuote(h.quote || '');
    setKeyPointsText((h.keyPoints || []).join('\n'));
    setPhotoUrl((h.photos && h.photos.length > 0) ? h.photos[0] : '');
    setEditModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const keyPoints = keyPointsText.split('\n').map(s => s.trim()).filter(Boolean);
      await api.createHighlight({
        title,
        speaker,
        summary,
        scripture,
        quote,
        keyPoints,
        photos: photoUrl ? [photoUrl] : [],
        branchId: selectedBranchId || undefined
      });
      setModalOpen(false);
      await fetchHighlights();
    } catch (err: any) {
      alert(err.message || 'Failed to publish highlight');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHighlight) return;
    setActionLoading(true);
    try {
      const keyPoints = keyPointsText.split('\n').map(s => s.trim()).filter(Boolean);
      await api.updateHighlight(selectedHighlight.id, {
        title,
        speaker,
        summary,
        scripture,
        quote,
        keyPoints,
        photos: photoUrl ? [photoUrl] : []
      });
      setEditModalOpen(false);
      setSelectedHighlight(null);
      await fetchHighlights();
    } catch (err: any) {
      alert(err.message || 'Failed to update highlight');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedHighlight) return;
    setActionLoading(true);
    try {
      await api.deleteHighlight(selectedHighlight.id);
      setConfirmDeleteOpen(false);
      setSelectedHighlight(null);
      await fetchHighlights();
    } catch (err: any) {
      alert(err.message || 'Failed to delete highlight');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Post-Service Sermon Highlights</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recap spiritual messages, scripture references, prophetic declarations, sermon quotes, and media.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Service Highlight</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading highlights...</div>
      ) : highlights.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">No service highlights published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {highlights.map(h => {
            const hasPhoto = h.photos && h.photos.length > 0;
            const canManage = isSuperAdmin || (user?.branchId === h.branchId);

            return (
              <div key={h.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                      {new Date(h.highlightDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h3 className="text-lg font-black text-slate-900">{h.title}</h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Minister: <strong className="text-slate-800">{h.speaker}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="flex items-center space-x-1 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Published</span>
                    </span>
                    {canManage && (
                      <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
                        <button
                          onClick={() => openEditModal(h)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Edit Highlight"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedHighlight(h);
                            setConfirmDeleteOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Delete Highlight"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {hasPhoto && (
                  <div className="rounded-xl overflow-hidden max-h-72 border border-slate-100 shadow-inner">
                    <img
                      src={h.photos[0]}
                      alt={h.title}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}

                {h.scripture && (
                  <div className="p-3 bg-amber-50/70 border-l-3 border-amber-500 rounded-r-xl text-xs text-amber-950 font-serif">
                    <span className="font-bold block not-italic mb-0.5">Anchor Scripture:</span>
                    {h.scripture}
                  </div>
                )}

                <p className="text-xs text-slate-700 leading-relaxed">{h.summary}</p>

                {h.keyPoints && h.keyPoints.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Key Takeaways</h4>
                    <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                      {h.keyPoints.map((pt: string, idx: number) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {h.quote && (
                  <div className="p-4 bg-blue-900 text-white rounded-xl flex items-start space-x-3 shadow-md shadow-blue-900/10">
                    <Quote className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-serif italic text-blue-100">"{h.quote}"</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Publish Highlight Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Publish Service Highlight</h3>
                <p className="text-[11px] text-slate-500">Recap sermon scriptures, media flyer, and key spiritual notes</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 text-xs p-6 overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Theme / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Operating in the Supernatural Dimension"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Minister / Preacher</label>
                <input
                  type="text"
                  required
                  value={speaker}
                  onChange={e => setSpeaker(e.target.value)}
                  placeholder="Pastor David Adeleke"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Photo / Media</label>
                <ImageUpload
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  entityType="highlight"
                  placeholder="Upload sermon flyer or pulpit photo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Anchor Scripture</label>
                <input
                  type="text"
                  value={scripture}
                  onChange={e => setScripture(e.target.value)}
                  placeholder="Mark 9:23"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Summary</label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Overview of the message..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Key Points (One per line)
                </label>
                <textarea
                  rows={3}
                  value={keyPointsText}
                  onChange={e => setKeyPointsText(e.target.value)}
                  placeholder="Faith is an active spiritual force...&#10;Your words frame your world..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Memorable Quote</label>
                <input
                  type="text"
                  value={quote}
                  onChange={e => setQuote(e.target.value)}
                  placeholder="When faith speaks, natural laws submit to divine authority."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl italic"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Publishing...' : 'Publish Highlight'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Highlight Modal */}
      {editModalOpen && selectedHighlight && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Service Highlight</h3>
                <p className="text-[11px] text-slate-500">Update sermon details, scripture reference, and quotes</p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 text-xs p-6 overflow-y-auto flex-1">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Theme / Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Minister / Preacher</label>
                <input
                  type="text"
                  required
                  value={speaker}
                  onChange={e => setSpeaker(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Photo / Media</label>
                <ImageUpload
                  value={photoUrl}
                  onChange={setPhotoUrl}
                  entityType="highlight"
                  placeholder="Upload sermon flyer or pulpit photo"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Anchor Scripture</label>
                <input
                  type="text"
                  value={scripture}
                  onChange={e => setScripture(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Sermon Summary</label>
                <textarea
                  rows={3}
                  required
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Key Points (One per line)
                </label>
                <textarea
                  rows={3}
                  value={keyPointsText}
                  onChange={e => setKeyPointsText(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Memorable Quote</label>
                <input
                  type="text"
                  value={quote}
                  onChange={e => setQuote(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl italic"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Highlight"
        message={`Are you sure you want to delete sermon highlight "${selectedHighlight?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Highlight"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
