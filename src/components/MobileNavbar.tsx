import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, MapPin, ClipboardList, Settings, User, Bell, LayoutDashboard, FileText, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavbarProps {
  role: 'admin' | 'student';
  userId?: string;
}

export default function MobileNavbar({ role, userId }: MobileNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const adminTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/admin' },
    { id: 'students', label: 'Students', icon: User, path: '/admin/students' },
    { id: 'geofencing', label: 'Map', icon: MapPin, path: '/admin/geofencing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
  ];

  const studentTabs = [
    { id: 'dashboard', label: 'Home', icon: Home, path: '/' },
    { id: 'attendance', label: 'Logs', icon: ClipboardList, path: '/track-my-attendance' },
    { id: 'leave-requests', label: 'Leave', icon: FileText, path: '/leave-requests' },
    { id: 'leaderboard', label: 'Rank', icon: Trophy, path: '/leaderboard' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const tabs = role === 'admin' ? adminTabs : studentTabs;

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeTab = tabs.find(tab => tab.path === currentPath);
    return activeTab ? activeTab.id : tabs[0].id;
  };

  const activeTab = getActiveTab();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md block lg:hidden">
      <div className="bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-2 flex items-center justify-around relative overflow-hidden">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center w-14 h-14 transition-all duration-500 group"
            >
              {/* Vibrant Background Blob (inspired by image) */}
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="activeBlob"
                    initial={{ scale: 0, opacity: 0, rotate: -45 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0, rotate: 45 }}
                    className={`absolute inset-1 rounded-[1.5rem] z-0 blur-sm ${
                      tab.id === 'dashboard' ? 'bg-gradient-to-br from-rose-400/20 to-rose-600/20' :
                      tab.id === 'students' || tab.id === 'attendance' ? 'bg-gradient-to-br from-blue-400/20 to-blue-600/20' :
                      tab.id === 'leave-requests' ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20' :
                      tab.id === 'leaderboard' ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20' :
                      tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20' :
                      'bg-gradient-to-br from-orange-400/20 to-orange-600/20'
                    }`}
                  />
                )}
              </AnimatePresence>

              {/* Glass Icon Container */}
              <div className="relative z-10 flex items-center justify-center w-10 h-10">
                {/* Background colored shape (the vibrant part in the image) */}
                <div className={`absolute w-7 h-7 rounded-full transition-all duration-700 ${
                   isActive ? 'scale-100 opacity-100 blur-[2px]' : 'scale-0 opacity-0'
                } ${
                  tab.id === 'dashboard' ? 'bg-rose-500/80 shadow-[0_4px_12px_rgba(244,63,94,0.4)]' :
                  tab.id === 'students' || tab.id === 'attendance' ? 'bg-blue-500/80 shadow-[0_4px_12px_rgba(59,130,246,0.4)]' :
                  tab.id === 'leave-requests' ? 'bg-amber-500/80 shadow-[0_4px_12px_rgba(245,158,11,0.4)]' :
                  tab.id === 'leaderboard' ? 'bg-yellow-500/80 shadow-[0_4px_12px_rgba(234,179,8,0.4)]' :
                  tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-emerald-500/80 shadow-[0_4px_12px_rgba(16,185,129,0.4)]' :
                  'bg-orange-500/80 shadow-[0_4px_12px_rgba(249,115,22,0.4)]'
                }`} />

                {/* Frosted Glass Overlay - The "Frosted" part from the image */}
                <div className={`absolute inset-0 bg-white/40 backdrop-blur-md rounded-xl border border-white/40 transition-all duration-500 shadow-sm ${
                  isActive ? 'opacity-100 translate-x-1 -translate-y-1' : 'opacity-0 scale-90'
                }`} />

                <Icon className={`w-5 h-5 transition-all duration-500 relative z-20 ${
                  isActive 
                    ? 'text-gray-900 drop-shadow-sm scale-110' 
                    : 'text-gray-400 group-hover:text-gray-600'
                }`} />
              </div>

              {/* Active Indicator Line */}
              {isActive && (
                <motion.div 
                  layoutId="activeLine"
                  className={`absolute bottom-0 w-4 h-1 rounded-full ${
                    tab.id === 'dashboard' ? 'bg-rose-500' :
                    tab.id === 'students' || tab.id === 'attendance' ? 'bg-blue-500' :
                    tab.id === 'leave-requests' ? 'bg-amber-500' :
                    tab.id === 'leaderboard' ? 'bg-yellow-500' :
                    tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-emerald-500' :
                    'bg-orange-500'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
