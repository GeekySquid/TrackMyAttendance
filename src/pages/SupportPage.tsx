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
import CustomInput from '../components/CustomInput';

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
      content: "The Admin Dashboard features 'Active Stat Cards' and a 'Recent Activity' log that updates in real-time. You can monitor active attendance windows and see exactly when students check-in with precise GPS coordinates."
    },
    {
      role: 'admin',
      category: 'geofencing',
      title: 'Managing Geofences & Active Alarms',
      content: "Use the Geofencing page to define campus boundaries. The 'Active Alarms' map allows you to visualize the geofence in real-time, toggle automated schedules, and adjust the radius to ensure maximum attendance precision."
    },
    {
      role: 'admin',
      category: 'reports',
      title: 'Advanced Data Exporting',
      content: "The Reports module allows for deep filtering by date, student, or status. You can export professional-grade Excel spreadsheets or PDF reports that include detailed check-in timestamps and location verification."
    },
    {
      role: 'admin',
      category: 'access',
      title: 'Hybrid Role & Permission Management',
      content: "The Access Control system supports both desktop drag-and-drop and a mobile-first 'Role Picker'. You can move users between roles, configure granular module permissions, and manage the 'Unassigned Pool' with one-tap actions."
    },
    {
      role: 'admin',
      category: 'documents',
      title: 'File Revision History (Track Records)',
      content: "When updating shared documents, the system automatically preserves the previous version in a 'Track Record'. This ensures a full revision history is maintained, allowing you to audit or revert changes at any time."
    },
    {
      role: 'admin',
      category: 'leaves',
      title: 'Responsive Leave Approval Workflow',
      content: "Manage leave requests through a dual-view panel. On desktop, use the high-efficiency table; on mobile, use the 'Action Cards' to quickly approve or reject requests with touch-optimized buttons."
    },
    // Student specific
    {
      role: 'student',
      category: 'student-dashboard',
      title: 'Marking Your Presence',
      content: "On your dashboard, the 'Check In' button activates only when you are within the verified campus geofence. The system uses high-precision GPS to ensure your attendance is logged accurately."
    },
    {
      role: 'student',
      category: 'attendance',
      title: 'Late Arrivals & Photo Verification',
      content: "If you arrive after the grace period, you can provide a reason for the delay and attach photo evidence. This information is instantly securely transmitted to the admin panel for review."
    },
    {
      role: 'student',
      category: 'leaderboard',
      title: 'Campus Rankings & Consistency',
      content: "Your rank is determined by your 'Consistency Score'. Regular, on-time check-ins boost your position. You can view top performers and your own standing relative to your peers."
    },
    {
      role: 'student',
      category: 'leaves',
      title: 'Mobile Leave Applications',
      content: "Apply for leaves directly from your phone. You can track the status of your requests (Pending, Approved, or Rejected) and receive real-time notifications once a decision is made."
    },
    {
      role: 'student',
      category: 'profile',
      title: 'Personalized Settings & Course Sync',
      content: "In your profile settings, you can update academic details and contact info. This ensures all generated attendance reports and documents reflect your current enrollment status."
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.role === role &&
    faq.category === activeTab && 
    (faq.title.toLowerCase().includes(searchQuery.toLowerCase()) || faq.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] overflow-y-auto custom-scrollbar relative z-0">
      {/* Header Section - Cleaned up white space and removed clipping */}
      <div className="bg-white border-b border-gray-100 mb-12 sm:mb-16 pt-10 pb-16 sm:pt-16 sm:pb-24 relative">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl sm:rounded-3xl mb-4 sm:mb-6 shadow-xl shadow-blue-200">
            <HelpCircle className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-3 tracking-tight">
            {role === 'admin' ? 'Admin Help Center' : 'Student Help Center'}
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[9px] sm:text-[11px] max-w-xs sm:max-w-lg mx-auto">
            {role === 'admin' ? 'System Administration & Management Guides' : 'Attendance & Profile Assistance'}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-40">
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
          <div className="lg:col-span-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-blue-600 rounded-full" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">
                  {categories.find(c => c.id === activeTab)?.label}
                </h2>
              </div>
              <div className="w-full sm:w-64">
                <CustomInput
                  placeholder="Search articles..."
                  icon={Search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="py-2.5"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => (
                  <div key={index} className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm hover:shadow-md transition-all group border-l-4 border-l-transparent hover:border-l-blue-500">
                    <h3 className="text-lg font-black text-gray-800 mb-4 group-hover:text-blue-600 transition-colors">
                      {faq.title}
                    </h3>
                    <div className="flex gap-4">
                      <div className="w-1 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors shrink-0" />
                      <p className="text-gray-600 leading-relaxed text-sm lg:text-base font-medium">
                        {faq.content}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
                  <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="w-10 h-10 text-gray-300" />
                  </div>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-sm">No entries found</p>
                </div>
              )}
            </div>

            {/* Quick Contact Footer */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
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
