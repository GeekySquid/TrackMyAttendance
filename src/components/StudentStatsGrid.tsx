import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle, Trophy, Crown, Loader2 } from 'lucide-react';
import { listenToCollection } from '../services/dbService';

interface StudentStatsGridProps {
  user: any;
}

const StudentStatsGrid = ({ user }: StudentStatsGridProps) => {
  const [streak, setStreak] = useState(0);
  const [sessionsToday, setSessionsToday] = useState(0);
  const [points, setPoints] = useState(0);
  const [rank, setRank] = useState('1st');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const unsubAttendance = listenToCollection('attendance', (logs) => {
      const today = new Date().toISOString().split('T')[0];
      const myLogs = logs.filter((l: any) => l.userId === user.id);
      setSessionsToday(myLogs.filter((l: any) => l.date === today).length);
      setStreak(user.streak || 1);
      setLoading(false);
    }, user.id);

    const unsubLeaderboard = listenToCollection('leaderboard', (data) => {
      const myEntry = data.find((e: any) => e.userId === user.id);
      if (myEntry) {
        setPoints(myEntry.points || 0);
        const sorted = [...data].sort((a, b) => (b.points || 0) - (a.points || 0));
        const index = sorted.findIndex(e => e.userId === user.id);
        setRank(index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`);
      }
    });

    return () => {
      unsubAttendance();
      unsubLeaderboard();
    };
  }, [user?.id, user?.streak]);

  const stats = [
    { label: 'Streak', value: `${streak}d`, icon: Flame, color: 'text-orange-700', iconBg: 'bg-orange-100', border: 'border-orange-200/60', insight: 'Consistency King' },
    { label: 'Attendance', value: `${sessionsToday}s`, icon: CheckCircle, color: 'text-blue-700', iconBg: 'bg-blue-100', border: 'border-blue-200/60', insight: 'Verified' },
    { label: 'Points', value: points.toString(), icon: Crown, color: 'text-yellow-700', iconBg: 'bg-yellow-100', border: 'border-yellow-200/60', insight: 'Pro Level' },
    { label: 'Rank', value: rank, icon: Trophy, color: 'text-purple-700', iconBg: 'bg-purple-100', border: 'border-purple-200/60', insight: 'Top Performer' },
  ];

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 lg:h-[220px]">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white/60 backdrop-blur-md animate-pulse rounded-[32px] border border-gray-100 h-[95px] lg:h-full" />
      ))}
    </div>
  );

  return (
    <>
      <style>{`
        .stats-glass-card {
          background: rgba(255, 255, 255, 0.55);
          backdrop-filter: blur(25px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.85);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
        }
        .text-black-ink { color: #000000 !important; font-weight: 900; }
      `}</style>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`relative overflow-hidden rounded-[32px] stats-glass-card ${stat.border} p-4 lg:p-6 flex flex-col justify-center lg:justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-xl h-[100px] lg:h-[220px] group`}>

            <div className="flex items-center gap-4 lg:block">
              <div className={`w-10 h-10 lg:w-13 lg:h-13 rounded-2xl ${stat.iconBg} flex items-center justify-center ${stat.color} mb-0 lg:mb-4 shadow-sm border border-white/60`}>
                <stat.icon className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div>
                <p className={`text-[9px] lg:text-[11px] font-black uppercase tracking-[0.25em] text-black-ink opacity-40 mb-0.5 lg:mb-1`}>{stat.label}</p>
                <p className="text-base lg:text-4xl text-black-ink tracking-tighter leading-none">{stat.value}</p>
              </div>
            </div>

            <div className={`hidden lg:flex py-2.5 px-4 rounded-2xl bg-white/70 border ${stat.border} items-center justify-center text-center shadow-sm`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${stat.color}`}>
                {stat.insight}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default StudentStatsGrid;
