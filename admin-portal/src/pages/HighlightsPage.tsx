import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, Quote, BookOpen, User, CheckCircle2, Edit2, Trash2, Image as ImageIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const HighlightsPage: React.FC = () => {
  const { user, selectedBranchId } = useAuth();
  const toast = useToast();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [highlights, setHighlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [summary, setSummary] = useState('');
  const [scripture, setScripture] = useState('');
  const [quote, setQuote] = useState('');
  const [keyPointsText, setKeyPointsText] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);

  const resolveMediaUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    if (/https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5000\/uploads\/(fpm-media\/)?/i.test(url)) {
      return url.replace(
        /https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5000\/uploads\/(fpm-media\/)?/gi,
        'https://ykibiaaohlodgcxpyfdm.supabase.co/storage/v1/object/public/fpm-media/'
      );
    }
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    if (typeof window !== 'undefined') {
      const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (window.location.port === '3000' && isLocalHost) {
        const host = window.location.hostname;
        const normalized = url.startsWith('/') ? url : `/${url}`;
        return `http://${host}:5000${normalized}`;
      }
    }
    return url.startsWith('/') ? url : `/${url}`;
  };

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
    setMediaUrls([]);
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
    const initialMedia = (h.photos && Array.isArray(h.photos) && h.photos.length > 0)
      ? [...h.photos]
      : [h.photoUrl, h.videoUrl].filter(Boolean);
    if (h.videoUrl && !initialMedia.includes(h.videoUrl)) {
      initialMedia.push(h.videoUrl);
    }
    setMediaUrls(initialMedia);
    setEditModalOpen(true);
  };

  const isVideoMedia = (url: string) => /\.(mp4|webm|mov|quicktime)(\?.*)?$/i.test(url);
  const isImageMedia = (url: string) => !isVideoMedia(url);
  const photoCount = mediaUrls.filter(isImageMedia).length;
  const videoCount = mediaUrls.filter(isVideoMedia).length;
  const canAddMoreMedia = photoCount < 5 || videoCount < 1;

  const handleAddMedia = (newUrls: string[]) => {
    let currentPhotos = mediaUrls.filter(isImageMedia);
    let currentVideos = mediaUrls.filter(isVideoMedia);
    let rejectedVideo = false;
    let rejectedPhotos = false;

    newUrls.forEach(url => {
      if (isVideoMedia(url)) {
        if (currentVideos.length < 1) {
          currentVideos.push(url);
        } else {
          rejectedVideo = true;
        }
      } else {
        if (currentPhotos.length < 5) {
          currentPhotos.push(url);
        } else {
          rejectedPhotos = true;
        }
      }
    });

    if (rejectedVideo) {
      toast.error('Maximum 1 video allowed per sermon recap.');
    }
    if (rejectedPhotos) {
      toast.error('Maximum 5 pictures allowed per sermon recap.');
    }
    setMediaUrls([...currentPhotos, ...currentVideos]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const keyPoints = keyPointsText.split('\n').map(s => s.trim()).filter(Boolean);
      const photos = mediaUrls.filter(isImageMedia).slice(0, 5);
      const videoItem = mediaUrls.find(isVideoMedia);
      await api.createHighlight({
        title,
        speaker,
        summary,
        scripture,
        quote,
        keyPoints,
        photos,
        videoUrl: videoItem || undefined,
        branchId: selectedBranchId || undefined
      });
      setModalOpen(false);
      toast.success('Highlight published successfully');
      await fetchHighlights();
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish highlight');
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
      const photos = mediaUrls.filter(isImageMedia).slice(0, 5);
      const videoItem = mediaUrls.find(isVideoMedia);
      await api.updateHighlight(selectedHighlight.id, {
        title,
        speaker,
        summary,
        scripture,
        quote,
        keyPoints,
        photos,
        videoUrl: videoItem || undefined
      });
      setEditModalOpen(false);
      setSelectedHighlight(null);
      toast.success('Highlight updated successfully');
      await fetchHighlights();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update highlight');
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
      toast.success('Highlight deleted successfully');
      await fetchHighlights();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete highlight');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Post-Service Sermon Highlights</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recap spiritual messages, scripture references, prophetic declarations, sermon quotes, and media.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Publish Service Highlight</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading highlights...</div>
      ) : highlights.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs">
          <Sparkles className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">No service highlights published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {highlights.map(h => {
            const hasPhoto = h.photos && h.photos.length > 0;
            const canManage = isSuperAdmin || (user?.branchId === h.branchId);

            return (
              <div key={h.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-6 space-y-5 hover:shadow-md transition">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                      {new Date(h.highlightDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">{h.title}</h3>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Minister: <strong className="text-slate-800">{h.speaker}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-start">
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

                {/* Multi-Media Gallery for Highlight */}
                {(() => {
                  const media: string[] = (h.photos && Array.isArray(h.photos) && h.photos.length > 0)
                    ? [...h.photos]
                    : [h.photoUrl, h.videoUrl].filter(Boolean);
                  if (h.videoUrl && !media.includes(h.videoUrl)) {
                    media.push(h.videoUrl);
                  }
                  if (media.length === 0) return null;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span>Service Media ({media.length} item{media.length > 1 ? 's' : ''})</span>
                        </span>
                        <span className="text-[10px] text-slate-400">Click to expand preview</span>
                      </div>

                      {media.length === 1 ? (
                        <div
                          onClick={() => setLightboxMedia(media[0])}
                          className="rounded-xl overflow-hidden max-h-80 border border-slate-200/80 shadow-inner cursor-pointer group relative bg-slate-900 flex items-center justify-center"
                        >
                          {media[0].match(/\.(mp4|webm|mov|quicktime)(\?.*)?$/i) ? (
                            <div className="w-full h-64 flex flex-col items-center justify-center bg-slate-950 text-white relative">
                              <video
                                src={resolveMediaUrl(media[0])}
                                className="w-full h-full object-contain"
                                preload="metadata"
                              />
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition">
                                <div className="w-12 h-12 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center font-bold shadow-lg">
                                  ▶
                                </div>
                              </div>
                              <span className="absolute bottom-2 left-3 px-2 py-0.5 bg-black/70 text-amber-300 text-[10px] font-bold rounded">
                                Sermon Video Recap
                              </span>
                            </div>
                          ) : (
                            <div className="w-full h-full relative">
                              <img
                                src={resolveMediaUrl(media[0])}
                                alt={h.title}
                                className="w-full max-h-80 object-cover group-hover:scale-101 transition duration-300"
                                onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                              />
                              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <span className="px-3 py-1.5 bg-slate-900/80 text-white text-xs font-semibold rounded-lg shadow-sm">
                                  View Full Size
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`grid gap-2 rounded-xl overflow-hidden ${
                          media.length === 2 ? 'grid-cols-2' : media.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                        }`}>
                          {media.map((url, idx) => {
                            const isVideo = url.match(/\.(mp4|webm|mov|quicktime)(\?.*)?$/i);
                            return (
                              <div
                                key={idx}
                                onClick={() => setLightboxMedia(url)}
                                className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video sm:aspect-square cursor-pointer group shadow-xs hover:shadow-md transition"
                              >
                                {isVideo ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white relative">
                                    <video src={resolveMediaUrl(url)} className="w-full h-full object-cover opacity-70" preload="metadata" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow">
                                        ▶
                                      </div>
                                    </div>
                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/80 text-amber-400 text-[9px] font-bold rounded">
                                      VIDEO #{idx + 1}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="w-full h-full relative">
                                    <img
                                      src={resolveMediaUrl(url)}
                                      alt={`Highlight media ${idx + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                    />
                                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 bg-black/60 text-white text-[9px] font-mono rounded">
                                      #{idx + 1}
                                    </span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-blue-900/20 opacity-0 group-hover:opacity-100 transition" />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
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
            <form onSubmit={handleCreate} className="space-y-4 text-xs p-4 sm:p-6 overflow-y-auto flex-1">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Service Media ({photoCount}/5 photos, {videoCount}/1 video)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Max 5 pictures & 1 video</span>
                </div>

                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                    {mediaUrls.map((url, idx) => {
                      const isVid = isVideoMedia(url);
                      return (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square flex items-center justify-center cursor-pointer"
                          onClick={() => setLightboxMedia(url)}
                          title="Click to view full preview"
                        >
                          {isVid ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-1">
                              <span className="text-[10px] font-bold text-amber-400">VIDEO</span>
                              <span className="text-[9px] text-slate-300 truncate max-w-full">Preview</span>
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(url)}
                              alt={`Media ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMediaUrls(mediaUrls.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                            title="Remove media"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/60 text-white text-[9px] rounded font-mono">
                            {isVid ? 'VIDEO' : `IMG ${idx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {canAddMoreMedia ? (
                  <ImageUpload
                    label=""
                    value=""
                    onChange={url => {
                      if (url) handleAddMedia([url]);
                    }}
                    multiple={true}
                    onMultipleUpload={urls => {
                      handleAddMedia(urls);
                    }}
                    entityType="highlight"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    helperText={
                      photoCount < 5 && videoCount < 1
                        ? `Add up to ${5 - photoCount} photo${5 - photoCount > 1 ? 's' : ''} or 1 video (multi-select supported)`
                        : photoCount < 5
                        ? `Add up to ${5 - photoCount} photo${5 - photoCount > 1 ? 's' : ''}`
                        : `Add 1 highlight video`
                    }
                    placeholder="Click to attach photos or video"
                  />
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg text-center font-medium border border-amber-200">
                    Maximum 5 pictures and 1 video limit reached. Remove an item to replace.
                  </p>
                )}
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

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 text-center"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
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
            <form onSubmit={handleUpdate} className="space-y-4 text-xs p-4 sm:p-6 overflow-y-auto flex-1">
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                    Service Media ({photoCount}/5 photos, {videoCount}/1 video)
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Max 5 pictures & 1 video</span>
                </div>

                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2.5">
                    {mediaUrls.map((url, idx) => {
                      const isVid = isVideoMedia(url);
                      return (
                        <div
                          key={idx}
                          className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-square flex items-center justify-center cursor-pointer"
                          onClick={() => setLightboxMedia(url)}
                          title="Click to view full preview"
                        >
                          {isVid ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-1">
                              <span className="text-[10px] font-bold text-amber-400">VIDEO</span>
                              <span className="text-[9px] text-slate-300 truncate max-w-full">Preview</span>
                            </div>
                          ) : (
                            <img
                              src={resolveMediaUrl(url)}
                              alt={`Media ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMediaUrls(mediaUrls.filter((_, i) => i !== idx));
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                            title="Remove media"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/60 text-white text-[9px] rounded font-mono">
                            {isVid ? 'VIDEO' : `IMG ${idx + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {canAddMoreMedia ? (
                  <ImageUpload
                    label=""
                    value=""
                    onChange={url => {
                      if (url) handleAddMedia([url]);
                    }}
                    multiple={true}
                    onMultipleUpload={urls => {
                      handleAddMedia(urls);
                    }}
                    entityType="highlight"
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                    helperText={
                      photoCount < 5 && videoCount < 1
                        ? `Add up to ${5 - photoCount} photo${5 - photoCount > 1 ? 's' : ''} or 1 video (multi-select supported)`
                        : photoCount < 5
                        ? `Add up to ${5 - photoCount} photo${5 - photoCount > 1 ? 's' : ''}`
                        : `Add 1 highlight video`
                    }
                    placeholder="Click to attach photos or video"
                  />
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg text-center font-medium border border-amber-200">
                    Maximum 5 pictures and 1 video limit reached. Remove an item to replace.
                  </p>
                )}
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

              <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 text-center"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Media Viewer Modal */}
      {lightboxMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxMedia(null)}
              className="absolute -top-10 right-0 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
            {lightboxMedia.match(/\.(mp4|webm|mov|quicktime)(\?.*)?$/i) ? (
              <video
                src={resolveMediaUrl(lightboxMedia)}
                controls
                autoPlay
                className="max-h-[80vh] w-auto max-w-full rounded-xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={resolveMediaUrl(lightboxMedia)}
                alt="Enlarged media"
                className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
              />
            )}
            <div className="mt-3 text-center">
              <a
                href={resolveMediaUrl(lightboxMedia)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Open Original in New Tab
              </a>
            </div>
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
