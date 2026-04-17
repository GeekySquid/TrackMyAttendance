import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Award, 
  Shield, 
  Clock, 
  AlertTriangle, 
  Save,
  Building,
  UserCheck,
  User,
  Database,
  Loader2
} from 'lucide-react';
import { saveUser, addAttendance, addLeaveRequest } from '../services/dbService';
import toast from 'react-hot-toast';

export default function SettingsPage({ role = 'admin', user }: { role?: 'admin' | 'student', user?: any }) {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || (role === 'admin' ? 'general' : 'profile'));
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state?.tab]);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('All changes saved successfully!');
    }, 800);
  };

  const generateDemoData = async () => {
    setIsGenerating(true);
    try {
      // Generate Students
      const students = [
        { uid: 's1', name: 'Alice Johnson', email: 'alice@example.com', role: 'student', rollNo: 'CS101', course: 'Computer Science', attendance: '92%' },
        { uid: 's2', name: 'Bob Smith', email: 'bob@example.com', role: 'student', rollNo: 'CS102', course: 'Computer Science', attendance: '85%' },
        { uid: 's3', name: 'Charlie Davis', email: 'charlie@example.com', role: 'student', rollNo: 'EE201', course: 'Electrical Engineering', attendance: '98%' },
        { uid: 's4', name: 'Diana Prince', email: 'diana@example.com', role: 'student', rollNo: 'ME301', course: 'Mechanical Engineering', attendance: '76%' },
        { uid: 's5', name: 'Evan Wright', email: 'evan@example.com', role: 'student', rollNo: 'CS103', course: 'Computer Science', attendance: '88%' },
      ];
      
      for (const s of students) {
        await saveUser(s);
      }

      // Generate Attendance for the past 7 days
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        // Skip weekends
        if (d.getDay() === 0 || d.getDay() === 6) continue;

        for (const s of students) {
          // Randomize attendance
          const rand = Math.random();
          let status = 'Present';
          let checkInTime = new Date(d);
          checkInTime.setHours(8, Math.floor(Math.random() * 30), 0);
          
          let checkOutTime = new Date(d);
          checkOutTime.setHours(15, Math.floor(Math.random() * 60), 0);

          if (rand > 0.9) {
            status = 'Absent';
            checkInTime = null as any;
            checkOutTime = null as any;
          } else if (rand > 0.7) {
            status = 'Late';
            checkInTime.setHours(9, Math.floor(Math.random() * 30), 0);
          }

          await addAttendance({
            userId: s.uid,
            userName: s.name,
            rollNo: s.rollNo,
            course: s.course,
            date: dateStr,
            checkInTime: checkInTime ? checkInTime.toISOString() : null,
            checkOutTime: checkOutTime ? checkOutTime.toISOString() : null,
            status,
            location: 'Campus Geofence'
          });
        }
      }

      // Generate Leave Requests
      await addLeaveRequest({
        userId: 's2',
        userName: 'Bob Smith',
        type: 'Sick Leave',
        fromDate: new Date().toISOString().split('T')[0],
        toDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        reason: 'Fever and cold',
        status: 'Pending',
        appliedOn: new Date().toISOString()
      });
      
      await addLeaveRequest({
        userId: 's4',
        userName: 'Diana Prince',
        type: 'Personal Leave',
        fromDate: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        toDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        reason: 'Family event',
        status: 'Approved',
        appliedOn: new Date(Date.now() - 86400000 * 5).toISOString()
      });

      toast.success("Demo data generated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate demo data.");
    } finally {
      setIsGenerating(false);
    }
  };

  const adminTabs = [
    { id: 'profile', label: 'My Admin Profile', icon: User },
    { id: 'general', label: 'General Info', icon: Building },
    { id: 'attendance', label: 'Attendance Rules', icon: Clock },
    { id: 'alerts', label: 'Alerts & Follow-ups', icon: AlertTriangle },
    { id: 'awards', label: 'Awards & Recognition', icon: Award },
    { id: 'security', label: 'System & Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  const studentTabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const tabs = role === 'admin' ? adminTabs : studentTabs;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">System Settings</h2>
            <p className="text-sm text-gray-500">Configure application parameters and admin preferences</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-blue-600 text-white text-xs py-2.5 px-6 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save All Changes
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8 min-h-[500px]">
            
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Institution Details</h3>
                  <p className="text-sm text-gray-500">Basic information about your campus or organization.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Institution Name</label>
                    <input type="text" defaultValue="Techwood University" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Academic Year</label>
                    <select className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>2023 - 2024</option>
                      <option selected>2024 - 2025</option>
                      <option>2025 - 2026</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Timezone</label>
                    <select className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option selected>America/New_York (EST)</option>
                      <option>America/Los_Angeles (PST)</option>
                      <option>Europe/London (GMT)</option>
                      <option>Asia/Kolkata (IST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Date Format</label>
                    <select className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option selected>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                      <option>YYYY-MM-DD</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Attendance Rules</h3>
                  <p className="text-sm text-gray-500">Define strict parameters for tracking student presence.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Standard Check-in Time</label>
                    <input type="time" defaultValue="08:30" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Standard Check-out Time</label>
                    <input type="time" defaultValue="15:30" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Late Mark Threshold</h4>
                      <p className="text-xs text-gray-500">Grace period before a student is marked "Late"</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue="15" className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600 font-medium">mins</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Half-Day Threshold</h4>
                      <p className="text-xs text-gray-500">Minimum hours required for a full day present mark</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" defaultValue="4" className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600 font-medium">hours</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Alerts & Follow-ups</h3>
                  <p className="text-sm text-gray-500">Monitor inattentive students and trigger automated interventions.</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-6 flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-orange-800">Inattentive Student Tracking</h4>
                    <p className="text-xs text-orange-600 mt-1">These settings help identify students who are frequently absent or late, allowing counselors to intervene early.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                    <div className="pr-4">
                      <h4 className="text-sm font-bold text-gray-800">Low Attendance Warning</h4>
                      <p className="text-xs text-gray-500 mt-1">Alert admin when a student's overall attendance drops below this percentage.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="number" defaultValue="75" className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600 font-bold">%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                    <div className="pr-4">
                      <h4 className="text-sm font-bold text-gray-800">Consecutive Absences Alert</h4>
                      <p className="text-xs text-gray-500 mt-1">Flag students who are absent for consecutive days to schedule a follow-up.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <input type="number" defaultValue="3" className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="text-sm text-gray-600 font-bold">days</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Auto-Notify Parents</h4>
                      <p className="text-xs text-gray-500 mt-1">Send automated SMS/Email to parents when thresholds are breached.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'awards' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Awards & Recognition</h3>
                  <p className="text-sm text-gray-500">Configure criteria for "Best Student of the Month" and gamification.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-blue-900">Enable Monthly Awards</h4>
                      <p className="text-xs text-blue-700">Automatically calculate and highlight top performers.</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-blue-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-800">Award Criteria</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2">Minimum Attendance %</label>
                      <input type="number" defaultValue="95" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2">Max Allowed Late Marks</label>
                      <input type="number" defaultValue="0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg mt-4">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800">Auto-Generate Certificates</h4>
                      <p className="text-xs text-gray-500 mt-1">Create downloadable PDF certificates for winners.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">System & Security</h3>
                  <p className="text-sm text-gray-500">Manage access and data privacy.</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-gray-400" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">Two-Factor Authentication (2FA)</h4>
                        <p className="text-xs text-gray-500">Require 2FA for your account.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  {role === 'admin' && (
                    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div>
                          <h4 className="text-sm font-bold text-gray-800">Strict Device Binding</h4>
                          <p className="text-xs text-gray-500">Students can only mark attendance from registered devices.</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Data Management</h3>
                  <p className="text-sm text-gray-500">Manage application data and testing tools.</p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600 shrink-0">
                      <Database className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-gray-800">Generate Demo Data</h4>
                      <p className="text-sm text-gray-600 mt-1 mb-4">
                        Populate the database with sample students, attendance records, and leave requests for testing purposes. This will add to existing data.
                      </p>
                      <button 
                        onClick={generateDemoData}
                        disabled={isGenerating}
                        className="bg-blue-600 text-white text-sm py-2.5 px-6 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            Generate Data
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">My Profile</h3>
                  <p className="text-sm text-gray-500">Update your personal information.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                    <input 
                      type="text" 
                      defaultValue={user?.name || ''} 
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue={user?.email || ''} 
                      disabled
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" 
                    />
                  </div>
                  {user?.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Roll Number</label>
                        <input 
                          type="text" 
                          defaultValue={user?.rollNo || ''} 
                          disabled
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Course</label>
                        <input 
                          type="text" 
                          defaultValue={user?.course || ''} 
                          disabled
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                    <input 
                      type="tel" 
                      defaultValue={user?.phone || ''}
                      placeholder="+1 (555) 123-4567" 
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                    />
                  </div>
                  {user?.role === 'student' && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                        <select 
                          defaultValue={user?.gender || ''}
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" 
                        >
                          <option value="">Select</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Blood Group</label>
                        <select 
                          defaultValue={user?.bloodGroup || ''}
                          disabled
                          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" 
                        >
                          <option value="">Select</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Preferences</h3>
                  <p className="text-sm text-gray-500">Customize your app experience.</p>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">Push Notifications</h4>
                    <p className="text-xs text-gray-500 mt-1">Receive alerts for attendance and leave updates.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
