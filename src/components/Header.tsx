import { Search, Bell, ChevronDown, Menu, LogOut, Settings, User, FileText, MapPin, Users, Calendar, CheckCircle2, AlertCircle, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserButton, useUser } from '@clerk/clerk-react';
import { listenToCollection, markAllNotificationsRead } from '../services/dbService';

interface HeaderProps {
  toggleSidebar: () => void;
  role?: 'admin' | 'student';
  user?: any;
  onLogout?: () => void;
}

export default function Header({ toggleSidebar, role = 'admin', user, onLogout }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();
  const { isSignedIn } = useUser();

  // Search shortcuts based on role
  const adminLinks = [
    { title: 'Students List', path: '/admin/students', icon: Users },
    { title: 'Attendance Records', path: '/admin/attendance', icon: Calendar },
    { title: 'Geofencing Settings', path: '/admin/geofencing', icon: MapPin },
    { title: 'Leave Requests', path: '/admin/leave-requests', icon: FileText },
  ];

  const studentLinks = [
    { title: 'My Dashboard', path: '/', icon: LayoutDashboard },
    { title: 'My Attendance Log', path: '/track-my-attendance', icon: Calendar },
    { title: 'Apply Leave', path: '/leave-requests', icon: FileText },
  ];
  
  // Dummy workaround for missing LayoutDashboard import issue (fallback to Settings if needed)
  const SearchIconWrapper = ({ Icon }: { Icon: any }) => <Icon className="w-4 h-4 text-gray-400" />;

  const quickLinks = role === 'admin' ? adminLinks : studentLinks;

  const filteredLinks = quickLinks.filter(link => 
    link.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = listenToCollection('notifications', (data) => {
      setNotifications(data);
    }, user?.uid || user?.id);

    return () => unsubscribe();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead(user?.uid || user?.id);
    toast.success('All notifications marked as read');
  };

  const handleSearchNavigate = (path: string) => {
    navigate(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 relative z-40">
      <div className="flex items-center flex-1">
        <button className="mr-4 lg:hidden text-gray-500 hover:text-gray-700" onClick={toggleSidebar}>
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Interactive Search Bar */}
        <div className="w-full max-w-md relative hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input 
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-1 focus:border-blue-500 focus:bg-white transition-colors text-sm" 
              placeholder="Search sections or reports..." 
              type="text" 
              value={searchQuery}
              onFocus={() => setShowSearch(true)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Search Dropdown Modal */}
          {showSearch && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowSearch(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Jump</p>
                  {filteredLinks.length > 0 ? (
                    filteredLinks.map((link, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSearchNavigate(link.path)}
                        className="w-full flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-left"
                      >
                        <SearchIconWrapper Icon={link.icon} />
                        <span className="ml-3">{link.title}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-500 text-center">No matching pages found</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 relative z-50">
        <div className="text-right hidden md:block">
          <p className="text-[10px] text-gray-400 font-medium tracking-wide">TODAY</p>
          <p className="text-xs font-bold text-gray-800">{today}</p>
        </div>

        {/* Notifications Center */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2 rounded-full border transition-all ${showNotifications ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-200 text-gray-500'}`}
          >
            <Bell className="h-5 w-5" />
            {notifications.filter(n => n.unread).length > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border border-white"></span>
            )}
          </button>

          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark all as read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex gap-3">
                        <div className={`mt-1 shrink-0 ${n.type === 'alert' ? 'text-orange-500' : n.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}>
                          {n.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : n.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <p className={`text-sm font-bold ${n.unread ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                            <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap">{n.time}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{n.message || n.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
                  <button onClick={() => { setShowNotifications(false); navigate(role === 'admin' ? '/admin/notifications' : '/notifications'); }} className="text-xs font-bold text-gray-600 hover:text-blue-600 mt-1 pb-1">View All Notifications</button>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Profile Menu Provider */}
        <div className="relative">
          {isSignedIn ? (
            <div className="flex items-center ml-2 border-l border-gray-100 pl-4">
               <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: 'w-9 h-9' } }} />
               <div className="hidden sm:block text-left ml-3">
                 <p className="text-xs font-bold text-gray-800 leading-tight truncate max-w-[120px]">{user?.name}</p>
                 <p className="text-[10px] font-medium text-gray-500 capitalize">{role}</p>
               </div>
            </div>
          ) : (
            <>
              <button 
                className={`flex items-center space-x-2 sm:space-x-3 cursor-pointer p-1.5 rounded-lg transition-all border ${showProfileMenu ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50 border-transparent'}`}
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img 
                  alt="Profile" 
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-gray-200 bg-white" 
                  src={user?.photoURL || (role === 'admin' ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" : "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex")} 
                />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-gray-800 leading-tight">{user?.name || (role === 'admin' ? 'Admin User' : 'Alex Johnson')}</p>
                  <p className="text-[10px] font-medium text-gray-500 capitalize">{role}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-gray-400 hidden sm:block transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </button>
    
              {/* Profile Dropdown */}
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)} 
                  />
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-gray-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-5 py-4 border-b border-gray-100 mb-2 flex flex-col items-center text-center bg-gray-50/50">
                      <img 
                        src={user?.photoURL || (role === 'admin' ? "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" : "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex")} 
                        className="w-16 h-16 rounded-full border-2 border-white shadow-md mb-3"
                        alt="Current user avatar"
                      />
                      <p className="text-sm font-bold text-gray-800 truncate w-full">{user?.name || (role === 'admin' ? 'Admin User' : 'Alex Johnson')}</p>
                      <p className="text-xs font-medium text-gray-500 truncate w-full">{user?.email || (role === 'admin' ? 'admin@trackmyattendance.com' : 'student@example.com')}</p>
                      <span className="mt-2 bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">{role}</span>
                    </div>
                    
                    <div className="px-2">
                      <button 
                        onClick={() => { setShowProfileMenu(false); navigate(role === 'admin' ? '/admin/settings' : '/settings', { state: { tab: 'profile' } }); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                      >
                        <User className="w-4 h-4 mr-3 opacity-70" />
                        My Profile
                      </button>
                      <button 
                        onClick={() => { setShowProfileMenu(false); navigate(role === 'admin' ? '/admin/settings' : '/settings', { state: { tab: 'preferences' } }); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                      >
                        <Settings className="w-4 h-4 mr-3 opacity-70" />
                        Account Settings
                      </button>
                      
                      <div className="border-t border-gray-100 my-2"></div>
                      
                      <button 
                        onClick={() => { setShowProfileMenu(false); onLogout?.(); }}
                        className="w-full flex items-center px-4 py-2.5 text-sm font-bold text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-3 opacity-70" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
