import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Target, Award, Star, Zap, TrendingUp, Calendar } from 'lucide-react';
import { listenToCollection } from '../services/dbService';

interface StudentStatsGridProps {
  user: any;
}

const StudentStatsGrid = ({ user }: StudentStatsGridProps) => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe to attendance for calculation
    const unsubAttendance = listenToCollection('attendance', (logs) => {
      // Subscribe to users for rank calculation
      const unsubUsers = listenToCollection('users', (allUsers) => {
        const myLogs = logs.filter(l => l.userId === user.id);
        const myUid = user.id;

        // 1. STREAK CALCULATION (Actual)
        const presentDates = new Set(
          myLogs
            .filter(l => l.status === 'Present' || l.status === 'Late')
            .map(l => l.date)
        );
        
        let streak = 0;
        const today = new Date();
        const checkDate = new Date();
        
        // Check today or yesterday as start
        const todayStr = today.toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let currentStr = presentDates.has(todayStr) ? todayStr : (presentDates.has(yesterdayStr) ? yesterdayStr : null);
        
        if (currentStr) {
          const d = new Date(currentStr);
          while (presentDates.has(d.toISOString().split('T')[0])) {
            streak++;
            d.setDate(d.getDate() - 1);
          }
        }

        const streakTag = streak >= 10 ? 'LEGENDARY' : streak >= 5 ? 'IRON WILL' : streak >= 3 ? 'ON FIRE' : 'STARTING UP';

        // 2. ATTENDANCE RATE (Actual)
        // For simplicity, we calculate rate based on total days since first record or 30 days
        const totalPresent = myLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
        const attendanceTag = totalPresent >= 20 ? 'MASTER' : totalPresent >= 10 ? 'EXCELLENT' : totalPresent >= 5 ? 'REGULAR' : 'VERIFIED';

        // 3. POINTS CALCULATION (Precision Math)
        // Present: 10, Late: 5, Bonus for streak
        const points = myLogs.reduce((acc, log) => {
          let p = log.status === 'Present' ? 10 : (log.status === 'Late' ? 5 : 0);
          return acc + p;
        }, 0) + (streak * 2);

        const pointsTag = points >= 200 ? 'ELITE CLASS' : points >= 100 ? 'PRO LEVEL' : points >= 50 ? 'RISING' : 'NOVICE';

        // 4. RANK CALCULATION (Relative to others)
        const studentScores = allUsers
          .filter(u => u.role === 'student')
          .map(u => {
            const uLogs = logs.filter(l => l.userId === (u.uid || u.id));
            const uPoints = uLogs.reduce((acc, log) => acc + (log.status === 'Present' ? 10 : (log.status === 'Late' ? 5 : 0)), 0);
            return { id: u.uid || u.id, points: uPoints };
          })
          .sort((a, b) => b.points - a.points);

        const myRankIndex = studentScores.findIndex(s => s.id === myUid);
        const myRank = myRankIndex === -1 ? studentScores.length + 1 : myRankIndex + 1;
        
        let rankStr = '—';
        if (myRank === 1) rankStr = '1st';
        else if (myRank === 2) rankStr = '2nd';
        else if (myRank === 3) rankStr = '3rd';
        else rankStr = `${myRank}th`;

        const rankTag = myRank <= 3 ? 'PODIUM' : myRank <= 10 ? 'TOP TIER' : 'ACTIVE';

        setStats([
          { 
            label: 'Streak', 
            value: `${streak}d`, 
            icon: Flame, 
            color: 'text-orange-600', 
            bg: 'bg-orange-50', 
            border: 'border-orange-100',
            iconBg: 'bg-orange-100/50',
            insight: streakTag 
          },
          { 
            label: 'Sessions', 
            value: `${totalPresent}s`, 
            icon: Calendar, 
            color: 'text-blue-600', 
            bg: 'bg-blue-50', 
            border: 'border-blue-100',
            iconBg: 'bg-blue-100/50',
            insight: attendanceTag 
          },
          { 
            label: 'Points', 
            value: points.toString(), 
            icon: Zap, 
            color: 'text-yellow-600', 
            bg: 'bg-yellow-50', 
            border: 'border-yellow-100',
            iconBg: 'bg-yellow-100/50',
            insight: pointsTag 
          },
          { 
            label: 'Rank', 
            value: rankStr, 
            icon: Trophy, 
            color: 'text-purple-600', 
            bg: 'bg-purple-50', 
            border: 'border-purple-100',
            iconBg: 'bg-purple-100/50',
            insight: rankTag 
          }
        ]);
        setLoading(false);
      });
      return () => unsubUsers();
    });

    return () => unsubAttendance();
  }, [user?.id]);

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
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(30px) saturate(200%);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04);
        }
        .text-black-ink { color: #000000 !important; font-weight: 900; }
        .stat-label-mini { 
          font-size: 9px; 
          font-weight: 900; 
          text-transform: uppercase; 
          letter-spacing: 0.25em; 
          color: #000000; 
          opacity: 0.35; 
        }
        .stat-value-sharp {
          font-size: 28px;
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 900;
          color: #000000;
        }
        .insight-pill-mini {
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          padding: 8px 16px;
          border-radius: 14px;
          border: 1px solid rgba(0, 0, 0, 0.03);
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
        }
      `}</style>

      <div id="stats-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        {stats.map((stat, i) => (
          <div key={i} className={`relative overflow-hidden rounded-[32px] stats-glass-card p-5 lg:p-6 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-xl h-[120px] lg:h-[220px] group`}>
            
            <div className="flex flex-col gap-1 lg:gap-3">
              <div className={`w-10 h-10 lg:w-11 lg:h-11 rounded-2xl ${stat.iconBg} flex items-center justify-center ${stat.color} mb-1 lg:mb-2 shadow-sm border border-white`}>
                <stat.icon className="w-5 h-5 lg:w-5.5 lg:h-5.5" />
              </div>
              
              <div>
                <p className="stat-label-mini mb-1">{stat.label}</p>
                <p className="stat-value-sharp">{stat.value}</p>
              </div>
            </div>

            <div className="flex items-center justify-center text-center mt-auto">
              <div className={`insight-pill-mini ${stat.color}`}>
                {stat.insight}
              </div>
            </div>

            {/* Decorative background accent */}
            <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-opacity ${stat.bg}`} />
          </div>
        ))}
      </div>
    </>
  );
};

export default StudentStatsGrid;
