import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckSquare, Bell, X, Loader2, Send, Filter, Users, Search } from 'lucide-react';
import CustomDropdown from './CustomDropdown';
import { bulkMarkAttendance, addNotification, broadcastNotification, bulkAddNotifications, isScheduleActive, markBulkCheckOut, getTodayDateStr } from '../services/dbService';
import toast from 'react-hot-toast';
import { MapPin, XCircle } from 'lucide-react';

interface QuickActionsProps {
  students: any[];
  attendance: any[];
  adminProfile?: any;
  schedules?: any[];
}

export default function QuickActions({ students, attendance, adminProfile, schedules = [] }: QuickActionsProps) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Bulk Attendance State
  const [bulkCourse, setBulkCourse] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Reminder State
  const [reminderType, setReminderType] = useState('all'); // all, absent, course
  const [reminderCourse, setReminderCourse] = useState('MCA');
  const [reminderTitle, setReminderTitle] = useState('Attendance Reminder');
  const [reminderMessage, setReminderMessage] = useState('');

  const handleForceCheckout = async () => {
    if (!window.confirm('This will immediately check out ALL students currently marked as Verified. Continue?')) return;
    
    // Optimistic UI
    toast.success('Initiating bulk checkout...');
    setIsProcessing(true);
    
    try {
      await markBulkCheckOut();
      toast.success('All active students have been checked out.');
    } catch (err) {
      toast.error('Failed to perform bulk checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const today = getTodayDateStr();

  // Filter students who haven't marked attendance today
  const absentStudentsToday = students.filter(s => {
    const hasAtt = attendance.some(a => a.userId === (s.uid || s.id) && a.date === today);
    return !hasAtt;
  });

  const getFilteredBulkStudents = () => {
    return absentStudentsToday.filter(s => {
      const matchesCourse = bulkCourse === 'All' || s.course === bulkCourse;
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCourse && matchesSearch;
    });
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredBulkStudents();
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(s => s.uid || s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const activeSchedules = schedules.filter(s => isScheduleActive(s));
  
  // Set default location when modal opens
  React.useEffect(() => {
    if (showBulkModal && activeSchedules.length > 0 && !selectedLocationId) {
      setSelectedLocationId(activeSchedules[0].id);
    }
  }, [showBulkModal, activeSchedules, selectedLocationId]);

  const handleBulkMarkPresent = async () => {
    const targets = absentStudentsToday.filter(s => selectedIds.has(s.uid || s.id));
    if (targets.length === 0) return toast.error('No students selected.');

    const selectedLoc = schedules.find(s => s.id === selectedLocationId);
    const locationString = selectedLoc 
      ? `${selectedLoc.locationName} | ${selectedLoc.lat}, ${selectedLoc.lng}`
      : 'Campus';

    // Optimistic UI
    setIsProcessing(true);
    setShowBulkModal(false);
    toast.success(`Marking ${targets.length} students as present...`);

    try {
      const records = targets.map(s => ({
        userId: s.uid || s.id,
        userName: s.name,
        rollNo: s.rollNo,
        course: s.course,
        date: today,
        status: 'Present',
        location: locationString,
        locationName: selectedLoc?.locationName || 'Campus'
      }));

      await bulkMarkAttendance(records);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error('Failed to mark bulk attendance.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendReminder = async () => {
    if (!reminderMessage) return toast.error('Please enter a message.');

    // Optimistic UI
    setIsProcessing(true);
    setShowReminderModal(false);
    toast.success('Sending reminders...');

    try {
      if (reminderType === 'all') {
        // Use Global Broadcast (efficient: 1 row)
        await broadcastNotification({
          title: reminderTitle,
          message: reminderMessage.trim() || `Reminder for all students.`,
          type: 'announcement',
          sender_id: adminProfile?.id
        });
      } else {
        let rawTargets = [];
        if (reminderType === 'absent') {
          rawTargets = absentStudentsToday;
        } else {
          rawTargets = students.filter(s => s.course === reminderCourse);
        }

        const targets = rawTargets.filter(s => (s.uid || s.id));

        if (targets.length === 0) {
          toast.error('No students found for selected target.');
          setIsProcessing(false);
          return;
        }

        const notifications = targets.map(s => ({
          userId: s.uid || s.id,
          type: 'warning',
          title: reminderTitle,
          message: reminderMessage.trim(),
          senderId: adminProfile?.id,
          data: { sentAt: new Date().toISOString(), reminderType }
        }));

        await bulkAddNotifications(notifications);
      }
      setReminderMessage('');
    } catch (err: any) {
      console.error('[QuickActions] handleSendReminder error:', err);
      toast.error(`Failed to send reminders.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const uniqueCourses = ['All', ...Array.from(new Set(students.map(s => s.course).filter(Boolean)))];

  return (
    <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base font-bold text-gray-800 tracking-tight">Quick Actions</h3>
        <span className="text-[10px] font-black text-blue-500 bg-blue-50/50 px-2 py-0.5 rounded-full uppercase tracking-widest">Fast Track</span>
      </div>
      <p className="text-xs text-gray-500 mb-4 sm:mb-6 italic leading-relaxed">Perform common administrative tasks with a single click.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
        <button
          onClick={handleForceCheckout}
          disabled={isProcessing}
          className="group relative w-full bg-red-50 hover:bg-red-600 hover:text-white text-red-700 text-sm font-bold py-4 px-4 rounded-2xl transition-all duration-300 flex items-center justify-between overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white group-hover:bg-red-500/20 rounded-xl flex items-center justify-center transition-colors">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-black">Force Checkout</p>
              <p className="text-[10px] opacity-70">Close all active sessions</p>
            </div>
          </div>
          <Loader2 className={`w-4 h-4 animate-spin ${isProcessing ? 'opacity-100' : 'opacity-0'}`} />
        </button>

        <button
          onClick={() => setShowBulkModal(true)}
          className="group relative w-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-sm font-bold py-4 px-4 rounded-2xl transition-all duration-300 flex items-center justify-between overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white group-hover:bg-blue-500/20 rounded-xl flex items-center justify-center transition-colors">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-black">Bulk Present</p>
              <p className="text-[10px] opacity-70">Mark multiple students</p>
            </div>
          </div>
          <div className="w-8 h-8 bg-blue-100 group-hover:bg-blue-700 rounded-full flex items-center justify-center transition-colors">
            <span className="text-xs font-black">{absentStudentsToday.length}</span>
          </div>
        </button>

        <button
          onClick={() => setShowReminderModal(true)}
          className="group relative w-full bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-700 text-sm font-bold py-4 px-4 rounded-2xl transition-all duration-300 flex items-center justify-between overflow-hidden"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white group-hover:bg-orange-500/20 rounded-xl flex items-center justify-center transition-colors">
              <Bell className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-black">Send Reminders</p>
              <p className="text-[10px] opacity-70">Notify absent students</p>
            </div>
          </div>
          <Send className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>

      {/* Bulk Attendance Modal */}
      {showBulkModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <CheckSquare className="w-6 h-6 text-blue-600" />
                  Bulk Attendance
                </h3>
                <p className="text-xs text-gray-500 mt-1">Marking attendance for {today}</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Select Attendance Location
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {activeSchedules.length > 0 ? (
                    activeSchedules.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedLocationId(s.id)}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left ${
                          selectedLocationId === s.id 
                            ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                            : 'bg-white border-gray-100 hover:border-blue-100'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                          selectedLocationId === s.id ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400'
                        }`}>
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black truncate ${selectedLocationId === s.id ? 'text-blue-900' : 'text-gray-700'}`}>
                            {s.locationName || 'Unnamed Location'}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                            {s.autoActivate === false ? 'Manual Session' : 'Scheduled Window'}
                          </p>
                        </div>
                        {selectedLocationId === s.id && (
                          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 animate-in zoom-in-50 duration-200">
                            <CheckSquare className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-orange-900">No active windows</p>
                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-tight">Defaulting to Campus</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <CustomDropdown
                  options={uniqueCourses.map(c => ({ value: c, label: c }))}
                  value={bulkCourse}
                  onChange={setBulkCourse}
                  className="w-full sm:w-40"
                />
              </div>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Absent Students ({getFilteredBulkStudents().length})</span>
                  <button
                    onClick={toggleSelectAll}
                    className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors"
                  >
                    {selectedIds.size === getFilteredBulkStudents().length && selectedIds.size > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {getFilteredBulkStudents().length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-400 italic">No students found.</p>
                    </div>
                  ) : (
                    getFilteredBulkStudents().map(s => (
                      <div
                        key={s.uid || s.id}
                        onClick={() => toggleStudent(s.uid || s.id)}
                        className={`flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 transition-colors cursor-pointer ${selectedIds.has(s.uid || s.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] transition-colors overflow-hidden border ${selectedIds.has(s.uid || s.id) ? 'bg-blue-500 text-white border-blue-400' : 'bg-blue-100 text-blue-600 border-blue-50'
                            }`}>
                            {s.photoURL ? (
                              <img
                                src={s.photoURL}
                                alt={s.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(s.name || 'S')}`;
                                }}
                              />
                            ) : (
                              <span>{s.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{s.name}</p>
                            <p className="text-[10px] text-gray-500">{s.rollNo} • {s.course}</p>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${selectedIds.has(s.uid || s.id) ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'
                          }`}>
                          {selectedIds.has(s.uid || s.id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-50">
              <button
                onClick={handleBulkMarkPresent}
                disabled={isProcessing || selectedIds.size === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <CheckSquare className="w-5 h-5" />
                  Mark {selectedIds.size} Present
                </>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Reminder Modal */}
      {showReminderModal && createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                  <Bell className="w-6 h-6 text-orange-500" />
                  Send Reminder
                </h3>
                <p className="text-xs text-gray-500 mt-1">Notify students instantly</p>
              </div>
              <button onClick={() => setShowReminderModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Audience</label>
                <div className="flex flex-wrap gap-2">
                  {['all', 'absent', 'course'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setReminderType(type)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${reminderType === type
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {type === 'all' ? 'Everyone' : type === 'absent' ? 'Absent Today' : 'By Course'}
                    </button>
                  ))}
                </div>
              </div>

              {reminderType === 'course' && (
                <div className="space-y-2 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Course</label>
                  <CustomDropdown
                    options={uniqueCourses.filter(c => c !== 'All').map(c => ({ value: c, label: c }))}
                    value={reminderCourse}
                    onChange={setReminderCourse}
                    className="w-full"
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reminder Title</label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={e => setReminderTitle(e.target.value)}
                  placeholder="e.g. Attendance Warning"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message</label>
                <textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={e => setReminderMessage(e.target.value)}
                  placeholder="Type your reminder message here..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50/50 border-t border-gray-50">
              <button
                onClick={handleSendReminder}
                disabled={isProcessing || !reminderMessage}
                className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black shadow-lg shadow-orange-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>
                  <Send className="w-5 h-5" />
                  Send Reminder to {reminderType === 'all' ? 'All' : reminderType === 'absent' ? absentStudentsToday.length : 'Course'}
                </>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  );
}
