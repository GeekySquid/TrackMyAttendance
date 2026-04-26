import React, { useEffect, useState } from 'react';
import { Umbrella } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { listenToCollection } from '../services/dbService';

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
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    const unsub = listenToCollection('leaveRequests', (data) => {
      // Only approved leaves for this user count against balance
      setLeaveRequests(data.filter((r: any) => r.userId === userId && r.status === 'Approved'));
    }, userId);
    return () => unsub();
  }, [userId]);

  const leaves = Object.entries(QUOTA).map(([type, total]) => {
    const used = leaveRequests.filter((r) => r.type === type).length;
    const { color, bg, bar, border } = COLORS[type as keyof typeof COLORS];
    return { type, used, total, color, bg, bar, border };
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <Umbrella className="w-4 h-4 text-gray-400" />
        <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Leave Balance</h3>
      </div>
      <div className="p-3 space-y-2 flex-1">
        {leaves.map((leave, i) => {
          const percentage = Math.min((leave.used / leave.total) * 100, 100);
          return (
            <div key={i} className={`p-2.5 rounded-xl border ${leave.border} ${leave.bg}`}>
              <div className="flex justify-between items-center mb-1.5">
                <span className={`text-[11px] font-bold ${leave.color}`}>{leave.type}</span>
                <span className="text-[10px] font-black text-gray-800">{leave.used} / {leave.total}</span>
              </div>
              <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${leave.bar}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 mt-auto">
        <button
          onClick={() => navigate('/leave-requests')}
          className="w-full py-2 border border-dashed border-gray-300 text-gray-600 text-[11px] font-bold rounded-lg hover:bg-gray-50 transition-colors"
        >
          Apply for Leave
        </button>
      </div>
    </div>
  );
}
