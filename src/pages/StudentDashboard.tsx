import React from 'react';
import AnalyticsChart from '../components/AnalyticsChart';
import StudentCheckInWidget from '../components/StudentCheckInWidget';
import StudentStatsGrid from '../components/StudentStatsGrid';
import StudentLeaveBalance from '../components/StudentLeaveBalance';
import StudentRecentActivity from '../components/StudentRecentActivity';

export default function StudentDashboard({ user }: { user?: any }) {
  const userId = user?.uid || user?.id;

  return (
    <div className="flex-1 overflow-y-auto p-2 sm:p-6">
      <div className="mb-3 sm:mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Welcome back, {user?.name?.split(' ')[0] || 'Student'}! 👋</h2>
        <p className="text-sm text-gray-500">{user?.course || 'Course'} • Roll No: {user?.rollNo || 'N/A'}</p>
      </div>

      {/* Top Row: Check-in & Gamification Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-8 mb-6 sm:mb-8">
        <div className="col-span-1">
          <StudentCheckInWidget user={user} />
        </div>
        <div className="col-span-1 lg:col-span-2">
          <StudentStatsGrid userId={userId} />
        </div>
      </div>

      {/* Middle Row: Recent Activity */}
      <div className="grid grid-cols-1 gap-3 sm:gap-8 mb-6 sm:mb-8">
        <div className="col-span-1">
          <StudentRecentActivity user={user} />
        </div>
      </div>

      {/* Bottom Row: Analytics & Leave Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-8 mb-6 sm:mb-8">
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
