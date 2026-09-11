import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, ThumbsUp, MessageSquare, Pin, ShieldCheck, Share2, Edit2, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ImageUpload } from '../components/ImageUpload';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const FeedPage: React.FC = () => {
  const { user, selectedBranchId } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    scriptureReference: '',
    postType: 'announcement',
    visibility: 'all',
    mediaUrl: '',
    isPinned: false
  });

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const data = await api.getFeed();
      setPosts(data || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const openCreateModal = () => {
    setFormData({
      title: '',
      content: '',
      scriptureReference: '',
      postType: 'announcement',
      visibility: 'all',
      mediaUrl: '',
      isPinned: false
    });
    setModalOpen(true);
  };

  const openEditModal = (p: any) => {
    setSelectedPost(p);
    setFormData({
      title: p.title || '',
      content: p.content || '',
      scriptureReference: p.scriptureReference || '',
      postType: p.postType || 'post',
      visibility: p.visibility || 'all',
      mediaUrl: p.mediaUrls && p.mediaUrls.length > 0 ? p.mediaUrls[0] : '',
      isPinned: !!p.isPinned
    });
    setEditModalOpen(true);
  };

  const openDeleteDialog = (p: any) => {
    setSelectedPost(p);
    setConfirmDeleteOpen(true);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.createPost({
        title: formData.title || undefined,
        content: formData.content,
        scriptureReference: formData.scriptureReference || undefined,
        postType: formData.postType,
        visibility: formData.visibility,
        branchId: selectedBranchId || undefined,
        mediaUrls: formData.mediaUrl ? [formData.mediaUrl] : []
      });
      setModalOpen(false);
      await fetchFeed();
    } catch (err: any) {
      alert(err.message || 'Failed to publish post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await api.updatePost(selectedPost.id, {
        title: formData.title || undefined,
        content: formData.content,
        scriptureReference: formData.scriptureReference || undefined,
        isPinned: formData.isPinned,
        mediaUrls: formData.mediaUrl ? [formData.mediaUrl] : []
      });
      setEditModalOpen(false);
      await fetchFeed();
    } catch (err: any) {
      alert(err.message || 'Failed to update post');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    setActionLoading(true);
    try {
      await api.deletePost(selectedPost.id);
      setConfirmDeleteOpen(false);
      await fetchFeed();
    } catch (err: any) {
      alert(err.message || 'Failed to delete post');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Church Feed & Announcements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish official announcements, media flyers, pastoral devotions, and updates targeted by branch.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Post / Announcement</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading feed...</div>
      ) : (
        <div className="space-y-5">
          {posts.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4 hover:shadow-md transition">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                    {p.authorName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{p.authorName}</h4>
                    <p className="text-[11px] text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • Visibility: <span className="font-semibold text-slate-600 uppercase">{p.visibility}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {p.isPinned && (
                    <span className="flex items-center space-x-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                      <Pin className="w-3 h-3" />
                      <span>Pinned</span>
                    </span>
                  )}
                  <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                    {p.postType}
                  </span>
                </div>
              </div>

              {p.title && <h3 className="text-base font-extrabold text-slate-900">{p.title}</h3>}

              {p.scriptureReference && (
                <div className="p-3 bg-amber-50/60 border-l-3 border-amber-500 rounded-r-xl text-xs font-serif italic text-amber-950">
                  {p.scriptureReference}
                </div>
              )}

              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{p.content}</p>

              {p.mediaUrls && p.mediaUrls.length > 0 && (
                <div className="rounded-xl overflow-hidden max-h-80 bg-slate-100">
                  <img src={p.mediaUrls[0]} alt="Post Media" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
                    <ThumbsUp className="w-4 h-4 text-blue-600" />
                    <span>{p.likesCount} Reactions</span>
                  </span>
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-700">
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span>{p.commentsCount} Comments</span>
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition"
                    title="Edit Post"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openDeleteDialog(p)}
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                    title="Delete Post"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Publish Church Post or Announcement</h3>
            <form onSubmit={handleCreatePost} className="space-y-4 text-xs">
              <ImageUpload
                label="Post Image / Flyer (Optional)"
                value={formData.mediaUrl}
                onChange={url => setFormData({ ...formData, mediaUrl: url })}
                entityType="feed"
                branchId={selectedBranchId}
              />

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Post Title (Optional)</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Welcome to the New Month of Supernatural Momentum!"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Type</label>
                  <select
                    value={formData.postType}
                    onChange={e => setFormData({ ...formData, postType: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="announcement">Official Announcement</option>
                    <option value="post">General Post</option>
                    <option value="scripture">Scripture / Word of the Day</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Visibility Scope</label>
                  <select
                    value={formData.visibility}
                    onChange={e => setFormData({ ...formData, visibility: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="all">Entire Church (All FPM)</option>
                    <option value="branch">Selected Branch Only</option>
                    <option value="workers_only">Workers Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Scripture Reference (Optional)</label>
                <input
                  type="text"
                  value={formData.scriptureReference}
                  onChange={e => setFormData({ ...formData, scriptureReference: e.target.value })}
                  placeholder="e.g. Amos 9:13, Hebrews 11:1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Post Content</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write the message or announcement..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
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
                  {actionLoading ? 'Publishing...' : 'Publish Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editModalOpen && selectedPost && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">Edit Post</h3>
            <form onSubmit={handleUpdatePost} className="space-y-4 text-xs">
              <ImageUpload
                label="Post Image / Flyer"
                value={formData.mediaUrl}
                onChange={url => setFormData({ ...formData, mediaUrl: url })}
                entityType="feed"
                entityId={selectedPost.id}
                branchId={selectedBranchId}
              />

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Post Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Scripture Reference</label>
                <input
                  type="text"
                  value={formData.scriptureReference}
                  onChange={e => setFormData({ ...formData, scriptureReference: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Post Content</label>
                <textarea
                  required
                  rows={4}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinPost"
                  checked={formData.isPinned}
                  onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pinPost" className="font-semibold text-slate-700 cursor-pointer">
                  Pin this post to the top of church feed
                </label>
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

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Post"
        message="Are you sure you want to remove this post from the church feed? This action will archive the post."
        confirmText="Remove Post"
        variant="danger"
        isLoading={actionLoading}
        onConfirm={handleDeletePost}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
