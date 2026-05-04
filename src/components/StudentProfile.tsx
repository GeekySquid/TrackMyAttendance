import { ChevronDown, Mail, FileDigit, Copy, Trophy, Sparkles, Download, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateCertificate } from '../utils/generateCertificate';
import toast from 'react-hot-toast';

export default function StudentProfile({ student, isAdmin, onToggleAward, onClose, onNavigate, isLoading }: { student?: any, isAdmin?: boolean, onToggleAward?: (id: string, current: boolean) => void, onClose?: () => void, onNavigate?: (dir: 'next' | 'prev') => void, isLoading?: boolean }) {
  if (isLoading && !student) {
    return (
      <div className="col-span-1 bg-white rounded-3xl border border-gray-100 shadow-xl p-8 relative overflow-hidden animate-pulse">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-gray-100 mb-4" />
          <div className="h-4 bg-gray-100 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-50 rounded w-20" />
        </div>
        <div className="space-y-6">
          <div className="h-16 bg-gray-50 rounded-2xl w-full" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-gray-50 rounded-xl" />
            <div className="h-12 bg-gray-50 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-50 rounded-xl w-full" />
            <div className="h-10 bg-gray-50 rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="col-span-1 bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <UserCheck className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">No Student Selected</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">Select a student from the list to view their full profile details.</p>
      </div>
    );
  }

  const displayStudent = student;

  return (
    <div className="col-span-1 bg-white rounded-3xl border border-gray-100 shadow-xl p-5 sm:p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-gray-900 leading-none">Profile Detail</h3>
        </div>
        <div className="flex items-center gap-2">
          {onNavigate && (
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-1">
              <button
                onClick={() => onNavigate('prev')}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>
              <div className="w-px h-4 bg-gray-200 mx-1" />
              <button
                onClick={() => onNavigate('next')}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Download className="h-5 w-5 rotate-180" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center text-center mb-5 relative z-10">
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 animate-pulse"></div>
          <img
            alt={displayStudent.name}
            className="w-20 h-20 rounded-2xl border-4 border-white shadow-xl object-cover relative z-10 ring-1 ring-gray-100"
            src={displayStudent.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayStudent.name}`}
          />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full z-20 shadow-md"></span>
        </div>

        {displayStudent.isAwardWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative mb-4 flex justify-center group"
          >
            <div className="relative inline-flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-md border border-amber-200/50 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm">
              <Trophy className="w-3 h-3 text-amber-500" />
              <span className="bg-gradient-to-r from-amber-600 to-red-600 bg-clip-text text-transparent font-black">Student of the Month</span>
            </div>
          </motion.div>
        )}

        <h4 className="text-lg font-black text-gray-900 tracking-tight">{displayStudent.name}</h4>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">{displayStudent.course || 'General'}</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase">{displayStudent.rollNo || 'N/A'}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-3 bg-gradient-to-br from-gray-50/50 to-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-1.5">
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Attendance Rate</p>
            <span className={`text-lg font-black ${parseInt(displayStudent.attendance) >= 75 ? 'text-green-600' :
              parseInt(displayStudent.attendance) >= 60 ? 'text-orange-500' : 'text-red-500'
              }`}>
              {displayStudent.attendance || '0%'}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${parseInt(displayStudent.attendance) >= 75 ? 'bg-green-500' :
                parseInt(displayStudent.attendance) >= 60 ? 'bg-orange-500' : 'bg-red-500'
                }`}
              style={{ width: displayStudent.attendance || '0%' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Status</p>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${(!displayStudent.status || displayStudent.status === 'Active') ? 'bg-green-500' : 'bg-orange-500'}`} />
              <p className={`text-[10px] font-black uppercase tracking-tighter ${(!displayStudent.status || displayStudent.status === 'Active') ? 'text-green-600' : 'text-orange-600'}`}>
                {displayStudent.status || 'Active'}
              </p>
            </div>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Gender</p>
            <p className="text-[10px] font-black text-gray-700 uppercase">{displayStudent.gender || 'N/A'}</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Blood Group</p>
            <p className="text-[10px] font-black text-rose-600 uppercase">{displayStudent.bloodGroup || 'N/A'}</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
            <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Phone</p>
            <p className="text-[10px] font-black text-gray-700">{displayStudent.phone || 'N/A'}</p>
          </div>
        </div>

        <div className="p-2.5 bg-blue-50/20 rounded-xl border border-blue-100/30 flex justify-between items-center">
          <p className="text-[8px] text-gray-400 font-black uppercase tracking-widest">Joined On</p>
          <p className="text-[10px] font-bold text-blue-800">
            {displayStudent.createdAt ? new Date(displayStudent.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors group rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 group-hover:text-blue-500">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Mentor</p>
                <p className="text-[10px] font-bold text-gray-800">{displayStudent.mentors?.name || 'No Mentor'}</p>
              </div>
            </div>
            {displayStudent.mentors?.name && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(displayStudent.mentors.name);
                  toast.success('Copied!');
                }}
                className="p-1.5 text-gray-300 hover:text-blue-600"
              >
                <Copy className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors group rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 group-hover:text-blue-500">
                <Mail className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Email</p>
                <p className="text-[10px] font-bold text-gray-800 truncate">{displayStudent.email || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayStudent.email || '');
                toast.success('Copied!');
              }}
              className="p-1.5 text-gray-300 hover:text-blue-600"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 hover:bg-gray-50 transition-colors group rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 border border-gray-100 group-hover:text-blue-500">
                <FileDigit className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-0.5">Roll Number</p>
                <p className="text-[10px] font-bold text-gray-800">{displayStudent.rollNo || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayStudent.rollNo || '');
                toast.success('Copied!');
              }}
              className="p-1.5 text-gray-300 hover:text-blue-600"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>

        {displayStudent.isAwardWinner && (
          <div className="pt-4 mt-2">
            <button
              onClick={() => {
                const now = new Date();
                const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const monthLabel = prevMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                const issueDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

                generateCertificate(
                  displayStudent.name,
                  displayStudent.course || 'General',
                  'TrackMYAttendance Institute',
                  issueDate,
                  `Student of the Month Award - ${monthLabel}`
                );
              }}
              className="w-full flex items-center justify-center space-x-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-blue-200 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Award Certificate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
