import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  MapPin,
  ClipboardList,
  Settings,
  User,
  Bell,
  LayoutDashboard,
  FileText,
  Trophy,
  MoreHorizontal,
  BarChart2,
  Folder,
  X,
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavbarProps {
  role: 'admin' | 'student';
  userId?: string;
}

export default function MobileNavbar({ role, userId }: MobileNavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const adminTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard, path: '/admin' },
    { id: 'students', label: 'Students', icon: User, path: '/admin/students' },
    { id: 'geofencing', label: 'Map', icon: MapPin, path: '/admin/geofencing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
    { id: 'more', label: 'More', icon: MoreHorizontal, path: '#more' },
  ];

  const studentTabs = [
    { id: 'dashboard', label: 'Home', icon: Home, path: '/' },
    { id: 'attendance', label: 'Logs', icon: ClipboardList, path: '/track-my-attendance' },
    { id: 'leave-requests', label: 'Leave', icon: FileText, path: '/leave-requests' },
    { id: 'leaderboard', label: 'Rank', icon: Trophy, path: '/leaderboard' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const moreMenuItems = [
    { id: 'attendance', label: 'Attendance', icon: ClipboardList, path: '/admin/attendance' },
    { id: 'leave-requests', label: 'Leave Requests', icon: FileText, path: '/admin/leave-requests' },
    { id: 'reports', label: 'Reports', icon: BarChart2, path: '/admin/reports' },
    { id: 'documents', label: 'Documents', icon: Folder, path: '/admin/documents' },
    { id: 'access', label: 'Access Control', icon: ShieldCheck, path: '/admin/access-control' },
    { id: 'subscribers', label: 'Waitlist', icon: ClipboardList, path: '/admin/subscribers' },
    { id: 'support', label: 'Support', icon: Headphones, path: '/admin/support' },
  ];

  const tabs = role === 'admin' ? adminTabs : studentTabs;

  const getActiveTab = () => {
    const currentPath = location.pathname;
    const activeTab = tabs.find(tab => tab.path === currentPath);
    if (isMoreOpen) return 'more';
    return activeTab ? activeTab.id : tabs[0].id;
  };

  const activeTab = getActiveTab();

  return (
    <>
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Transparent Backdrop (Interaction blocker without visual blur) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 bg-transparent z-[110]"
            />

            {/* Ultra-Compact Menu Container */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed bottom-20 right-6 z-[120] w-48"
            >
              <div className="bg-white/40 backdrop-blur-md border border-white/30 shadow-lg rounded-2xl overflow-hidden p-1">
                <div className="flex flex-col gap-0.5">
                  {moreMenuItems.map((item, idx) => (
                    <motion.button
                      key={item.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => {
                        navigate(item.path);
                        setIsMoreOpen(false);
                      }}
                      className="flex items-center gap-3 p-2 hover:bg-white/60 transition-colors group active:bg-white/80 rounded-xl"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center text-indigo-600 shadow-sm">
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 tracking-tight">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div id="mobile-navbar" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md block lg:hidden">
        <div className="bg-white/80 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-2 flex items-center justify-around relative overflow-hidden">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'more') {
                    setIsMoreOpen(!isMoreOpen);
                  } else {
                    setIsMoreOpen(false);
                    navigate(tab.path);
                  }
                }}
                className="relative flex flex-col items-center justify-center w-14 h-14 transition-all duration-500 group"
              >
                {/* Vibrant Background Blob */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="activeBlob"
                      initial={{ scale: 0, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0, opacity: 0, rotate: 45 }}
                      className={`absolute inset-1 rounded-[1.5rem] z-0 blur-sm ${tab.id === 'dashboard' ? 'bg-gradient-to-br from-rose-400/20 to-rose-600/20' :
                        tab.id === 'students' || tab.id === 'attendance' ? 'bg-gradient-to-br from-blue-400/20 to-blue-600/20' :
                          tab.id === 'leave-requests' ? 'bg-gradient-to-br from-amber-400/20 to-amber-600/20' :
                            tab.id === 'leaderboard' ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20' :
                              tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-gradient-to-br from-emerald-400/20 to-emerald-600/20' :
                                tab.id === 'more' ? 'bg-gradient-to-br from-indigo-400/20 to-indigo-600/20' :
                                  'bg-gradient-to-br from-orange-400/20 to-orange-600/20'
                        }`}
                    />
                  )}
                </AnimatePresence>

                {/* Glass Icon Container */}
                <div className="relative z-10 flex items-center justify-center w-10 h-10">
                  <div className={`absolute w-7 h-7 rounded-full transition-all duration-700 ${isActive ? 'scale-100 opacity-100 blur-[2px]' : 'scale-0 opacity-0'
                    } ${tab.id === 'dashboard' ? 'bg-rose-500/80 shadow-[0_4px_12px_rgba(244,63,94,0.4)]' :
                      tab.id === 'students' || tab.id === 'attendance' ? 'bg-blue-500/80 shadow-[0_4px_12px_rgba(59,130,246,0.4)]' :
                        tab.id === 'leave-requests' ? 'bg-amber-500/80 shadow-[0_4px_12px_rgba(245,158,11,0.4)]' :
                          tab.id === 'leaderboard' ? 'bg-yellow-500/80 shadow-[0_4px_12px_rgba(234,179,8,0.4)]' :
                            tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-emerald-500/80 shadow-[0_4px_12px_rgba(16,185,129,0.4)]' :
                              tab.id === 'more' ? 'bg-indigo-500/80 shadow-[0_4px_12px_rgba(99,102,241,0.4)]' :
                                'bg-orange-500/80 shadow-[0_4px_12px_rgba(249,115,22,0.4)]'
                    }`} />

                  <div className={`absolute inset-0 bg-white/40 backdrop-blur-md rounded-xl border border-white/40 transition-all duration-500 shadow-sm ${isActive ? 'opacity-100 translate-x-1 -translate-y-1' : 'opacity-0 scale-90'
                    }`} />

                  <Icon className={`w-5 h-5 transition-all duration-500 relative z-20 ${isActive
                    ? 'text-gray-900 drop-shadow-sm scale-110'
                    : 'text-gray-400 group-hover:text-gray-600'
                    }`} />
                </div>

                {isActive && (
                  <motion.div
                    layoutId="activeLine"
                    className={`absolute bottom-0 w-4 h-1 rounded-full ${tab.id === 'dashboard' ? 'bg-rose-500' :
                      tab.id === 'students' || tab.id === 'attendance' ? 'bg-blue-500' :
                        tab.id === 'leave-requests' ? 'bg-amber-500' :
                          tab.id === 'leaderboard' ? 'bg-yellow-500' :
                            tab.id === 'geofencing' || tab.id === 'notifications' ? 'bg-emerald-500' :
                              tab.id === 'more' ? 'bg-indigo-500' :
                                'bg-orange-500'
                      }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
