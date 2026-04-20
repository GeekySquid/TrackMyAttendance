import { useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import { SignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function LoginPage({
  onLogin,
}: {
  onLogin: (role: 'admin' | 'student', userData?: any) => void;
}) {
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState<'admin' | 'student' | null>(null);
  const [error, setError] = useState('');

  // ─── Demo login (no Clerk session, uses mock data) ────────────────────────
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
      } as const;

      onLogin(isAdmin ? 'admin' : 'student', demoProfile);
      navigate(isAdmin ? '/admin' : '/');
      toast.success(`Signed in as ${isAdmin ? 'Admin' : 'Student'} (Demo Mode)`);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setIsDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/30 overflow-hidden">
              <img src="/logo.png" alt="TrackMyAttendance Logo" className="w-full h-full object-cover p-2" />
            </div>
            <h1 className="text-2xl font-black text-white mb-1 tracking-tight">
              TrackMyAttendance
            </h1>
            <p className="text-blue-100 text-sm font-medium">
              Sign in to manage your attendance
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center">
          {error && (
            <div className="mb-5 w-full p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          {/* Clerk Universal SignIn Widget (Handles Email/Password + Google OAuth natively + switch to Sign Up) */}
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
              {isDemoLoading === 'student' ? <Loader2 className="w-4 h-4 animate-spin" /> : '🎓'}
              Student Demo
            </button>
            <button
              onClick={() => handleDemoLogin(true)}
              disabled={!!isDemoLoading}
              className="flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDemoLoading === 'admin' ? <Loader2 className="w-4 h-4 animate-spin" /> : '🛡️'}
              Admin Demo
            </button>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed w-full">
            Demo mode uses local test data. Standard login syncs profiles to Supabase securely.
          </p>
        </div>
      </div>
    </div>
  );
}
