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
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between space-x-3">
          <div className="flex flex-col items-center w-full mb-6">
            <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-100 mb-4 transition-transform hover:scale-105 duration-300">
              <img src="/logo.png" alt="TrackMyAttendance Logo" className="w-full h-full object-contain p-2" />
            </div>
            <div className="text-center px-2">
              <h1 className="font-extrabold text-gray-900 text-lg tracking-tight leading-tight truncate max-w-[200px]">
                {sysSettings?.institution_name || 'TrackMyAttendance'}
              </h1>

              <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">
                {role === 'admin' ? 'Admin Suite' : 'Student Portal'}
              </p>
            </div>
          </div>
          <button className="absolute top-6 right-6 lg:hidden text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-xl transition-all" onClick={() => setIsOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const itemPath = item.id ? `${basePath}/${item.id}` : basePath || '/';
            const isActive = location.pathname === itemPath || (item.id === '' && location.pathname === (basePath || '/'));
            
            return (
              <Link
                key={item.id}
                to={itemPath}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center px-5 py-3.5 text-sm font-semibold rounded-2xl transition-all duration-200 ${
                  isActive 
                    ? 'sidebar-active shadow-sm' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 active:scale-95'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto">
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 rounded-[24px] p-4 text-center border border-indigo-100/50 shadow-sm relative group">
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center mx-auto mb-2 shadow-sm border border-indigo-50 group-hover:rotate-6 transition-transform">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-[11px] font-bold text-slate-800 tracking-tight">Need help?</p>
            <p className="text-[10px] text-slate-500 mb-3">Check our documentation</p>
            <Link 
              to={`${basePath}/support`}
              onClick={() => setIsOpen(false)}
              className="bg-indigo-600 text-white text-[10px] py-1.5 px-4 rounded-xl w-full font-bold inline-block shadow-md shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95"
            >
              Get Support
            </Link>
          </div>
          
          {deferredPrompt && (
            <button 
              onClick={handleInstall}
              className="mt-3 bg-gradient-to-br from-indigo-600 to-blue-600 text-white w-full flex items-center justify-center px-4 py-2.5 text-[11px] font-bold rounded-xl transition-all shadow-md shadow-indigo-100 hover:shadow-indigo-200 active:scale-95"
            >
              <Download className="mr-2 h-4 w-4" />
              Install Application
            </button>
          )}

          <button 
            onClick={onLogout} 
            className="mt-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 w-full flex items-center px-5 py-2.5 text-[11px] font-bold rounded-xl transition-all active:scale-95"
          >
            <LogOut className="mr-2.5 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
