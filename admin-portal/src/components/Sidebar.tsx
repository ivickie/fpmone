import React from 'react';
import {
  LayoutDashboard, UserCheck, Users, Building2, Layers, Shield,
  Calendar, Clock, Newspaper, Sparkles, HeartHandshake, UserCog,
  FileSpreadsheet, Bell, History, Settings, LogOut, Wallet, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 
  | 'dashboard' | 'approvals' | 'members' | 'branches' | 'departments' | 'roles'
  | 'services' | 'events' | 'feed' | 'highlights' | 'testimonies' | 'attendance'
  | 'reports' | 'finance' | 'notifications' | 'audit' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingApprovalsCount?: number;
  pendingTestimoniesCount?: number;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onOpenProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingApprovalsCount = 0,
  pendingTestimoniesCount = 0,
  mobileOpen = false,
  onMobileClose,
  onOpenProfile
}) => {
  const { user, logout } = useAuth();

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
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar: Drawer on mobile/tablet, Sticky on desktop */}
      <aside
        className={`bg-[#0A192F] text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] h-full
          lg:static lg:w-64 lg:h-screen lg:sticky lg:top-0 lg:translate-x-0 lg:shrink-0
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
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
                    onClick={() => {
                      onSelectTab(item.id);
                      onMobileClose?.();
                    }}
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
            onMobileClose?.();
            onOpenProfile?.();
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
    </aside>
    </>
  );
};
