import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Zap, Calendar } from 'lucide-react';
import { listenToCollection } from '../services/dbService';
import { motion, AnimatePresence } from 'framer-motion';

interface StudentStatsGridProps {
  user: any;
}

const StudentStatsGrid = ({ user }: StudentStatsGridProps) => {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const unsubAttendance = listenToCollection('attendance', (logs) => {
      const unsubUsers = listenToCollection('users', (allUsers) => {
        const myLogs = logs.filter(l => l.userId === user.id);
        const myUid = user.id;

        // 1. STREAK
        const presentDates = new Set(myLogs.filter(l => l.status === 'Present' || l.status === 'Late').map(l => l.date));
        let streak = 0;
        const todayStr = new Date().toISOString().split('T')[0];
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

        // 2. SESSIONS
        const totalPresent = myLogs.filter(l => l.status === 'Present' || l.status === 'Late').length;
        const attendanceTag = totalPresent >= 20 ? 'MASTER' : totalPresent >= 10 ? 'EXCELLENT' : totalPresent >= 5 ? 'REGULAR' : 'VERIFIED';

        // 3. POINTS
        const points = myLogs.reduce((acc, log) => acc + (log.status === 'Present' ? 10 : (log.status === 'Late' ? 5 : 0)), 0) + (streak * 2);
        const pointsTag = points >= 200 ? 'ELITE CLASS' : points >= 100 ? 'PRO LEVEL' : points >= 50 ? 'RISING' : 'NOVICE';

        // 4. RANK
        const studentScores = allUsers.filter(u => u.role === 'student').map(u => {
          const uLogs = logs.filter(l => l.userId === (u.uid || u.id));
          return { id: u.uid || u.id, points: uLogs.reduce((acc, log) => acc + (log.status === 'Present' ? 10 : (log.status === 'Late' ? 5 : 0)), 0) };
        }).sort((a, b) => b.points - a.points);
        const myRankIndex = studentScores.findIndex(s => s.id === myUid);
        const myRank = myRankIndex === -1 ? studentScores.length + 1 : myRankIndex + 1;
        let rankStr = myRank === 1 ? '1st' : myRank === 2 ? '2nd' : myRank === 3 ? '3rd' : `${myRank}th`;
        const rankTag = myRank <= 3 ? 'PODIUM' : myRank <= 10 ? 'TOP TIER' : 'ACTIVE';

        setStats([
          { label: 'STREAK', value: `${streak}d`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-400', iconBg: 'bg-orange-100/50', insight: streakTag },
          { label: 'SESSIONS', value: `${totalPresent}s`, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-400', iconBg: 'bg-blue-100/50', insight: attendanceTag },
          { label: 'POINTS', value: points.toString(), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-400', iconBg: 'bg-yellow-100/50', insight: pointsTag },
          { label: 'RANK', value: rankStr, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-400', iconBg: 'bg-purple-100/50', insight: rankTag }
        ]);
        setLoading(false);
      });
      return () => unsubUsers();
    });
    return () => unsubAttendance();
  }, [user?.id]);

  if (loading) return (
    <div className="grid grid-cols-2 gap-3 lg:gap-4 h-full">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-white/60 backdrop-blur-md animate-pulse rounded-[32px] border border-gray-100 h-[114px] lg:h-[122px]" />
      ))}
    </div>
  );

  return (
    <>
      <style>{`
        /* MOBILE-ONLY REDESIGN (Vibrant Mesh Glass) */
        @media (max-width: 1024px) {
          .stat-card-responsive {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 20px;
            padding: 0.75rem;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 84px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          }
          .icon-box-responsive {
            width: 36px;
            height: 36px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 2;
          }
          .icon-box-glow {
            position: absolute;
            inset: -4px;
            border-radius: 16px;
            filter: blur(12px);
            opacity: 0.3;
            background: currentColor;
          }
          .label-responsive {
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.2em;
            color: #000000;
            opacity: 0.4;
            text-transform: uppercase;
          }
          .value-responsive {
            font-size: 32px;
            font-weight: 900;
            color: #000000;
            line-height: 1;
            letter-spacing: -0.02em;
          }
          .tag-responsive {
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 7px;
            font-weight: 900;
            padding: 2px 8px;
            border-radius: 100px;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(4px);
            border: 1px solid rgba(255, 255, 255, 0.3);
          }
          .mesh-bg {
            position: absolute;
            top: -20%;
            right: -20%;
            width: 80%;
            height: 80%;
            border-radius: 50%;
            filter: blur(40px);
            opacity: 0.15;
            z-index: 0;
          }
          .desktop-layout { display: none; }
          .mobile-layout { 
            display: flex; 
            flex-direction: row; 
            align-items: center; 
            justify-content: space-between; 
            width: 100%;
            margin-top: auto;
            position: relative; 
            z-index: 2;
            height: 32px;
          }
        }

        /* UNIFIED PREMIUM WHITE GLASS STATS */
        .stat-card-responsive {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 24px;
          padding: 0.75rem;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 1rem;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
          height: 84px;
          position: relative;
          overflow: hidden;
        }

        .icon-box-responsive {
          width: 52px;
          height: 52px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .label-responsive {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #000000;
          opacity: 0.35;
          text-transform: uppercase;
        }

        .value-responsive {
          font-size: 32px;
          font-weight: 900;
          color: #000000;
          line-height: 1;
        }

        .tag-responsive {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .tag-badge-mobile {
          position: absolute;
          bottom: -2px;
          right: -6px;
          font-size: 6px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 1px 4px;
          border-radius: 4px;
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          z-index: 20;
          white-space: nowrap;
        }

        .mesh-bg-desktop {
          position: absolute;
          inset: 0;
          opacity: 0;
          z-index: 0;
          transition: opacity 0.5s ease;
          background: radial-gradient(circle at 100% 0%, currentColor, transparent 80%);
        }

        @media (min-width: 1025px) {
          .stat-card-responsive {
            padding: 1.5rem;
            height: 140px;
            gap: 1.5rem;
            border-radius: 32px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.02);
          }
          .stat-card-responsive:hover {
            transform: translateY(-8px) scale(1.02);
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.06);
          }
          .stat-card-responsive:hover .mesh-bg-desktop { opacity: 0.1; }
          .icon-box-responsive { width: 64px; height: 64px; border-radius: 20px; }
          .label-responsive { font-size: 11px; opacity: 0.4; }
          .value-responsive { font-size: 42px; letter-spacing: -0.04em; }
          .tag-responsive { font-size: 9px; padding: 4px 12px; border-radius: 8px; }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-2 gap-2 lg:gap-4 h-full"
      >
        <AnimatePresence>
          {stats.map((stat, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="stat-card-responsive group"
            >
              <div className={`icon-box-responsive ${stat.iconBg} ${stat.color}`}>
                <div className={`icon-box-glow ${stat.bg}`} />
                <stat.icon className="w-5 h-5 relative z-10" strokeWidth={3} />
                
                {/* Mobile-Only Tag Badge */}
                <div className={`tag-badge-mobile lg:hidden ${stat.color}`}>
                  {stat.insight}
                </div>
              </div>

              {/* Unified Responsive Content */}
              <div className="flex-1 flex flex-col justify-center min-w-0 relative z-10 h-full">
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="label-responsive">{stat.label}</span>
                  {/* Desktop-Only Tag */}
                  <div className={`tag-responsive hidden lg:block ${stat.color}`}>
                    {stat.insight}
                  </div>
                </div>
                <span className="value-responsive truncate">{stat.value}</span>
              </div>

              <div className={`mesh-bg-desktop ${stat.bg}`} />
              
              {/* Premium Glow Effect (Desktop Only) */}
              <div className={`hidden lg:block absolute -right-4 -bottom-4 w-24 h-24 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${stat.bg}`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default StudentStatsGrid;
