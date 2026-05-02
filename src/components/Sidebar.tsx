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
    { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
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
          width: isHovered ? 256 : 84,
          x: windowWidth < 1024 ? (isOpen ? 0 : -280) : 0
        }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
        className="fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 flex flex-col shrink-0 lg:relative will-change-transform shadow-xl lg:shadow-none [transform:translateZ(0)]"
      >
        <div className="p-6 flex flex-col items-center">
          <div className="flex flex-col items-center w-full mb-6 text-center">
            <div className="bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-50 mb-4 w-14 h-14 shadow-indigo-100/50">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
            
            <AnimatePresence>
              {isHovered && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  transition={{ duration: 0.2 }}
                  className="origin-center"
                >
                  <h1 className="font-black text-gray-900 text-sm tracking-tight leading-tight max-w-[200px]">
                    {renderStyledBranding(
                      sysSettings?.institution_name || 'TrackMYAttendance',
                      sysSettings?.brand_color_word,
                      sysSettings?.brand_color_type
                    )}
                  </h1>
                  <p className="text-[9px] uppercase font-black text-blue-600 tracking-[0.2em] mt-1.5">
                    {role === 'admin' ? 'Admin Suite' : 'Student Portal'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-700 p-2" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={`flex-1 px-3 space-y-1.5 ${role === 'student' ? 'overflow-hidden' : 'overflow-y-auto no-scrollbar'} overflow-x-hidden py-4`}>
          {navItems.filter(item => {
            if (role === 'admin') return true;
            
            // Special check for award-only items
            if ((item as any).awardOnly && !user?.isAwardWinner) return false;

            const perms = sysSettings?.role_permissions?.student || [];
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
            const moduleId = moduleMapping[item.id] || item.id;
            const coreItems = ['support'];
            if (coreItems.includes(item.id)) return true;
            return perms.includes(moduleId);
          }).map((item) => {
            const Icon = item.icon;
            const itemPath = item.id ? `${basePath}/${item.id}` : basePath || '/';
            const isActive = location.pathname === itemPath || (item.id === '' && location.pathname === (basePath || '/'));

            return (
              <Link
                key={item.id}
                to={itemPath}
                onClick={() => setIsOpen(false)}
                className={`group relative flex items-center transition-all duration-300 ${
                  isActive ? 'sidebar-active shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                } ${isHovered ? 'px-4 py-3 rounded-xl' : 'justify-center py-3 rounded-xl'}`}
              >
                <div className="shrink-0">
                  <Icon className={`h-5 w-5 transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                
                <AnimatePresence>
                  {isHovered && (
                    <motion.span 
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="ml-3 whitespace-nowrap text-[13px] font-bold"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {!isHovered && (
                  <div className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-md opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all pointer-events-none whitespace-nowrap z-[100] hidden lg:block">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="p-4"
            >
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-2xl p-4 text-center border border-indigo-100/50 shadow-sm">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Need help?</p>
                <p className="text-[10px] text-slate-500 mb-3">Support Portal</p>
                <Link
                  to={`${basePath}/support`}
                  onClick={() => setIsOpen(false)}
                  className="bg-indigo-600 text-white text-[10px] py-2 px-4 rounded-xl w-full font-black inline-block shadow-md hover:shadow-indigo-200 transition-all"
                >
                  OPEN TICKET
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="px-3 pb-4 space-y-2 mt-auto">
          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className={`bg-indigo-600 text-white flex items-center transition-all rounded-xl ${isHovered ? 'px-4 py-3 w-full' : 'w-12 h-12 justify-center mx-auto'}`}
              title="Install App"
            >
              <Download className="h-5 w-5 shrink-0" />
              {isHovered && <span className="ml-3 text-[10px] font-black whitespace-nowrap">Install App</span>}
            </button>
          )}

          <button
            onClick={onLogout}
            className={`text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center transition-all rounded-xl ${isHovered ? 'px-4 py-3 w-full' : 'w-12 h-12 justify-center mx-auto'}`}
            title="Sign Out"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isHovered && <span className="ml-3 text-[10px] font-black whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
}
