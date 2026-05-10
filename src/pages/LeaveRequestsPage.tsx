import React, { useState, useEffect } from 'react';
import { 
  FileText, CheckCircle, Clock, XCircle, Plus, Calendar, Loader2, 
  Trophy, AlertTriangle, User, Search, History, Trash2, Briefcase, 
  MessageSquare as MessageSquareIcon, Info, Mail 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import LeaveReports from '../components/LeaveReports';
import StatCard from '../components/StatCard';
import { listenToCollection, addLeaveRequest, updateLeaveRequestStatus, bulkUpdateLeaveRequestStatus } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDropdown from '../components/CustomDropdown';
import CustomDateInput from '../components/CustomDateInput';
import CustomInput from '../components/CustomInput';
import CustomTextarea from '../components/CustomTextarea';

function SkeletonLeaveRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      {[...Array(cols)].map((_, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-gray-100 rounded" style={{ width: `${50 + (i * 17) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function LeaveRequestsPage({ role = 'admin', user }: { role?: 'admin' | 'student', user?: any }) {
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [timelineFilter, setTimelineFilter] = useState('All Time');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'apply'>('history');
  
  // Admin-specific state
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [targetStudentId, setTargetStudentId] = useState('');

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = listenToCollection('leaveRequests', (data) => {
      try {
        const sorted = (data || []).sort((a, b) => {
          const timeA = a.appliedOn ? new Date(a.appliedOn).getTime() : 0;
          const timeB = b.appliedOn ? new Date(b.appliedOn).getTime() : 0;
          return timeB - timeA;
        });
        setLeaveRequests(sorted);
      } catch (err) {
        console.error("Error processing leave requests:", err);
        setLeaveRequests([]);
      } finally {
        setIsLoading(false);
      }
    }, role === 'student' ? (user?.uid || user?.id) : undefined);

    return () => unsubscribe();
  }, [role, user]);

  useEffect(() => {
    if (role === 'admin') {
      const fetchStudents = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, roll_no, course')
          .eq('role', 'student')
          .order('name');
        
        if (data) {
          setAllStudents(data.map(s => ({
            id: s.id,
            name: s.name,
            rollNo: s.roll_no,
            course: s.course
          })));
        }
      };
      fetchStudents();
    }
  }, [role]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('apply') === 'true') {
      setActiveTab('apply');
      // Clean up URL without reload
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const filteredRequests = leaveRequests.filter(r => {
    const matchesStatus = statusFilter === 'All Status' || r.status === statusFilter;
    const matchesType = typeFilter === 'All Types' || r.type === typeFilter;
    const matchesCourse = courseFilter === 'All Courses' || r.course === courseFilter;

    // Timeline filtering
    let matchesTimeline = true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = r.fromDate ? new Date(r.fromDate) : null;
    const end = r.toDate ? new Date(r.toDate) : null;

    if (timelineFilter === 'Active Leaves') {
      matchesTimeline = !!(start && end && start.getTime() <= today.getTime() && end.getTime() >= today.getTime());
    } else if (timelineFilter === 'Upcoming') {
      matchesTimeline = !!(start && start.getTime() > today.getTime());
    } else if (timelineFilter === 'Past') {
      matchesTimeline = !!(end && end.getTime() < today.getTime());
    }

    const searchLower = searchQuery.toLowerCase();
    const shortId = r.id?.substring(0, 8).toLowerCase() || '';
    const name = r.userName?.toLowerCase() || '';
    const rollNo = r.rollNo?.toLowerCase() || '';
    const reason = r.reason?.toLowerCase() || '';
    const course = r.course?.toLowerCase() || '';

    const matchesSearch = !searchQuery ||
      shortId.includes(searchLower) ||
      name.includes(searchLower) ||
      rollNo.includes(searchLower) ||
      reason.includes(searchLower) ||
      course.includes(searchLower);

    return matchesStatus && matchesType && matchesCourse && matchesTimeline && matchesSearch;
  });

  const { visibleItems: studentItems, sentinelRef: studentSentinel } = useInfiniteScroll(filteredRequests, 10, 5);
  const { visibleItems: adminItems, sentinelRef: adminSentinel } = useInfiniteScroll(filteredRequests, 10, 5);

  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;
  const totalRequests = leaveRequests.length || 1;

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} records?`)) return;

    const idsToProcess = Array.from(selectedIds);
    const loadingToast = toast.loading(`Deleting ${idsToProcess.length} records...`);

    // Optimistic update
    setLeaveRequests(prev => prev.filter(r => !idsToProcess.includes(r.id)));
    setSelectedIds(new Set());

    try {
      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase.from('leave_requests').delete().in('id', idsToProcess);
      if (error) throw error;
      toast.success(`Successfully deleted ${idsToProcess.length} records`, { id: loadingToast });
    } catch (err) {
      toast.error("Failed to delete some records", { id: loadingToast });
    }
  };

  const handleSubmitRequest = async () => {
    if (!fromDate || !toDate || !reason) return;
    
    let targetUser = user;
    if (role === 'admin') {
      if (!targetStudentId) {
        toast.error("Please select a student first");
        return;
      }
      targetUser = allStudents.find(s => s.id === targetStudentId);
    }

    if (!targetUser) return;

    const tempRequest = {
      id: `lr-temp-${Date.now()}`,
      userId: targetUser.uid || targetUser.id,
      userName: targetUser.name,
      rollNo: targetUser.rollNo,
      course: targetUser.course || 'N/A',
      fromDate,
      toDate,
      type: leaveType,
      reason,
      status: role === 'admin' ? 'Approved' : 'Pending',
      appliedOn: new Date().toISOString(),
    };

    // Optimistic update
    setLeaveRequests(prev => [tempRequest, ...prev]);
    setActiveTab('history');
    const prevFrom = fromDate;
    const prevTo = toDate;
    const prevReason = reason;

    setFromDate('');
    setToDate('');
    setReason('');
    setTargetStudentId('');

    try {
      await addLeaveRequest(tempRequest);
      toast.success(role === 'admin' ? "Leave recorded successfully!" : "Leave request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit request:", err);
      toast.error("Failed to process leave. Please try again.");
      // Rollback
      setLeaveRequests(prev => prev.filter(r => r.id !== tempRequest.id));
      setFromDate(prevFrom);
      setToDate(prevTo);
      setReason(prevReason);
      setActiveTab('apply');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!id || !confirm("Are you sure you want to delete this leave request?")) return;
    
    // Optimistic
    setLeaveRequests(prev => prev.filter(r => r.id !== id));
    try {
      const { deleteLeaveRequest } = await import('../services/dbService');
      await deleteLeaveRequest(id);
      toast.success("Request deleted successfully");
    } catch (err) {
      toast.error("Failed to delete request");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    if (!id || processingIds.has(id)) return;
    // Optimistic update
    setLeaveRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await updateLeaveRequestStatus(id, status);
      toast.success(`Leave request ${status.toLowerCase()}`);
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error(`Failed to ${status.toLowerCase()} leave request.`);
      // Realtime will restore correct state
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const idsToProcess = Array.from(selectedIds);

    // Optimistic update
    setLeaveRequests(prev => prev.map(r => idsToProcess.includes(r.id) ? { ...r, status: 'Approved' } : r));
    setProcessingIds(prev => {
      const next = new Set(prev);
      idsToProcess.forEach(id => next.add(id));
      return next;
    });

    const loadingToast = toast.loading(`Approving ${idsToProcess.length} requests...`);
    setSelectedIds(new Set());

    try {
      await bulkUpdateLeaveRequestStatus(idsToProcess, 'Approved');
      toast.success(`Successfully approved ${idsToProcess.length} requests`, { id: loadingToast });
    } catch (err) {
      toast.error("Failed to process some requests", { id: loadingToast });
      // Realtime will reconcile, but we could rollback here if needed
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        idsToProcess.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (role === 'student') {
    return (
      <div className="flex-1 mobile-container-padding max-w-[1800px] mx-auto">
        {/* Compact Header & Action Bar */}
        <div className="mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                <FileText className="w-5 h-5 text-white" />
              </div>
              My Leave Requests
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-bold">Track and apply for your leaves</p>
          </div>

          <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto relative z-50">
            {activeTab === 'history' && (
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full lg:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-100 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all bg-white shadow-sm font-bold"
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <CustomDropdown
                    options={[
                      { value: 'All Status', label: 'All Status', icon: FileText },
                      { value: 'Approved', label: 'Approved', icon: CheckCircle },
                      { value: 'Pending', label: 'Pending', icon: Clock },
                      { value: 'Rejected', label: 'Rejected', icon: XCircle }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="min-w-[130px]"
                  />
                  
                  <CustomDropdown
                    options={[
                      { value: 'All Types', label: 'All Types', icon: Briefcase },
                      { value: 'Sick Leave', label: 'Sick Leave', icon: AlertTriangle },
                      { value: 'Casual Leave', label: 'Casual Leave', icon: User },
                      { value: 'Emergency', label: 'Emergency', icon: Clock },
                      { value: 'Duty Leave', label: 'Duty Leave', icon: CheckCircle }
                    ]}
                    value={typeFilter}
                    onChange={setTypeFilter}
                    className="min-w-[130px]"
                  />

                  <CustomDropdown
                    options={[
                      { value: 'All Time', label: 'All Time', icon: History },
                      { value: 'Active Leaves', label: 'Active', icon: Clock },
                      { value: 'Upcoming', label: 'Upcoming', icon: Calendar },
                      { value: 'Past', label: 'Past', icon: XCircle }
                    ]}
                    value={timelineFilter}
                    onChange={setTimelineFilter}
                    className="min-w-[130px]"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setActiveTab(activeTab === 'history' ? 'apply' : 'history')}
              className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-[11px] font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 whitespace-nowrap"
            >
              {activeTab === 'history' ? (
                <>
                  <Plus className="w-4 h-4" />
                  Request Leave
                </>
              ) : (
                <>
                  <History className="w-4 h-4" />
                  View History
                </>
              )}
            </button>
          </div>
        </div>

        {/* Mini Stat Strip - More Space Efficient */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Taken', value: approvedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
            { label: 'Balance', value: 12 - approvedCount, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-50' },
            { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' }
          ].map((stat, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={stat.label} 
              className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group hover:border-blue-100 transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} transition-transform group-hover:scale-110`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                <p className="text-base font-black text-gray-800 leading-none">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className={activeTab === 'history' ? 'lg:col-span-12' : 'lg:col-span-8'}>
            <AnimatePresence mode="wait">
              {activeTab === 'history' ? (
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {/* Desktop Table View - High Density */}
                  <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse table-fixed">
                      <thead className="bg-gray-50/50">
                        <tr className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">
                          <th className="py-4 px-6 w-32">Request ID</th>
                          <th className="py-4 px-6 w-1/4">Leave Duration</th>
                          <th className="py-4 px-6 w-1/3">Category & Rationale</th>
                          <th className="py-4 px-6 w-32">Applied On</th>
                          <th className="py-4 px-6 text-right w-32">Current Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leaveRequests.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center">
                              <div className="flex flex-col items-center justify-center opacity-40">
                                <Search className="w-8 h-8 mb-2" />
                                <p className="text-sm font-bold">No leave requests found</p>
                              </div>
                            </td>
                          </tr>
                        )}
                        {studentItems.map((leave, i) => (
                          <tr key={leave.id || i} className="group text-[11px] font-bold text-gray-600 hover:bg-blue-50/40 transition-all duration-300">
                            <td className="py-4 px-6">
                              <span className="font-black text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg">
                                #{leave.id?.substring(0, 8) || `LR-${i}`}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2.5 text-gray-900">
                                <div className="p-1.5 bg-blue-50 rounded-lg">
                                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <div>
                                  <span className="font-black block">
                                    {(() => {
                                      const f = new Date(leave.fromDate + 'T00:00:00');
                                      const t = new Date(leave.toDate + 'T00:00:00');
                                      return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                                    })()}
                                  </span>
                                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                    {Math.round((new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} Day(s)
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="space-y-1">
                                <p className="text-gray-900 font-black flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                  {leave.type}
                                </p>
                                <p className="text-[10px] text-gray-500 font-medium italic truncate max-w-xs group-hover:max-w-none transition-all duration-500">
                                  "{leave.reason}"
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-[10px] text-gray-400 font-black">
                              {(() => {
                                const d = new Date(leave.appliedOn);
                                return isNaN(d.getTime()) ? leave.appliedOn : d.toLocaleDateString();
                              })()}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                leave.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {leave.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View - High Fidelity */}
                  <div className="md:hidden space-y-4">
                    {studentItems.map((leave, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={leave.id || i}
                        className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm space-y-4"
                      >
                        <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg tracking-widest">
                            #{leave.id?.substring(0, 8) || 'LR-NEW'}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                            leave.status === 'Approved' ? 'bg-green-50 text-green-700' :
                            leave.status === 'Pending' ? 'bg-orange-50 text-orange-700' :
                            'bg-red-50 text-red-700'
                          }`}>
                            {leave.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-black text-gray-400 uppercase tracking-widest">Category</span>
                            <span className="font-bold text-gray-900">{leave.type}</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-black text-gray-400 uppercase tracking-widest">Duration</span>
                            <span className="font-bold text-gray-900 flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-blue-500" />
                              {leave.fromDate} - {leave.toDate}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 text-[10px]">
                            <span className="font-black text-gray-400 uppercase tracking-widest">Reason</span>
                            <p className="font-bold text-gray-700 bg-gray-50 p-3 rounded-xl italic leading-relaxed">
                              "{leave.reason}"
                            </p>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-black text-gray-400 uppercase tracking-widest">Applied</span>
                            <span className="font-bold text-gray-400">
                              {new Date(leave.appliedOn).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div ref={studentSentinel} className="h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="apply"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-hidden"
                >
                  <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative">
                    <div className="relative z-10">
                      <h3 className="text-xl font-black tracking-tight">Apply for Leave</h3>
                      <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest opacity-80">Fill in the details below</p>
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Plus className="w-20 h-20 rotate-12" />
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Category</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { id: 'Casual Leave', label: 'Casual', icon: Briefcase },
                          { id: 'Sick Leave', label: 'Sick', icon: AlertTriangle },
                          { id: 'Emergency', label: 'Emergency', icon: Clock },
                          { id: 'Personal Leave', label: 'Personal', icon: User }
                        ].map((type) => (
                          <button
                            key={type.id}
                            onClick={() => setLeaveType(type.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2 ${
                              leaveType === type.id 
                                ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-md scale-105' 
                                : 'border-gray-50 bg-gray-50/50 text-gray-400 hover:border-gray-100'
                            }`}
                          >
                            <type.icon className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CustomDateInput label="Start Date" value={fromDate} onChange={setFromDate} />
                      <CustomDateInput label="End Date" value={toDate} onChange={setToDate} />
                    </div>

                    <CustomTextarea
                      label="Application Reason"
                      icon={MessageSquareIcon}
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why do you need this leave?"
                    />

                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <Info className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-[9px] font-bold text-amber-700 uppercase tracking-wider leading-relaxed">
                        Requests are reviewed within 24 hours. Check history for updates.
                      </p>
                    </div>

                    <button
                      onClick={handleSubmitRequest}
                      disabled={!fromDate || !toDate || !reason}
                      className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                    >
                      Submit Application
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Sidebar - Desktop Only Tips/Info */}
          {activeTab === 'apply' && (
            <div className="hidden lg:block lg:col-span-4 space-y-4">
              <div className="bg-gray-900 rounded-[2rem] p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
                <h4 className="text-sm font-black mb-4 relative z-10">Application Tips</h4>
                <ul className="space-y-4 relative z-10">
                  {[
                    { title: 'Planned Leave', text: 'Apply at least 3 days in advance for casual leave.' },
                    { title: 'Emergency', text: 'Contact your mentor directly for urgent requests.' },
                    { title: 'Documentation', text: 'Keep medical certificates ready for sick leave over 2 days.' }
                  ].map((tip, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{tip.title}</p>
                        <p className="text-[11px] text-gray-400 leading-relaxed">{tip.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-800">Support</h4>
                    <p className="text-[10px] font-bold text-gray-500">Need help?</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed mb-4">
                  If you have issues with your leave balance, please contact the administration office.
                </p>
                <button className="w-full py-3 bg-white text-blue-600 text-[9px] font-black uppercase tracking-widest rounded-xl border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  Contact Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <div className="flex-1 mobile-container-padding max-w-[1800px] mx-auto w-full">
      {/* Action Header */}
      <div className="mb-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <FileText className="w-5 h-5 text-white" />
            </div>
            Leave Management
          </h2>
          <p className="text-xs text-gray-500 font-bold mt-1">Process student leave applications</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setActiveTab(activeTab === 'history' ? 'apply' : 'history')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-[11px] font-black rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
          >
            {activeTab === 'history' ? (
              <>
                <Plus className="w-4 h-4" />
                Add Leave Record
              </>
            ) : (
              <>
                <History className="w-4 h-4" />
                View History
              </>
            )}
          </button>
          
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 bg-white p-1 rounded-xl border border-blue-100 shadow-xl"
              >
                <button
                  onClick={handleBulkApprove}
                  className="px-4 py-2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg"
                >
                  Approve ({selectedIds.size})
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mini Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: leaveRequests.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Pending', value: pendingCount, icon: Clock, color: 'text-orange-400', bg: 'bg-orange-50' },
          { label: 'Approved', value: approvedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 group"
          >
            <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
              <p className="text-base font-black text-gray-800 leading-none">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {activeTab === 'history' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {pendingCount > 0 && (
              <div className="lg:col-span-3">
                <LeaveReports />
              </div>
            )}
            
            <div className={`${pendingCount > 0 ? 'lg:col-span-9' : 'lg:col-span-12'} bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col relative z-20`}>
              <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex flex-col sm:flex-row items-center gap-4 relative z-30">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Filter by name, roll or reason..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 bg-white font-bold transition-all"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2">
                    <CustomDropdown 
                      options={[
                        { value: 'All Status', label: 'All Status', icon: FileText },
                        { value: 'Approved', label: 'Approved', icon: CheckCircle },
                        { value: 'Pending', label: 'Pending', icon: Clock },
                        { value: 'Rejected', label: 'Rejected', icon: XCircle }
                      ]} 
                      value={statusFilter} 
                      onChange={setStatusFilter} 
                      className="w-40" 
                    />
                    <CustomDropdown 
                      options={[
                        { value: 'All Time', label: 'All Time', icon: History },
                        { value: 'Active Leaves', label: 'Active', icon: Clock },
                        { value: 'Upcoming', label: 'Upcoming', icon: Calendar },
                        { value: 'Past', label: 'Past', icon: Trash2 }
                      ]} 
                      value={timelineFilter} 
                      onChange={setTimelineFilter} 
                      className="w-40" 
                    />
                  </div>
                </div>
              </div>

              {/* Desktop Table View - High Density */}
              <div className="hidden md:block overflow-x-auto relative z-10">
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                      <th className="py-4 px-6 w-12">
                        <input
                          type="checkbox"
                          onChange={(e) => setSelectedIds(e.target.checked ? new Set(filteredRequests.map(r => r.id)) : new Set())}
                          checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.length}
                          className="w-4 h-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500/20 transition-all"
                        />
                      </th>
                      <th className="py-4 px-6 w-1/4">Student Info</th>
                      <th className="py-4 px-6 w-1/4">Duration & Type</th>
                      <th className="py-4 px-6 w-1/3">Reason for Leave</th>
                      <th className="py-4 px-6 text-right w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {adminItems.map((req, i) => (
                      <tr key={req.id || i} className="group text-[11px] font-bold text-gray-600 hover:bg-blue-50/40 transition-all duration-300">
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={() => toggleSelection(req.id)}
                            className="w-4 h-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500/20 transition-all"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50 overflow-hidden shadow-sm flex items-center justify-center text-[10px] font-black text-blue-600 group-hover:scale-110 transition-transform duration-300">
                                {req.userPhoto ? <img src={req.userPhoto} className="w-full h-full object-cover" /> : req.userName?.charAt(0)}
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-50">
                                <div className={`w-2 h-2 rounded-full ${req.status === 'Approved' ? 'bg-green-500' : req.status === 'Pending' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
                              </div>
                            </div>
                            <div className="min-w-0">
                              <p className="text-gray-900 font-black leading-tight truncate">{req.userName}</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wider font-black mt-0.5">{req.rollNo || 'ID: UNKNOWN'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-gray-900">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span className="font-black">{req.fromDate}</span>
                              <span className="text-gray-300">→</span>
                              <span className="font-black">{req.toDate}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">
                                {req.type || 'General'}
                              </span>
                              <span className="text-[8px] text-gray-400 font-bold">Applied: {new Date(req.appliedOn).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="max-w-xs xl:max-w-md">
                            <p className="text-gray-600 italic line-clamp-2 leading-relaxed bg-gray-50/50 p-2 rounded-lg border border-gray-100/30 group-hover:bg-white transition-colors">
                              "{req.reason}"
                            </p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <button 
                                onClick={() => handleUpdateStatus(req.id, 'Approved')} 
                                className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200 hover:scale-110 active:scale-95 transition-all"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(req.id, 'Rejected')} 
                                className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200 hover:scale-110 active:scale-95 transition-all"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              req.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {req.status === 'Approved' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {req.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile Card View - High Fidelity Admin */}
              <div className="md:hidden divide-y divide-gray-100">
                {adminItems.map((req, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={req.id || i}
                    className="p-6 space-y-5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 overflow-hidden shadow-sm flex items-center justify-center text-xs font-black text-blue-600">
                          {req.userPhoto ? <img src={req.userPhoto} className="w-full h-full object-cover" /> : req.userName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-gray-900 leading-none mb-1">{req.userName}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{req.rollNo || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(req.id)}
                          onChange={() => toggleSelection(req.id)}
                          className="w-5 h-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Duration</span>
                        <span className="font-bold text-gray-800 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {req.fromDate} - {req.toDate}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Category</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-black uppercase tracking-tighter">{req.type}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="font-black text-gray-400 uppercase tracking-widest text-[11px]">Reason</span>
                        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 italic text-[11px] font-bold text-gray-700 leading-relaxed">
                          "{req.reason}"
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-black text-gray-400 uppercase tracking-widest">Status</span>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${
                          req.status === 'Approved' ? 'bg-green-50 text-green-700' : 
                          req.status === 'Pending' ? 'bg-orange-50 text-orange-700' : 
                          'bg-red-50 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Approved')}
                          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                          className="flex-1 py-4 bg-white text-red-600 border border-red-100 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              <div ref={adminSentinel} className="h-4" />
            </div>
          </div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-blue-900/5 overflow-hidden max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12"
        >
          <div className="md:col-span-4 bg-gray-900 p-8 text-white relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <h3 className="text-xl font-black mb-2">Record Leave</h3>
              <p className="text-gray-400 text-xs leading-relaxed font-medium">Manually record student leave in the system. These records are pre-approved.</p>
            </div>
            <div className="mt-8 space-y-4 relative z-10">
              {[
                { icon: User, text: 'Select a student' },
                { icon: Calendar, text: 'Choose dates' },
                { icon: CheckCircle, text: 'Confirm & save' }
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-gray-500">
                  <div className="w-6 h-6 rounded-lg bg-gray-800 flex items-center justify-center"><step.icon className="w-3 h-3" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{step.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-8 p-8 space-y-6">
            <div className="grid grid-cols-1 gap-5">
              <div className="relative z-[60]">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block ml-1">Student</label>
                <CustomDropdown
                  options={allStudents.map(s => ({
                    value: s.id,
                    label: `${s.name} (${s.rollNo})`,
                    icon: User
                  }))}
                  value={targetStudentId}
                  onChange={setTargetStudentId}
                  placeholder="-- Select Student --"
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CustomDateInput label="Start Date" value={fromDate} onChange={setFromDate} />
                <CustomDateInput label="End Date" value={toDate} onChange={setToDate} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Casual Leave', 'Sick Leave', 'Emergency', 'Personal Leave'].map((t) => (
                    <button
                      key={t}
                      onClick={() => setLeaveType(t)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase whitespace-nowrap border-2 transition-all ${
                        leaveType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-400 border-gray-50 hover:border-gray-100'
                      }`}
                    >
                      {t.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              <CustomTextarea
                label="Reason"
                icon={MessageSquareIcon}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for record..."
              />

              <button
                onClick={handleSubmitRequest}
                disabled={!fromDate || !toDate || !reason || !targetStudentId}
                className="w-full py-4 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 mt-2"
              >
                Record Leave
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
