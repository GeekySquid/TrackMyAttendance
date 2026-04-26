import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addAttendance,
  updateAttendance,
  getAttendance,
  getMentors,
  listenToCollection,
  isScheduleActive,
  getSystemSettings,
} from '../services/dbService';
import {
  Phone, AlertCircle, Send, X, ClipboardList, LogOut,
  MapPin, Navigation, Lock, Unlock, Loader2, History, Timer,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Haversine distance (meters) ────────────────────────────────────────────
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1), dLam = toRad(lon2 - lon1);
  const a =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


function StudentCheckInWidget({ user }: { user?: any }) {
  const [isCheckedIn, setIsCheckedIn] = useState(() => !!localStorage.getItem('tracked_session_id'));
  const [isOutsideZone, setIsOutsideZone] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAction, setShowAction] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(localStorage.getItem('tracked_session_id'));
  const [isProcessing, setIsProcessing] = useState(false);

  // Persist session ID to survive refreshes
  useEffect(() => {
    if (currentRecordId) localStorage.setItem('tracked_session_id', currentRecordId);
    else localStorage.removeItem('tracked_session_id');
  }, [currentRecordId]);

  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReasonText, setLateReasonText] = useState('');
  const [lateReasonImage, setLateReasonImage] = useState<string | null>(null);
  const [mentor, setMentor] = useState<any>(null);

  // ── Live geofence & attendance state ──────────────────────────────────────
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [attendanceLoaded, setAttendanceLoaded] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number | null>(null);
  const [lastKnownLocation, setLastKnownLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [locationTimestamp, setLocationTimestamp] = useState<number>(0);
  const [sysSettings, setSysSettings] = useState<any>(null);

  // ── Fetch System Settings ────────────────────────────────────────────────
  useEffect(() => {
    getSystemSettings().then(data => {
      if (data) setSysSettings(data);
    });
  }, []);


  // ── Session start tracking ────────────────────────────────────────────────
  // We detect the TRANSITION windowOpen false→true and stamp the time ONCE.
  // A ref makes the current value accessible inside callbacks without deps.
  const prevWindowOpenRef = useRef(false);
  const openedAtRef = useRef<number | null>(
    // If the page loads while a session is already active, grab from localStorage
    (() => {
      const v = localStorage.getItem('session_opened_at');
      if (!v) return null;
      const parsed = parseInt(v, 10);
      return isNaN(parsed) ? null : parsed;
    })()
  );
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(openedAtRef.current);

  // ── Realtime listener for OWN and Global state ────────────────────────────
  useEffect(() => {
    // 1. Listen to geofence windows
    const unsubG = listenToCollection('geofence_schedules', (data) => {
      setSchedules(data);
      setSchedulesLoaded(true);
    });

    // 2. Listen to OWN attendance records (today)
    let unsubA = () => { };
    if (user) {
      unsubA = listenToCollection('attendance', (data) => {
        const today = new Date().toLocaleDateString('en-CA');
        const todayRecords = data
          .filter((r: any) => r.date === today)
          .sort((a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());

        setAttendanceRecords(todayRecords);
        setAttendanceLoaded(true);

        // Derive current state from the latest today record
        const latest = todayRecords[0];
        if (latest) {
          setShowAction(true);
          setIsCheckedIn(!latest.checkOutTime);
          if (!latest.checkOutTime) setCurrentRecordId(latest.id);
        } else {
          setIsCheckedIn(false);
        }
      }, user.uid || user.id);
    }

    return () => { unsubG(); unsubA(); };
  }, [user]);

  // Derive last check-out time for display
  const lastCheckOut = attendanceRecords.find(r => r.checkOutTime)?.checkOutTime;

  // ── Clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Background Location Watcher (Keeps GPS 'Hot') ──────────────────────────
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLastKnownLocation({ 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude 
        });
        setLocationTimestamp(Date.now());
      },
      (err) => console.warn('[GPS Watcher] Error:', err.message),
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
    
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Derived: is the window currently open? ────────────────────────────────
  const windowOpen: boolean = schedules.some(isScheduleActive);

  // ── Active (non-sentinel) schedules for GPS check ─────────────────────────
  const activeSchedules = schedules.filter(
    (s) => parseFloat(s.radius) !== -999 && isScheduleActive(s)
  );

  // ── Has the manual override (sentinel) been activated? ───────────────────
  const manualOverrideActive = schedules.some(
    (s) => parseFloat(s.radius) === -999 && s.isActive
  );

  // ── The best active schedule for countdown (prefer real geofence over sentinel) ─
  const activeScheduleForCountdown: any | null =
    activeSchedules[0] ||
    schedules.find((s) => parseFloat(s.radius) === -999 && s.isActive) ||
    schedules.find((s) => s.locationName === 'Manual Selection' && s.isActive) ||
    null;

  // ── The sentinel (manual override) schedule ───────────────────────────────
  const sentinelSchedule = schedules.find(
    (s) => (parseFloat(s.radius) === -999 || s.locationName === 'Manual Selection') && s.isActive
  ) ?? null;

  // Server-authoritative session open time: use the sentinel row's Supabase
  // `updated_at` timestamp so ALL students share the same countdown reference
  // regardless of when their browser loaded the page.
  const sentinelOpenedAtMs: number | null = sentinelSchedule?.updatedAt
    ? new Date(sentinelSchedule.updatedAt).getTime()
    : null;

  // Stable primitive values extracted to avoid object-reference churn in useEffect deps
  const _schedId = activeScheduleForCountdown?.id ?? null;
  const _schedRadius = activeScheduleForCountdown?.radius ?? null;
  const _schedTime = activeScheduleForCountdown?.time ?? null;
  const _graceMins = activeScheduleForCountdown?.gracePeriod ?? 15;
  const _sentinelOpenedMs = sentinelOpenedAtMs; // already a number

  // ── Detect windowOpen transition to stamp accurate session start time ────────
  useEffect(() => {
    const wasOpen = prevWindowOpenRef.current;
    prevWindowOpenRef.current = windowOpen;

    // 1. FRESH SYNC: Always trust the DB's updated_at if it's available and recent (last 12h)
    if (windowOpen && _sentinelOpenedMs) {
      const dbTime = _sentinelOpenedMs;
      const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
      const isRecent = dbTime > twelveHoursAgo;

      // If our local ref is empty or older than the DB, update it
      if (isRecent && (!openedAtRef.current || Math.abs(openedAtRef.current - dbTime) > 2000)) {
        openedAtRef.current = dbTime;
        setSessionStartMs(dbTime);
        localStorage.setItem('session_opened_at', String(dbTime));
      }
    }

    // 2. TRANSITION: If window just opened and we have no reliable DB time, use right now
    if (windowOpen && !wasOpen && !openedAtRef.current) {
      const openTime = Date.now();
      openedAtRef.current = openTime;
      setSessionStartMs(openTime);
      localStorage.setItem('session_opened_at', String(openTime));
    } else if (!windowOpen && wasOpen) {
      // Window just closed: clear everything.
      openedAtRef.current = null;
      setSessionStartMs(null);
      localStorage.removeItem('session_opened_at');
    }
  }, [windowOpen, _sentinelOpenedMs]);

  // ── Grace period countdown ────────────────────────────────────────────────
  useEffect(() => {
    if (!windowOpen || !_schedId) {
      setGraceSecondsLeft(null);
      return;
    }

    const isSentinel = parseFloat(String(_schedRadius)) === -999 || activeScheduleForCountdown?.locationName === 'Manual Selection';
    const globalGrace = sysSettings?.late_threshold_mins ?? 15;
    const graceMins = (_graceMins !== undefined && _graceMins !== null) ? _graceMins : globalGrace;

    // CRITICAL: capture openedAt ONCE here.
    const openedAt = isSentinel
      ? (_sentinelOpenedMs && !isNaN(_sentinelOpenedMs) ? _sentinelOpenedMs : (openedAtRef.current || Date.now()))
      : (() => {
        const [h, m] = (_schedTime || '00:00').split(':').map(Number);
        const t = new Date();
        t.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
        return t.getTime();
      })();

    const safeGraceMins = isNaN(graceMins) ? globalGrace : graceMins;
    const endOfGrace = openedAt + safeGraceMins * 60 * 1000;


    const computeSecondsLeft = (): number => {
      if (isNaN(endOfGrace)) return 0;
      return Math.max(0, Math.round((endOfGrace - Date.now()) / 1000));
    };

    setGraceSecondsLeft(computeSecondsLeft());
    const timer = setInterval(() => {
      const left = computeSecondsLeft();
      setGraceSecondsLeft(left);
      if (left <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowOpen, _schedId, _schedRadius, _schedTime, _graceMins, sessionStartMs, sysSettings]);


  useEffect(() => {
    if (user?.mentorId) {
      getMentors().then(mentors => {
        const m = mentors.find((mnt: any) => mnt.id === user.mentorId);
        if (m) setMentor(m);
      });
    }
  }, [user]);

  // ── GPS + late check ──────────────────────────────────────────────────────
  const geofenceCheck = useCallback(
    async (silent: boolean = false): Promise<{ passed: boolean; isLate: boolean; schedule?: any }> => {
      // 1. Preparation: Build finalSchedules with SENTINEL FIRST so its late logic takes priority
      const sentinelSchedules = schedules.filter(s => parseFloat(s.radius) === -999 && s.isActive);
      const finalSchedules = manualOverrideActive
        ? [...sentinelSchedules, ...activeSchedules] // sentinel first
        : activeSchedules;

      if (!navigator.geolocation) {
        if (!silent) toast.error('Geolocation is not supported.', { id: 'geo-error' });
        return { passed: false, isLate: false };
      }

      // 2. Obtain Coords: Use state variables if fresh (< 10s), otherwise fetch new
      let lat: number, lng: number;
      if (lastKnownLocation && (Date.now() - locationTimestamp < 10000)) {
        lat = lastKnownLocation.lat;
        lng = lastKnownLocation.lng;
      } else {
        if (!silent) toast.loading('Verifying location...', { id: 'location-check' });
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) => 
            navigator.geolocation.getCurrentPosition(res, rej, { 
              enableHighAccuracy: true, 
              timeout: 5000, 
              maximumAge: 1000 
            })
          );
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch (error) {
          if (!silent) toast.error('Location failed', { id: 'location-check' });
          return { passed: false, isLate: false };
        }
      }

      // 3. Zone Validation: Check if within any active geofence
      let passed = false;
      for (const s of finalSchedules) {
        const r = parseFloat(s.radius);
        // Sentinel (-999) means geofence is disabled for this window
        if (r === -999) { 
          passed = true; 
          break; 
        }

        const gLat = parseFloat(s.lat), gLng = parseFloat(s.lng);
        if (isNaN(gLat) || isNaN(gLng)) continue;
        
        if (getDistance(lat, lng, gLat, gLng) <= r) { 
          passed = true; 
          break; 
        }
      }

      if (!silent) toast.dismiss('location-check');

      if (!passed) {
        if (!silent) toast.error('Outside campus zone!', { id: 'location-check' });
        return { passed: false, isLate: false };
      }

      if (!silent) toast.success('Location verified!', { id: 'location-check' });

      // 4. Lateness Determination
      let isLate = false;
      let bestSchedule = finalSchedules[0];

      for (const s of finalSchedules) {
        if (parseFloat(s.radius) === -999) {
          const openedAt = openedAtRef.current ?? _sentinelOpenedMs ?? Date.now();
          const graceMsElapsed = Date.now() - openedAt;
          const globalGrace = sysSettings?.late_threshold_mins ?? 15;
          const graceMins = s.gracePeriod || globalGrace;
          isLate = graceMsElapsed > (graceMins * 60 * 1000) + 30000;

          bestSchedule = s;
          break;
        }

        const [h, m] = (s.time || '00:00').split(':').map(Number);
        const schedTime = new Date(); 
        schedTime.setHours(h, m, 0, 0);
        const diffMins = (Date.now() - schedTime.getTime()) / 60000;
        const globalGrace = sysSettings?.late_threshold_mins ?? 15;
        const grace = s.gracePeriod || globalGrace;


        if (diffMins <= grace && diffMins >= -30) {
          isLate = false;
          bestSchedule = s;
          break;
        }

        // Compare closeness to scheduled time to find the most relevant window
        const currentBestTime = (bestSchedule?.time || '00:00').split(':').map(Number);
        const currentBestMs = bestSchedule ? Math.abs(Date.now() - new Date().setHours(currentBestTime[0], currentBestTime[1], 0, 0)) : Infinity;
        const newAttemptMs = Math.abs(Date.now() - schedTime.getTime());
        if (newAttemptMs < currentBestMs) bestSchedule = s;
      }

      return { passed: true, isLate, schedule: bestSchedule };
    },
    [manualOverrideActive, activeSchedules, schedules, lastKnownLocation, locationTimestamp, _sentinelOpenedMs]
  );

  // ── Background Auto-Tracking ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let autoCheckInterval: any = null;

    const attemptAutoCheckIn = async () => {
      // Gate: window must be open, attendance data must be loaded, and student not already checked in
      if (!windowOpen || !attendanceLoaded || isCheckedIn || isProcessing) {
        if (!windowOpen && mounted) setIsOutsideZone(false); 
        return;
      }

      // Final safety: check if we have any record for today in the local list
      const today = new Date().toLocaleDateString('en-CA');
      const hasTodayRecord = attendanceRecords.some(r => r.date === today && !r.checkOutTime);
      if (hasTodayRecord) {
        if (mounted) setIsCheckedIn(true);
        return;
      }

      setIsProcessing(true);
      // Run silently to avoid spamming the user
      const { passed, isLate } = await geofenceCheck(true);

      if (!passed) {
        if (mounted) {
          setIsProcessing(false);
          setIsOutsideZone(true); // they are outside the zone
        }
        return;
      }

      if (mounted) setIsOutsideZone(false); // successfully inside

      if (mounted) setIsOutsideZone(false); // successfully inside

      try {
        if (user) {
          const sched = activeScheduleForCountdown;
          const hasName = sched?.locationName && sched.locationName.trim();
          const locName = hasName
            ? sched.locationName.trim()
            : sched
              ? `${parseFloat(String(sched.lat)).toFixed(4)}°N, ${parseFloat(String(sched.lng)).toFixed(4)}°E`
              : 'Campus';
          const locCoords = sched ? `${sched.lat},${sched.lng}` : '';
          const locField = locCoords ? `${locName}|${locCoords}` : locName;

          if (isLate) {
            // IF LATE: We don't auto-check-in. We wait for the user to see the modal.
            // But we must signal to the UI that they ARE in the zone and should click check-in.
            // However, the user wants "Auto-Tracking".
            // Compromise: Mark as Late in DB immediately (so admin sees them), 
            // but keep the modal prominent.
            // Actually, the user's prompt says "BEFORE MARKING... IT SHOULD ASK".
            // So I will STOP auto-check-in for Late users and force them to click.
            if (!showLateModal) {
              setShowLateModal(true);
              toast('Late entry detected. Please provide a reason to check in.', { icon: '⏰', duration: 6000 });
            }
            setIsProcessing(false);
            return;
          }

          const record = {
            userId: user.uid || user.id,
            userName: user.name,
            rollNo: user.rollNo,
            course: user.course,
            date: new Date().toLocaleDateString('en-CA'),
            checkInTime: new Date().toISOString(),
            checkOutTime: null,
            status: 'Present',
            location: locField ? `${locField} | (Auto)` : '(Auto)',
          };
          const saved = await addAttendance(record);
          if (mounted) {
            setCurrentRecordId(saved.id);
            setIsCheckedIn(true);
            toast.success('Auto Check-in successful!', { icon: '🤖' });
          }
        }
      } catch (err) {
        console.error('Auto check-in error:', err);
      } finally {
        if (mounted) setIsProcessing(false);
      }
    };

    // Run once immediately, then poll every 10 seconds if window stands open
    if (windowOpen && attendanceLoaded && !isCheckedIn) {
      attemptAutoCheckIn();
      autoCheckInterval = setInterval(attemptAutoCheckIn, 3000); // 3s polling for "instant" feel
    }

    return () => {
      mounted = false;
      if (autoCheckInterval) clearInterval(autoCheckInterval);
    };
  }, [windowOpen, isCheckedIn, attendanceLoaded, geofenceCheck, user]);

  // ── Auto Reset When Window Closes ────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    if (!schedulesLoaded) return;

    // Logic: If window is closed and client thinks they are tracked, force a cleanup and checkout.
    if (!windowOpen && isCheckedIn) {
      const recordToClose = currentRecordId || localStorage.getItem('tracked_session_id');

      // 1. Force local state reset immediately (Optimistic UI)
      if (mounted) {
        setIsCheckedIn(false);
        setCurrentRecordId(null);
        setIsOutsideZone(false);
        setIsProcessing(false);
      }

      // 2. Permanently record out-time in background
      if (recordToClose) {
        updateAttendance(recordToClose, {
          checkOutTime: new Date().toISOString()
        }).catch(err => console.error('[Tracker] finalization failure:', err));
      }

      // 3. User feedback
      if (mounted) {
        toast.dismiss('session-reset');
        toast('Session finalized. Redirecting to tracking...', {
          icon: '🏁',
          style: { borderRadius: '12px', background: '#333', color: '#fff', fontSize: '10px' },
          duration: 4000,
          id: 'session-reset'
        });
      }
    }
    return () => { mounted = false; };
  }, [windowOpen, isCheckedIn, currentRecordId, schedulesLoaded]);

  // ── Manual Check-in handler (now internal fallback) ──────────────────────
  const handleActionClick = async () => {
    if (!isCheckedIn) {
      // Gate: window must be open
      if (!windowOpen) {
        toast.error('The attendance window is not currently open. Please wait for your admin to activate it.', {
          id: 'window-closed', icon: '🔒', duration: 5000,
        });
        return;
      }

      setIsProcessing(true);
      const { passed, isLate } = await geofenceCheck();
      setIsProcessing(false);
      if (!passed) return;

      try {
        if (user) {
          const sched = activeScheduleForCountdown;
          const hasName = sched?.locationName && sched.locationName.trim();
          const locName = hasName
            ? sched.locationName.trim()
            : sched
              ? `${parseFloat(String(sched.lat)).toFixed(4)}°N, ${parseFloat(String(sched.lng)).toFixed(4)}°E`
              : 'Campus';
          const locCoords = sched ? `${sched.lat},${sched.lng}` : '';
          const locField = locCoords ? `${locName}|${locCoords}` : locName;

          if (isLate) {
            setShowLateModal(true);
            toast.error('You are late! Please provide a reason to check in.', { icon: '⏰' });
            return;
          }

          const record = {
            userId: user.uid || user.id,
            userName: user.name,
            rollNo: user.rollNo,
            course: user.course,
            date: new Date().toLocaleDateString('en-CA'),
            checkInTime: new Date().toISOString(),
            checkOutTime: null,
            status: 'Present',
            location: locField ? `${locField} | (Manual)` : '(Manual)',
          };
          const saved = await addAttendance(record);
          setCurrentRecordId(saved.id);
          setIsCheckedIn(true);
          setShowAction(true);
          toast.success('Checked in successfully!');
        }
      } catch (err) {
        toast.error('Check-in failed. Error saving to DB.');
      }
    } else {
      setShowCheckoutModal(true);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutReason) return;
    if (checkoutReason === 'Other' && !otherReason) return;

    if (currentRecordId) {
      setIsProcessing(true);
      try {
        await updateAttendance(currentRecordId, {
          checkOutTime: new Date().toISOString(),
          checkoutReason: checkoutReason === 'Other' ? otherReason : checkoutReason,
        });
        toast.success('Checked out successfully.');
        setIsCheckedIn(false);
        setShowCheckoutModal(false);
      } catch (err) {
        toast.error('Failed to checkout. Database error.');
      } finally {
        setIsProcessing(false);
      }
    }
    setCheckoutReason(''); setOtherReason('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image too large. Please keep it under 2MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setLateReasonImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitLateReason = async () => {
    if (!lateReasonText.trim()) return;
    setIsProcessing(true);
    try {
      if (user) {
        const sched = activeScheduleForCountdown;
        const hasName = sched?.locationName && sched.locationName.trim();
        const locName = hasName
          ? sched.locationName.trim()
          : sched
            ? `${parseFloat(String(sched.lat)).toFixed(4)}°N, ${parseFloat(String(sched.lng)).toFixed(4)}°E`
            : 'Campus';
        const locCoords = sched ? `${sched.lat},${sched.lng}` : '';
        const locField = locCoords ? `${locName}|${locCoords}` : locName;

        const record = {
          userId: user.uid || user.id,
          userName: user.name,
          rollNo: user.rollNo,
          course: user.course,
          date: new Date().toLocaleDateString('en-CA'),
          checkInTime: new Date().toISOString(),
          checkOutTime: null,
          status: 'Late',
          location: locField ? `${locField} | (Manual)` : '(Manual)',
          lateReason: lateReasonText,
          lateReasonStatus: 'Pending Review',
          lateReasonImage: lateReasonImage,
        };
        const saved = await addAttendance(record);
        setCurrentRecordId(saved.id);
        setIsCheckedIn(true);
        setShowAction(true);
        toast.success('Late attendance recorded and appeal submitted.', { icon: '✅' });
        setShowLateModal(false);
        setLateReasonText('');
        setLateReasonImage(null);
      }
    } catch (err) {
      toast.error('Failed to record attendance. DB error.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Window status badge ──────────────────────────────────────────────────
  const WindowBadge = () => {
    if (!schedulesLoaded) return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking window...
      </div>
    );
    if (isCheckedIn) return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-600 uppercase tracking-wider mt-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Checked In
      </div>
    );
    if (windowOpen) return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-2 animate-in fade-in duration-500">
        <Navigation className="w-3 h-3 animate-pulse" />
        Window Open — Auto-Tracking
      </div>
    );
    if (lastCheckOut && !isCheckedIn) return (
      <div className="flex flex-col items-center mt-2 animate-in slide-in-from-top-2 duration-700">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full border border-gray-100">
          <History className="w-3 h-3 text-indigo-500" />
          Last Check-out: {new Date(lastCheckOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
    if (!windowOpen) return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider mt-2">
        <Lock className="w-3 h-3" />
        Window Closed
      </div>
    );
  };

  return (
    <>
      {/* Main widget */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 lg:p-6 flex flex-col items-center justify-center text-center relative overflow-hidden h-full min-h-[250px] lg:min-h-[350px]">
        {/* Top accent bar — green when open, red when closed */}
        <div className={`absolute top-0 left-0 w-full h-2 transition-colors duration-700 ${windowOpen ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`} />

        {/* Countdown during grace period / Clock otherwise */}
        {windowOpen && !isCheckedIn && graceSecondsLeft !== null ? (
          <>
            <h3 className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-orange-500" />
              Grace Period
            </h3>
            <div className={`text-3xl lg:text-4xl font-black font-mono tracking-tight mb-1 transition-colors ${(graceSecondsLeft || 0) <= 60 ? 'text-red-500 animate-pulse' :
                (graceSecondsLeft || 0) <= 180 ? 'text-orange-500' : 'text-gray-800'
              }`}>
              {String(Math.floor((graceSecondsLeft || 0) / 60)).padStart(2, '0')}:{String((graceSecondsLeft || 0) % 60).padStart(2, '0')}
            </div>
            <p className="text-[11px] lg:text-xs text-gray-400 font-semibold mb-0.5">
              {graceSecondsLeft > 0 ? 'Time left to check in on time' : 'Grace period expired — you will be marked Late'}
            </p>
            {activeScheduleForCountdown?.locationName && (
              <p className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activeScheduleForCountdown.locationName}
              </p>
            )}
          </>
        ) : (
          <>
            <h3 className="text-xs lg:text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Current Time</h3>
            <div className="text-3xl lg:text-4xl font-black text-gray-800 mb-1 font-mono tracking-tight">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </>
        )}

        {/* Live window status badge */}
        <WindowBadge />

        <div className="mt-5 lg:mt-6">
          {isOutsideZone && windowOpen ? (
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-xs lg:text-sm shadow-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-red-300 mx-auto animate-radar-red text-center px-4 leading-snug border-4 border-white/20">
              <AlertCircle className="w-8 h-8 lg:w-10 lg:h-10 mb-1 mx-auto" />
              <span className="uppercase tracking-tighter">OUT OF ZONE</span>
            </div>
          ) : isCheckedIn ? (
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-lg lg:text-xl shadow-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-teal-200 mx-auto transition-transform hover:scale-105 border-4 border-white/20">
              <MapPin className="w-7 h-7 lg:w-9 lg:h-9 mb-1 mx-auto" />
              TRACKED
            </div>
          ) : !windowOpen ? (
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-xs lg:text-sm shadow-xl bg-gradient-to-br from-indigo-400 to-purple-500 shadow-indigo-200 mx-auto border-4 border-white/20">
              <Lock className="w-7 h-7 lg:w-9 lg:h-9 mb-1 mx-auto" />
              LOCKED
            </div>
          ) : (
            <div className="w-32 h-32 lg:w-40 lg:h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-xs lg:text-sm shadow-xl bg-gradient-to-br from-blue-400 to-indigo-500 shadow-blue-200 mx-auto animate-radar border-4 border-white/20">
              <Loader2 className="w-7 h-7 lg:w-9 lg:h-9 mb-1 mx-auto animate-spin" />
              TRACKING
            </div>
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-gray-500 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-green-500" />
          Location verified on check-in
        </p>
      </div>

      {/* ── Checkout reason modal ─────────────────────────────────────────── */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-4">
                <LogOut className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Check-Out Reason</h3>
              <p className="text-sm text-gray-500 mb-4">Please select a reason for leaving the campus.</p>
              <div className="space-y-2 mb-6">
                {['Classes Over', 'Medical Reason', 'Emergency', 'Other'].map(reason => (
                  <label key={reason} className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${checkoutReason === reason ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="reason" value={reason} checked={checkoutReason === reason}
                      onChange={(e) => setCheckoutReason(e.target.value)} className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                    <span className={`text-sm font-medium ${checkoutReason === reason ? 'text-blue-700' : 'text-gray-700'}`}>{reason}</span>
                  </label>
                ))}
                {checkoutReason === 'Other' && (
                  <input type="text" placeholder="Please specify your reason..." value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2" autoFocus />
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCheckoutModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleConfirmCheckout} disabled={!checkoutReason || (checkoutReason === 'Other' && !otherReason)}
                  className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  Check Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Late reason modal ─────────────────────────────────────────────── */}
      {showLateModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
              <button onClick={() => setShowLateModal(false)} className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-1">Attendance Grace Period Exceeded</h3>
              <p className="text-orange-100 text-sm font-medium">You are marked as <span className="underline decoration-2 underline-offset-2">LATE</span> today.</p>
            </div>
            <div className="p-6 sm:p-8">
              <div className="bg-blue-50 rounded-2xl p-4 mb-8 border border-blue-100 flex items-center justify-between group hover:bg-blue-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
                    {mentor?.name?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-0.5">Your Mentor</p>
                    <h4 className="text-gray-800 font-bold leading-tight">{mentor?.name || 'Assigned Mentor'}</h4>
                    <p className="text-xs text-gray-500 font-medium">{mentor?.phone || 'Contact Admin'}</p>
                  </div>
                </div>
                {mentor?.phone && (
                  <a href={`tel:${mentor.phone}`} className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-md hover:scale-110 active:scale-95 transition-all border border-blue-200 group-hover:bg-blue-600 group-hover:text-white">
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Reason for Late Entry</label>
                  <textarea placeholder="Briefly explain why you were late (e.g., Traffic, Medical, Personal)" value={lateReasonText}
                    onChange={(e) => setLateReasonText(e.target.value)} rows={3}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none shadow-inner font-medium mb-4" />
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Evidence / Proof (Optional)</label>
                  <div className="relative">
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="late-image-upload" />
                    <label htmlFor="late-image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer overflow-hidden group">
                      {lateReasonImage ? (
                        <div className="relative w-full h-full">
                          <img src={lateReasonImage} alt="Preview" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-[10px] font-bold uppercase">Change Image</span>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Navigation className="w-6 h-6 text-gray-300 mb-2 group-hover:text-orange-400" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Click to upload photo</span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={handleSubmitLateReason} disabled={!lateReasonText.trim() || isProcessing}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale">
                    {isProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        SUBMIT APPEAL
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-gray-400 mt-4 font-bold uppercase tracking-tighter">
                    Submission is final and will be reviewed by admin & mentor
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StudentCheckInWidget;
