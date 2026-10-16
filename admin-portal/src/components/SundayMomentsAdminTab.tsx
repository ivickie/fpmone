import React, { useState, useEffect, useMemo } from 'react';
import { 
  Camera, Plus, Check, X, Trash2, Heart, Clock, User, 
  Search, Filter, AlertCircle, Eye, CheckCircle2, XCircle, 
  Building2, MessageSquare, ShieldCheck, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ImageUpload } from './ImageUpload';
import { ConfirmDialog } from './ConfirmDialog';

interface SundayMoment {
  id: string;
  branchId: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole?: string;
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  sundayDate: string;
  status: 'approved' | 'pending' | 'rejected';
  rejectionReason?: string;
  approvedBy?: string;
  rejectedBy?: string;
  publishedAt?: string;
  expiresAt?: string;
  creatorSource?: 'member' | 'admin';
  likesCount?: number;
  hasLiked?: boolean;
  isExpired?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const SundayMomentsAdminTab: React.FC = () => {
  const { user, selectedBranchId } = useAuth();
  const toast = useToast();

  const isSuperAdmin = user?.adminLevel === 'super_admin' || user?.roleName === 'Super Administrator' || user?.roleCode === 'SUPER_ADMIN';
  const isBranchAdmin = user?.adminLevel === 'branch_admin' || user?.adminLevel === 'church_admin' || user?.roleName?.toLowerCase().includes('pastor') || user?.roleName?.toLowerCase().includes('admin');

  // Moments and Branches state
  const [moments, setMoments] = useState<SundayMoment[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'published' | 'rejected' | 'expired'>('pending');
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranchId || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 9;

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedMomentForReject, setSelectedMomentForReject] = useState<SundayMoment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedMomentForDelete, setSelectedMomentForDelete] = useState<SundayMoment | null>(null);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Upload Form State
  const [uploadBranchId, setUploadBranchId] = useState<string>(selectedBranchId || user?.branchId || '');
  const [uploadMediaUrl, setUploadMediaUrl] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadSundayDate, setUploadSundayDate] = useState('');

  // Resolve media URL safely
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
    return url.startsWith('/') ? url : `/${url}`;
  };

  const fetchBranches = async () => {
    try {
      const data = await api.getBranches();
      if (Array.isArray(data)) {
        setBranches(data);
        if (!uploadBranchId && data.length > 0) {
          setUploadBranchId(user?.branchId || data[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch branches:', err);
    }
  };

  const fetchMoments = async () => {
    setLoading(true);
    try {
      // Query moments with includeExpired and all branches for administration
      const params: any = {
        includeExpired: true,
        allBranches: isSuperAdmin
      };
      if (branchFilter !== 'all') {
        params.branchId = branchFilter;
      }
      const data = await api.getSundayMoments(params);
      if (Array.isArray(data)) {
        setMoments(data);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load Sunday moments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchMoments();
  }, [branchFilter]);

  // Compute pending count
  const pendingCount = useMemo(() => {
    return moments.filter(m => m.status === 'pending').length;
  }, [moments]);

  // Filter moments
  const filteredMoments = useMemo(() => {
    const now = Date.now();
    return moments.filter(m => {
      // Status filter
      const isExpired = m.expiresAt ? new Date(m.expiresAt).getTime() <= now : (m.isExpired || false);
      
      if (statusFilter === 'pending' && m.status !== 'pending') return false;
      if (statusFilter === 'published' && (m.status !== 'approved' || isExpired)) return false;
      if (statusFilter === 'rejected' && m.status !== 'rejected') return false;
      if (statusFilter === 'expired' && (!isExpired || m.status !== 'approved')) return false;

      // Branch filter
      if (branchFilter !== 'all' && m.branchId !== branchFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const captionMatch = m.caption?.toLowerCase().includes(query);
        const uploaderMatch = m.uploadedByName?.toLowerCase().includes(query);
        const branchObj = branches.find(b => b.id === m.branchId);
        const branchMatch = branchObj?.name?.toLowerCase().includes(query);
        if (!captionMatch && !uploaderMatch && !branchMatch) return false;
      }

      return true;
    });
  }, [moments, statusFilter, branchFilter, searchQuery, branches]);

  // Paginated moments
  const totalPages = Math.ceil(filteredMoments.length / pageSize) || 1;
  const paginatedMoments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMoments.slice(start, start + pageSize);
  }, [filteredMoments, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, branchFilter, searchQuery]);

  // Approve Moment
  const handleApprove = async (moment: SundayMoment) => {
    setActionLoading(true);
    try {
      await api.approveSundayMoment(moment.id);
      toast.success('Sunday moment approved! It will be visible to members for 24 hours.');
      await fetchMoments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve Sunday moment');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Reject Modal
  const openRejectModal = (moment: SundayMoment) => {
    setSelectedMomentForReject(moment);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  // Confirm Reject
  const handleRejectConfirm = async () => {
    if (!selectedMomentForReject) return;
    setActionLoading(true);
    try {
      await api.rejectSundayMoment(selectedMomentForReject.id, rejectionReason);
      toast.success('Sunday moment submission rejected.');
      setRejectModalOpen(false);
      setSelectedMomentForReject(null);
      await fetchMoments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject Sunday moment');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Delete Confirmation
  const openDeleteConfirm = (moment: SundayMoment) => {
    setSelectedMomentForDelete(moment);
    setConfirmDeleteOpen(true);
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!selectedMomentForDelete) return;
    setActionLoading(true);
    try {
      await api.deleteSundayMoment(selectedMomentForDelete.id);
      toast.success('Sunday moment removed successfully.');
      setConfirmDeleteOpen(false);
      setSelectedMomentForDelete(null);
      await fetchMoments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete Sunday moment');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Direct Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadMediaUrl) {
      toast.error('Please upload an image for the Sunday Moment.');
      return;
    }
    const targetBranch = uploadBranchId || selectedBranchId || user?.branchId;
    if (!targetBranch) {
      toast.error('Please select an authorized church branch.');
      return;
    }

    setActionLoading(true);
    try {
      await api.createSundayMoment({
        branchId: targetBranch,
        mediaUrl: uploadMediaUrl,
        caption: uploadCaption.trim() || undefined,
        sundayDate: uploadSundayDate || undefined
      });
      toast.success('Sunday Moment posted successfully! Published immediately.');
      setUploadModalOpen(false);
      setUploadMediaUrl('');
      setUploadCaption('');
      setUploadSundayDate('');
      await fetchMoments();
    } catch (err: any) {
      toast.error(err.message || 'Failed to post Sunday Moment');
    } finally {
      setActionLoading(false);
    }
  };

  // Calculate remaining time for 24h expiry
  const formatExpiryTime = (moment: SundayMoment) => {
    if (moment.status !== 'approved') return null;
    const now = Date.now();
    const expTime = moment.expiresAt ? new Date(moment.expiresAt).getTime() : (moment.publishedAt ? new Date(moment.publishedAt).getTime() + 24 * 60 * 60 * 1000 : 0);
    if (!expTime) return null;
    const diffMs = expTime - now;
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Expires in ${hours}h ${mins}m`;
    return `Expires in ${mins}m`;
  };

  const getBranchName = (branchId: string) => {
    const b = branches.find(br => br.id === branchId);
    return b ? b.name : 'Branch';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200/60">
              <Camera className="w-5 h-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Sunday Moments Moderation & Gallery
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Review member-submitted fellowship pictures, approve community stories, and publish official branch moments. Published moments stay live for exactly 24 hours.
          </p>
        </div>

        {(isSuperAdmin || isBranchAdmin) && (
          <button
            onClick={() => {
              setUploadMediaUrl('');
              setUploadCaption('');
              setUploadSundayDate('');
              setUploadBranchId(selectedBranchId || user?.branchId || (branches[0]?.id || ''));
              setUploadModalOpen(true);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Official Moment</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  statusFilter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'published'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Published (Active)
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Rejected
            </button>

            <button
              onClick={() => setStatusFilter('expired')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'expired'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Expired
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All Moments
            </button>
          </div>

          {/* Search & Branch Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {isSuperAdmin && branches.length > 0 && (
              <div className="relative min-w-[170px]">
                <select
                  value={branchFilter}
                  onChange={e => setBranchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                >
                  <option value="all">All Branches</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}

            <div className="relative min-w-[200px]">
              <input
                type="text"
                placeholder="Search caption or member..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid / Table */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading Sunday Moments...</p>
        </div>
      ) : filteredMoments.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <Camera className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-black text-slate-800">
            {statusFilter === 'pending'
              ? 'No Pending Moments Awaiting Moderation'
              : statusFilter === 'published'
              ? 'No Currently Published Sunday Moments'
              : statusFilter === 'rejected'
              ? 'No Rejected Sunday Moments'
              : statusFilter === 'expired'
              ? 'No Expired Sunday Moments'
              : 'No Sunday Moments Found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {statusFilter === 'pending'
              ? 'All member submissions have been reviewed. When new photos are submitted, they will appear here for approval.'
              : 'Try selecting a different filter or branch, or post an official Sunday Moment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedMoments.map(moment => {
              const expiryText = formatExpiryTime(moment);
              const branchName = getBranchName(moment.branchId);
              const isMomentExpired = expiryText === 'Expired' || moment.isExpired;

              return (
                <div
                  key={moment.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition"
                >
                  {/* Image Card Header */}
                  <div className="relative aspect-4/3 bg-slate-900 group">
                    <img
                      src={resolveMediaUrl(moment.mediaUrl)}
                      alt={moment.caption || 'Sunday Moment'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Overlay Click to View */}
                    <button
                      onClick={() => setLightboxUrl(resolveMediaUrl(moment.mediaUrl))}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white space-x-1.5 cursor-pointer"
                    >
                      <Eye className="w-5 h-5" />
                      <span className="text-xs font-bold">View Full</span>
                    </button>

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {moment.status === 'pending' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                          Pending Review
                        </span>
                      )}
                      {moment.status === 'approved' && !isMomentExpired && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                          Published
                        </span>
                      )}
                      {moment.status === 'approved' && isMomentExpired && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-600 text-white shadow-xs">
                          Expired (24h)
                        </span>
                      )}
                      {moment.status === 'rejected' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                          Rejected
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {branchName}
                      </span>
                    </div>

                    {/* Creator source badge */}
                    <div className="absolute top-3 right-3">
                      {moment.creatorSource === 'admin' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white shadow-xs flex items-center space-x-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Official</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/50 text-slate-200 backdrop-blur-xs">
                          Member Upload
                        </span>
                      )}
                    </div>

                    {/* Expiry / Likes Bottom Overlay */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-semibold drop-shadow-sm pointer-events-none">
                      <span className="flex items-center space-x-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs">
                        <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                        <span>{moment.likesCount || 0}</span>
                      </span>

                      {expiryText && expiryText !== 'Expired' && (
                        <span className="flex items-center space-x-1 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-xs text-amber-300">
                          <Clock className="w-3 h-3" />
                          <span>{expiryText}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Moment Details */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      {moment.caption ? (
                        <p className="text-xs text-slate-800 font-medium line-clamp-2">
                          "{moment.caption}"
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No caption provided</p>
                      )}

                      {moment.status === 'rejected' && moment.rejectionReason && (
                        <div className="p-2 bg-rose-50 border border-rose-200/60 rounded-lg text-[11px] text-rose-800">
                          <span className="font-bold">Reason:</span> {moment.rejectionReason}
                        </div>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700 flex items-center space-x-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{moment.uploadedByName || 'Church Member'}</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(moment.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="pt-2 flex items-center justify-between gap-2">
                      {moment.status === 'pending' ? (
                        <div className="flex items-center space-x-2 w-full">
                          <button
                            onClick={() => handleApprove(moment)}
                            disabled={actionLoading}
                            className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => openRejectModal(moment)}
                            disabled={actionLoading}
                            className="flex-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Status: {moment.status}
                          </span>

                          <button
                            onClick={() => openDeleteConfirm(moment)}
                            disabled={actionLoading}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Delete Sunday Moment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredMoments.length)} of {filteredMoments.length} moments
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-black text-slate-800 px-2">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center space-x-1 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Post Official Sunday Moment</h3>
                <p className="text-[11px] text-slate-500">Official admin moments publish immediately and appear in Sunday Stories.</p>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* Branch Selector (if multi-branch/super admin) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Branch <span className="text-rose-500">*</span>
                </label>
                {isSuperAdmin ? (
                  <select
                    value={uploadBranchId}
                    onChange={e => setUploadBranchId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                    {getBranchName(uploadBranchId || user?.branchId || '')}
                  </div>
                )}
              </div>

              {/* Image Upload Component */}
              <ImageUpload
                label="Select Photo"
                value={uploadMediaUrl}
                onChange={url => setUploadMediaUrl(url)}
                entityType="sunday-moment"
                branchId={uploadBranchId}
                helperText="Upload fellowship photograph (JPEG, PNG, WEBP, max 10MB)"
              />

              {/* Caption */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Caption (Optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  placeholder="e.g. Joyful worship with our Choir ministry today!"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Sunday Date (optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sunday Date (Optional)
                </label>
                <input
                  type="date"
                  value={uploadSundayDate}
                  onChange={e => setUploadSundayDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Leave blank to automatically use the recent Sunday.</p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !uploadMediaUrl}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <span>Publish Moment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-5 space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Reject Sunday Moment Submission</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please provide an optional reason for the member explaining why this picture was not approved.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Photo resolution is too low, or content is off-topic."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rejecting...</span>
                  </>
                ) : (
                  <span>Confirm Rejection</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Sunday Moment"
        message="Are you sure you want to permanently delete this Sunday Moment? This cannot be undone."
        confirmLabel="Delete Moment"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      {/* Full-Screen Lightbox Preview */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-5 right-5 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxUrl}
            alt="Sunday Moment Preview"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
