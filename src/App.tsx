import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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
import LandingPage from './pages/LandingPage';
import InstallPWA from './components/InstallPWA';
import MobileNavbar from './components/MobileNavbar';
import toast, { Toaster } from 'react-hot-toast';
import NotificationStack from './components/notifications/NotificationStack';
import PermissionGate from './components/PermissionGate';
import { saveUser, getUserById } from './services/dbService';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { useSupabaseNotifications } from './hooks/useSupabaseNotifications';

function NotificationManager({ profile }: { profile: any }) {
  useSupabaseNotifications(profile);
  return null;
}

function AppContent() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profile, setProfile] = useState<any>(null);
  const [onboarded, setOnboarded] = useState(() => localStorage.getItem('tm_onboarded') === 'true');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const isAuthPath = location.pathname === '/login' || location.pathname === '/register';

  // ─── Persistence Logic ────────────────────────────────────────────────────
  useEffect(() => {
    // Restore persistent session immediately to avoid flicker
    const savedSession = localStorage.getItem('tm_persistent_session');
    if (savedSession) {
      try {
        const { profile: savedProfile, timestamp } = JSON.parse(savedSession);
        const now = new Date().getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;

        if (now - timestamp < oneDayInMs) {
          setProfile(savedProfile);
          setOnboarded(savedProfile.onboarded);
          // Only stop loading if we actually have a profile to show
          setProfileLoading(false);
        } else {
          localStorage.removeItem('tm_persistent_session');
        }
      } catch (err) {
        console.error('[App] Persistence restore failed:', err);
      }
    }
  }, []);

  // ─── Sync Clerk user → Supabase profiles ─────────────────────────────────
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      // If we don't have a profile and we aren't signed in, only then stop loading
      // (Unless we have a persistent session already set)
      if (!profile) {
        setProfileLoading(false);
      }
      return;
    }

    const syncProfile = async () => {
      // Don't re-sync if we're already loading or already have the right profile
      if (profile && profile.id === user.id) {
        setProfileLoading(false);
        return;
      }

      console.log('[App] Starting syncProfile for:', user.id);
      setProfileLoading(true);
      
      const toastId = toast.loading('Synchronizing account...', { id: 'sync-status' });

      const syncTimeout = setTimeout(() => {
        setProfileLoading(false);
        toast.error('Sync timed out. Retrying...', { id: 'sync-status' });
        console.warn('[App] syncProfile timed out after 10s');
      }, 10000);

      try {
        const clerkId = user.id;
        console.log('[App] Checking for existing profile in Supabase...');
        let existing = await getUserById(clerkId);

        if (!existing) {
          toast.loading('Creating your profile...', { id: 'sync-status' });
          console.log('[App] No existing profile found. Creating one...');
          const adminEmails = ['ramkrishna0x0@gmail.com', 'admin@trackmy.demo'];
          const userEmail = user.primaryEmailAddress?.emailAddress || '';
          const role = adminEmails.includes(userEmail) ? 'admin' : 'student';

          const newUserData = {
            id: clerkId,
            uid: clerkId,
            name: user.fullName || user.firstName || 'New User',
            email: userEmail,
            photoURL: user.imageUrl || '',
            role: role,
          };

          const saveSuccess = await saveUser(newUserData);
          if (!saveSuccess) {
            throw new Error('Failed to create initial profile in database');
          }
          
          console.log('[App] Profile created, fetching fresh copy...');
          existing = await getUserById(clerkId);
          if (!existing) throw new Error('Profile created but could not be retrieved');
          
          toast.success('Account created and synced!', { id: 'sync-status' });
        } else {
          console.log('[App] Existing profile found:', existing.id);
          const adminEmails = ['ramkrishna0x0@gmail.com', 'admin@trackmy.demo'];
          const shouldBeAdmin = adminEmails.includes(user.primaryEmailAddress?.emailAddress || '');
          const photoDiffers = user.imageUrl && existing.photoURL !== user.imageUrl;

          if ((shouldBeAdmin && existing.role !== 'admin') || photoDiffers) {
            toast.loading('Updating profile details...', { id: 'sync-status' });
            console.log('[App] Syncing updates for existing profile...');
            await saveUser({
              ...existing,
              role: shouldBeAdmin ? 'admin' : existing.role,
              photoURL: user.imageUrl || existing.photoURL
            });
            existing = await getUserById(clerkId);
          }
          toast.success('Welcome back!', { id: 'sync-status' });
        }

        if (existing) {
          setProfile(existing);
          if (existing.onboarded) {
            setOnboarded(true);
            localStorage.setItem('tm_onboarded', 'true');
          }
        } else {
          throw new Error('Profile synchronization failed to produce a valid record');
        }
      } catch (err) {
        console.error('[App] syncProfile error:', err);
        toast.error('Sync failed: ' + (err instanceof Error ? err.message : 'Database error'), { id: 'sync-status' });
      } finally {
        clearTimeout(syncTimeout);
        setProfileLoading(false);
      }
    };

    syncProfile();
  }, [isLoaded, isSignedIn, user]);

  // ─── Demo login (bypasses Clerk, uses mock profile) ──────────────────────
  const handleDemoLogin = (role: 'admin' | 'student', userData?: any) => {
    const isDone = role === 'admin' || userData?.onboarded || !!userData?.phone;
    const profileData = { ...userData, role, onboarded: isDone };
    setProfile(profileData);
    setOnboarded(isDone);
    localStorage.setItem('tm_onboarded', String(isDone));

    // Persist session for 24h
    localStorage.setItem('tm_persistent_session', JSON.stringify({
      profile: profileData,
      timestamp: new Date().getTime()
    }));

    setProfileLoading(false);
  };

  // ─── Onboarding complete ──────────────────────────────────────────────────
  const handleOnboardingComplete = async (onboardingData: any) => {
    console.log('[App] handleOnboardingComplete started:', onboardingData);
    try {
      const updatedData = {
        ...profile,
        ...onboardingData,
        onboarded: true,
        profileCompleted: true
      };

      console.log('[App] Saving updated profile:', updatedData);
      const success = await saveUser(updatedData);
      console.log('[App] saveUser result:', success);

      if (success) {
        setProfile(updatedData);
        setOnboarded(true);
        localStorage.setItem('tm_onboarded', 'true');

        // Update persistent session if it exists
        const savedSession = localStorage.getItem('tm_persistent_session');
        if (savedSession) {
          localStorage.setItem('tm_persistent_session', JSON.stringify({
            profile: updatedData,
            timestamp: new Date().getTime()
          }));
        }

        toast.success('Profile created successfully!');
      } else {
        toast.error('Failed to save profile. Please try again.');
      }
    } catch (err) {
      console.error('[App] handleOnboardingComplete error:', err);
      toast.error('An unexpected error occurred.');
    }
  };

  // ─── Sync profile changes to persistence ──────────────────────────────────
  useEffect(() => {
    if (profile) {
      const savedSession = localStorage.getItem('tm_persistent_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          // Only update if the profile is actually different to avoid infinite loops
          if (JSON.stringify(parsed.profile) !== JSON.stringify(profile)) {
            localStorage.setItem('tm_persistent_session', JSON.stringify({
              profile,
              timestamp: parsed.timestamp // Preserve original login timestamp
            }));
          }
        } catch (e) {
          console.error('[App] Persistence sync failed:', e);
        }
      }
    }
  }, [profile]);

  const { setRole } = useNotifications();

  // Sync role to notification context
  useEffect(() => {
    if (profile?.role) {
      setRole(profile.role === 'admin' ? 'admin' : 'student');
    }
  }, [profile?.role, setRole]);

  // ─── Logout ───────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
    localStorage.removeItem('tm_onboarded');
    localStorage.removeItem('tm_persistent_session');

    if (!isSignedIn) {
      setProfile(null);
      setOnboarded(false);
      navigate('/');
      return;
    }
    await signOut();
    setProfile(null);
    setOnboarded(false);
    navigate('/');
  }, [isSignedIn, navigate, signOut]);

  // ─── Auto Logout logic (24h) ─────────────────────────────────────────────
  useEffect(() => {
    const checkSession = () => {
      const savedSession = localStorage.getItem('tm_persistent_session');
      if (savedSession) {
        try {
          const { timestamp } = JSON.parse(savedSession);
          const now = new Date().getTime();
          const oneDayInMs = 24 * 60 * 60 * 1000;
          if (now - timestamp >= oneDayInMs) {
            handleLogout();
            toast.error('Session expired (24h limit). Please log in again.', { id: 'session-expiry' });
          }
        } catch (e) { }
      }
    };

    const intervalId = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(intervalId);
  }, [handleLogout]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (profileLoading || (!isLoaded && !profile)) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading Track<span className="text-blue-600">MY</span>Attendance...</p>
        </div>
      </div>
    );
  }

  // ─── Auth gates ───────────────────────────────────────────────────────────
  // If not signed in to Clerk, show Landing Page or Login Page
  if (!isSignedIn && !profile) {
    if (isAuthPath) {
      return (
        <LoginPage 
          onLogin={handleDemoLogin} 
          onBack={() => navigate('/')} 
          initialTab={location.pathname === '/register' ? 'signup' : 'login'}
        />
      );
    }
    return <LandingPage onGetStarted={() => navigate('/login')} />;
  }

  // If signed in but no profile yet, we show login (which handles demo)
  if (!profile) return <LoginPage onLogin={handleDemoLogin} />;

  // onboarded is already correctly computed inside mapProfile via phone/roll_no/role check
  const isUserOnboarded = profile.onboarded;

  if (profile.role === 'student' && !isUserOnboarded) {
    return <OnboardingPage user={profile} onComplete={handleOnboardingComplete} />;
  }

  const role: 'admin' | 'student' = profile.role === 'admin' ? 'admin' : 'student';

  return (
    <>
      {profile && <NotificationManager profile={profile} />}
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          role={role}
          onLogout={handleLogout}
        />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-24 lg:pb-0">
          <Header
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            role={role}
            user={profile}
            onLogout={handleLogout}
          />
          <Routes>
            {role === 'admin' ? (
              <>
                <Route path="/admin" element={<Dashboard user={profile} />} />
                <Route path="/admin/students" element={<StudentsPage />} />
                <Route path="/admin/attendance" element={<AttendancePage user={profile} />} />
                <Route path="/admin/leave-requests" element={<LeaveRequestsPage role="admin" user={profile} />} />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/admin/documents" element={<DocumentsPage user={{ role, data: profile }} />} />
                <Route path="/admin/notifications" element={<NotificationsPage userId={profile?.id} />} />
                <Route path="/admin/settings" element={<SettingsPage role="admin" user={profile} onUpdate={setProfile} />} />
                <Route path="/admin/geofencing" element={<PermissionGate><GeofencingPage /></PermissionGate>} />
                <Route path="/admin/access-control" element={<AccessControlPage />} />
                <Route path="/admin/support" element={<SupportPage role="admin" />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<PermissionGate><StudentDashboard user={profile} /></PermissionGate>} />
                <Route path="/leave-requests" element={<LeaveRequestsPage role="student" user={profile} />} />
                <Route path="/track-my-attendance" element={<PermissionGate><TrackMyAttendancePage userId={profile?.id} /></PermissionGate>} />
                <Route path="/leaderboard" element={<LeaderboardPage userId={profile?.id} />} />
                <Route path="/settings" element={<SettingsPage role={profile.role} user={profile} onUpdate={setProfile} />} />
                <Route path="/notifications" element={<PermissionGate><NotificationsPage userId={profile?.id} /></PermissionGate>} />
                <Route path="/support" element={<SupportPage role="student" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </main>
        <InstallPWA />
        {profile && <MobileNavbar role={role} userId={profile.id} />}
      </div>
    </>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <Toaster position="top-right" />
      <NotificationStack />
      <Router>
        <Routes>
          {/* Clerk SSO callback — must be outside AppContent */}
          <Route path="/sso-callback" element={<SSOCallbackPage />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </NotificationProvider>
  );
}
