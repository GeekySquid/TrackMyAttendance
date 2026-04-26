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
    // 1. Deduplicate by date (take best status if multiple records for same day)
    const recordsByDate = new Map<string, string>();
    attendanceLogs.forEach(r => {
      const existing = recordsByDate.get(r.date);
      if (!existing || (r.status === 'Present' && existing !== 'Present')) {
        recordsByDate.set(r.date, r.status);
      }
    });

    const sortedDates = Array.from(recordsByDate.keys()).sort((a, b) => (a < b ? 1 : -1));

    let count = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    for (const dateStr of sortedDates) {
      const status = recordsByDate.get(dateStr);
      const d = new Date(dateStr + 'T00:00:00');
      const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000);

      // If this record is from today or yesterday
      if (diff === 0 || diff === 1) {
        if (status === 'Present' || status === 'Late') {
          count++;
          cursor = d;
        } else {
          // If the record exists but is Absent/Half Day, break the streak
          // (Unless it's 'today' and we haven't checked in yet? 
          // Usually streak continues if yesterday was good, until today ends.
          // But if there IS an Absent record for today, break it.)
          break;
        }
      } else if (diff > 1) {
        // Gap in attendance, break streak
        break;
      }
    }
    return count;
  })();

  // Sessions Attended Today
  const today = new Date().toLocaleDateString('en-CA');
  const sessionsToday = attendanceLogs.filter(r => r.date === today).length;

  // Rank & score from leaderboard view
  const myEntry = userId
    ? leaderData.find((e) => e.user_id === userId)
    : null;
  const rank = myEntry?.rank ?? '--';
  const score = myEntry?.score ?? '--';
  const totalInBoard = leaderData.length;

  // Progress label
  const nextBadge = 15 - (streak % 15);

  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4">
      {/* Streak */}
      <div className="bg-gradient-to-br from-orange-500/10 via-orange-50/30 to-white rounded-3xl border border-orange-200/50 p-3 lg:p-4 flex flex-col justify-center transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/20 hover:scale-[1.02] group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex flex-row lg:flex-col lg:items-start items-center gap-2 lg:gap-3 mb-2 lg:mb-3 relative z-10">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30 shrink-0 group-hover:rotate-12 transition-transform duration-500">
            <Flame className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] lg:text-[10px] font-black text-orange-800/50 uppercase tracking-[0.2em] truncate mb-0.5">Streak</p>
            <h4 className="text-lg lg:text-xl font-black text-orange-950 truncate tracking-tight">
              {streak > 0 ? `${streak} Day${streak !== 1 ? 's' : ''}` : '0 Days'}
            </h4>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] lg:text-[11px] font-black text-orange-700 bg-orange-200/40 py-2 px-4 rounded-xl inline-block w-fit truncate max-w-full border border-orange-200/50">
            {streak > 0 ? `${nextBadge} DAYS TO LEVEL UP` : 'START YOUR JOURNEY'}
          </p>
        </div>
      </div>

      {/* Sessions Attended Today */}
      <div className="bg-gradient-to-br from-blue-500/10 via-blue-50/30 to-white rounded-3xl border border-blue-200/50 p-3 lg:p-4 flex flex-col justify-center transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/20 hover:scale-[1.02] group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex flex-row lg:flex-col lg:items-start items-center gap-2 lg:gap-3 mb-2 lg:mb-3 relative z-10">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30 shrink-0 group-hover:rotate-12 transition-transform duration-500">
            <CheckCircle className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] lg:text-[10px] font-black text-blue-800/50 uppercase tracking-[0.2em] truncate mb-0.5">Attendance</p>
            <h4 className="text-lg lg:text-xl font-black text-blue-950 truncate tracking-tight">
              {sessionsToday} Session{sessionsToday !== 1 ? 's' : ''}
            </h4>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] lg:text-[11px] font-black text-blue-700 bg-blue-200/40 py-2 px-4 rounded-xl inline-block w-fit truncate max-w-full border border-blue-200/50">
            {sessionsToday > 0 ? 'KEEP IT UP!' : 'READY TO TRACK'}
          </p>
        </div>
      </div>

      {/* Points / Score */}
      <div className="bg-gradient-to-br from-yellow-500/10 via-yellow-50/30 to-white rounded-3xl border border-yellow-200/50 p-3 lg:p-4 flex flex-col justify-center transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-500/20 hover:scale-[1.02] group relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <div className="flex flex-row lg:flex-col lg:items-start items-center gap-2 lg:gap-3 mb-2 lg:mb-3 relative z-10">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center text-yellow-950 shadow-xl shadow-yellow-500/30 shrink-0 group-hover:rotate-12 transition-transform duration-500">
            <Star className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] lg:text-[10px] font-black text-yellow-800/50 uppercase tracking-[0.2em] truncate mb-0.5">Points</p>
            <h4 className="text-lg lg:text-xl font-black text-yellow-900 truncate tracking-tight">
              {score !== '--' ? score.toLocaleString() : '--'}
            </h4>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] lg:text-[11px] font-black text-yellow-700 bg-yellow-200/40 py-2 px-4 rounded-xl inline-block w-fit truncate max-w-full border border-yellow-200/50">
            {myEntry ? `TOP ${Math.ceil((rank / totalInBoard) * 100)}% PERFORMANCE` : 'CALCULATING...'}
          </p>
        </div>
      </div>

      {/* Class Rank */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-800 to-indigo-900 rounded-3xl border border-white/20 p-3 lg:p-4 flex flex-col justify-center transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/30 hover:scale-[1.02] group relative overflow-hidden text-white shadow-xl">
        <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        <div className="flex flex-row lg:flex-col lg:items-start items-center gap-2 lg:gap-3 mb-2 lg:mb-3 relative z-10">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-white border border-white/20 shadow-lg shrink-0 group-hover:rotate-12 transition-transform duration-500">
            <Trophy className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] lg:text-[10px] font-black text-white/50 uppercase tracking-[0.2em] truncate mb-0.5">Rank</p>
            <h4 className="text-lg lg:text-xl font-black text-white truncate tracking-tight">
              {rank !== '--' ? `${rank}${getRankSuffix(rank)}` : '--'}
            </h4>
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[10px] lg:text-[11px] font-black text-white bg-white/10 py-2 px-4 rounded-xl inline-block w-fit truncate max-w-full border border-white/10 backdrop-blur-sm">
            {totalInBoard > 0 ? `OUT OF ${totalInBoard} STUDENTS` : 'RANK PENDING'}
          </p>
        </div>
      </div>
    </div>
  );
}

function getRankSuffix(rank: number | string): string {
  const n = Number(rank);
  if (isNaN(n)) return '';
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
}
