import React from 'react';
import { Building2, Globe, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  branches: Array<{ id: string; name: string; branchCode: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onToggleMobileMenu?: () => void;
  onOpenProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ branches, title, subtitle, actions, onToggleMobileMenu, onOpenProfile }) => {
  const { user, selectedBranchId, setSelectedBranchId } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Mobile Menu Toggle + Title */}
        <div className="flex items-center space-x-3 min-w-0">
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden transition cursor-pointer shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 truncate hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Right: Branch Switcher & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
          {/* Branch Switcher */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs max-w-full">
            {selectedBranchId ? (
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
            ) : (
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" />
            )}
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              disabled={!isSuperAdmin}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer disabled:cursor-not-allowed text-xs truncate max-w-[200px] sm:max-w-[240px]"
            >
              {isSuperAdmin && <option value="">Global FPM (All Branches)</option>}
              {branches.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.branchCode})
                </option>
              ))}
            </select>
          </div>

          {actions}

          {/* Quick Profile Access */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              title={`Logged in as ${user?.fullName || 'User'} (${user?.roleName || 'Admin'}) — Click to view profile & password`}
              className="flex items-center space-x-2 p-1 pl-1.5 pr-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition cursor-pointer shrink-0 group focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <div className="w-6 h-6 rounded-full bg-blue-700 text-white font-bold text-xs flex items-center justify-center group-hover:ring-2 group-hover:ring-amber-400/50 transition shrink-0">
                {user?.firstName?.charAt(0) || 'A'}
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate hidden md:inline">
                {user?.firstName || 'Profile'}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

