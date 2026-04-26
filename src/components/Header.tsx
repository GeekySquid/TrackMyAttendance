import { Search, Bell, ChevronDown, Menu, LogOut, Settings, User, FileText, MapPin, Users, Calendar, CheckCircle2, AlertCircle, LayoutDashboard, Download } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { UserButton, useUser } from '@clerk/clerk-react';
import { listenToCollection, markAllNotificationsRead, deleteNotification } from '../services/dbService';
import SwipeableNotificationItem from './SwipeableNotificationItem';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

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
    let isFirstLoad = true;
    const unsubscribe = listenToCollection('notifications', (data) => {
      if (!isFirstLoad) {
        // Find notifications that weren't in the previous list
        setNotifications(prev => {
          const newItems = data.filter(n => !prev.some(p => p.id === n.id));
          newItems.forEach(n => {
            toast(n.message || n.title, {
              icon: n.type === 'success' ? '✅' : n.type === 'alert' ? '⚠️' : '🔔',
              duration: 4000,
              style: {
                borderRadius: '1rem',
                background: '#fff',
                color: '#333',
                fontWeight: 'bold',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              },
            });
          });
          return data;
        });
      } else {
        setNotifications(data);
        isFirstLoad = false;
      }
    }, user?.uid || user?.id);

    return () => unsubscribe();
  }, [user]);

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead(user?.uid || user?.id);
    // Optimistically update local state for instant feel
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleSearchNavigate = (path: string) => {
    navigate(path);
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-3 sm:px-8 shrink-0 relative z-40">
      <div className="flex items-center flex-1">
        {/* Application Branding (Mobile) */}
        <div className="flex lg:hidden items-center gap-2.5 mr-4">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
          <h1 className="text-sm font-black text-gray-900 tracking-tighter">
            Track<span className="text-blue-600">MY</span>Device
          </h1>
        </div>
        
        {/* Interactive Search Bar */}
        <div className="w-full max-w-md relative hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
            <input 
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-100 rounded-2xl leading-5 bg-gray-50/50 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 focus:bg-white transition-all text-sm font-medium" 
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
              <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-black/5">
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

      <div className="flex items-center space-x-2.5 sm:space-x-6 relative z-50">
        <div className="text-right">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-black tracking-widest uppercase">Today</p>
          <p className="text-[10px] sm:text-xs font-black text-gray-800 whitespace-nowrap">{today}</p>
        </div>

        {/* PWA Install Button */}
        {deferredPrompt && (
          <button 
            onClick={handleInstall}
            className="hidden sm:flex items-center space-x-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-xs shadow-lg shadow-blue-200 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span>Install App</span>
          </button>
        )}

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
              <div className="fixed left-1/2 -translate-x-1/2 top-20 sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:mt-1.5 w-[calc(100vw-2rem)] sm:w-96 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-black/5 max-w-[400px]">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="font-bold text-gray-800">Notifications</h3>
                  <button onClick={handleMarkAllAsRead} className="text-xs font-bold text-blue-600 hover:text-blue-700">Mark all as read</button>
                </div>
                <div className="max-h-[28rem] overflow-y-auto overflow-x-hidden">
                  <AnimatePresence initial={false}>
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0, x: -100 }}
                          transition={{ duration: 0.2 }}
                        >
                          <SwipeableNotificationItem 
                            notification={n} 
                            onRemove={handleRemoveNotification} 
                            variant="compact"
                          />
                        </motion.div>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Bell className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                      </div>
                    )}
                  </AnimatePresence>
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
            <div className="flex items-center ml-1 border-l border-gray-100 pl-2.5">
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
                  <div className="absolute right-0 mt-4 w-64 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-300 ring-1 ring-black/5">
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
