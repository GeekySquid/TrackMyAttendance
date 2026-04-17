import React from 'react';
import { Flame, Star, CheckCircle, Trophy } from 'lucide-react';

export default function StudentStatsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Current Streak</p>
            <h4 className="text-2xl font-black text-orange-900">12 Days</h4>
          </div>
        </div>
        <p className="text-xs font-medium text-orange-700 mt-2 bg-orange-200/50 py-1 px-2 rounded inline-block w-fit">3 days away from next badge!</p>
      </div>

      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 shadow-lg shadow-yellow-200 shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Total Points</p>
            <h4 className="text-2xl font-black text-yellow-900">1,250</h4>
          </div>
        </div>
        <p className="text-xs font-medium text-yellow-700 mt-2 bg-yellow-200/50 py-1 px-2 rounded inline-block w-fit">Top 5% of your class</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Attendance</p>
            <h4 className="text-2xl font-black text-gray-800">94.5%</h4>
          </div>
        </div>
        <p className="text-xs font-medium text-green-600 mt-2 bg-green-50 py-1 px-2 rounded inline-block w-fit">+2.1% this month</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Class Rank</p>
            <h4 className="text-2xl font-black text-gray-800">12th</h4>
          </div>
        </div>
        <p className="text-xs font-medium text-purple-600 mt-2 bg-purple-50 py-1 px-2 rounded inline-block w-fit">Out of 120 students</p>
      </div>
    </div>
  );
}
