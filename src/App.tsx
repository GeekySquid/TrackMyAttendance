import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StudentsPage from './pages/StudentsPage';
import AttendancePage from './pages/AttendancePage';
import LeaveRequestsPage from './pages/LeaveRequestsPage';
import GeofencingPage from './pages/GeofencingPage';
import SettingsPage from './pages/SettingsPage';
import GenericPage from './pages/GenericPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import StudentDashboard from './pages/StudentDashboard';
import TrackMyAttendancePage from './pages/TrackMyAttendancePage';
import LeaderboardPage from './pages/LeaderboardPage';
import ReportsPage from './pages/ReportsPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import AccessControlPage from './pages/AccessControlPage';
import SupportPage from './pages/SupportPage';
import SSOCallbackPage from './pages/SSOCallbackPage';
import toast, { Toaster } from 'react-hot-toast';
import { saveUser, getUserById } from './services/dbService';

function AppContent() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('tm_onboarded') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // ─── Sync Clerk user → Supabase profiles ─────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setProfile(null);
      setOnboarded(false);
      setProfileLoading(false);
      return;
    }

    const syncProfile = async () => {
      setProfileLoading(true);
      try {
        const clerkId = user.id;
        console.log('[App] Syncing Clerk ID:', clerkId);
        let existing = await getUserById(clerkId);
        console.log('[App] Existing Profile:', existing);

        if (!existing) {
          console.log('[App] New user detected, creating profile...');
          // First sign-in: create profile row using only valid DB columns
          await saveUser({
            id: clerkId,
            uid: clerkId,
            name: user.fullName || user.firstName || '',
            email: user.primaryEmailAddress?.emailAddress || '',
            photoURL: user.imageUrl || '',
            role: 'student',
          });
          existing = await getUserById(clerkId);
        }

        if (existing) {
          setProfile(existing);
          // onboarded is already correctly set inside mapProfile
          // (true if admin, or if student has phone/rollNo)
          if (existing.onboarded) {
            setOnboarded(true);
            localStorage.setItem('tm_onboarded', 'true');
          }
        } else {
          // DB unreachable or RLS blocking — sign out gracefully to prevent loop
          console.error('[App] Profile creation failed. Signing out to prevent loop.');
          await signOut();
          localStorage.removeItem('tm_onboarded');
        }
      } catch (err) {
        console.error('[App] syncProfile error:', err);
      } finally {
        setProfileLoading(false);
      }
    };

    syncProfile();
  }, [isLoaded, isSignedIn, user]);

  // ─── Demo login (bypasses Clerk, uses mock profile) ──────────────────────
  const handleDemoLogin = (role: 'admin' | 'student', userData?: any) => {
    const isDone = role === 'admin' || userData?.onboarded || !!userData?.phone;
    setProfile({ ...userData, role, onboarded: isDone });
    setOnboarded(isDone);
    localStorage.setItem('tm_onboarded', String(isDone));
    setProfileLoading(false);
  };

  // ─── Onboarding complete ──────────────────────────────────────────────────
  const handleOnboardingComplete = async (onboardingData: any) => {
    try {
      const updatedData = { 
        ...profile, 
        ...onboardingData, 
        onboarded: true,
        profile_completed: true // Ensure both keys are set for safety
      };

      const success = await saveUser(updatedData);
      
      if (success) {
        setProfile(updatedData);
        setOnboarded(true);
        localStorage.setItem('tm_onboarded', 'true');
        toast.success('Profile created successfully!');
      } else {
        toast.error('Failed to save profile. Please try again.');
      }
    } catch (err) {
      console.error('[App] handleOnboardingComplete error:', err);
      toast.error('An unexpected error occurred.');
    }
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    // If it's a demo session (no Clerk session), just clear state
    if (!isSignedIn) {
      setProfile(null);
      setOnboarded(false);
      localStorage.removeItem('tm_onboarded');
      navigate('/');
      return;
    }
    await signOut();
    setProfile(null);
    setOnboarded(false);
    localStorage.removeItem('tm_onboarded');
    navigate('/');
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (!isLoaded || profileLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading TrackMyAttendance...</p>
        </div>
      </div>
    );
  }

  // ─── Auth gates ───────────────────────────────────────────────────────────
  if (!profile) return <LoginPage onLogin={handleDemoLogin} />;
  
  // onboarded is already correctly computed inside mapProfile via phone/roll_no/role check
  const isUserOnboarded = profile.onboarded;

  if (profile.role === 'student' && !isUserOnboarded) {
    return <OnboardingPage user={profile} onComplete={handleOnboardingComplete} />;
  }

  const role: 'admin' | 'student' = profile.role === 'admin' ? 'admin' : 'student';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          className: 'text-sm font-bold',
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Sidebar
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        role={role}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          role={role}
          user={profile}
          onLogout={handleLogout}
        />
        <Routes>
          {role === 'admin' ? (
            <>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/students" element={<StudentsPage />} />
              <Route path="/admin/attendance" element={<AttendancePage />} />
              <Route path="/admin/leave-requests" element={<LeaveRequestsPage role="admin" user={profile} />} />
              <Route path="/admin/reports" element={<ReportsPage />} />
              <Route path="/admin/documents" element={<DocumentsPage user={{ role, data: profile }} />} />
              <Route path="/admin/notifications" element={<NotificationsPage userId={profile?.id} />} />
              <Route path="/admin/settings" element={<SettingsPage role="admin" user={profile} />} />
              <Route path="/admin/geofencing" element={<GeofencingPage />} />
              <Route path="/admin/access-control" element={<AccessControlPage />} />
              <Route path="/admin/support" element={<SupportPage role="admin" />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<StudentDashboard user={profile} />} />
              <Route path="/leave-requests" element={<LeaveRequestsPage role="student" user={profile} />} />
              <Route path="/track-my-attendance" element={<TrackMyAttendancePage userId={profile?.id} />} />
              <Route path="/leaderboard" element={<LeaderboardPage userId={profile?.id} />} />
              <Route path="/settings" element={<SettingsPage role={profile.role} user={profile} onUpdate={setProfile} />} />
              <Route path="/notifications" element={<NotificationsPage userId={profile?.id} />} />
              <Route path="/support" element={<SupportPage role="student" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Clerk SSO callback — must be outside AppContent */}
        <Route path="/sso-callback" element={<SSOCallbackPage />} />
        <Route path="*" element={<AppContent />} />
      </Routes>
    </Router>
  );
}
