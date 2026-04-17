import React from 'react';
import { Umbrella } from 'lucide-react';

const leaves = [
  { type: 'Casual Leave', used: 2, total: 12, color: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500' },
  { type: 'Sick Leave', used: 1, total: 8, color: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500' },
  { type: 'Emergency', used: 0, total: 3, color: 'text-purple-600', bg: 'bg-purple-50', bar: 'bg-purple-500' },
];

export default function StudentLeaveBalance() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full flex flex-col">
      <h3 className="text-base font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Umbrella className="w-5 h-5 text-gray-400" />
        Leave Balance
      </h3>
      <div className="space-y-4 flex-1">
        {leaves.map((leave, i) => {
          const percentage = (leave.used / leave.total) * 100;
          return (
            <div key={i} className={`p-4 rounded-lg border border-gray-100 ${leave.bg}`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm font-bold ${leave.color}`}>{leave.type}</span>
                <span className="text-xs font-bold text-gray-700">{leave.total - leave.used} Left</span>
              </div>
              <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden mb-1">
                <div 
                  className={`h-2 rounded-full ${leave.bar}`} 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-gray-500 text-right">{leave.used} of {leave.total} used</p>
            </div>
          );
        })}
      </div>
      <button className="w-full mt-6 py-2.5 border border-dashed border-gray-300 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors">
        Apply for Leave
      </button>
    </div>
  );
}
