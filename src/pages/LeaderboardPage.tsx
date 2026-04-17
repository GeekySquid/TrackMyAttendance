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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-60" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center relative z-10 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-100">
                <Sparkles className="w-3.5 h-3.5" /> Monthly Ranking
              </div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">
                Leaderboard
              </h2>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                Real-time rankings based on attendance consistency and punctuality.
              </p>
            </div>

            {currentUserEntry ? (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 shadow-lg shadow-gray-200 border border-gray-700 w-full sm:w-auto text-white flex gap-6 items-center">
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Your Rank</p>
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black">
                      {currentUserEntry.rank}
                    </span>
                    <span className="text-sm text-gray-400 font-medium mb-1">
                      th
                    </span>
                  </div>
                </div>
                <div className="h-10 w-px bg-gray-700" />
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-blue-400">
                      {currentUserEntry.score}
                    </span>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {currentUserEntry.attendance_pct}% attendance
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Podium */}
        {topThreeRaw.length >= 2 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-10">
            <div className="flex justify-center items-end gap-2 sm:gap-6 h-64 mt-8">
              {/* 2nd Place */}
              {topThree[0] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[120px] relative">
                  <div className="absolute -top-14 flex flex-col items-center">
                    <img
                      src={avatarUrl(topThree[0].name, topThree[0].photo_url)}
                      alt={topThree[0].name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-gray-200 bg-gray-50 shadow-md object-cover z-10 relative"
                    />
                    <div className="absolute -bottom-3 bg-gray-200 text-gray-700 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white z-20">
                      2ND
                    </div>
                  </div>
                  <div className="w-full h-32 bg-gradient-to-t from-gray-100 to-gray-50 border border-gray-200 rounded-t-xl flex flex-col items-center justify-end pb-4 relative overflow-hidden hover:h-36 transition-all duration-300">
                    <p className="text-xs font-bold text-gray-800 text-center truncate w-full px-2">
                      {topThree[0].name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 mt-0.5">
                      {topThree[0].attendance_pct}%
                    </p>
                    <div className="absolute bottom-0 w-full h-1 bg-gray-300" />
                  </div>
                </div>
              ) : <div className="w-1/3" />}

              {/* 1st Place */}
              {topThree[1] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[140px] relative z-10 filter drop-shadow-xl">
                  <div className="absolute -top-20 flex flex-col items-center">
                    <Crown className="w-8 h-8 text-yellow-500 mb-1 drop-shadow-md animate-bounce" />
                    <img
                      src={avatarUrl(topThree[1].name, topThree[1].photo_url)}
                      alt={topThree[1].name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-yellow-400 bg-yellow-50 shadow-lg shadow-yellow-200 object-cover z-10 relative"
                    />
                    <div className="absolute -bottom-3 bg-yellow-400 text-yellow-900 text-[11px] font-black px-3 py-1 rounded-full border-2 border-white z-20 shadow-md">
                      1ST
                    </div>
                  </div>
                  <div className="w-full h-44 bg-gradient-to-t from-yellow-100 to-yellow-50 border border-yellow-200 rounded-t-xl flex flex-col items-center justify-end pb-4 relative overflow-hidden hover:h-48 transition-all duration-300">
                    <p className="text-sm font-black text-yellow-900 text-center truncate w-full px-2">
                      {topThree[1].name}
                    </p>
                    <p className="text-[11px] font-bold text-yellow-700 mt-1 bg-yellow-200/50 px-2 py-0.5 rounded">
                      {topThree[1].attendance_pct}%
                    </p>
                    <div className="absolute bottom-0 w-full h-1.5 bg-yellow-400" />
                  </div>
                </div>
              ) : <div className="w-1/3" />}

              {/* 3rd Place */}
              {topThree[2] ? (
                <div className="flex flex-col items-center w-1/3 max-w-[120px] relative">
                  <div className="absolute -top-14 flex flex-col items-center">
                    <img
                      src={avatarUrl(topThree[2].name, topThree[2].photo_url)}
                      alt={topThree[2].name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-4 border-orange-200 bg-orange-50 shadow-md object-cover z-10 relative"
                    />
                    <div className="absolute -bottom-3 bg-orange-200 text-orange-900 text-[10px] font-black px-2 py-0.5 rounded-full border-2 border-white z-20">
                      3RD
                    </div>
                  </div>
                  <div className="w-full h-24 bg-gradient-to-t from-orange-50 to-orange-50/30 border border-orange-100 rounded-t-xl flex flex-col items-center justify-end pb-4 relative overflow-hidden hover:h-28 transition-all duration-300">
                    <p className="text-xs font-bold text-gray-800 text-center truncate w-full px-2">
                      {topThree[2].name}
                    </p>
                    <p className="text-[10px] font-bold text-orange-600 mt-0.5">
                      {topThree[2].attendance_pct}%
                    </p>
                    <div className="absolute bottom-0 w-full h-1 bg-orange-300" />
                  </div>
                </div>
              ) : <div className="w-1/3" />}
            </div>
          </div>
        )}

        {/* Current user highlight if outside top 10 */}
        {currentUserEntry && currentUserEntry.rank > 10 && (
          <div className="bg-blue-600 rounded-xl p-4 sm:p-5 flex items-center justify-between text-white shadow-md shadow-blue-200 ring-2 ring-blue-600 ring-offset-2 ring-offset-gray-50 transform hover:scale-[1.01] transition-transform">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-black text-lg border border-white/30 backdrop-blur-sm">
                {currentUserEntry.rank}
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={avatarUrl(currentUserEntry.name, currentUserEntry.photo_url)}
                  alt="You"
                  className="w-10 h-10 rounded-full border-2 border-white/50 bg-blue-500"
                />
                <div>
                  <p className="font-bold text-sm tracking-wide">You</p>
                  <p className="text-[11px] text-blue-100 bg-blue-700/50 px-2 py-0.5 rounded-full w-fit">
                    {currentUserEntry.attendance_pct}% attendance
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-black text-lg">{currentUserEntry.score}</p>
              <p className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Score</p>
            </div>
          </div>
        )}

        {/* Rankings 4-20 */}
        {leaderData.length > 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center relative z-10">
              <h3 className="font-bold text-gray-800">Full Rankings</h3>
              <span className="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                Positions 4–{leaderData.length}
              </span>
            </div>
            <div className="overflow-x-auto relative z-10">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <tbody className="divide-y divide-gray-50">
                  {leaderData.slice(3).map((entry) => {
                    const isMe = entry.user_id === userId;
                    return (
                      <tr
                        key={entry.user_id}
                        className={`hover:bg-gray-50/50 transition-colors group ${isMe ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="py-4 px-6 w-20 text-center">
                          <span className="text-gray-400 font-bold text-sm group-hover:text-blue-600 transition-colors">
                            {entry.rank}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarUrl(entry.name, entry.photo_url)}
                              className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50"
                              alt={entry.name}
                            />
                            <div>
                              <span className={`font-bold text-sm ${isMe ? 'text-blue-700' : 'text-gray-800'} group-hover:text-blue-700 transition-colors`}>
                                {entry.name} {isMe && '(You)'}
                              </span>
                              {entry.roll_no && (
                                <p className="text-[10px] text-gray-400">{entry.roll_no}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${entry.attendance_pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-gray-500 min-w-8">
                              {entry.attendance_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <span className="font-black text-gray-800 tabular-nums">
                            {entry.score}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="absolute right-0 bottom-0 pointer-events-none opacity-5">
              <Trophy className="w-64 h-64 translate-x-1/3 translate-y-1/3" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
