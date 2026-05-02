import React from 'react';
import AnalyticsChart from '../components/AnalyticsChart';
import StudentCheckInWidget from '../components/StudentCheckInWidget';
import StudentStatsGrid from '../components/StudentStatsGrid';
import StudentLeaveBalance from '../components/StudentLeaveBalance';
import StudentRecentActivity from '../components/StudentRecentActivity';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentDashboard({ user }: { user?: any }) {
  const userId = user?.uid || user?.id;
  const fullName = (user?.name || 'Student').split(' ')[0];

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 max-w-[1440px] mx-auto w-full">
      <style>{`
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .waving-hand {
          display: inline-block;
          animation: wave 2.5s infinite;
          transform-origin: 70% 70%;
        }
        .header-glass {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.6);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
        }
        .custom-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: #2563eb;
          margin-left: 1px;
          vertical-align: middle;
          animation: blink 0.8s step-end infinite;
          box-shadow: 0 0 8px rgba(37, 99, 235, 0.5);
        }
      `}</style>

      <div className="mb-10 relative">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center mb-1">
              <h1 className="text-xl sm:text-5xl font-[950] text-slate-900 tracking-tighter sm:tracking-tight leading-none flex items-center gap-1 sm:gap-2 flex-nowrap">
                <span className="shrink-0">Welcome back,</span>
                <span className="text-blue-600 flex items-center min-w-0">
                  <span className="truncate">
                    {fullName.split('').map((char, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, display: 'none' }}
                        animate={{ opacity: 1, display: 'inline' }}
                        transition={{ delay: i * 0.12, duration: 0 }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </span>
                  <span className="custom-cursor shrink-0" />
                </span>
                <span className="waving-hand shrink-0 ml-1">👋</span>
              </h1>
            </div>
            <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.4em] mt-3 flex items-center gap-2 sm:gap-3 flex-nowrap overflow-x-auto no-scrollbar">
              <span className="shrink-0">{user?.course || 'Course'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
              <span className="shrink-0">Roll: {user?.rollNo || 'N/A'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
              <span className="text-emerald-500 flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified
              </span>
            </p>
          </div>

          {/* System Intelligence Bar - Ultra Premium */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="header-glass flex items-center gap-4 p-2 pr-6 rounded-3xl self-start lg:self-center transition-all duration-500 cursor-default"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200 group relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
              <Zap className="w-6 h-6 fill-current relative z-10" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">System Intelligence</p>
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-xs font-black text-slate-800 tracking-tight">
                {navigator.onLine ? "Global Sync Active" : "Local Security Mode"}
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Top Row: Check-in & Gamification Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 mb-4 sm:mb-6">
        <div className="col-span-1">
          <StudentCheckInWidget user={user} />
        </div>
        <div className="col-span-1">
          <StudentStatsGrid user={user} />
        </div>
      </div>

      {/* Middle Row: Recent Activity */}
      <div className="grid grid-cols-1 gap-3 lg:gap-4 mb-4 sm:mb-6">
        <div className="col-span-1">
          <StudentRecentActivity user={user} />
        </div>
      </div>

      {/* Bottom Row: Analytics & Leave Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 sm:mb-6">
        <div className="col-span-1 lg:col-span-2">
          {/* AnalyticsChart in student mode shows only this user's data */}
          <AnalyticsChart userId={userId} />
        </div>
        <div className="col-span-1">
          <StudentLeaveBalance userId={userId} />
        </div>
      </div>
    </div>
  );
}
