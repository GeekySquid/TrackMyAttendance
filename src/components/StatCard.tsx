import { ReactNode } from 'react';
import { motion } from 'framer-motion';

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
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-100/80 shadow-lg shadow-gray-200/10 relative overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-0.5 duration-300 group"
    >
      {/* Visual Accent Line - Sleek */}
      <div className={`h-1.5 w-full ${progressColorClass} opacity-90 group-hover:opacity-100 transition-opacity`} />
      
      <div className="p-3 sm:p-4 flex-1">
        <div className="flex justify-between items-start mb-2 sm:mb-3">
          <div className={`p-2 rounded-xl ${bgClass} shadow-inner transition-transform group-hover:scale-105 duration-300`}>
            {/* Scale down the icon container */}
            <div className="scale-75">
              {icon}
            </div>
          </div>
          {trend && (
            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-widest border transition-colors ${
              trendUp 
                ? 'text-red-600 bg-red-50/50 border-red-100' 
                : 'text-green-600 bg-green-50/50 border-green-100'
            }`}>
              {trend}
            </span>
          )}
        </div>

        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">{title}</p>
        
        <div className="flex items-baseline gap-1 mb-2 sm:mb-3">
          <span className="text-xl font-black text-gray-900 tracking-tighter">{value}</span>
          {total && total !== '-' && total !== '0' && (
            <div className="flex items-baseline">
              <span className="text-xs font-black text-gray-300 mx-0.5">/</span>
              <span className="text-xs font-bold text-gray-400 tracking-tight">{total}</span>
            </div>
          )}
        </div>
        
        <div className="mt-auto space-y-1.5">
          <div className="flex justify-between items-end">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Util</span>
            <span className={`text-[9px] font-black ${colorClass} bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100 shadow-sm`}>
              {percentage}
            </span>
          </div>
          
          <div className="w-full bg-gray-100 h-2 rounded-full relative overflow-hidden border border-gray-200/30 p-[1.5px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: percentage }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${progressColorClass} relative overflow-hidden shadow-sm`}
            >
              {/* Glossy Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent w-full h-full" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Subtle Background Decoration */}
      <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full ${bgClass} opacity-10 blur-xl group-hover:scale-125 transition-transform duration-500`} />
    </motion.div>
  );
}
