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

    let isMounted = true;

    const fetchStats = async () => {
      try {
        // Fetch authoritative server-side stats from the leaderboard view
        // Import this dynamically to avoid circular dependencies if any
        const { getStudentLeaderboardStats } = await import('../services/dbService');
        const data = await getStudentLeaderboardStats(user.id);

        if (!isMounted || !data) return;

        // Map server data to UI stats
        const streak = data.current_streak || 0;
        const totalSessions = data.present_count || 0;
        const totalPoints = data.score || 0;
        const myRank = data.rank || 0;

        const streakTag = streak >= 10 ? 'LEGENDARY' : streak >= 5 ? 'IRON WILL' : streak >= 3 ? 'ON FIRE' : 'STARTING UP';
        const attendanceTag = totalSessions >= 20 ? 'MASTER' : totalSessions >= 10 ? 'EXCELLENT' : totalSessions >= 5 ? 'REGULAR' : 'VERIFIED';
        const pointsTag = totalPoints >= 200 ? 'ELITE CLASS' : totalPoints >= 100 ? 'PRO LEVEL' : totalPoints >= 50 ? 'RISING' : 'NOVICE';
        
        let rankStr = myRank === 1 ? '1st' : myRank === 2 ? '2nd' : myRank === 3 ? '3rd' : `${myRank}th`;
        if (myRank === 0) rankStr = 'N/A';
        const rankTag = myRank > 0 && myRank <= 3 ? 'PODIUM' : myRank <= 10 ? 'TOP TIER' : 'ACTIVE';

        setStats([
          { label: 'STREAK', value: `${streak}d`, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-400', iconBg: 'bg-orange-100/50', insight: streakTag },
          { label: 'SESSIONS', value: `${totalSessions}s`, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-400', iconBg: 'bg-blue-100/50', insight: attendanceTag },
          { label: 'POINTS', value: totalPoints.toString(), icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-400', iconBg: 'bg-yellow-100/50', insight: pointsTag },
          { label: 'RANK', value: rankStr, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-400', iconBg: 'bg-purple-100/50', insight: rankTag }
        ]);
        setLoading(false);
      } catch (err) {
        console.error('[StudentStatsGrid] Failed to fetch stats:', err);
      }
    };

    // Initial fetch
    fetchStats();

    // Listen for attendance changes to refresh authoritative stats
    // This ensures that when a student checks in, their dashboard updates immediately
    // but the actual calculation remains server-side for accuracy.
    const unsubAttendance = listenToCollection('attendance', () => {
      fetchStats();
    }, user.id); // Filtered to current user for performance

    return () => {
      isMounted = false;
      unsubAttendance();
    };
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
        /* PREMIUM STATS DESIGN SYSTEM */
        .stat-card-responsive {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 28px;
          padding: 1rem;
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 1.25rem;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 4px 24px -4px rgba(0, 0, 0, 0.04);
          height: 96px;
          position: relative;
          overflow: visible; /* Allow tags to overflow if needed */
        }

        .icon-container {
          position: relative;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .icon-box-responsive {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .icon-box-glow {
          position: absolute;
          inset: -4px;
          border-radius: 22px;
          filter: blur(14px);
          opacity: 0.2;
          background: currentColor;
          transition: opacity 0.3s ease;
        }

        .tag-badge-premium {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 7px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 3px 10px;
          border-radius: 100px;
          background: #ffffff;
          border: 1.5px solid currentColor;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 10;
          white-space: nowrap;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .label-responsive {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.2em;
          color: #000000;
          opacity: 0.4;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .value-responsive {
          font-size: 38px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .mesh-bg-desktop {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0;
          z-index: 0;
          transition: all 0.6s ease;
          background: radial-gradient(circle at 100% 0%, currentColor, transparent 70%);
        }

        @media (min-width: 1025px) {
          .stat-card-responsive {
            padding: 2rem;
            height: 140px;
            gap: 2rem;
            border-radius: 40px;
            box-shadow: 0 10px 40px -15px rgba(0, 0, 0, 0.05);
          }
          .stat-card-responsive:hover {
            transform: translateY(-8px);
            background: #ffffff;
            box-shadow: 0 40px 80px -20px rgba(0, 0, 0, 0.12);
            border-color: rgba(255, 255, 255, 1);
          }
          .stat-card-responsive:hover .icon-box-responsive {
            transform: scale(1.1) rotate(-5deg);
          }
          .stat-card-responsive:hover .icon-box-glow {
            opacity: 0.5;
            filter: blur(18px);
          }
          .stat-card-responsive:hover .tag-badge-premium {
            transform: translateX(-50%) translateY(-4px) scale(1.1);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }
          .stat-card-responsive:hover .mesh-bg-desktop { opacity: 0.15; }
          
          .icon-box-responsive { width: 76px; height: 76px; border-radius: 26px; }
          .tag-badge-premium { font-size: 10px; padding: 4px 14px; bottom: -12px; }
          .label-responsive { font-size: 12px; opacity: 0.5; }
          .value-responsive { font-size: 52px; }
        }

        /* Adjust grid to manage whitespace better */
        .stats-grid-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          height: 100%;
        }

        @media (min-width: 1025px) {
          .stats-grid-container {
            gap: 1.5rem;
          }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="stats-grid-container"
      >
        <AnimatePresence mode="popLayout">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.08,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="stat-card-responsive group"
            >
              {/* Icon Section with "Upon Logo Down Part" Tag */}
              <div className="icon-container">
                <div className={`icon-box-responsive ${stat.iconBg} ${stat.color}`}>
                  <div className={`icon-box-glow ${stat.bg}`} />
                  <stat.icon className="w-6 h-6 lg:w-8 lg:h-8 relative z-10" strokeWidth={2.5} />
                </div>

                {/* Premium Tag Badge - Positioned at "Logo Down Part" */}
                <div className={`tag-badge-premium ${stat.color}`}>
                  {stat.insight}
                </div>
              </div>

              {/* Text Content */}
              <div className="flex-1 flex flex-col justify-center min-w-0 relative z-10 h-full">
                <span className="label-responsive">{stat.label}</span>
                <span className="value-responsive truncate">{stat.value}</span>
              </div>

              {/* Decorative Elements */}
              <div className={`mesh-bg-desktop ${stat.bg}`} />
              <div className={`hidden lg:block absolute -right-6 -bottom-6 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 ${stat.bg}`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default StudentStatsGrid;
