import React from 'react';
import {
  LayoutDashboard, UserCheck, Users, Building2, Layers, Shield,
  Calendar, Clock, Newspaper, Sparkles, HeartHandshake, UserCog,
  FileSpreadsheet, Bell, History, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type NavTab = 
  | 'dashboard' | 'approvals' | 'members' | 'branches' | 'departments' | 'roles'
  | 'services' | 'events' | 'feed' | 'highlights' | 'testimonies' | 'attendance'
  | 'reports' | 'notifications' | 'audit' | 'settings';

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
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'notifications' as NavTab, label: 'Notifications', icon: Bell },
        { id: 'audit' as NavTab, label: 'Audit Logs', icon: History },
        { id: 'settings' as NavTab, label: 'Settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0A192F] text-slate-300 flex flex-col shrink-0 border-r border-slate-800 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <img
          src="/church-logo.png"
          alt="Faith Preachers Ministry"
          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10 shrink-0 bg-white"
        />
        <div>
          <h1 className="font-extrabold text-white tracking-wide text-base leading-tight">FPM ONE</h1>
          <p className="text-[11px] font-medium text-amber-400 uppercase tracking-wider">Faith Preachers Ministry</p>
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
      <div className="p-4 border-t border-slate-800 bg-[#071224] flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
            {user?.firstName?.charAt(0) || 'A'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.roleName || 'Admin'}</p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
