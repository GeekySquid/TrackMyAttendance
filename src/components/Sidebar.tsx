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
  Shield
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
  ];

  const studentNavItems = [
    { id: '', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'track-my-attendance', label: 'My Attendance', icon: ClipboardList },
    { id: 'leave-requests', label: 'Leave Requests', icon: FileText },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'settings', label: 'Settings', icon: Settings },
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
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-gray-800 leading-tight">TrackMyAttendance</h1>
              <p className="text-xs text-gray-500">{role === 'admin' ? 'Admin Panel' : 'Student Panel'}</p>
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
            <button className="bg-blue-600 text-white text-xs py-2 px-4 rounded-lg w-full font-medium">Get Support</button>
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
