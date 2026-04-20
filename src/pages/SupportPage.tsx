import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  ChevronRight, 
  FileText, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  HelpCircle,
  MessageSquare,
  Mail,
  Zap,
  Info,
  Trophy,
  Layout
} from 'lucide-react';

interface SupportPageProps {
  role: 'admin' | 'student';
}

const SupportPage: React.FC<SupportPageProps> = ({ role }) => {
  const [activeTab, setActiveTab] = useState(role === 'admin' ? 'admin-dashboard' : 'student-dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Categories tailored by Role ──────────────────────────────────────────
  const adminCategories = [
    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Layout },
    { id: 'geofencing', label: 'Geofencing Setup', icon: MapPin },
    { id: 'reports', label: 'Reports & Export', icon: FileText },
    { id: 'access', label: 'Access Control', icon: ShieldCheck },
    { id: 'documents', label: 'Doc Management', icon: FileText },
  ];

  const studentCategories = [
    { id: 'student-dashboard', label: 'My Dashboard', icon: Layout },
    { id: 'attendance', label: 'Marking Attendance', icon: Calendar },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'leaves', label: 'Leave Requests', icon: Calendar },
    { id: 'profile', label: 'My Profile', icon: ShieldCheck },
  ];

  const categories = role === 'admin' ? adminCategories : studentCategories;

  // ─── FAQs tailored by Role ────────────────────────────────────────────────
  const faqs = [
    // Admin specific
    {
      role: 'admin',
      category: 'admin-dashboard',
      title: 'How to monitor real-time activity?',
      content: "The Admin Dashboard feature a 'Recent Activity' log that updates in real-time as students check-in or out. You can see their location, time, and any late reasons provided."
    },
    {
      role: 'admin',
      category: 'geofencing',
      title: 'Configurable Campus Boundaries',
      content: "Navigate to the Geofencing page to set the Latitude, Longitude, and Radius (in meters) for your campus. You can also define an automated schedule for when the attendance window should open."
    },
    {
      role: 'admin',
      category: 'reports',
      title: 'Exporting Attendance Data',
      content: "Go to the Reports page to filter attendance by date or student. You can export the results as professional Excel spreadsheets or PDF documents for your records."
    },
    {
      role: 'admin',
      category: 'access',
      title: 'Granting Staff Permissions',
      content: "Use the Access Control page to assign roles. 'Admins' have full access, while other roles can be restricted to specific modules like Attendance or Reports."
    },
    
    {
      role: 'admin',
      category: 'documents',
      title: 'Managing Documents & Revisions',
      content: "As an admin, you can upload, replace, and delete shared documents. When you replace a file, the system preserves the previous one in a 'Track Record' (revision history), ensuring no data is ever lost during updates."
    },
    // Student specific
    {
      role: 'student',
      category: 'student-dashboard',
      title: 'How do I check-in for the day?',
      content: "On your dashboard, you will see a 'Check In' button. If you are within the campus geofence and the attendance window is open, simply click it to mark your presence."
    },
    {
      role: 'student',
      category: 'attendance',
      title: 'What happens if I am late?',
      content: "If you check-in after the grace period, the system will prompt you for a reason. You can type your reason and even attach a photo (e.g., a medical slip) for admin review."
    },
    {
      role: 'student',
      category: 'leaderboard',
      title: 'How is my rank calculated?',
      content: "The leaderboard ranks students based on their attendance percentage and consistency. Checking in early and missing no days will boost your position on the campus leaderboard."
    },
    {
      role: 'student',
      category: 'leaves',
      title: 'Checking my Leave Status',
      content: "Go to the Leave Requests page to see a history of all your applications. The status will update from 'Pending' to 'Approved' or 'Rejected' once viewed by an admin."
    },
    {
      role: 'student',
      category: 'profile',
      title: 'Updating my Course Details',
      content: "In the Settings page, you can update your Course name and other personal details. This ensures your attendance reports always show your correct academic information."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.role === role &&
    faq.category === activeTab && 
    (faq.title.toLowerCase().includes(searchQuery.toLowerCase()) || faq.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 bg-[#F8FAFC] min-h-screen relative overflow-y-auto">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-100 mb-8 overflow-hidden pt-12 pb-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 rounded-2xl mb-4">
            <HelpCircle className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            {role === 'admin' ? 'Admin Help Center' : 'Student Help Center'}
          </h1>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Documentation and guides for the {role === 'admin' ? 'Administrative Suite' : 'Student Experience'}
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search guides..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-700 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs - Horizontal Scroll on Mobile */}
          <div className="lg:col-span-1">
            <p className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-4">Documentation</p>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-hide snap-x">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id)}
                    className={`flex-shrink-0 snap-start flex items-center gap-3 px-5 py-3 rounded-xl transition-all whitespace-nowrap lg:whitespace-normal text-left ${
                      activeTab === cat.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                        : 'text-gray-600 bg-white border border-gray-50 hover:bg-white hover:shadow-sm'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${activeTab === cat.id ? 'text-white' : 'text-gray-400'}`} />
                    <span className="font-bold text-sm">{cat.label}</span>
                    {activeTab === cat.id && <ChevronRight className="hidden lg:block w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </div>

            <div className="hidden lg:block mt-8 p-5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <Zap className="w-8 h-8 mb-4 text-yellow-400 fill-yellow-400" />
                <p className="font-bold mb-1">Expert Support</p>
                <p className="text-xs text-blue-100 mb-4 opacity-90">Can't find what you're looking for? Our admins are here to help.</p>
                <button className="text-xs font-bold bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors w-full">
                  Submit Ticket
                </button>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white opacity-10 rounded-full" />
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {categories.find(c => c.id === activeTab)?.label}
                  <Info className="w-4 h-4 text-gray-400" />
                </h2>
              </div>
              
              <div className="p-6 sm:p-8 divide-y divide-gray-50">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, index) => (
                    <div key={index} className="py-6 first:pt-0 last:pb-0 group">
                      <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                        {faq.title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed text-sm lg:text-base pl-4 border-l-2 border-blue-100">
                        {faq.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20">
                    <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-bold">No documentation entries found.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Contact Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Support Chat</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Recommended</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-bold text-gray-800">Email Helpdesk</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide font-bold">Non-urgent</p>
                </div>
                <ChevronRight className="w-5 h-5 ml-auto text-gray-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
