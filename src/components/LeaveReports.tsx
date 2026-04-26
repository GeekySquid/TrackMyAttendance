import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listenToCollection, updateLeaveRequestStatus } from '../services/dbService';
import toast from 'react-hot-toast';

export default function LeaveReports() {
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = listenToCollection('leaveRequests', (data) => {
      try {
        const pending = (data || [])
          .filter(req => req.status === 'Pending')
          .sort((a, b) => {
            const timeA = a.appliedOn ? new Date(a.appliedOn).getTime() : 0;
            const timeB = b.appliedOn ? new Date(b.appliedOn).getTime() : 0;
            return timeB - timeA;
          });
        setPendingRequests(pending);
      } catch (err) {
        console.error("Error processing leave requests:", err);
        setPendingRequests([]);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id: string) => {
    if (!id || processingIds.has(id)) return;
    // Optimistic: remove from pending list immediately
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await updateLeaveRequestStatus(id, 'Approved');
      toast.success('Leave request approved');
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Failed to approve leave request. Please try again.");
      // Realtime will restore the list if failed
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  const handleDecline = async (id: string) => {
    if (!id || processingIds.has(id)) return;
    // Optimistic: remove from pending list immediately
    setPendingRequests(prev => prev.filter(r => r.id !== id));
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await updateLeaveRequestStatus(id, 'Rejected');
      toast.success('Leave request rejected');
    } catch (err) {
      console.error("Failed to decline:", err);
      toast.error("Failed to decline leave request. Please try again.");
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  return (
    <div className="col-span-1 bg-white rounded-3xl border border-gray-100/80 shadow-sm p-3 sm:p-5 flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            Leave Requests
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
          </h3>
          <p className="text-[10px] text-gray-500">Review pending reports</p>
        </div>
        <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-tighter">
          {pendingRequests.length} PENDING
        </span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        {isLoading ? (
          // Skeleton loaders
          [...Array(2)].map((_, i) => (
            <div key={i} className="animate-pulse flex flex-col space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gray-100" />
                <div className="space-y-1">
                  <div className="h-2.5 bg-gray-100 rounded w-24" />
                  <div className="h-2 bg-gray-100 rounded w-16" />
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded w-32" />
              <div className="flex space-x-2">
                <div className="flex-1 h-6 bg-gray-100 rounded-lg" />
                <div className="flex-1 h-6 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))
        ) : pendingRequests.length === 0 ? (
          <div className="text-center text-gray-400 text-xs py-8 italic">No pending requests</div>
        ) : (
          pendingRequests.slice(0, 3).map((report, idx) => (
            <div key={report.id || idx} className="flex flex-col space-y-2 group">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs border border-blue-50 overflow-hidden shadow-sm">
                  {report.userPhoto ? (
                    <img 
                      src={report.userPhoto} 
                      alt={report.userName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(report.userName || 'S')}`;
                      }}
                    />
                  ) : (
                    <span>{report.userName?.charAt(0) || 'S'}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 leading-tight">{report.userName}</p>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{report.type}</p>
                </div>
              </div>
              <div className="flex items-center text-[10px] text-gray-500 bg-gray-50/80 px-2 py-1 rounded-lg border border-gray-100/50 w-fit">
                <Clock className="h-3 w-3 mr-1.5 text-gray-400" />
                <span className="font-medium">{report.fromDate}</span>
                <span className="mx-1 text-gray-300">→</span>
                <span className="font-medium">{report.toDate}</span>
              </div>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => handleApprove(report.id)}
                  disabled={processingIds.has(report.id)}
                  className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 active:scale-95"
                >
                  <Check className="h-3 w-3 mr-1" /> Approve
                </button>
                <button
                  onClick={() => handleDecline(report.id)}
                  disabled={processingIds.has(report.id)}
                  className="flex-1 py-1.5 bg-white text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-50 active:scale-95"
                >
                  <X className="h-3 w-3 mr-1" /> Decline
                </button>
              </div>
              {idx < Math.min(pendingRequests.length, 3) - 1 && <div className="h-px bg-gray-50 mt-2" />}
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => navigate('/admin/leave-requests')}
        className="w-full mt-4 py-2 text-center text-[10px] font-black text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-[0.2em] border-t border-gray-50"
      >
        View All Requests
      </button>
    </div>
  );
}
