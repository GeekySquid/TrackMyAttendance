import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Plus, Calendar, Loader2, Trophy } from 'lucide-react';
import LeaveReports from '../components/LeaveReports';
import StatCard from '../components/StatCard';
import { listenToCollection, addLeaveRequest, updateLeaveRequestStatus } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('All Status');
  
  // Form state
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

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

  const { visibleItems: studentItems, sentinelRef: studentSentinel } = useInfiniteScroll(leaveRequests, 10, 5);

  const handleSubmitRequest = async () => {
    if (!fromDate || !toDate || !reason || !user) return;
    
    try {
      await addLeaveRequest({
        userId: user.uid || user.id,
        userName: user.name,
        rollNo: user.rollNo,
        fromDate,
        toDate,
        type: leaveType,
        reason,
        status: 'Pending',
        appliedOn: new Date().toISOString(),
      });
      
      setShowRequestModal(false);
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

    if (role === 'student') {
      const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
      const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
      const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;
      const totalRequests = leaveRequests.length || 1;

      return (
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                My Leave Requests
              </h2>
              <p className="text-sm text-gray-500 mt-2 font-medium">Apply for leave and track your request status in real-time.</p>
            </div>
            <button 
              onClick={() => setShowRequestModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white text-sm font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              Request Leave
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
            <StatCard 
              title="Leaves Taken" value={approvedCount.toString()} total="12" percentage={`${Math.round((approvedCount/12)*100)}%`} trend="This Year" trendUp={true} 
              icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500" 
            />
            <StatCard 
              title="Available Balance" value={(12 - approvedCount).toString()} total="12" percentage={`${Math.round(((12 - approvedCount)/12)*100)}%`} trend="Current" trendUp={true} 
              icon={<Trophy className="h-6 w-6 text-purple-500" />} colorClass="text-purple-500" bgClass="bg-purple-50" progressColorClass="bg-purple-500" 
            />
            <StatCard 
              title="Pending Approval" value={pendingCount.toString()} total={totalRequests.toString()} percentage={`${Math.round((pendingCount/totalRequests)*100)}%`} trend="Current" trendUp={true} 
              icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400" 
            />
            <StatCard 
              title="Rejected" value={rejectedCount.toString()} total={totalRequests.toString()} percentage={`${Math.round((rejectedCount/totalRequests)*100)}%`} trend="This Year" trendUp={false} 
              icon={<XCircle className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400" 
            />
          </div>

        <div className="bg-transparent space-y-3">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 backdrop-blur-md">
                <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400">
                  <th className="px-6 py-4 font-black">Request ID</th>
                  <th className="px-6 py-4 font-black">Leave Dates</th>
                  <th className="px-6 py-4 font-black">Type & Reason</th>
                  <th className="px-6 py-4 font-black">Applied On</th>
                  <th className="px-6 py-4 font-black text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm italic">No leave requests found.</td>
                  </tr>
                )}
                {studentItems.map((leave, i) => (
                  <tr key={leave.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-gray-500">{leave.id?.substring(0, 8) || `LR-${i}`}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {(() => {
                          const f = new Date(leave.fromDate + 'T00:00:00');
                          const t = new Date(leave.toDate + 'T00:00:00');
                          return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-gray-800">{leave.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{leave.reason}</p>
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-gray-400">
                      {(() => {
                        const d = new Date(leave.appliedOn);
                        if (isNaN(d.getTime())) return leave.appliedOn;
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' :
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
          <div className="md:hidden space-y-4 max-h-[calc(100vh-380px)] overflow-y-auto pb-8 pr-1 touch-pan-y custom-scrollbar">
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
                    className={`bg-gradient-to-br p-4 rounded-3xl border shadow-sm transition-all active:scale-[0.98] ${
                      leave.status === 'Approved' ? 'from-green-50/50 to-green-100/20 border-green-100/50' :
                      leave.status === 'Pending' ? 'from-orange-50/50 to-orange-100/20 border-orange-100/50' :
                      'from-red-50/50 to-red-100/20 border-red-100/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-transform group-hover:rotate-6 ${
                          leave.status === 'Approved' ? 'bg-green-500 text-white shadow-green-100' :
                          leave.status === 'Pending' ? 'bg-orange-500 text-white shadow-orange-100' :
                          'bg-red-500 text-white shadow-red-100'
                        }`}>
                          {leave.status === 'Approved' ? <CheckCircle className="w-4 h-4" /> : 
                           leave.status === 'Pending' ? <Clock className="w-4 h-4" /> : 
                           <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Status</p>
                          <h4 className={`text-xs font-black uppercase tracking-tight ${
                            leave.status === 'Approved' ? 'text-green-900' :
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

                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span className="text-[9px] font-black uppercase tracking-tighter italic">
                            Applied: {(() => {
                              const d = new Date(leave.appliedOn);
                              if (isNaN(d.getTime())) return leave.appliedOn;
                              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                            })()}
                          </span>
                        </div>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          <div ref={studentSentinel} className="h-4" />
        </div>

        {/* Request Leave Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Request Leave</h3>
                <button onClick={() => setShowRequestModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Leave Type</label>
                  <select 
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option>Casual Leave</option>
                    <option>Sick Leave</option>
                    <option>Emergency</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Reason</label>
                  <textarea 
                    rows={3} 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
                    placeholder="Please specify the reason for your leave..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setShowRequestModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                <button 
                  onClick={handleSubmitRequest} 
                  disabled={!fromDate || !toDate || !reason}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin View
  const approvedCount = leaveRequests.filter(r => r.status === 'Approved').length;
  const pendingCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const rejectedCount = leaveRequests.filter(r => r.status === 'Rejected').length;

  const filteredRequests = statusFilter === 'All Status' 
    ? leaveRequests 
    : leaveRequests.filter(r => r.status === statusFilter);

  const { visibleItems: adminItems, sentinelRef: adminSentinel } = useInfiniteScroll(filteredRequests, 10, 5);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Leave Requests</h2>
            <p className="text-sm text-gray-500">Manage student leave applications</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard 
          title="Total Requests" value={leaveRequests.length.toString()} total="50" percentage="90%" trend="" trendUp={true} 
          icon={<FileText className="h-6 w-6 text-blue-600" />} colorClass="text-blue-600" bgClass="bg-blue-50" progressColorClass="bg-blue-500" 
        />
        <StatCard 
          title="Pending" value={pendingCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((pendingCount/Math.max(1, leaveRequests.length))*100)}%`} trend="" trendUp={true} 
          icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400" 
        />
        <StatCard 
          title="Approved" value={approvedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((approvedCount/Math.max(1, leaveRequests.length))*100)}%`} trend="" trendUp={true} 
          icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500" 
        />
        <StatCard 
          title="Rejected" value={rejectedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((rejectedCount/Math.max(1, leaveRequests.length))*100)}%`} trend="" trendUp={false} 
          icon={<XCircle className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <LeaveReports />
        <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              Leave History
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
            </h3>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-600 font-medium"
            >
              <option>All Status</option>
              <option>Approved</option>
              <option>Pending</option>
              <option>Rejected</option>
            </select>
          </div>
          <div className="table-fixed-height flex-1">
            <table className="w-full text-left border-collapse table-responsive">
              <thead className="sticky top-0 z-20 bg-gray-50/50 backdrop-blur-md">
                <tr className="border-b border-gray-100">
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Student</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Leave Dates</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase">Reason</th>
                  <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <>
                    <SkeletonLeaveRow cols={4} />
                    <SkeletonLeaveRow cols={4} />
                    <SkeletonLeaveRow cols={4} />
                  </>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 px-4 text-center text-gray-500 text-sm">No leave requests found.</td>
                  </tr>
                ) : (
                  adminItems.map((req, i) => (
                  <tr key={req.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4" data-label="Student">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs shrink-0 overflow-hidden border border-blue-50">
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
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-800">{req.userName}</p>
                          <p className="text-xs text-gray-500">{req.rollNo || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium whitespace-nowrap" data-label="Leave Dates">
                      {(() => {
                        const f = new Date(req.fromDate + 'T00:00:00');
                        const t = new Date(req.toDate + 'T00:00:00');
                        return `${String(f.getDate()).padStart(2, '0')}/${String(f.getMonth() + 1).padStart(2, '0')}/${f.getFullYear()} - ${String(t.getDate()).padStart(2, '0')}/${String(t.getMonth() + 1).padStart(2, '0')}/${t.getFullYear()}`;
                      })()}
                    </td>
                    <td className="py-3 px-4" data-label="Reason">
                      <p className="text-sm font-bold text-gray-800 text-left">{req.type}</p>
                      <p className="text-xs text-gray-500 max-w-[200px] truncate text-left">{req.reason}</p>
                    </td>
                    <td className="py-3 px-4 text-right" data-label="Status">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Approved')}
                            disabled={processingIds.has(req.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {processingIds.has(req.id) && <Loader2 className="w-3 h-3 animate-spin" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                            disabled={processingIds.has(req.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          req.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
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
        </div>
      </div>
    </div>
  );
}
