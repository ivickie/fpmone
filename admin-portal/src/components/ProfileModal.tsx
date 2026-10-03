import React, { useState, useEffect } from 'react';
import { User, KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'profile' | 'password';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile'
}) => {
  const { user } = useAuth();
  const [modalTab, setModalTab] = useState<'profile' | 'password'>(initialTab);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

  // Sync initial tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalTab(initialTab);
      setPassError(null);
      setPassSuccess(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowOldPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);
    }
  }, [isOpen, initialTab]);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    setPassSuccess(null);

    if (!oldPassword) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword === oldPassword) {
      setPassError('New password must be different from current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match. Please verify.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword: oldPassword,
        newPassword
      });
      setPassSuccess(res.message || 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div className="bg-[#0A192F] text-slate-100 rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-800 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800/90 mb-6 pb-0 space-x-6">
          <button
            type="button"
            id="profile-modal-title"
            onClick={() => {
              setModalTab('profile');
              setPassError(null);
              setPassSuccess(null);
            }}
            className={`pb-3 text-sm font-semibold transition flex items-center space-x-2 cursor-pointer border-b-2 -mb-px ${
              modalTab === 'profile'
                ? 'text-amber-400 border-amber-400 font-bold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <User className="w-4 h-4" />
            <span>My Profile</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setModalTab('password');
              setPassError(null);
              setPassSuccess(null);
            }}
            className={`pb-3 text-sm font-semibold transition flex items-center space-x-2 cursor-pointer border-b-2 -mb-px ${
              modalTab === 'password'
                ? 'text-amber-400 border-amber-400 font-bold'
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
        </div>

        {/* Tab 1: Profile Overview */}
        {modalTab === 'profile' ? (
          <div className="space-y-4">
            {/* User Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#071224] border border-slate-800/80 flex items-center space-x-4 shadow-inner">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border-2 border-amber-400/30 text-amber-400 font-black text-xl flex items-center justify-center shrink-0 shadow-sm">
                {user?.firstName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-base font-bold text-white tracking-tight truncate">
                  {user?.fullName || 'User Profile'}
                </h4>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {user?.email || 'No email registered'}
                </p>
                <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/25">
                  {user?.roleName || 'Administrator'}
                </span>
              </div>
            </div>

            {/* Profile Meta Cards */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3.5 sm:p-4 bg-[#071224] rounded-xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Branch
                </span>
                <span className="font-semibold text-slate-200 text-sm block truncate">
                  {user?.branchName || 'Headquarters'}
                </span>
              </div>
              <div className="p-3.5 sm:p-4 bg-[#071224] rounded-xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                  Status
                </span>
                <span className="font-semibold text-emerald-400 text-sm capitalize flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                  {user?.accountStatus || 'Active'}
                </span>
              </div>
              {user?.workerDetails && (
                <div className="p-3.5 sm:p-4 bg-[#071224] rounded-xl border border-slate-800/80 col-span-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Directorate & Role
                  </span>
                  <span className="font-semibold text-slate-200 text-sm block">
                    {user.workerDetails.departmentName}
                  </span>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {user.workerDetails.workerCode} • {user.workerDetails.positionName}
                  </span>
                </div>
              )}
            </div>

            {/* Quick Action Button */}
            <button
              type="button"
              onClick={() => setModalTab('password')}
              className="w-full py-3 px-4 mt-5 bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-bold rounded-xl transition border border-slate-700/60 flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>Update Account Password</span>
            </button>
          </div>
        ) : (
          /* Tab 2: Change Password Form */
          <div>
            {passSuccess ? (
              <div className="space-y-5 py-2">
                <div className="p-4 bg-emerald-950/60 border border-emerald-600/70 rounded-xl flex items-start space-x-3 text-emerald-300 text-xs sm:text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white mb-1 text-sm">Password Updated!</p>
                    <p className="leading-relaxed">{passSuccess}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passError && (
                  <div className="p-3.5 bg-rose-950/60 border border-rose-800/70 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs sm:text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                    <span>{passError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOldPass ? 'text' : 'password'}
                      required
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#071224] border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOldPass(!showOldPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#071224] border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full px-3.5 py-2.5 pr-10 bg-[#071224] border border-slate-700/80 rounded-xl text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto px-4 py-2.5 border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs sm:text-sm font-semibold rounded-xl transition cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-60"
                  >
                    {passLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Save Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
