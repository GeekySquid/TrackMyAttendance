import { ChevronDown, Mail, FileDigit, Copy, Trophy, Sparkles, Download, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateCertificate } from '../utils/generateCertificate';

export default function StudentProfile({ student }: { student?: any }) {
  const defaultStudent = {
    name: 'Rama Krishna Sahoo',
    course: 'MCA',
    phone: '+91 8594844784',
    email: 'ramkrishna@gmail.com',
    rollNo: '2505304049',
    attendance: '95%',
    photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbgdQwzVtPMlM2yT_EAhF1EO0DzxPiPLOZt6XQb8-qL8CsCfuEGpW-glokFCBDIvDBdvoAVpHmuH90Ye9yXJA_KHKDf--HoL3EfjYkIfoPWG5QStSD5b9weeLhIlGqmomqgdfLd_prdadPvqzZsDUsYgGKjxL7fAC-CN3Kn0oobNiC1ARVZiFsYv15shyK3aW6p5cs0CBAaOZZVJ_6BChEAuzsi50wBjAB0Sw2RnCrdMJxCm5OBW5WrtM-5AmtkjSf5awPbK8tv7o'
  };

  const displayStudent = student || defaultStudent;

  return (
    <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 relative overflow-hidden">
      <h3 className="text-base font-bold text-gray-800">Students Profile</h3>
      <div className="absolute top-6 right-6">
        <button className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-100 rounded-lg bg-gray-50">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-6">Quick overview and details</p>
      <div className="flex flex-col items-center text-center mb-8 relative z-10">
        <div className="relative mb-3">
          <img
            alt={displayStudent.name}
            className="w-20 h-20 rounded-full border-2 border-white shadow-md object-cover relative z-10"
            src={displayStudent.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayStudent.name}`}
          />
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full z-20"></span>
        </div>
        
        {(displayStudent.isStudentOfTheMonth || parseInt(displayStudent.attendance || '0') >= 90) && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative mb-5 flex justify-center group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full blur-md opacity-40 group-hover:opacity-70 animate-pulse transition-opacity duration-500"></div>
            <div className="relative inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-amber-200 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transform transition-all hover:scale-110 hover:-translate-y-1">
              <div className="flex items-center justify-center w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full shadow-inner">
                <Trophy className="w-3 h-3 text-white drop-shadow-md animate-bounce" />
              </div>
              <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 bg-clip-text text-transparent drop-shadow-sm">Student of the Month</span>
              <Sparkles className="w-3 h-3 text-orange-500 animate-pulse drop-shadow-sm" />
            </div>
            {/* Floating Orbs for extra flair */}
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-50"></div>
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-orange-400 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.5s' }}></div>
          </motion.div>
        )}

        <h4 className="text-lg font-bold text-gray-800">{displayStudent.name}</h4>
        <p className="text-xs text-gray-500 mb-2">{displayStudent.course || 'N/A'}</p>
        <span className="bg-blue-50 text-blue-500 px-3 py-1 rounded-full text-[10px] font-bold">{displayStudent.phone || 'N/A'}</span>
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-4 p-3 bg-gray-50 rounded-xl">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm ${parseInt(displayStudent.attendance) >= 75 ? 'bg-green-100 text-green-600' :
              parseInt(displayStudent.attendance) >= 60 ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
            }`}>
            {displayStudent.attendance || '0%'}
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Attendance Rate</p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className={`h-full rounded-full ${parseInt(displayStudent.attendance) >= 75 ? 'bg-green-500' :
                    parseInt(displayStudent.attendance) >= 60 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                style={{ width: displayStudent.attendance || '0%' }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</p>
            <p className={`text-xs font-bold mt-1 ${(!displayStudent.status || displayStudent.status === 'Active') ? 'text-green-600' : 'text-orange-600'
              }`}>
              {displayStudent.status || 'Active'}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Course</p>
            <p className="text-xs font-bold text-gray-700 mt-1">{displayStudent.course || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">Assigned Mentor</p>
            <p className="text-xs font-semibold text-gray-700">{displayStudent.mentors?.name || 'No Mentor Assigned'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">Email</p>
            <p className="text-xs font-semibold text-gray-700 break-all">{displayStudent.email || 'N/A'}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(displayStudent.email || '')}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            <FileDigit className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">Registration Number</p>
            <p className="text-xs font-semibold text-gray-700">{displayStudent.rollNo || 'N/A'}</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(displayStudent.rollNo || '')}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>

        {(displayStudent.isStudentOfTheMonth || parseInt(displayStudent.attendance || '0') >= 90) && (
          <div className="pt-4 border-t border-gray-100 mt-2">
            <button
              onClick={() => {
                const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                generateCertificate(
                  displayStudent.name,
                  displayStudent.course || 'General',
                  'TrackMYAttendance Institute',
                  today,
                  'Outstanding Attendance & Performance'
                );
              }}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download Certificate</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
