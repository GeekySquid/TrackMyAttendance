import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * AuthCallbackPage
 * 
 * Supabase Google OAuth redirects back here after external auth.
 * The Supabase client auto-exchanges the code in the URL for a session,
 * then our App.tsx onAuthStateChange listener takes over routing.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[AuthCallback] Session error:', error.message);
        navigate('/');
        return;
      }

      if (session?.user) {
        // Session is ready — navigate to root; App.tsx auth listener will route by role
        navigate('/');
      } else {
        // No session yet — wait briefly for the code exchange to complete
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          navigate(retrySession ? '/' : '/');
        }, 1500);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Completing sign-in...</p>
        <p className="text-xs text-gray-400">Please wait while we set up your session.</p>
      </div>
    </div>
  );
}
