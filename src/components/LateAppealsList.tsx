import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Phone, ArrowUpRight } from 'lucide-react';
import { listenToCollection, updateAttendance } from '../services/dbService';
import toast from 'react-hot-toast';

export default function LateAppealsList() {
  const [appeals, setAppeals] = useState<any[]>([]);

  useEffect(() => {
    const unsub = listenToCollection('attendance', (data) => {
      // Filter for records with a pending late reason
      const filtered = data
        .filter(r => r.status === 'Late' && r.lateReason && r.lateReasonStatus === 'Pending')
        .sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
      setAppeals(filtered);
    });
    return () => unsub();
  }, []);

  const handleAction = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      await updateAttendance(id, {
        lateReasonStatus: newStatus,
        lateReasonReviewedAt: new Date().toISOString()
      });
      toast.success(`Appeal ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      toast.error('Failed to update appeal');
    }
  };

  if (appeals.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/30">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base leading-tight">Pending Late Appeals</h3>
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">Review {appeals.length} submissions</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {appeals.map((appeal) => (
          <div key={appeal.id} className="p-5 hover:bg-gray-50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {appeal.userName?.charAt(0) || 'S'}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 leading-tight">{appeal.userName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{appeal.rollNo} • {appeal.course}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">Time: {new Date(appeal.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                  <span className="text-[10px] text-orange-600 font-black uppercase">Pending Approval</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
              <p className="text-xs text-gray-600 font-medium italic leading-relaxed">
                "{appeal.lateReason}"
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleAction(appeal.id, 'Approved')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-[11px] font-black rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-200 uppercase tracking-tighter"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Approve
                </button>
                <button 
                  onClick={() => handleAction(appeal.id, 'Rejected')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-[11px] font-black rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-200 uppercase tracking-tighter"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </button>
              </div>
              
              <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Student Detail">
                 <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
