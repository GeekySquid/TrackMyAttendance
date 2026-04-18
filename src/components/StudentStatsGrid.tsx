import React, { useState, useEffect } from 'react';
import { Flame, Star, CheckCircle, Trophy } from 'lucide-react';
import { listenToCollection, getLeaderboard } from '../services/dbService';

export default function StudentStatsGrid({ userId }: { userId?: string }) {
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [leaderData, setLeaderData] = useState<any[]>([]);

  // Listen to attendance records for this student
  useEffect(() => {
    if (!userId) return;
    const unsub = listenToCollection('attendance', (data) => {
      setAttendanceLogs(data.filter((r: any) => r.userId === userId));
    }, userId);
    return () => unsub();
  }, [userId]);

  // Refresh leaderboard every time attendance changes
  useEffect(() => {
    getLeaderboard().then(setLeaderData);
  }, [attendanceLogs]);

  // ── Compute stats ──────────────────────────────────────────────────
  const totalDays = attendanceLogs.length;
  const presentDays = attendanceLogs.filter(
    (r) => r.status === 'Present' || r.status === 'Late' || r.status === 'Half Day'
  ).length;
  const attendancePct =
    totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  // Streak: consecutive days from today backwards where student was present/late
  const streak = (() => {
    const sorted = [...attendanceLogs]
      .filter((r) => r.status === 'Present' || r.status === 'Late')
      .map((r) => r.date)
      .sort((a, b) => (a < b ? 1 : -1)); // newest first

    let count = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const dateStr of sorted) {
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round(
        (cursor.getTime() - d.getTime()) / 86400000
      );
      if (diff === 0 || diff === 1) {
        count++;
        cursor = d;
      } else {
        break;
      }
    }
    return count;
  })();

  // Rank & score from leaderboard view
  const myEntry = userId
    ? leaderData.find((e) => e.user_id === userId)
    : null;
  const rank = myEntry?.rank ?? '--';
  const score = myEntry?.score ?? '--';
  const totalInBoard = leaderData.length;

  // Progress label
  const nextBadge = 15 - (streak % 15);
  const attendanceTrend =
    attendancePct > 90
      ? '+Good standing'
      : attendancePct > 75
      ? 'Needs improvement'
      : '⚠ Low attendance';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-orange-200 shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wider">Current Streak</p>
            <h4 className="text-2xl font-black text-orange-900">
              {streak > 0 ? `${streak} Day${streak !== 1 ? 's' : ''}` : '0 Days'}
            </h4>
          </div>
        </div>
        <p className="text-xs font-medium text-orange-700 mt-2 bg-orange-200/50 py-1 px-2 rounded inline-block w-fit">
          {streak > 0
            ? `${nextBadge} day${nextBadge !== 1 ? 's' : ''} to next badge!`
            : 'Check in to start your streak!'}
        </p>
      </div>

      {/* Points / Score */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 shadow-lg shadow-yellow-200 shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Total Points</p>
            <h4 className="text-2xl font-black text-yellow-900">
              {score !== '--' ? score.toLocaleString() : '--'}
            </h4>
          </div>
        </div>
        <p className="text-xs font-medium text-yellow-700 mt-2 bg-yellow-200/50 py-1 px-2 rounded inline-block w-fit">
          {myEntry ? `Top ${Math.ceil((rank / totalInBoard) * 100)}% of your class` : 'No ranking data yet'}
        </p>
      </div>

      {/* Attendance % */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Overall Attendance</p>
            <h4 className="text-2xl font-black text-gray-800">
              {totalDays > 0 ? `${attendancePct}%` : '--'}
            </h4>
          </div>
        </div>
        <p className={`text-xs font-medium mt-2 py-1 px-2 rounded inline-block w-fit ${
          attendancePct > 90
            ? 'text-green-600 bg-green-50'
            : attendancePct > 75
            ? 'text-orange-600 bg-orange-50'
            : 'text-red-600 bg-red-50'
        }`}>
          {totalDays > 0 ? attendanceTrend : 'No records yet'}
        </p>
      </div>

      {/* Class Rank */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-center">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Class Rank</p>
            <h4 className="text-2xl font-black text-gray-800">
              {rank !== '--' ? `${rank}${getRankSuffix(rank)}` : '--'}
            </h4>
          </div>
        </div>
        <p className="text-xs font-medium text-purple-600 mt-2 bg-purple-50 py-1 px-2 rounded inline-block w-fit">
          {totalInBoard > 0 ? `Out of ${totalInBoard} students` : 'No ranking data yet'}
        </p>
      </div>
    </div>
  );
}

function getRankSuffix(rank: number | string): string {
  const n = Number(rank);
  if (isNaN(n)) return '';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
