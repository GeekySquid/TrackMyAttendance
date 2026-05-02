/**
 * cacheManager.ts
 *
 * Automatically manages application cache to ensure smooth operation
 * while preserving critical authentication and session data.
 */

export const autoClearCache = async () => {
  try {
    const DEBUG = false;
    if (DEBUG) console.log('[CacheManager] Initializing automatic cache cleanup...');

    // 1. SESSION STORAGE
    // Safe to clear on every app boot as it only persists for the tab session.
    sessionStorage.clear();

    // 2. LOCAL STORAGE CLEANUP
    // We only keep keys that are essential for Authentication and critical user state.
    const ESSENTIAL_KEYS = [
      'tm_persistent_session',
      'tm_onboarded',
      'tm_last_sync',
      'tm_cache_version',
      'clerk', // Clerk Auth
      'sb-',   // Supabase Auth
      'supabase.auth',
      'ajs_',  // Analytics (optional but common)
    ];

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const isEssential = ESSENTIAL_KEYS.some(essential => 
          key.toLowerCase().startsWith(essential.toLowerCase())
        );
        if (!isEssential) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (DEBUG && keysToRemove.length > 0) {
      console.log(`[CacheManager] Removed ${keysToRemove.length} stale localStorage keys.`);
    }

    // 3. CACHE API CLEANUP
    // Clears the browser's Cache API (used by Service Workers) to force-refresh assets.
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      if (cacheNames.length > 0) {
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        if (DEBUG) console.log(`[CacheManager] Cleared ${cacheNames.length} Cache API buckets.`);
      }
    }

    // 4. SERVICE WORKER RESET
    // Unregisters old service workers to prevent "stuck" app versions.
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        if (DEBUG) console.log('[CacheManager] Unregistered a stale Service Worker.');
      }
    }

    if (DEBUG) console.log('[CacheManager] Cleanup complete. Sessions preserved.');
  } catch (error) {
    console.error('[CacheManager] Error during cache cleanup:', error);
  }
};

/**
 * checkCacheVersion
 * 
 * Compares the server's required cache version with the local version.
 * If they differ, it triggers a full purge and updates the local version.
 */
export const checkCacheVersion = async (serverVersion: number) => {
  const LOCAL_VERSION_KEY = 'tm_cache_version';
  const localVersion = parseInt(localStorage.getItem(LOCAL_VERSION_KEY) || '0', 10);

  if (serverVersion > localVersion) {
    // 1. Mark as updated immediately to prevent reload loops
    localStorage.setItem(LOCAL_VERSION_KEY, serverVersion.toString());
    
    // 2. Perform purge
    await autoClearCache();
    
    // Hard refresh to ensure everything is clean and new assets are fetched
    window.location.reload();
  }
};
