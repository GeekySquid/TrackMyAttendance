import { ChevronDown, Mail, FileDigit, Copy } from 'lucide-react';

export default function StudentProfile({ student }: { student?: any }) {
  const defaultStudent = {
    name: 'Rama Krishna Sahoo',
    course: 'MCA',
    phone: '+91 8594844784',
    email: 'ramkrishna@gmail.com',
    rollNo: '2505304049',
    photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAbgdQwzVtPMlM2yT_EAhF1EO0DzxPiPLOZt6XQb8-qL8CsCfuEGpW-glokFCBDIvDBdvoAVpHmuH90Ye9yXJA_KHKDf--HoL3EfjYkIfoPWG5QStSD5b9weeLhIlGqmomqgdfLd_prdadPvqzZsDUsYgGKjxL7fAC-CN3Kn0oobNiC1ARVZiFsYv15shyK3aW6p5cs0CBAaOZZVJ_6BChEAuzsi50wBjAB0Sw2RnCrdMJxCm5OBW5WrtM-5AmtkjSf5awPbK8tv7o'
  };

  const displayStudent = student || defaultStudent;

  return (
    <div className="col-span-1 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 relative">
      <h3 className="text-base font-bold text-gray-800">Students Profile</h3>
      <div className="absolute top-6 right-6">
        <button className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-100 rounded-lg bg-gray-50">
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-6">Quick overview and details</p>
      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-3">
          <img 
            alt={displayStudent.name} 
            className="w-20 h-20 rounded-full border-2 border-white shadow-md object-cover" 
            src={displayStudent.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayStudent.name}`} 
          />
          <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
        </div>
        <h4 className="text-lg font-bold text-gray-800">{displayStudent.name}</h4>
        <p className="text-xs text-gray-500 mb-2">{displayStudent.course || 'N/A'}</p>
        <span className="bg-blue-50 text-blue-500 px-3 py-1 rounded-full text-[10px] font-bold">{displayStudent.phone || 'N/A'}</span>
      </div>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
            <Mail className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-gray-400">Email</p>
            <p className="text-xs font-semibold text-gray-700">{displayStudent.email || 'N/A'}</p>
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
            <p className="text-[9px] text-gray-400 mt-0.5">Gandhi Institute of Technology and Management</p>
          </div>
          <button 
            onClick={() => navigator.clipboard.writeText(displayStudent.rollNo || '')}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
