import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, XCircle, Plus, Calendar, Loader2 } from 'lucide-react';
import LeaveReports from '../components/LeaveReports';
import StatCard from '../components/StatCard';
import { listenToCollection, addLeaveRequest, updateLeaveRequestStatus } from '../services/dbService';
import toast from 'react-hot-toast';

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
        appliedOn: new Date().toISOString().split('T')[0],
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

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              My Leave Requests
            </h2>
            <p className="text-sm text-gray-500">Apply for leave and track your request status.</p>
          </div>
          <button 
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            Request Leave
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <StatCard 
            title="Leaves Taken" value={approvedCount.toString()} total="12" percentage={`${Math.round((approvedCount/12)*100)}%`} trend="This Year" trendUp={true} 
            icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500" 
          />
          <StatCard 
            title="Pending Approval" value={pendingCount.toString()} total="-" percentage="0%" trend="Current" trendUp={true} 
            icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400" 
          />
          <StatCard 
            title="Rejected" value={rejectedCount.toString()} total="-" percentage="0%" trend="This Year" trendUp={false} 
            icon={<XCircle className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400" 
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-base font-bold text-gray-800">Leave History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 bg-gray-50/50">
                  <th className="px-6 py-4 font-bold">Request ID</th>
                  <th className="px-6 py-4 font-bold">Leave Dates</th>
                  <th className="px-6 py-4 font-bold">Type & Reason</th>
                  <th className="px-6 py-4 font-bold">Applied On</th>
                  <th className="px-6 py-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {leaveRequests.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">No leave requests found.</td>
                  </tr>
                )}
                {leaveRequests.map((leave, i) => (
                  <tr key={leave.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{leave.id?.substring(0, 8) || `LR-${i}`}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {leave.fromDate} to {leave.toDate}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-800">{leave.type}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{leave.reason}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{leave.appliedOn}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-bold ${
                        leave.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        leave.status === 'Pending' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          title="Total Requests" value={leaveRequests.length.toString()} total="50" percentage="90%" trend="+12" trendUp={true} 
          icon={<FileText className="h-6 w-6 text-blue-600" />} colorClass="text-blue-600" bgClass="bg-blue-50" progressColorClass="bg-blue-500" 
        />
        <StatCard 
          title="Pending" value={pendingCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((pendingCount/Math.max(1, leaveRequests.length))*100)}%`} trend="+2" trendUp={true} 
          icon={<Clock className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400" 
        />
        <StatCard 
          title="Approved" value={approvedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((approvedCount/Math.max(1, leaveRequests.length))*100)}%`} trend="+5" trendUp={true} 
          icon={<CheckCircle className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500" 
        />
        <StatCard 
          title="Rejected" value={rejectedCount.toString()} total={leaveRequests.length.toString()} percentage={`${Math.round((rejectedCount/Math.max(1, leaveRequests.length))*100)}%`} trend="-1" trendUp={false} 
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
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
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
                  filteredRequests.map((req, i) => (
                  <tr key={req.id || i} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{req.userName}</p>
                        <p className="text-xs text-gray-500">{req.rollNo || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 font-medium whitespace-nowrap">{req.fromDate} to {req.toDate}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-bold text-gray-800">{req.type}</p>
                      <p className="text-xs text-gray-500 max-w-[200px] truncate">{req.reason}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
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
          </div>
        </div>
      </div>
    </div>
  );
}
