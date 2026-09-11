import React, { useState, useEffect } from 'react';
import { HeartHandshake, Check, X, Star, ShieldCheck, Tag, User, Trash2, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const TestimoniesPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [testimonies, setTestimonies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_review' | 'approved' | 'rejected'>('all');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedTestimony, setSelectedTestimony] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTestimonies = async () => {
    setLoading(true);
    try {
      const data = await api.getTestimoniesQueue();
      setTestimonies(data || []);
    } catch (err) {
      console.error('Failed to load testimonies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonies();
  }, []);

  const handleReview = async (id: string, status: string, isFeaturedOnFeed = false) => {
    setActionLoading(true);
    try {
      await api.reviewTestimony(id, { status, isFeaturedOnFeed });
      await fetchTestimonies();
    } catch (err: any) {
      alert(err.message || 'Review action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTestimony) return;
    setActionLoading(true);
    try {
      await api.deleteTestimony(selectedTestimony.id);
      setConfirmDeleteOpen(false);
      setSelectedTestimony(null);
      await fetchTestimonies();
    } catch (err: any) {
      alert(err.message || 'Failed to delete testimony');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredList = testimonies.filter(t => filter === 'all' || t.status === filter);

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Testimonies Moderation Queue</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review submissions from church members, verify consent, and authorize publication.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${filter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}
          >
            All ({testimonies.length})
          </button>
          <button
            onClick={() => setFilter('pending_review')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${filter === 'pending_review' ? 'bg-amber-500 text-slate-950 font-bold shadow-xs' : 'text-slate-600'}`}
          >
            Pending ({testimonies.filter(t => t.status === 'pending_review').length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${filter === 'approved' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}
          >
            Approved ({testimonies.filter(t => t.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${filter === 'rejected' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600'}`}
          >
            Rejected ({testimonies.filter(t => t.status === 'rejected').length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading testimonies...</div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs">
          <p className="text-xs text-slate-500">No testimonies found in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredList.map(t => {
            const canDelete = isSuperAdmin || (user?.branchId === t.branchId);

            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                        {t.category}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-bold text-slate-600">{t.branchName}</span>
                      {t.isFeaturedOnFeed && (
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                          <Star className="w-3 h-3 fill-blue-600" />
                          <span>Featured on Feed</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1">{t.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Shared by <strong className="text-slate-800">{t.authorName}</strong> on {new Date(t.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      t.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : t.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {t.status.replace('_', ' ')}
                    </span>
                    {canDelete && (
                      <button
                        onClick={() => {
                          setSelectedTestimony(t);
                          setConfirmDeleteOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Testimony"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {t.photoUrl && (
                  <div className="rounded-xl overflow-hidden max-h-60 border border-slate-100 shadow-inner">
                    <img
                      src={t.photoUrl}
                      alt={t.title}
                      className="w-full h-full object-cover"
                      onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}

                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  "{t.content}"
                </p>

                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2 text-slate-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Member Publication Consent: <strong className="text-slate-900">{t.allowPublish ? 'Granted (Yes)' : 'Declined (No)'}</strong></span>
                  </div>

                  {t.status === 'pending_review' && (
                    <div className="flex items-center space-x-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleReview(t.id, 'approved', true)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center space-x-1 shadow transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Feature</span>
                      </button>
                      <button
                        onClick={() => handleReview(t.id, 'approved', false)}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center space-x-1 shadow transition cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReview(t.id, 'rejected')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg flex items-center space-x-1 transition cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Testimony"
        message={`Are you sure you want to delete testimony "${selectedTestimony?.title}"? This will permanently remove it from the church archives.`}
        confirmLabel="Delete Testimony"
        confirmVariant="danger"
        loading={actionLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
