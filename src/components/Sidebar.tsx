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
  Download
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSystemSettings } from '../services/dbService';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: 'admin' | 'student';
  onLogout: () => void;
}

export default function Sidebar({ isOpen, setIsOpen, role, onLogout }: SidebarProps) {
  const location = useLocation();
  const basePath = role === 'admin' ? '/admin' : '';

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
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const studentNavItems = [
    { id: '', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'track-my-attendance', label: 'My Attendance', icon: ClipboardList },
    { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [sysSettings, setSysSettings] = useState<any>(null);

  useEffect(() => {
    getSystemSettings().then(data => {
      if (data) setSysSettings(data);
    });
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
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex flex-col items-center">
          <div className="flex flex-col items-center w-full mb-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-50 mb-3 transition-transform hover:scale-105 duration-300">
              <img src="/logo.png" alt="TrackMyAttendance Logo" className="w-full h-full object-contain p-1.5" />
            </div>
            <div className="text-center px-1">
              <h1 className="font-black text-gray-900 text-sm tracking-tight leading-tight truncate max-w-[180px] uppercase">
                {sysSettings?.institution_name || 'TrackMyAttendance'}
              </h1>
              <p className="text-[9px] uppercase font-black text-blue-600 tracking-[0.2em] mt-0.5">
                {role === 'admin' ? 'Admin Suite' : 'Student Portal'}
              </p>
            </div>
          </div>
          <button className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-xl transition-all" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const itemPath = item.id ? `${basePath}/${item.id}` : basePath || '/';
            const isActive = location.pathname === itemPath || (item.id === '' && location.pathname === (basePath || '/'));

            return (
              <Link
                key={item.id}
                to={itemPath}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center px-4 py-2.5 text-[13px] font-bold rounded-xl transition-all duration-200 ${isActive
                    ? 'sidebar-active shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                  }`}
              >
                <Icon className="mr-3 h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 mt-auto">
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-[20px] p-3 text-center border border-indigo-100/50 shadow-sm relative group">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center mx-auto mb-1.5 shadow-sm border border-indigo-50 group-hover:rotate-6 transition-transform">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="text-[10px] font-black text-slate-800 tracking-tight">Need help?</p>
            <p className="text-[9px] text-slate-400 mb-2">Documentation & Support</p>
            <Link
              to={`${basePath}/support`}
              onClick={() => setIsOpen(false)}
              className="bg-indigo-600 text-white text-[9px] py-1.5 px-3 rounded-lg w-full font-black inline-block shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 uppercase tracking-wider"
            >
              Get Support
            </Link>
          </div>

          {deferredPrompt && (
            <button
              onClick={handleInstall}
              className="mt-2 bg-gradient-to-br from-indigo-600 to-blue-600 text-white w-full flex items-center justify-center px-3 py-2 text-[10px] font-black rounded-lg transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 active:scale-95 uppercase tracking-wide"
            >
              <Download className="mr-2 h-3.5 w-3.5" />
              Install App
            </button>
          )}

          <button
            onClick={onLogout}
            className="mt-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 w-full flex items-center px-4 py-2 text-[10px] font-black rounded-lg transition-all active:scale-95 uppercase tracking-wide"
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
