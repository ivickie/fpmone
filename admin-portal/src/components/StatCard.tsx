import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: string;
  trend?: string;
  color?: 'blue' | 'amber' | 'emerald' | 'purple' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  color = 'blue'
}) => {
  const colorStyles = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' }
  }[color];

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${colorStyles.bg} ${colorStyles.text} ${colorStyles.border} border`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || badge || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
          {trend && <span className="font-semibold text-emerald-600">{trend}</span>}
          {badge && (
            <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${colorStyles.bg} ${colorStyles.text}`}>
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
