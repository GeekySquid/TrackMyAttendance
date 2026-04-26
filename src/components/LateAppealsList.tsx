import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, ArrowUpRight, Loader2 } from 'lucide-react';
import { listenToCollection, updateAttendance } from '../services/dbService';
import toast from 'react-hot-toast';

export default function LateAppealsList() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(true);
    const unsub = listenToCollection('attendance', (data) => {
      const filtered = data
        .filter(r => r.status === 'Late' && r.lateReason && r.lateReasonStatus === 'Pending')
        .sort((a, b) => {
          const tA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          const tB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          return tB - tA;
        });
      setAppeals(filtered);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAction = async (id: string, newStatus: 'Approved' | 'Rejected') => {
    if (processingIds.has(id)) return;

    // Optimistic update — remove from list immediately
    setAppeals(prev => prev.filter(a => a.id !== id));
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      await updateAttendance(id, {
        lateReasonStatus: newStatus,
        lateReasonReviewedAt: new Date().toISOString(),
      });
      toast.success(`Appeal ${newStatus.toLowerCase()} successfully`);
    } catch (err) {
      toast.error('Failed to update appeal');
      // Realtime will restore correct state
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-pulse">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20" />
          <div className="space-y-2">
            <div className="h-3 bg-white/30 rounded w-36" />
            <div className="h-2.5 bg-white/20 rounded w-24" />
          </div>
        </div>
        <div className="p-5 space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100" />
                <div className="space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-28" />
                  <div className="h-2.5 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="h-8 bg-gray-100 rounded-xl" />
              <div className="flex gap-2">
                <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
                <div className="flex-1 h-8 bg-gray-100 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
            <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest">
              Review {appeals.length} submission{appeals.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
        {appeals.map((appeal) => (
          <div key={appeal.id} className="p-5 hover:bg-gray-50 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-all overflow-hidden">
                  {appeal.userPhoto ? (
                    <img 
                      src={appeal.userPhoto} 
                      alt={appeal.userName} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(appeal.userName || 'S')}`;
                      }}
                    />
                  ) : (
                    <span>{appeal.userName?.charAt(0) || 'S'}</span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800 leading-tight">{appeal.userName}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{appeal.rollNo} • {appeal.course}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-bold uppercase">
                  Time: {appeal.checkInTime ? new Date(appeal.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}
                </p>
                <div className="flex items-center gap-1 justify-end mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[10px] text-orange-600 font-black uppercase">Pending Approval</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100 group-hover:bg-white group-hover:border-blue-100 transition-all">
              <p className="text-xs text-gray-600 font-medium italic leading-relaxed">
                "{appeal.lateReason}"
              </p>
              {appeal.lateReasonImage && (
                <img
                  src={appeal.lateReasonImage}
                  alt="Late evidence"
                  className="mt-3 w-full h-20 object-cover rounded-lg border border-gray-100"
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction(appeal.id, 'Approved')}
                  disabled={processingIds.has(appeal.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 text-[11px] font-black rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-200 uppercase tracking-tighter disabled:opacity-50"
                >
                  {processingIds.has(appeal.id) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => handleAction(appeal.id, 'Rejected')}
                  disabled={processingIds.has(appeal.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 text-[11px] font-black rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-200 uppercase tracking-tighter disabled:opacity-50"
                >
                  {processingIds.has(appeal.id) ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
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
