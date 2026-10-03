import React, { useState } from 'react';
import {
  LayoutDashboard, UserCheck, Users, Building2, Layers, Shield,
  Calendar, Clock, Newspaper, Sparkles, HeartHandshake, UserCog,
  FileSpreadsheet, Bell, History, Settings, LogOut, Wallet,
  KeyRound, X, CheckCircle2, AlertCircle, Eye, EyeOff, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export type NavTab = 
  | 'dashboard' | 'approvals' | 'members' | 'branches' | 'departments' | 'roles'
  | 'services' | 'events' | 'feed' | 'highlights' | 'testimonies' | 'attendance'
  | 'reports' | 'finance' | 'notifications' | 'audit' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount?: number;
  pendingTestimoniesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  pendingTestimoniesCount = 0
}) => {
  const { user, logout } = useAuth();
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [modalTab, setModalTab] = useState<'profile' | 'password'>('profile');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);

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

  const isSuperAdmin = user?.adminLevel === 'super_admin' || user?.roleCode === 'SUPER_ADMIN';
  const isBranchPastor = user?.roleCode === 'BRANCH_PASTOR';
  const isChurchAdmin = user?.adminLevel === 'branch_admin' || user?.adminLevel === 'church_admin' || user?.roleCode === 'BRANCH_ADMIN';
  const canAccessFinance = isSuperAdmin || isBranchPastor || isChurchAdmin;

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
        { id: 'approvals' as NavTab, label: 'Approvals', icon: UserCheck, badge: pendingApprovalsCount },
        { id: 'members' as NavTab, label: 'Members', icon: Users }
      ]
    },
    {
      title: 'CHURCH STRUCTURE',
      items: [
        { id: 'branches' as NavTab, label: 'Branches', icon: Building2 },
        { id: 'departments' as NavTab, label: 'Departments', icon: Layers },
        { id: 'roles' as NavTab, label: 'Ministry Roles', icon: Shield }
      ]
    },
    {
      title: 'SERVICES & MINISTRIES',
      items: [
        { id: 'services' as NavTab, label: 'Services', icon: Clock },
        { id: 'events' as NavTab, label: 'Events', icon: Calendar },
        { id: 'feed' as NavTab, label: 'Posts & Feed', icon: Newspaper },
        { id: 'highlights' as NavTab, label: 'Service Highlights', icon: Sparkles },
        { id: 'testimonies' as NavTab, label: 'Testimonies', icon: HeartHandshake, badge: pendingTestimoniesCount }
      ]
    },
    {
      title: 'WORKERS & ATTENDANCE',
      items: [
        { id: 'attendance' as NavTab, label: 'Attendance & Clock-In', icon: UserCog },
        { id: 'reports' as NavTab, label: 'Reports & Matrix', icon: FileSpreadsheet }
      ]
    },
    ...(canAccessFinance ? [{
      title: 'FINANCE & TREASURY',
      items: [
        { id: 'finance' as NavTab, label: 'Finance & Treasury', icon: Wallet }
      ]
    }] : []),
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'notifications' as NavTab, label: 'Notifications', icon: Bell },
        { id: 'audit' as NavTab, label: 'Audit Logs', icon: History },
        { id: 'settings' as NavTab, label: 'General Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0A192F] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <img
          src="/church-logo.png"
          alt="Faith Preachers Ministries Int'l"
          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10 shrink-0 bg-white"
        />
        <div>
          <h1 className="font-extrabold text-white tracking-wide text-base leading-tight">FPM Global</h1>
          <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Faith Preachers Ministries Int'l</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h2 className="text-[10px] font-bold text-slate-400 px-3 tracking-wider mb-2">
              {group.title}
            </h2>
            {group.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {!!item.badge && item.badge > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer Profile & Logout */}
      <div className="p-3.5 border-t border-slate-800 bg-[#071224] flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setModalTab('profile');
            setPassError(null);
            setPassSuccess(null);
            setShowProfileModal(true);
          }}
          className="flex items-center space-x-3 overflow-hidden text-left hover:opacity-90 transition group cursor-pointer focus:outline-none"
          title="View profile & security settings"
        >
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-white shrink-0 group-hover:ring-2 group-hover:ring-amber-400/50 transition">
            {user?.firstName?.charAt(0) || 'A'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate group-hover:text-amber-300 transition">
              {user?.fullName || 'Administrator'}
            </p>
            <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
              <span>{user?.roleName || 'Admin'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-[#C59B27] group-hover:underline">Security</span>
            </p>
          </div>
        </button>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Profile & Security Modal for Logged-In User */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0B1528] text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 relative">
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-800 mb-5 pb-1 space-x-4">
              <button
                type="button"
                onClick={() => setModalTab('profile')}
                className={`pb-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  modalTab === 'profile'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab('password')}
                className={`pb-2 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  modalTab === 'password'
                    ? 'text-amber-400 border-b-2 border-amber-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Change Password</span>
              </button>
            </div>

            {modalTab === 'profile' ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 font-extrabold text-base flex items-center justify-center">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{user?.fullName}</h4>
                    <p className="text-slate-400 text-[11px]">{user?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      {user?.roleName || 'Administrator'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Branch</span>
                    <span className="font-semibold text-slate-200">{user?.branchName || 'Headquarters'}</span>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 block mb-1">Status</span>
                    <span className="font-semibold text-emerald-400 capitalize">{user?.accountStatus || 'Active'}</span>
                  </div>
                  {user?.workerDetails && (
                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2">
                      <span className="text-[10px] uppercase text-slate-400 block mb-1">Directorate</span>
                      <span className="font-semibold text-slate-200 block">{user.workerDetails.departmentName}</span>
                      <span className="text-[11px] text-slate-400">{user.workerDetails.workerCode} • {user.workerDetails.positionName}</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setModalTab('password')}
                  className="w-full h-10 mt-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Update Account Password</span>
                </button>
              </div>
            ) : (
              <div>
                {passSuccess ? (
                  <div className="space-y-4 py-2">
                    <div className="p-3.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl flex items-start space-x-2.5 text-emerald-300 text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-white mb-0.5">Password Updated!</p>
                        <p>{passSuccess}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="w-full h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                    {passError && (
                      <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl flex items-start space-x-2 text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                        <span>{passError}</span>
                      </div>
                    )}

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
                      <div className="relative">
                        <input
                          type={showOldPass ? 'text' : 'password'}
                          required
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full px-3 py-2.5 pr-9 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPass(!showOldPass)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">New Password</label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-3 py-2.5 pr-9 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          className="w-full px-3 py-2.5 pr-9 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowProfileModal(false)}
                        className="w-1/2 h-10 border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={passLoading}
                        className="w-1/2 h-10 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition flex items-center justify-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                      >
                        {passLoading ? (
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <KeyRound className="w-3.5 h-3.5" />
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
      )}
    </aside>
  );
};
