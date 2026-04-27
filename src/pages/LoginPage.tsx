import { useState } from 'react';
import { Shield, Loader2, ArrowLeft } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginPage({
  onLogin,
  onBack,
}: {
  onLogin: (role: 'admin' | 'student', userData?: any) => void;
  onBack?: () => void;
}) {
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState<'admin' | 'student' | null>(null);
  const [error, setError] = useState('');

  // --- Demo login (no Clerk session, uses mock data) ---
  const handleDemoLogin = async (isAdmin = false) => {
    const key: 'admin' | 'student' = isAdmin ? 'admin' : 'student';
    setIsDemoLoading(key);
    setError('');
    try {
      const demoProfile = {
        id: isAdmin ? 'demo-admin-001' : 'demo-student-002',
        uid: isAdmin ? 'demo-admin-001' : 'demo-student-002',
        name: isAdmin ? 'Demo Admin' : 'Demo Student',
        email: isAdmin ? 'admin@trackmy.demo' : 'student@trackmy.demo',
        photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${isAdmin ? 'Admin' : 'Student'}`,
        role: isAdmin ? 'admin' : 'student',
        rollNo: isAdmin ? '' : 'CS2024001',
        course: isAdmin ? '' : 'Computer Science',
        phone: isAdmin ? '9999999999' : '8888888888',
        gender: 'Male',
        status: 'Active',
        attendance: '92%',
        attendance_pct: 92,
      };

      onLogin(isAdmin ? 'admin' : 'student', demoProfile);
      navigate(isAdmin ? '/admin' : '/');
      toast.success(`Signed in as ${isAdmin ? 'Admin' : 'Student'} (Demo Mode)`);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsDemoLoading(null);
    }
  };

  const [authMode, setAuthMode] = useState<'student' | 'admin'>('student');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute top-4 left-4 p-2 text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 overflow-hidden">
            <img src="/logo.png" alt="TrackMYAttendance Logo" className="w-full h-full object-cover p-2" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1 tracking-tight">
            Track<span className="text-blue-300">MY</span>Attendance
          </h1>
          <p className="text-blue-100 text-sm font-medium">
            {authMode === 'admin' ? 'Administrative Control Panel' : 'Student Attendance Portal'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex p-1 bg-gray-100 mx-8 mt-6 rounded-xl border border-gray-200">
          <button 
            onClick={() => setAuthMode('student')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${authMode === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Student
          </button>
          <button 
            onClick={() => setAuthMode('admin')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${authMode === 'admin' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Admin
          </button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center pt-4">
          {error && (
            <div className="mb-5 w-full p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {authMode === 'admin' && (
            <div className="mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl text-center">
              <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest mb-1">Notice</p>
              <p className="text-xs text-purple-600 font-medium leading-relaxed">
                Use your authorized institutional email (e.g., <strong>ramkrishna0x0@gmail.com</strong>) to sign up as an administrator.
              </p>
            </div>
          )}

          {/* Clerk Universal SignIn Widget */}
          <div className="w-full flex justify-center mb-4 clerk-container-override">
            <SignIn routing="hash" />
          </div>

          {/* Demo Divider */}
          <div className="w-full my-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-500 font-semibold uppercase tracking-wider">
                Or try a demo
              </span>
            </div>
          </div>

          {/* Demo Buttons */}
          <div className="w-full grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDemoLogin(false)}
              disabled={!!isDemoLoading}
              className="flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDemoLoading === 'student' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Student Demo'}
            </button>
            <button
              onClick={() => handleDemoLogin(true)}
              disabled={!!isDemoLoading}
              className="flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDemoLoading === 'admin' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Admin Demo'}
            </button>
          </div>

          <div className="mt-8 w-full p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Authorized Access
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-gray-700">Admin Account</p>
                  <p className="text-gray-500 font-medium">ramkrishna0x0@gmail.com</p>
                </div>
                <span className="px-2 py-1 bg-purple-100 text-purple-600 rounded-md font-black text-[8px] uppercase tracking-tighter">System Admin</span>
              </div>
              <div className="flex justify-between items-center text-xs opacity-60">
                <div>
                  <p className="font-bold text-gray-700">Demo Account</p>
                  <p className="text-gray-500 font-medium">admin@trackmy.demo</p>
                </div>
                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded-md font-black text-[8px] uppercase tracking-tighter">Pass: admin123</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed w-full">
            Standard signup with authorized emails automatically grants administrative privileges.
          </p>
        </div>
      </div>
    </div>
  );
}
