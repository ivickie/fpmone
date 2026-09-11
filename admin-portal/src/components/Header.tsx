import React from 'react';
import { Building2, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  branches: Array<{ id: string; name: string; branchCode: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ branches, title, subtitle, actions }) => {
  const { user, selectedBranchId, setSelectedBranchId } = useAuth();
  const isSuperAdmin = user?.adminLevel === 'super_admin';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center space-x-3">
        {/* Branch Switcher */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
          {selectedBranchId ? (
            <Building2 className="w-4 h-4 text-blue-600" />
          ) : (
            <Globe className="w-4 h-4 text-amber-500" />
          )}
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            disabled={!isSuperAdmin}
            className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer disabled:cursor-not-allowed text-xs"
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
      </div>
    </header>
  );
};
