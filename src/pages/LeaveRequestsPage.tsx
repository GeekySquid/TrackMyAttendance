import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Plus, Calendar, Loader2, Trophy, AlertTriangle, User, Search, History } from 'lucide-react';
import LeaveReports from '../components/LeaveReports';
import StatCard from '../components/StatCard';
import { listenToCollection, addLeaveRequest, updateLeaveRequestStatus } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CustomDropdown from '../components/CustomDropdown';
import CustomDateInput from '../components/CustomDateInput';
import CustomInput from '../components/CustomInput';
import CustomTextarea from '../components/CustomTextarea';
import { Mail, MessageSquare as MessageSquareIcon, Briefcase, Info } from 'lucide-react';

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

  // Form state
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [activeTab, setActiveTab] = useState<'history' | 'apply'>('history');

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
      matchesTimeline = !!(start && end && start <= today && end >= today);
    } else if (timelineFilter === 'Upcoming') {
      matchesTimeline = !!(start && start > today);
    } else if (timelineFilter === 'Past') {
      matchesTimeline = !!(end && end < today);
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

  const handleSubmitRequest = async () => {
    if (!fromDate || !toDate || !reason || !user) return;

    try {
      await addLeaveRequest({
        userId: user.uid || user.id,
        userName: user.name,
        rollNo: user.rollNo,
        course: user.course || 'N/A',
        fromDate,
        toDate,
        type: leaveType,
        reason,
        status: 'Pending',
        appliedOn: new Date().toISOString(),
      });

      setActiveTab('history');
      setFromDate('');
      setToDate('');
      setReason('');
      toast.success("Leave request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit request:", err);
      toast.error("Failed to submit leave request. Please try again.");
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
    const loadingToast = toast.loading(`Approving ${idsToProcess.length} requests...`);
    
    setProcessingIds(prev => {
      const next = new Set(prev);
      idsToProcess.forEach(id => next.add(id));
      return next;
    });

    try {
      await Promise.all(idsToProcess.map(id => updateLeaveRequestStatus(id, 'Approved')));
      toast.success(`Successfully approved ${idsToProcess.length} requests`, { id: loadingToast });
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Failed to process some requests", { id: loadingToast });
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
      <div className="flex-1 mobile-container-padding">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              My Leave Requests
            </h2>
            <p className="text-sm text-gray-500 mt-2 font-medium">Apply for leave and track your request status in real-time.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID or Reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white shadow-sm"
              />
            </div>
            <button
              onClick={() => setActiveTab('apply')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Request Leave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
          <StatCard
            title="Leaves Taken" value={approvedCount.toString()} total="12" percentage={`${Math.round((approvedCount / 12) * 100)}%`} trend="This Year" trendUp={true}
            icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500"
          />
          <StatCard
            title="Available Balance" value={(12 - approvedCount).toString()} total="12" percentage={`${Math.round(((12 - approvedCount) / 12) * 100)}%`} trend="Current" trendUp={true}
            icon={<Trophy className="h-6 w-6 text-purple-500" />} colorClass="text-purple-500" bgClass="bg-purple-50" progressColorClass="bg-purple-500"
          />
          <StatCard
            title="Pending Approval" value={pendingCount.toString()} total={totalRequests.toString()} percentage={`${Math.round((pendingCount / totalRequests) * 100)}%`} trend="Current" trendUp={true}
            icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400"
          />
          <StatCard
            title="Rejected" value={rejectedCount.toString()} total={totalRequests.toString()} percentage={`${Math.round((rejectedCount / totalRequests) * 100)}%`} trend="This Year" trendUp={false}
            icon={<XCircle className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100/50 rounded-2xl mb-6 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'history' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My History
          </button>
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'apply' 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Apply Now
          </button>
        </div>

        {activeTab === 'history' ? (
          <div className="bg-transparent space-y-3">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50/90 z-10 backdrop-blur-md shadow-[0_1px_0_0_#f9fafb]">
                  <tr className="text-left text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="pb-2 px-6">Request ID</th>
                    <th className="pb-2 px-6">Leave Dates</th>
                    <th className="pb-2 px-6">Type & Reason</th>
                    <th className="pb-2 px-6">Applied On</th>
                    <th className="pb-2 px-6 text-center">Details</th>
                    <th className="pb-2 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {leaveRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">No leave requests found.</td>
                    </tr>
                  )}
                  {studentItems.map((leave, i) => (
                    <tr key={leave.id || i} className="text-[11px] sm:text-xs transition-all duration-500 hover:bg-blue-50/30">
                      <td className="py-2.5 px-6 sm:py-3 text-gray-500 font-bold">{leave.id?.substring(0, 8) || `LR-${i}`}</td>
                      <td className="py-2.5 px-6 sm:py-3 text-gray-600 font-bold">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          {(() => {
                            const f = new Date(leave.fromDate + 'T00:00:00');
                            const t = new Date(leave.toDate + 'T00:00:00');
                            return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                          })()}
                        </div>
                      </td>
                      <td className="py-2.5 px-6 sm:py-3">
                        <p className="font-bold text-gray-700">{leave.type}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 max-w-[200px] truncate">{leave.reason}</p>
                      </td>
                      <td className="py-2.5 px-6 sm:py-3 text-[10px] font-bold text-gray-400">
                        {(() => {
                          const d = new Date(leave.appliedOn);
                          if (isNaN(d.getTime())) return leave.appliedOn;
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        })()}
                      </td>
                      <td className="py-2.5 px-6 sm:py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toast.success(`Viewing ${leave.userName}'s Context`);
                          }}
                          className="p-2 hover:bg-blue-50 rounded-xl text-blue-500 transition-all hover:scale-110 active:scale-95 group/btn"
                          title="View Detailed History"
                        >
                          <History className="w-4 h-4 group-hover/btn:rotate-[-45deg] transition-transform duration-500" />
                        </button>
                      </td>
                      <td className="py-2.5 px-6 sm:py-3 text-right">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                            leave.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                              'bg-red-50 text-red-700 border-red-100'
                          }`}>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View: Premium High-Fidelity Design */}
            <div className="md:hidden space-y-4 pb-8 pr-1 touch-pan-y">
              {leaveRequests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center flex flex-col items-center border border-gray-100 shadow-sm">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No Leave Records</p>
                  <p className="text-[10px] text-gray-300 mt-1">Apply for leave to see them here.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {studentItems.map((leave, i) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={leave.id || i}
                      className={`bg-gradient-to-br p-4 rounded-3xl border shadow-sm transition-all active:scale-[0.98] ${leave.status === 'Approved' ? 'from-green-50/50 to-green-100/20 border-green-100/50' :
                          leave.status === 'Pending' ? 'from-orange-50/50 to-orange-100/20 border-orange-100/50' :
                            'from-red-50/50 to-red-100/20 border-red-100/50'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:rotate-6 ${leave.status === 'Approved' ? 'bg-green-500 text-white shadow-green-100' :
                              leave.status === 'Pending' ? 'bg-orange-500 text-white shadow-orange-100' :
                                'bg-red-500 text-white shadow-red-100'
                            }`}>
                            {leave.status === 'Approved' ? <CheckCircle className="w-4 h-4" /> :
                              leave.status === 'Pending' ? <Clock className="w-4 h-4" /> :
                                <XCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Status</p>
                            <h4 className={`text-xs font-black uppercase tracking-tight ${leave.status === 'Approved' ? 'text-green-900' :
                                leave.status === 'Pending' ? 'text-orange-900' :
                                  'text-red-900'
                              }`}>{leave.status}</h4>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Request ID</p>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">#{leave.id?.substring(0, 8) || i}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="bg-white/60 backdrop-blur-sm p-2.5 rounded-2xl border border-white/80 shadow-sm">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Leave Duration</span>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-black text-gray-800">
                              {(() => {
                                const f = new Date(leave.fromDate + 'T00:00:00');
                                const t = new Date(leave.toDate + 'T00:00:00');
                                return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                              })()}
                            </span>
                          </div>
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm p-2.5 rounded-2xl border border-white/80 shadow-sm">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 block">{leave.type}</span>
                          <p className="text-[10px] text-gray-600 leading-relaxed font-medium italic">"{leave.reason}"</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
            <div ref={studentSentinel} className="h-4" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden flex flex-col max-w-2xl mx-auto"
          >
            {/* Modal Header style but integrated */}
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
              <div className="relative z-10">
                <h3 className="text-2xl font-[950] tracking-tight mb-1">New Leave Application</h3>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-[0.2em]">Application Portal</p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">Leave Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'Casual Leave', label: 'Casual', icon: Briefcase, color: 'blue' },
                      { id: 'Sick Leave', label: 'Sick', icon: AlertTriangle, color: 'orange' },
                      { id: 'Emergency', label: 'Emergency', icon: Clock, color: 'purple' },
                      { id: 'Personal Leave', label: 'Personal', icon: User, color: 'indigo' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setLeaveType(type.id)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all group ${
                          leaveType === type.id 
                            ? `border-blue-600 bg-blue-50/50 shadow-md` 
                            : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                        }`}
                      >
                        <type.icon className={`w-5 h-5 ${leaveType === type.id ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className={`text-[10px] font-black uppercase tracking-tight ${leaveType === type.id ? 'text-blue-700' : 'text-gray-500'}`}>
                          {type.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <CustomDateInput
                    label="From Date"
                    value={fromDate}
                    onChange={setFromDate}
                  />
                  <CustomDateInput
                    label="To Date"
                    value={toDate}
                    onChange={setToDate}
                  />
                </div>

                <CustomTextarea
                  label="Application Reason"
                  icon={MessageSquareIcon}
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide detailed justification for your leave request..."
                />
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed uppercase tracking-wider">
                  Ensure all dates are correct. Requests submitted cannot be edited once pending.
                </p>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleSubmitRequest}
                disabled={!fromDate || !toDate || !reason}
                className="w-full py-5 bg-blue-600 text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:grayscale active:scale-95"
              >
                Submit Application
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // Admin View
  return (
    <div className="flex-1 mobile-container-padding">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-3xl font-[950] text-gray-800 tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-100">
                <FileText className="w-6 h-6" />
              </div>
              Leave Management
            </h2>
            <p className="text-sm text-gray-500 font-bold mt-1">Review and process student leave applications with full control</p>
          </div>

          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 bg-white p-2 pl-6 rounded-2xl border border-blue-100 shadow-xl shadow-blue-900/5"
              >
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedIds.size} Selected</p>
                <div className="h-8 w-px bg-gray-100 mx-1" />
                <button 
                  onClick={handleBulkApprove}
                  className="px-6 py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                >
                  Bulk Approve
                </button>
                <button 
                  onClick={() => setSelectedIds(new Set())}
                  className="px-4 py-2.5 text-gray-400 hover:text-gray-600 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6">
        <StatCard
          title="Total Requests" value={leaveRequests.length.toString()} total="50" percentage="90%" trend="" trendUp={true}
          icon={<FileText className="h-6 w-6 text-blue-600" />} colorClass="text-blue-600" bgClass="bg-blue-50" progressColorClass="bg-blue-500"
        />
        <StatCard
          title="Pending" value={pendingCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((pendingCount / Math.max(1, leaveRequests.length)) * 100)}%`} trend="" trendUp={true}
          icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400"
        />
        <StatCard
          title="Approved" value={approvedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((approvedCount / Math.max(1, leaveRequests.length)) * 100)}%`} trend="" trendUp={true}
          icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500"
        />
        <StatCard
          title="Rejected" value={rejectedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((rejectedCount / Math.max(1, leaveRequests.length)) * 100)}%`} trend="" trendUp={false}
          icon={<XCircle className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400"
        />
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:gap-8 mb-8 ${pendingCount > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {pendingCount > 0 && <LeaveReports />}
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col ${pendingCount > 0 ? 'lg:col-span-2' : ''}`}>
          <div className="p-3 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              Leave History
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ID, Name, Roll No..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <CustomDropdown
                options={[
                  { value: 'All Time', label: 'All Time' },
                  { value: 'Active Leaves', label: 'Currently Active' },
                  { value: 'Upcoming', label: 'Upcoming Only' },
                  { value: 'Past', label: 'Historical' }
                ]}
                value={timelineFilter}
                onChange={setTimelineFilter}
                className="w-full sm:w-40"
              />
              <CustomDropdown
                options={[
                  { value: 'All Courses', label: 'All Courses' },
                  ...Array.from(new Set(leaveRequests.map(r => r.course).filter(Boolean)))
                    .map(c => ({ value: c, label: c }))
                ]}
                value={courseFilter}
                onChange={setCourseFilter}
                className="w-full sm:w-40"
              />
              <CustomDropdown
                options={[
                  { value: 'All Types', label: 'All Types' },
                  { value: 'Casual Leave', label: 'Casual' },
                  { value: 'Sick Leave', label: 'Sick' },
                  { value: 'Emergency', label: 'Emergency' }
                ]}
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-full sm:w-40"
              />
              <CustomDropdown
                options={[
                  { value: 'All Status', label: 'All Status' },
                  { value: 'Approved', label: 'Approved' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Rejected', label: 'Decline' }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full sm:w-40"
              />
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden md:block table-fixed-height overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-50/90 z-20 backdrop-blur-md shadow-[0_1px_0_0_#f9fafb]">
                  <tr className="text-left text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="pb-2 px-6 w-12">
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pendingIds = filteredRequests.filter(r => r.status === 'Pending').map(r => r.id);
                            setSelectedIds(new Set(pendingIds));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.filter(r => r.status === 'Pending').length}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="pb-2 px-6">Student</th>
                    <th className="pb-2 px-6">Leave Dates</th>
                    <th className="pb-2 px-6">Reason</th>
                    <th className="pb-2 px-6 text-center">Details</th>
                    <th className="pb-2 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <>
                      <SkeletonLeaveRow cols={4} />
                      <SkeletonLeaveRow cols={4} />
                      <SkeletonLeaveRow cols={4} />
                    </>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 px-6 text-center text-gray-400 text-sm italic font-medium">No leave requests found.</td>
                    </tr>
                  ) : (
                    adminItems.map((req, i) => (
                      <tr key={req.id || i} className={`text-[11px] sm:text-xs transition-all duration-500 hover:bg-blue-50/30 ${selectedIds.has(req.id) ? 'bg-blue-50/50' : ''}`}>
                        <td className="py-2.5 px-6 sm:py-3 text-center">
                          {req.status === 'Pending' && (
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(req.id)}
                              onChange={() => toggleSelection(req.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-6 sm:py-3 text-gray-600 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px] shrink-0 overflow-hidden border border-blue-100 shadow-sm">
                              {req.userPhoto ? (
                                <img
                                  src={req.userPhoto}
                                  alt={req.userName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.userName || 'S')}`;
                                  }}
                                />
                              ) : (
                                <span>{req.userName?.charAt(0) || 'S'}</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{req.userName}</p>
                              <p className="text-[9px] text-gray-400 font-medium">{req.rollNo || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-6 sm:py-3 text-gray-600 font-bold">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                            {(() => {
                              const f = new Date(req.fromDate + 'T00:00:00');
                              const t = new Date(req.toDate + 'T00:00:00');
                              return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                            })()}
                          </div>
                        </td>
                        <td className="py-2.5 px-6 sm:py-3 text-gray-600 font-medium">
                          <p className="font-bold text-gray-700">{req.type}</p>
                          <p className="text-[10px] text-gray-500 max-w-[200px] truncate">{req.reason}</p>
                        </td>
                        <td className="py-2.5 px-6 sm:py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success(`Checking History for ${req.userName}`);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-xl text-blue-500 transition-all hover:scale-110 active:scale-95 group/btn"
                            title="View Student Context"
                          >
                            <History className="w-4 h-4 group-hover/btn:rotate-[-45deg] transition-transform duration-500" />
                          </button>
                        </td>
                        <td className="py-2.5 px-6 sm:py-3 text-right">
                          {req.status === 'Pending' ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'Approved')}
                                disabled={processingIds.has(req.id)}
                                className="px-3 py-1.5 bg-green-500 text-white hover:bg-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-green-100 transition-all active:scale-95 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                                disabled={processingIds.has(req.id)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                                'bg-red-50 text-red-700 border-red-100'
                              }`}>
                              {req.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div ref={adminSentinel} className="h-4" />
            </div>

            {/* Mobile Admin Request Cards - Ultra Compact & Responsive */}
            <div className="md:hidden p-3 space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar bg-gray-50/30">
              {filteredRequests.length === 0 ? (
                <div className="p-10 text-center text-gray-400 italic text-xs font-medium">No requests found.</div>
              ) : (
                adminItems.map((req, i) => (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={req.id || i}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px] border border-blue-100 shadow-sm">
                          {req.userName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-800 leading-none truncate w-[100px]">{req.userName}</p>
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{req.rollNo || 'N/A'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border shrink-0 ${req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
                          req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            'bg-red-50 text-red-700 border-red-100'
                        }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-gray-600 bg-blue-50/30 p-2 rounded-xl border border-blue-100/50 mb-3">
                      <Calendar className="w-3 h-3 text-blue-500" />
                      <span className="text-[10px] font-black tracking-tight">
                        {(() => {
                          const f = new Date(req.fromDate + 'T00:00:00');
                          const t = new Date(req.toDate + 'T00:00:00');
                          return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                        })()}
                      </span>
                    </div>

                    <div className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 mb-3">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{req.type}</p>
                      <p className="text-[10px] text-gray-600 italic leading-snug line-clamp-2">"{req.reason}"</p>
                    </div>

                    {req.status === 'Pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Approved')}
                          disabled={processingIds.has(req.id)}
                          className="flex-1 py-2 bg-green-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-green-100 active:scale-95 transition-all"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                          disabled={processingIds.has(req.id)}
                          className="flex-1 py-2 bg-white text-red-600 border border-red-100 rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
              <div ref={adminSentinel} className="h-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
