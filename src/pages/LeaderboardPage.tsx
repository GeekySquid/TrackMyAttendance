import React, { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Crown,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { getLeaderboard } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

interface LeaderEntry {
  rank: number;
  user_id: string;
  name: string;
  roll_no?: string;
  course?: string;
  photo_url?: string;
  attendance_pct: number;
  score: number;
}

export default function LeaderboardPage({ userId }: { userId?: string }) {
  const [leaderData, setLeaderData] = useState<LeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then(setLeaderData)
      .finally(() => setIsLoading(false));
  }, []);

  const fullRankings = React.useMemo(() => leaderData.slice(3), [leaderData]);
  const { visibleItems: rankItems, sentinelRef: rankSentinel } = useInfiniteScroll(fullRankings, 10, 5);

  const currentUserEntry = userId
    ? leaderData.find((entry) => entry.user_id === userId)
    : null;

  const topThreeRaw = leaderData.slice(0, 3);
  // Podium order: 2nd, 1st, 3rd
  const topThree =
    topThreeRaw.length >= 3
      ? [topThreeRaw[1], topThreeRaw[0], topThreeRaw[2]]
      : topThreeRaw.length === 1
      ? [null, topThreeRaw[0], null]
      : topThreeRaw;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (leaderData.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
            <Trophy className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-600">
              No leaderboard data yet
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              Attendance records will populate the leaderboard automatically.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const avatarUrl = (name: string, photoUrl?: string) =>
    photoUrl ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#f8fafc] relative">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-white/50 shadow-xl shadow-blue-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3 opacity-40" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-500/10 text-blue-700 text-xs font-black mb-3 border border-blue-200/50">
                <Sparkles className="w-3.5 h-3.5" /> MONTHLY RANKING
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                Top Performers
                <Trophy className="w-8 h-8 text-yellow-500 drop-shadow-sm" />
              </h2>
              <p className="text-sm text-gray-500 mt-2 max-w-md font-medium leading-relaxed">
                Real-time rankings based on attendance consistency and punctuality.
              </p>
            </div>

            {currentUserEntry ? (
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-[2rem] p-5 shadow-2xl shadow-gray-400/20 border border-gray-700/50 w-full sm:w-auto text-white flex gap-6 items-center group transition-transform hover:scale-105 duration-500">
                <div className="relative">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Your Rank</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent leading-none">
                      {currentUserEntry.rank}
                    </span>
                    <span className="text-sm text-gray-500 font-black mb-1">
                      {currentUserEntry.rank === 1 ? 'st' : currentUserEntry.rank === 2 ? 'nd' : currentUserEntry.rank === 3 ? 'rd' : 'th'}
                    </span>
                  </div>
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="h-12 w-px bg-white/10" />
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Global Score</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-blue-400 tracking-tight">
                      {currentUserEntry.score}
                    </span>
                    <div className="flex items-center gap-1 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-lg text-[10px] font-black border border-green-500/20">
                      <TrendingUp className="w-3 h-3" />
                      +{Math.round(currentUserEntry.score / 100)}
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 font-bold">
                    {currentUserEntry.attendance_pct}% consistency
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Podium */}
        {topThreeRaw.length >= 2 && (
          <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-500/5 p-6 sm:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-transparent pointer-events-none" />
            
            <div className="flex justify-center items-end gap-2 sm:gap-10 h-72 mt-12 relative z-10">
              {/* 2nd Place */}
              {topThree[0] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[130px] relative group">
                  <div className="absolute -top-16 flex flex-col items-center transition-transform duration-500 group-hover:-translate-y-2">
                    <div className="relative">
                      <img
                        src={avatarUrl(topThree[0].name, topThree[0].photo_url)}
                        alt={topThree[0].name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-gray-300 bg-white shadow-xl object-cover z-10"
                      />
                      <div className="absolute inset-0 rounded-full ring-4 ring-gray-400/20 animate-ping opacity-20" />
                    </div>
                    <div className="absolute -bottom-3 bg-gray-300 text-gray-800 text-[10px] font-black px-3 py-1 rounded-xl border-2 border-white z-20 shadow-lg">
                      2ND
                    </div>
                  </div>
                  <div className="w-full h-36 bg-gradient-to-t from-gray-200/50 via-gray-100/30 to-white/10 backdrop-blur-sm border-x border-t border-gray-200/50 rounded-t-[2rem] flex flex-col items-center justify-end pb-6 transition-all duration-500 group-hover:h-40 group-hover:from-gray-200/70">
                    <p className="text-xs font-black text-gray-800 text-center truncate w-full px-3">
                      {topThree[0].name}
                    </p>
                    <p className="text-[10px] font-black text-gray-500 mt-1 bg-gray-200/50 px-2 py-0.5 rounded-lg">
                      {topThree[0].score} PTS
                    </p>
                  </div>
                </div>
              ) : <div className="w-1/3" />}

              {/* 1st Place */}
              {topThree[1] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[160px] relative z-10 group">
                  <div className="absolute -top-24 flex flex-col items-center transition-transform duration-700 group-hover:-translate-y-4">
                    <div className="relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce">
                        <Crown className="w-10 h-10 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                      </div>
                      <img
                        src={avatarUrl(topThree[1].name, topThree[1].photo_url)}
                        alt={topThree[1].name}
                        className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-[6px] border-yellow-400 bg-yellow-50 shadow-2xl shadow-yellow-400/40 object-cover z-10"
                      />
                      <div className="absolute inset-0 rounded-full ring-[8px] ring-yellow-400/30 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-2xl border-2 border-white z-20 shadow-xl">
                      CHAMPION
                    </div>
                  </div>
                  <div className="w-full h-52 bg-gradient-to-t from-yellow-400/30 via-yellow-100/20 to-white/10 backdrop-blur-md border-x border-t border-yellow-400/30 rounded-t-[2.5rem] flex flex-col items-center justify-end pb-8 transition-all duration-500 group-hover:h-56 group-hover:from-yellow-400/40">
                    <p className="text-sm font-black text-gray-900 text-center truncate w-full px-4 mb-1">
                      {topThree[1].name}
                    </p>
                    <div className="flex items-center gap-2 bg-yellow-400/20 px-3 py-1 rounded-xl border border-yellow-400/30">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-600" />
                      <span className="text-[11px] font-black text-yellow-700">
                        {topThree[1].score} PTS
                      </span>
                    </div>
                  </div>
                </div>
              ) : <div className="w-1/3" />}

              {/* 3rd Place */}
              {topThree[2] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[130px] relative group">
                  <div className="absolute -top-16 flex flex-col items-center transition-transform duration-500 group-hover:-translate-y-2">
                    <div className="relative">
                      <img
                        src={avatarUrl(topThree[2].name, topThree[2].photo_url)}
                        alt={topThree[2].name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-orange-300 bg-white shadow-xl object-cover z-10"
                      />
                      <div className="absolute inset-0 rounded-full ring-4 ring-orange-400/20 animate-ping opacity-20" />
                    </div>
                    <div className="absolute -bottom-3 bg-orange-200 text-orange-900 text-[10px] font-black px-3 py-1 rounded-xl border-2 border-white z-20 shadow-lg">
                      3RD
                    </div>
                  </div>
                  <div className="w-full h-28 bg-gradient-to-t from-orange-200/40 via-orange-100/20 to-white/10 backdrop-blur-sm border-x border-t border-orange-200/40 rounded-t-[2rem] flex flex-col items-center justify-end pb-6 transition-all duration-500 group-hover:h-32 group-hover:from-orange-200/60">
                    <p className="text-xs font-black text-gray-800 text-center truncate w-full px-3">
                      {topThree[2].name}
                    </p>
                    <p className="text-[10px] font-black text-orange-700 mt-1 bg-orange-200/50 px-2 py-0.5 rounded-lg">
                      {topThree[2].score} PTS
                    </p>
                  </div>
                </div>
              ) : <div className="w-1/3" />}
            </div>
          </div>
        )}

        {/* Current user highlight if outside top 10 */}
        {currentUserEntry && currentUserEntry.rank > 10 && (
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-[2rem] p-5 flex items-center justify-between text-white shadow-2xl shadow-blue-500/20 ring-4 ring-white/10 transform hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center font-black text-2xl border border-white/20 backdrop-blur-md shadow-inner">
                {currentUserEntry.rank}
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={avatarUrl(currentUserEntry.name, currentUserEntry.photo_url)}
                    alt="You"
                    className="w-12 h-12 rounded-full border-2 border-white bg-blue-500 shadow-lg"
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-blue-600 animate-pulse" />
                </div>
                <div>
                  <p className="font-black text-lg tracking-tight">Your Ranking</p>
                  <p className="text-[11px] text-blue-100 font-bold opacity-80">
                    Keep showing up to climb higher!
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right px-4">
              <p className="font-black text-3xl tabular-nums bg-gradient-to-b from-white to-blue-200 bg-clip-text text-transparent">
                {currentUserEntry.score}
              </p>
              <p className="text-[10px] uppercase font-black text-blue-200 tracking-widest">Global Score</p>
            </div>
          </div>
        )}

        {/* Rankings 4-20 */}
        {leaderData.length > 3 && (
          <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-500/5 overflow-hidden relative group">
            <div className="px-8 py-6 border-b border-gray-100/50 bg-gray-50/30 flex justify-between items-center relative z-10">
              <h3 className="font-black text-gray-900 tracking-tight text-lg">Full Rankings</h3>
              <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Positions 4–{leaderData.length}
                </span>
              </div>
            </div>
            <div className="table-fixed-height relative z-10 px-2 pb-2">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead className="sticky top-0 z-20 bg-gray-50/50 backdrop-blur-md">
                  <tr>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Rank</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Student</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Performance</th>
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0">
                  {rankItems.map((entry) => {
                    const isMe = entry.user_id === userId;
                    return (
                      <tr
                        key={entry.user_id}
                        className={`transition-all duration-300 group/row relative ${isMe ? 'z-10' : 'z-0'}`}
                      >
                        <td className="py-4 px-6 text-center">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-300 ${
                            isMe ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-400 group-hover/row:bg-blue-50 group-hover/row:text-blue-600'
                          }`}>
                            {entry.rank}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={avatarUrl(entry.name, entry.photo_url)}
                                className={`w-10 h-10 rounded-full border-2 transition-transform duration-300 group-hover/row:scale-110 ${
                                  isMe ? 'border-blue-500 shadow-md' : 'border-gray-100 group-hover/row:border-blue-200'
                                }`}
                                alt={entry.name}
                              />
                              {isMe && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                              )}
                            </div>
                            <div className="text-left">
                              <span className={`font-black text-[15px] tracking-tight block ${isMe ? 'text-blue-700' : 'text-gray-800'}`}>
                                {entry.name} {isMe && '⭐'}
                              </span>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{entry.roll_no || 'CS-S1'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1.5">
                            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden p-[2px]">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${
                                  entry.attendance_pct >= 90 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
                                  entry.attendance_pct >= 75 ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 
                                  'bg-gradient-to-r from-orange-400 to-orange-600'
                                }`}
                                style={{ width: `${entry.attendance_pct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-black tracking-widest ${
                              entry.attendance_pct >= 90 ? 'text-blue-600' : 
                              entry.attendance_pct >= 75 ? 'text-indigo-600' : 
                              'text-orange-600'
                            }`}>
                              {entry.attendance_pct}% ACCURACY
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-black text-lg tabular-nums tracking-tight ${isMe ? 'text-blue-700' : 'text-gray-900'}`}>
                              {entry.score}
                            </span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Points</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div ref={rankSentinel} className="h-4" />
            </div>

            <div className="absolute right-0 bottom-0 pointer-events-none opacity-[0.03] select-none">
              <Trophy className="w-80 h-80 translate-x-1/4 translate-y-1/4" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
