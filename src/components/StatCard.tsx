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
      className="bg-white rounded-2xl border border-gray-100/80 shadow-sm relative overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 duration-300 group"
    >
      {/* Visual Accent Line - Ultra Sleek */}
      <div className={`h-1 w-full ${progressColorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />
      
      <div className="p-3 sm:p-4 flex-1">
        <div className="flex justify-between items-start mb-2 sm:mb-2.5">
          <div className={`p-1.5 rounded-xl ${bgClass} border border-white shadow-sm transition-transform group-hover:scale-105 duration-300`}>
            {/* Direct scale for a compact icon */}
            <div className="scale-75 origin-center">
              {icon}
            </div>
          </div>
          {trend && (
            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border transition-colors ${
              trendUp 
                ? 'text-red-500 bg-red-50/50 border-red-100' 
                : 'text-green-500 bg-green-50/50 border-green-100'
            }`}>
              {trend}
            </span>
          )}
        </div>

        <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.15em] mb-0.5">{title}</p>
        
        <div className="flex items-baseline gap-1 mb-2">
          <span className="text-lg font-black text-gray-900 tracking-tighter">{value}</span>
          {total && total !== '-' && total !== '0' && (
            <div className="flex items-baseline">
              <span className="text-[10px] font-black text-gray-200 mx-0.5">/</span>
              <span className="text-[10px] font-bold text-gray-300 tracking-tight">{total}</span>
            </div>
          )}
        </div>
        
        <div className="mt-auto space-y-1">
          <div className="flex justify-between items-end">
            <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest">Utilisation</span>
            <span className={`text-[8px] font-black ${colorClass} bg-gray-50/80 px-1.5 py-0.5 rounded-lg border border-gray-100 shadow-sm`}>
              {percentage}
            </span>
          </div>
          
          <div className="w-full bg-gray-50 h-1.5 rounded-full relative overflow-hidden border border-gray-100 p-[1px]">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: percentage }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className={`h-full rounded-full ${progressColorClass} relative overflow-hidden shadow-sm`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent w-full h-full" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Subtle Background Decoration */}
      <div className={`absolute -right-2 -bottom-2 w-12 h-12 rounded-full ${bgClass} opacity-5 blur-xl group-hover:scale-125 transition-transform duration-500`} />
    </motion.div>
  );
}
