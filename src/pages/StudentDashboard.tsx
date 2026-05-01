import React from 'react';
import AnalyticsChart from '../components/AnalyticsChart';
import StudentCheckInWidget from '../components/StudentCheckInWidget';
import StudentStatsGrid from '../components/StudentStatsGrid';
import StudentLeaveBalance from '../components/StudentLeaveBalance';
import StudentRecentActivity from '../components/StudentRecentActivity';

export default function StudentDashboard({ user }: { user?: any }) {
  const userId = user?.uid || user?.id;

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-8 max-w-[1440px] mx-auto w-full">
      <div className="mb-4 sm:mb-4">
        <h2 className="text-xl sm:text-xl font-black text-gray-900 tracking-tight">Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋</h2>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{user?.course || 'Course'} • Roll No: {user?.rollNo || 'N/A'}</p>
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
