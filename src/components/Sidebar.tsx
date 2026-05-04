import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileText,
  BarChart2,
  Folder,
  Bell,
  Settings,
  MapPin,
  ClipboardList,
  X,
  LogOut,
  Trophy,
  Shield,
  HelpCircle,
  Download,
  Mail,
  Award
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { renderStyledBranding } from '../utils/branding';
import { listenToCollection } from '../services/dbService';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: 'admin' | 'student';
  user?: any;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, role, user, onLogout }: SidebarProps) {
  const location = useLocation();
  const basePath = role === 'admin' ? '/admin' : '';
  const [isHovered, setIsHovered] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const adminNavItems = [
    { id: '', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Student', icon: Users },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'documents', label: 'Documents', icon: Folder },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'access-control', label: 'Access Control', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'geofencing', label: 'Geofencing', icon: MapPin },
    { id: 'subscribers', label: 'Waitlist', icon: Mail },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const studentNavItems = [
    { id: '', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'track-my-attendance', label: 'My Attendance', icon: ClipboardList },
    { id: 'leave-requests?apply=true', label: 'Leave Requests', icon: FileText },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'certificates', label: 'My Certificates', icon: Award, awardOnly: true },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [sysSettings, setSysSettings] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = listenToCollection('app_settings', (data) => {
      if (data && data.length > 0) {
        setSysSettings(data[0]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const navItems = role === 'admin' ? adminNavItems : studentNavItems;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={false}
        animate={{
          width: windowWidth < 1024 ? 280 : (isHovered ? 260 : 72),
          x: windowWidth < 1024 ? (isOpen ? 0 : -280) : 0
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-y-0 left-0 z-50 bg-white/90 backdrop-blur-2xl border-r border-gray-100 flex flex-col shrink-0 lg:relative shadow-2xl lg:shadow-none overflow-hidden"
      >
        {/* Header Section */}
        <div className="h-20 flex items-center shrink-0 relative overflow-hidden">
          <div className={`flex items-center w-full transition-all duration-300 ${isHovered ? 'px-4 min-w-[220px]' : 'px-0 justify-center min-w-0'}`}>
            <div className="w-11 h-11 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-lg shadow-black/5 border border-white/50 shrink-0">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden ${isHovered ? 'ml-3 w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 pointer-events-none'}`}>
              <h1 className="font-black text-gray-900 text-[15px] tracking-tight leading-tight whitespace-nowrap uppercase">
                {renderStyledBranding(
                  sysSettings?.institution_name || 'TrackMYAttendance',
                  sysSettings?.brand_color_word,
                  sysSettings?.brand_color_type
                )}
              </h1>
              <p className="text-[9px] uppercase font-black text-blue-600 tracking-[0.15em] mt-0.5 opacity-80">
                {role === 'admin' ? 'Management Suite' : 'Student Portal'}
              </p>
            </div>
          </div>

          <button className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-700 p-2" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 space-y-0.5 px-3 py-2 overflow-x-hidden custom-scrollbar ${isHovered ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
          {navItems.filter(item => {
            if (role === 'admin') return true;
            if ((item as any).awardOnly && !user?.isAwardWinner) return false;

            const defaultPerms = ['dashboard', 'attendance', 'leave', 'leaderboard', 'awards', 'settings'];
            const perms = sysSettings?.role_permissions?.student || defaultPerms;
            const moduleMapping: Record<string, string> = {
              '': 'dashboard',
              'track-my-attendance': 'attendance',
              'leave-requests': 'leave',
              'notifications': 'notifications',
              'leaderboard': 'leaderboard',
              'certificates': 'awards',
              'documents': 'documents',
              'settings': 'settings'
            };
            const baseId = item.id.split('?')[0];
            const moduleId = moduleMapping[baseId] || baseId;
            const coreItems = ['support'];
            if (coreItems.includes(item.id)) return true;
            return perms.includes(moduleId);
          }).map((item) => {
            const Icon = item.icon;
            const itemPathPart = item.id.split('?')[0];
            const fullItemPath = itemPathPart ? `${basePath}/${itemPathPart}` : basePath || '/';
            const itemPath = item.id ? `${basePath}/${item.id}` : basePath || '/';
            const isActive = location.pathname === fullItemPath || (item.id === '' && location.pathname === (basePath || '/'));
            const isLabelsVisible = isHovered || (windowWidth < 1024 && isOpen);

            return (
              <Link
                key={item.id}
                to={itemPath}
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center h-11 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 ring-1 ring-blue-500/20'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-blue-600'
                  }`}
              >
                <div className="w-[40px] flex items-center justify-center shrink-0 ml-1">
                  <Icon className={`h-[18px] w-[18px] transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>

                <span className={`ml-2 whitespace-nowrap text-[12px] font-bold transition-all duration-300 ${isLabelsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                  }`}>
                  {item.label}
                </span>

                {!isLabelsVisible && (
                  <div className="fixed left-20 px-3 py-2 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] hidden lg:block shadow-2xl">
                    {item.label}
                    <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                  </div>
                )}

                {isActive && !isLabelsVisible && (
                  <div className="absolute right-0 w-1 h-4 bg-white rounded-l-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-gray-50 space-y-1">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="w-full flex items-center h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all group"
              title="Install App"
            >
              <div className="w-[40px] flex items-center justify-center shrink-0 ml-1">
                <Download className="h-4 w-4" />
              </div>
              <span className={`ml-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                Install
              </span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center h-10 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-all group"
            title="Sign Out"
          >
            <div className="w-[40px] flex items-center justify-center shrink-0 ml-1">
              <LogOut className="h-4 w-4" />
            </div>
            <span className={`ml-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}>
              Logout
            </span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
