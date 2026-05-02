import React, { useEffect, useState } from 'react';
import { Umbrella, Briefcase, AlertTriangle, Clock, User, Info, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listenToCollection, addLeaveRequest } from '../services/dbService';
import CustomDropdown from './CustomDropdown';
import CustomDateInput from './CustomDateInput';
import CustomTextarea from './CustomTextarea';
import toast from 'react-hot-toast';

// Max quotas per leave type
const QUOTA: Record<string, number> = {
  'Casual Leave': 12,
  'Sick Leave': 8,
  'Emergency': 3,
};

const COLORS = {
  'Casual Leave': { color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500', border: 'border-blue-100' },
  'Sick Leave':   { color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500', border: 'border-orange-100' },
  'Emergency':    { color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500', border: 'border-purple-100' },
};

export default function StudentLeaveBalance({ userId }: { userId?: string }) {
  const navigate = useNavigate();
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingQuota, setEditingQuota] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!userId) return;
    
    // Check if current user is admin
    const checkAdmin = async () => {
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { getUserById } = await import('../services/dbService');
        const { data } = await getUserById(user.id);
        setIsAdmin(data?.role === 'admin');
      }
    };
    checkAdmin();

    const unsubLeaves = listenToCollection('leaveRequests', (data) => {
      setAllLeaves(data.filter((r: any) => r.userId === userId));
    }, userId);

    const unsubProfile = listenToCollection('users', (data) => {
      const userProf = data.find((u: any) => (u.id || u.uid) === userId);
      setProfile(userProf);
    });

    return () => {
      unsubLeaves();
      unsubProfile();
    };
  }, [userId]);

  const handleUpdateQuota = async (type: string, newValue: number) => {
    if (!userId || !profile) return;
    const { updateProfile } = await import('../services/dbService');
    
    const fieldMap: Record<string, string> = {
      'Casual Leave': 'casual_leave_quota',
      'Sick Leave': 'sick_leave_quota',
      'Emergency': 'emergency_leave_quota'
    };

    const success = await updateProfile(userId, {
      [fieldMap[type]]: newValue
    });

    if (success) {
      setEditingQuota(null);
    }
  };

  const approvedLeaves = allLeaves.filter(r => r.status === 'Approved');

  const quotas: Record<string, number> = {
    'Casual Leave': profile?.casual_leave_quota ?? 12,
    'Sick Leave': profile?.sick_leave_quota ?? 8,
    'Emergency': profile?.emergency_leave_quota ?? 3,
  };

  const balances = Object.entries(quotas).map(([type, total]) => {
    const used = approvedLeaves.filter((r) => r.type === type).length;
    const { color, bg, bar, border } = COLORS[type as keyof typeof COLORS];
    return { type, used, total, color, bg, bar, border };
  });

  const recentRequests = allLeaves
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  const handleSubmitInlineRequest = async () => {
    if (!fromDate || !toDate || !reason || !userId || !profile) return;
    setIsSubmitting(true);
    try {
      await addLeaveRequest({
        userId,
        userName: profile.name,
        rollNo: profile.rollNo,
        course: profile.course || 'N/A',
        fromDate,
        toDate,
        type: leaveType,
        reason,
        status: 'Pending',
        appliedOn: new Date().toISOString(),
      });

      setIsApplying(false);
      setFromDate('');
      setToDate('');
      setReason('');
      toast.success("Leave request submitted successfully!");
    } catch (err) {
      console.error("Failed to submit request:", err);
      toast.error("Failed to submit leave request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full min-h-[450px]">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          {isApplying ? (
            <button 
              onClick={() => setIsApplying(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors mr-1"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </button>
          ) : (
            <Umbrella className="w-4 h-4 text-blue-500" />
          )}
          <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest">
            {isApplying ? 'Apply for Leave' : 'Leave Control'}
          </h3>
        </div>
        {!isApplying && (
          <button 
            onClick={() => navigate('/leave-requests')}
            className="text-[10px] font-black text-blue-600 hover:underline"
          >
            View All
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isApplying ? (
          <div className="p-4 space-y-4">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Leave Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Casual Leave', label: 'Casual', icon: Briefcase },
                  { id: 'Sick Leave', label: 'Sick', icon: AlertTriangle },
                  { id: 'Emergency', label: 'Emergency', icon: Clock },
                  { id: 'Personal Leave', label: 'Personal', icon: User }
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setLeaveType(type.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                      leaveType === type.id 
                        ? `border-blue-500 bg-blue-50 text-blue-600` 
                        : 'border-gray-100 bg-gray-50/50 text-gray-500'
                    }`}
                  >
                    <type.icon className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomDateInput
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                className="text-[10px]"
              />
              <CustomDateInput
                label="To Date"
                value={toDate}
                onChange={setToDate}
                className="text-[10px]"
              />
            </div>

            <CustomTextarea
              label="Reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Specify the reason..."
              className="text-[10px]"
            />
          </div>
        ) : (
          <div className="p-4">
            {/* Compact Balance Grid */}
            <div className="grid grid-cols-1 gap-2 mb-6">
              {balances.map((leave, i) => {
                const percentage = Math.min((leave.used / leave.total) * 100, 100);
                return (
                  <div key={i} className={`p-3 rounded-xl border ${leave.border} ${leave.bg}/40 relative overflow-hidden group`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-tight ${leave.color}`}>{leave.type}</span>
                      
                      {isAdmin ? (
                        <div className="flex items-center gap-1 group/edit">
                          {editingQuota === leave.type ? (
                            <input
                              autoFocus
                              type="number"
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={() => handleUpdateQuota(leave.type, parseInt(tempValue))}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdateQuota(leave.type, parseInt(tempValue))}
                              className="w-10 bg-white border border-blue-400 rounded text-[10px] font-black px-1 outline-none"
                            />
                          ) : (
                            <button 
                              onClick={() => {
                                setEditingQuota(leave.type);
                                setTempValue(leave.total.toString());
                              }}
                              className="flex items-center gap-1 hover:bg-white/50 px-1.5 py-0.5 rounded transition-all"
                            >
                              <span className="text-[10px] font-black text-gray-900">{leave.used} / {leave.total}</span>
                              <svg className="w-2.5 h-2.5 text-blue-500 opacity-0 group-hover/edit:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-900">{leave.used} / {leave.total}</span>
                      )}
                    </div>
                    <div className="w-full bg-white/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-1000 ${leave.bar}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {/* Subtle Progress Label */}
                    <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className={`text-[8px] font-bold ${leave.color} bg-white px-1.5 rounded-full border ${leave.border}`}>
                        {Math.round(percentage)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent Status */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Recent Status</p>
              {recentRequests.length > 0 ? (
                <div className="space-y-2">
                  {recentRequests.map((req, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100/50">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-700">{req.type}</span>
                        <span className="text-[9px] text-gray-400">{new Date(req.fromDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center border-2 border-dashed border-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium italic">No recent requests</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-50 bg-white">
        {isApplying ? (
          <div className="flex gap-2">
            <button
              onClick={() => setIsApplying(false)}
              className="flex-1 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-widest border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitInlineRequest}
              disabled={isSubmitting || !fromDate || !toDate || !reason}
              className="flex-[2] py-2.5 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm Request'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsApplying(true)}
            className="w-full py-2.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95"
          >
            Apply for Leave
          </button>
        )}
      </div>
    </div>
  );
}
