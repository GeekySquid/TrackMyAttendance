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
  HelpCircle
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

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
              <h1 className="font-extrabold text-gray-900 text-lg tracking-tight leading-tight">TrackMyAttendance</h1>
              <p className="text-[10px] uppercase font-bold text-blue-600 tracking-widest mt-1">
                {role === 'admin' ? 'Admin Suite' : 'Student Portal'}
              </p>
            </div>
          </div>
          <button className="lg:hidden text-gray-500 hover:text-gray-700" onClick={() => setIsOpen(false)}>
            <X className="h-5 w-5" />
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
                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive 
                    ? 'sidebar-active' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-gray-700">Need help?</p>
            <p className="text-[10px] text-gray-500 mb-3">Check our documentations</p>
            <Link 
              to={`${basePath}/support`}
              onClick={() => setIsOpen(false)}
              className="bg-blue-600 text-white text-xs py-2 px-4 rounded-lg w-full font-medium inline-block"
            >
              Get Support
            </Link>
          </div>
          <button 
            onClick={onLogout} 
            className="mt-4 text-gray-500 hover:text-red-600 hover:bg-red-50 w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
