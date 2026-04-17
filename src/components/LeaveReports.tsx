import React, { useState, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listenToCollection, updateLeaveRequestStatus } from '../services/dbService';
import toast from 'react-hot-toast';

export default function LeaveReports() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = listenToCollection('leaveRequests', (data) => {
      try {
        const pending = (data || []).filter(req => req.status === 'Pending')
                            .sort((a, b) => {
                              const timeA = a.appliedOn ? new Date(a.appliedOn).getTime() : 0;
                              const timeB = b.appliedOn ? new Date(b.appliedOn).getTime() : 0;
                              return timeB - timeA;
                            });
        setPendingRequests(pending);
      } catch (err) {
        console.error("Error processing leave requests:", err);
        setPendingRequests([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    if (!id) return;
    try {
      await updateLeaveRequestStatus(id, 'Approved');
      toast.success('Leave request approved');
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Failed to approve leave request. Please try again.");
    }
  };

  const handleDecline = async (id: string) => {
    if (!id) return;
    try {
      await updateLeaveRequestStatus(id, 'Rejected');
      toast.success('Leave request rejected');
    } catch (err) {
      console.error("Failed to decline:", err);
      toast.error("Failed to decline leave request. Please try again.");
    }
  };

  return (
    <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-base font-bold text-gray-800">Leave Reports</h3>
          <p className="text-xs text-gray-500">Review and approve leave reports</p>
        </div>
        <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded whitespace-nowrap">
          {pendingRequests.length} pending
        </span>
      </div>
      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        {pendingRequests.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">No pending requests</div>
        ) : (
          pendingRequests.slice(0, 3).map((report, idx) => (
            <div key={report.id || idx} className="flex flex-col space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                  {report.userName?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{report.userName}</p>
                  <p className="text-[10px] text-gray-400">{report.type}</p>
                </div>
              </div>
              <div className="flex items-center text-[10px] text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {report.fromDate} to {report.toDate}
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleApprove(report.id)}
                  className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
                >
                  <Check className="h-3 w-3 mr-1" /> Approve
                </button>
                <button 
                  onClick={() => handleDecline(report.id)}
                  className="flex-1 py-1.5 bg-gray-50 text-gray-400 text-[10px] font-bold rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </button>
              </div>
              {idx < Math.min(pendingRequests.length, 3) - 1 && <hr className="border-gray-50" />}
            </div>
          ))
        )}
      </div>
      <button 
        onClick={() => navigate('/admin/leave-requests')}
        className="w-full mt-6 text-center text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
      >
        View All
      </button>
    </div>
  );
}
