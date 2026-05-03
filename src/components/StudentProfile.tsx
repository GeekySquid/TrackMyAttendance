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
    <div className="col-span-1 bg-white rounded-3xl border border-gray-100 shadow-xl p-6 sm:p-8 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-gray-900 leading-none">Profile Detail</h3>
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

      <div className="flex flex-col items-center text-center mb-8 relative z-10">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-10 animate-pulse"></div>
          <img
            alt={displayStudent.name}
            className="w-24 h-24 rounded-3xl border-4 border-white shadow-2xl object-cover relative z-10 ring-1 ring-gray-100"
            src={displayStudent.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayStudent.name}`}
          />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full z-20 shadow-lg"></span>
        </div>
        
        {displayStudent.isAwardWinner && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative mb-6 flex justify-center group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 rounded-full blur-xl opacity-30 group-hover:opacity-60 animate-pulse transition-opacity duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full blur-lg opacity-20 group-hover:opacity-50 animate-spin-slow"></div>
            
            <div className="relative inline-flex items-center gap-3 px-5 py-2 bg-white/90 backdrop-blur-md border border-amber-200/50 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] shadow-[0_10px_40px_-10px_rgba(245,158,11,0.3)] transform transition-all duration-500 hover:scale-105 hover:-translate-y-1">
              <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-yellow-300 via-amber-500 to-orange-600 rounded-xl shadow-lg transform rotate-3 group-hover:rotate-12 transition-transform">
                <Trophy className="w-3.5 h-3.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
              </div>
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent drop-shadow-sm font-[950]">Student of the Month</span>
              <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
            </div>
          </motion.div>
        )}

        <h4 className="text-xl font-black text-gray-900 tracking-tight">{displayStudent.name}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{displayStudent.course || 'General'}</span>
          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
          <span className="text-[10px] font-bold text-gray-400 uppercase">{displayStudent.rollNo || 'ID: N/A'}</span>
        </div>
      </div>

      <div className="space-y-5">
        <div className="p-4 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Attendance Rate</p>
              <h5 className={`text-2xl font-black mt-0.5 ${parseInt(displayStudent.attendance) >= 75 ? 'text-green-600' :
                parseInt(displayStudent.attendance) >= 60 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {displayStudent.attendance || '0%'}
              </h5>
            </div>
            <div className={`p-2 rounded-xl ${parseInt(displayStudent.attendance) >= 75 ? 'bg-green-100 text-green-600' :
                parseInt(displayStudent.attendance) >= 60 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
            }`}>
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-1000 shadow-sm ${parseInt(displayStudent.attendance) >= 75 ? 'bg-green-500 shadow-green-100' :
                  parseInt(displayStudent.attendance) >= 60 ? 'bg-orange-500 shadow-orange-100' : 'bg-red-500 shadow-red-100'
                }`}
              style={{ width: displayStudent.attendance || '0%' }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${(!displayStudent.status || displayStudent.status === 'Active') ? 'bg-green-500' : 'bg-orange-500'}`} />
              <p className={`text-xs font-black uppercase tracking-tighter ${(!displayStudent.status || displayStudent.status === 'Active') ? 'text-green-600' : 'text-orange-600'}`}>
                {displayStudent.status || 'Active'}
              </p>
            </div>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Gender</p>
            <p className="text-xs font-black text-gray-700 tracking-tighter uppercase">{displayStudent.gender || 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Blood Group</p>
            <p className="text-xs font-black text-rose-600 tracking-tighter uppercase">{displayStudent.blood_group || 'N/A'}</p>
          </div>
          <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Phone</p>
            <p className="text-xs font-black text-gray-700 tracking-tighter">{displayStudent.phone || 'N/A'}</p>
          </div>
        </div>

        <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Joined On</p>
          <p className="text-xs font-bold text-blue-800">
            {displayStudent.created_at ? new Date(displayStudent.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:text-blue-500 transition-colors">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Mentor</p>
                <p className="text-xs font-bold text-gray-800">{displayStudent.mentors?.name || 'No Mentor Assigned'}</p>
              </div>
            </div>
            {displayStudent.mentors?.name && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(displayStudent.mentors.name);
                  toast.success('Mentor Name Copied');
                }}
                className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
              >
                <Copy className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:text-blue-500 transition-colors">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Email</p>
                <p className="text-xs font-bold text-gray-800 truncate">{displayStudent.email || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayStudent.email || '');
                toast.success('Email Copied');
              }}
              className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:text-blue-500 transition-colors">
                <FileDigit className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Roll Number</p>
                <p className="text-xs font-bold text-gray-800 font-mono tracking-wider">{displayStudent.rollNo || 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(displayStudent.rollNo || '');
                toast.success('Roll Number Copied');
              }}
              className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
            >
              <Copy className="h-4 w-4" />
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
