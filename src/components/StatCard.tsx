import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  total?: string;
  percentage: string;
  trend: string;
  trendUp: boolean;
  icon: ReactNode;
  colorClass: string;
  bgClass: string;
  progressColorClass: string;
}

export default function StatCard({ 
  title, value, total, percentage, trend, trendUp, icon, colorClass, bgClass, progressColorClass 
}: StatCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${bgClass}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${trendUp ? 'text-red-500 bg-red-50' : 'text-green-500 bg-green-50'}`}>
          {trend}
        </span>
      </div>
      <p className="text-xs text-gray-500 font-medium mb-1">{title}</p>
      <div className="flex items-end space-x-1">
        <span className="text-2xl font-bold text-gray-800">{value}</span>
        {total && total !== '-' && <span className="text-sm text-gray-400 pb-1">/ {total}</span>}
      </div>
      <div className="mt-4 w-full bg-gray-100 h-1.5 rounded-full relative">
        <div className={`absolute left-0 top-0 h-full rounded-full ${progressColorClass}`} style={{ width: percentage }}></div>
        <span className="absolute right-0 -top-4 text-[10px] text-gray-400">{percentage}</span>
      </div>
    </div>
  );
}
