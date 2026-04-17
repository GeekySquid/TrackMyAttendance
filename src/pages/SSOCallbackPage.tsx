import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

/**
 * SSOCallbackPage
 *
 * Clerk redirects here after Google OAuth completes.
 * AuthenticateWithRedirectCallback handles the token exchange automatically,
 * then Clerk's session state updates and App.tsx re-renders with the signed-in user.
 */
export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-600">Completing sign-in...</p>
        <p className="text-xs text-gray-400">Please wait while we set up your session.</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
