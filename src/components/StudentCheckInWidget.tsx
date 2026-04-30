import { useState, useEffect, useCallback, useRef } from 'react';
import {
  addAttendance,
  updateAttendance,
  getAttendance,
  getMentors,
  listenToCollection,
  getGeofenceSchedules,
  isScheduleActive,
  getSystemSettings,
  addLeaveRequest,
  addNotification,
  getLeaveRequests,
  updateLeaveRequestStatus,
} from '../services/dbService';
import {
  Phone, AlertCircle, Send, X, ClipboardList, LogOut,
  MapPin, Navigation, Lock, Unlock, Loader2, History, Timer, CheckCircle, Clock, RefreshCw, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import CustomInput from './CustomInput';
import CustomTextarea from './CustomTextarea';
import { MessageSquare as MessageSquareIcon } from 'lucide-react';

interface StudentCheckInWidgetProps {
  user: any;
}

const StudentCheckInWidget = ({ user }: StudentCheckInWidgetProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkedInStatus, setCheckedInStatus] = useState<string | null>(null);
  const [hasLoadedAttendance, setHasLoadedAttendance] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [lastCheckOut, setLastCheckOut] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [activeScheduleForCountdown, setActiveScheduleForCountdown] = useState<any>(null);
  const [allGeofences, setAllGeofences] = useState<any[]>([]);
  const [sysSettings, setSysSettings] = useState<any>(null);
  const [isOutsideZone, setIsOutsideZone] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReasonText, setLateReasonText] = useState('');
  const [pendingLateData, setPendingLateData] = useState<any>(null);

  const [checkoutReasonState, setCheckoutReasonState] = useState<string | null>(null);
  const [checkoutDetails, setCheckoutDetails] = useState('');
  const [verificationState, setVerificationState] = useState<'IDLE' | 'SEARCHING' | 'READY'>('IDLE');
  const [pendingCheckInData, setPendingCheckInData] = useState<any>(null);
  
  const [showRejoinReasonModal, setShowRejoinReasonModal] = useState(false);
  const [rejoinReasonText, setRejoinReasonText] = useState('');
  const [pendingRejoinLeaveId, setPendingRejoinLeaveId] = useState<string | null>(null);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const syncAttendance = async () => {
      const todayLogs = await getAttendance(userId);
      const today = new Date().toISOString().split('T')[0];
      const activeLog = todayLogs.slice().reverse().find((log: any) => log.date === today && log.status !== 'Absent');
      if (activeLog) {
        setIsCheckedIn(!activeLog.checkOutTime);
        setLastCheckOut(activeLog.checkOutTime || null);
        setCheckedInStatus(activeLog.status);
        setCheckoutReasonState(activeLog.checkoutReason || null);
      }
    };
    syncAttendance();

    const unsub = listenToCollection('attendance', (logs) => {
      const activeLog = logs.find((l: any) => l.userId === userId && !l.checkOutTime);
      
      if (activeLog) {
        // If we have an active session, check if this log is stale (from a previous session today)
        let isStale = false;
        if (activeScheduleForCountdown) {
          const [h, m] = activeScheduleForCountdown.time.split(':').map(Number);
          const sessionStart = new Date();
          sessionStart.setHours(h, m, 0, 0);
          const logTime = new Date(activeLog.checkInTime);
          if (logTime < sessionStart && activeLog.checkOutTime) {
            isStale = true;
          }
        }

        if (isStale) {
          setIsCheckedIn(false);
          setLastCheckIn(null);
          setLastCheckOut(null);
          setCheckedInStatus(null);
          setCheckoutReasonState(null);
        } else {
          setIsCheckedIn(!activeLog.checkOutTime);
          setLastCheckIn(activeLog.checkInTime || null);
          setLastCheckOut(activeLog.checkOutTime || null);
          setCheckedInStatus(activeLog.status);
          setCheckoutReasonState(activeLog.checkoutReason || null);
        }
      } else {
        setIsCheckedIn(false);
        setLastCheckIn(null);
        setLastCheckOut(null);
        setCheckedInStatus(null);
        setCheckoutReasonState(null);
      }
      setHasLoadedAttendance(true);
    }, userId);
    return () => unsub();
  }, [userId, activeScheduleForCountdown]);

  useEffect(() => {
    if (!userId) return;

    const unsubSchedules = listenToCollection('geofence_schedules', async (allSchedules) => {
      try {
        setAllGeofences(allSchedules);
        const settings = await getSystemSettings();
        setSysSettings(settings);
      } catch (error) {
        console.error('[StudentCheckInWidget] Schedule sync error:', error);
      }
    });

    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      unsubSchedules();
      clearInterval(clockInterval);
    };
  }, [userId]);

  // Recalculate schedule every second based on `currentTime`
  useEffect(() => {
    if (!allGeofences.length) {
       setWindowOpen(false);
       setGraceSecondsLeft(null);
       setActiveScheduleForCountdown(null);
       return;
    }

    const activeSchedules = allGeofences.filter(s => isScheduleActive(s, currentTime));
    const active = activeSchedules.length > 0;
    setWindowOpen(active);
    
    if (active) {
      const currentSchedule = activeSchedules[0];
      setActiveScheduleForCountdown(currentSchedule);
      
      const startParts = currentSchedule.time.split(':');
      const windowStart = new Date();
      windowStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
      
      const graceMinutes = sysSettings?.late_threshold_mins || 15;
      const graceEnd = new Date(windowStart.getTime() + graceMinutes * 60000);
      setGraceSecondsLeft(currentTime < graceEnd ? Math.floor((graceEnd.getTime() - currentTime.getTime()) / 1000) : 0);
    } else {
      setGraceSecondsLeft(null);
      setActiveScheduleForCountdown(null);
    }
  }, [currentTime, allGeofences, sysSettings]);

  useEffect(() => {
    if (graceSecondsLeft !== null && graceSecondsLeft > 0) {
      const timer = setInterval(() => setGraceSecondsLeft(prev => (prev && prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [graceSecondsLeft]);

  useEffect(() => {
    if (hasLoadedAttendance && windowOpen && !isCheckedIn && !isProcessing && !lastCheckOut && verificationState === 'IDLE') {
      handleAutoCheckIn();
    }
    if (!windowOpen) {
      setVerificationState('IDLE');
      setPendingCheckInData(null);
    }
  }, [hasLoadedAttendance, windowOpen, isCheckedIn, isProcessing, lastCheckOut, verificationState]);

  const handleAutoCheckIn = async () => {
    if (isProcessing || !activeScheduleForCountdown || isCheckedIn) return;
    
    setVerificationState('SEARCHING');
    setIsProcessing(true);
    let hasCheckedInLocally = false;
    let locallyOutsideZone = false;
    
    const attemptCheckIn = (highAccuracy: boolean) => {
      return new Promise<void>((resolve) => {
        if (hasCheckedInLocally) return resolve(); // Skip if already successful

        const sched = activeScheduleForCountdown;
        const targetLat = parseFloat(sched.lat);
        const targetLng = parseFloat(sched.lng);
        const targetRadius = parseFloat(sched.radius);

        navigator.geolocation.getCurrentPosition(async (pos) => {
          const { latitude, longitude } = pos.coords;
          const dist = getFastDistance(latitude, longitude, targetLat, targetLng);
          
          if (dist <= targetRadius) {
            locallyOutsideZone = false;
            setIsOutsideZone(false);
            const now = new Date().toISOString();
            const startParts = sched.time.split(':');
            const windowStart = new Date();
            windowStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
            
            // Re-fetch or use cached grace period
            const settings = await getSystemSettings();
            const graceMinutes = settings?.late_threshold_mins || 15; 
            const graceEnd = new Date(windowStart.getTime() + graceMinutes * 60000);
            const isLate = new Date() > graceEnd;

            const checkInData = {
              userId, 
              userName: user.name, 
              rollNo: user.rollNo, 
              course: user.course,
              date: new Date().toISOString().split('T')[0], 
              checkInTime: now, 
              status: isLate ? 'Late' : 'Present', 
              locationName: sched.locationName,
              locationCoords: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            };

            if (lastCheckOut) {
              // It's a rejoin, set to READY and wait for manual click
              setPendingCheckInData(checkInData);
              setVerificationState('READY');
              toast.success('Ready to Re-join!');
            } else {
              // First time check-in, automate it
              try {
                const recordedData = await addAttendance(checkInData);
                setIsCheckedIn(true);
                setVerificationState('IDLE');
                if (isLate) {
                  setPendingLateData(recordedData);
                  setShowLateModal(true);
                } else {
                  toast.success('Attendance Automated: Verified!');
                }
              } catch (err) {
                console.error('[AutoCheckIn] DB Save failed:', err);
                toast.error('Auto-checkin failed. Retrying...');
              }
            }
            hasCheckedInLocally = true;
            setIsProcessing(false);
            resolve();
          } else {
            locallyOutsideZone = true;
            setIsOutsideZone(true);
            setIsProcessing(false);
            resolve();
          }
        }, (err) => {
          console.warn(`[AutoCheckIn] Geolocation attempt (HighAcc: ${highAccuracy}) failed:`, err.message);
          resolve(); // Resolve anyway to allow next steps or cleanup
        }, { 
          enableHighAccuracy: highAccuracy, 
          timeout: highAccuracy ? 10000 : 15000, 
          maximumAge: highAccuracy ? 0 : 30000 
        });
      });
    };

    try {
      // Step 1: Try High Accuracy
      await attemptCheckIn(true);
      
      // Step 2: If still not checked in and not outside zone (meaning it likely timed out or accuracy was poor), try standard
      if (!hasCheckedInLocally && !locallyOutsideZone) {
        console.log('[AutoCheckIn] Retrying with standard accuracy...');
        await attemptCheckIn(false);
      }
    } catch (e) { 
      console.error('[AutoCheckIn] Fatal error:', e); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const performFinalCheckIn = async () => {
    if (!pendingCheckInData || isProcessing) return;
    setIsProcessing(true);
    try {
      const recordedData = await addAttendance(pendingCheckInData);
      setIsCheckedIn(true);
      setVerificationState('IDLE');
      
      if (recordedData.status === 'Late') {
        setPendingLateData(recordedData);
        setShowLateModal(true);
      } else {
        toast.success('Check-in Activated Successfully!');
      }
    } catch (err) {
      console.error('[StudentCheckInWidget] Final check-in failed:', err);
      toast.error('Failed to activate check-in. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Best Mathematical Approach: Equirectangular approximation
  // Significantly faster than Haversine for small geofences (campus level)
  const getFastDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371000; // Earth's radius in meters
    const x = (lon2 - lon1) * Math.PI / 180 * Math.cos((lat1 + lat2) * Math.PI / 360);
    const y = (lat2 - lat1) * Math.PI / 180;
    return Math.sqrt(x * x + y * y) * R;
  };

  const handleConfirmLateCheckIn = async () => {
    if (!lateReasonText.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setIsProcessing(true);
    try {
      await updateAttendance(pendingLateData.id, {
        lateReason: lateReasonText,
        lateReasonStatus: 'Pending'
      });
      setShowLateModal(false);
      setLateReasonText('');
      setPendingLateData(null);
      toast.success('Checked in (LATE)');
    } catch (err) {
      console.error('[AutoCheckIn] DB Save failed:', err);
      toast.error('DB error.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOutRequest = () => setShowCheckoutModal(true);
  const handleConfirmCheckout = async () => {
    setIsProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const logs = await getAttendance(userId);
      const activeLog = logs.find((l: any) => l.date === today && !l.checkOutTime);
      if (activeLog) {
        const existingReason = activeLog.checkoutReason ? `${activeLog.checkoutReason} | ` : '';
        const currentCheckoutStr = checkoutReason + (checkoutDetails ? ` - ${checkoutDetails}` : '');
        const finalReason = existingReason + currentCheckoutStr;
        const now = new Date().toISOString();
        await updateAttendance(activeLog.id, { checkOutTime: now, checkoutReason: finalReason });

        if (checkoutReason === 'Emergency') {
          await addLeaveRequest({
            userId,
            userName: user.name,
            rollNo: user.rollNo,
            fromDate: today,
            toDate: today,
            type: 'Emergency',
            reason: checkoutDetails || 'Emergency Leave during active session',
            status: 'Pending'
          });
          
          await addNotification({
            title: 'CRITICAL: EMERGENCY LEAVE',
            message: `Student ${user.name} (${user.rollNo}) has requested an Emergency leave. Details: ${checkoutDetails}`,
            type: 'alert',
            senderId: userId,
            allowDuplicates: true
          });
        }

        setIsCheckedIn(false); setLastCheckOut(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })); setShowCheckoutModal(false);
        toast.success('Checked out successfully!');
      }
    } catch (e) { toast.error('DB error.'); } finally { setIsProcessing(false); }
  };

  const handleReJoinClick = async () => {
    if (activeScheduleForCountdown && activeScheduleForCountdown.endTime) {
      const now = new Date();
      const nowTotal = now.getHours() * 60 + now.getMinutes();
      const [eh, em] = activeScheduleForCountdown.endTime.split(':').map(Number);
      const endTotal = eh * 60 + em;
      
      if (endTotal >= nowTotal && (endTotal - nowTotal) <= 10) {
        toast.error("Session ends in less than 10 minutes. Rejoining is fully blocked.");
        return;
      }
    }

    setIsProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const leaves = await getLeaveRequests(userId);
      const todayEmergencyLeave = leaves.find((l: any) => l.fromDate === today && l.type === 'Emergency');
      
      if (todayEmergencyLeave) {
        setPendingRejoinLeaveId(todayEmergencyLeave.id);
        setShowRejoinReasonModal(true);
        setIsProcessing(false);
        return;
      }

      await proceedWithRejoin('');
    } catch (e) {
      toast.error("Failed to check rejoin status.");
      setIsProcessing(false);
    }
  };

  const proceedWithRejoin = async (reason: string) => {
    setIsProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (pendingRejoinLeaveId) {
        await updateLeaveRequestStatus(pendingRejoinLeaveId, 'Cancelled');
        await addNotification({
          title: 'EMERGENCY LEAVE CANCELLED',
          message: `Student ${user.name} (${user.rollNo}) cancelled their emergency leave and rejoined. Reason: ${reason}`,
          type: 'info',
          senderId: userId,
          allowDuplicates: true
        });
        toast.success("Emergency leave cancelled. Rejoining...");
      }

      const logs = await getAttendance(userId);
      const activeLog = logs.find((l: any) => l.date === today && l.checkOutTime);
      if (activeLog && activeLog.checkoutReason) {
         const rejoinAppend = reason ? ` | Rejoined at ${new Date().toLocaleTimeString()} (Reason: ${reason})` : ` | Rejoined at ${new Date().toLocaleTimeString()}`;
         await updateAttendance(activeLog.id, { 
            checkOutTime: null,
            checkoutReason: `${activeLog.checkoutReason}${rejoinAppend}`
         });
      }

      setLastCheckOut(null);
      setShowRejoinReasonModal(false);
      setRejoinReasonText('');
      setPendingRejoinLeaveId(null);
    } catch (e) {
      toast.error("Failed to rejoin. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes steady-glow { 0%, 100% { opacity: 0.8; filter: brightness(1.2); } 50% { opacity: 1; filter: brightness(1.5); } }
        @keyframes sonar-pulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes float-lock {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes scan-line {
          0% { left: -100%; }
          100% { left: 100%; }
        }
        @keyframes color-shift {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(15deg); }
        }
        
        .static-ring-system {
          position: absolute;
          inset: -6px;
          border-radius: 16px;
          padding: 2px;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 5;
        }

        .sonar-wave {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          border: 4px solid currentColor;
          animation: sonar-pulse 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          pointer-events: none;
          z-index: 4;
        }
        
        .static-offline { 
          background: rgba(0, 0, 0, 0.04); 
          box-shadow: none;
          opacity: 0.3;
        }
        
        .static-active { 
          background: linear-gradient(135deg, #3b82f6, #8b5cf6, #3b82f6); 
          background-size: 200% 200%;
          box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 0 0 60px rgba(139, 92, 246, 0.2);
          animation: steady-glow 2s ease-in-out infinite, color-shift 4s linear infinite alternate;
        }

        .action-dial-static::after {
          content: "";
          position: absolute;
          top: 0;
          height: 100%;
          width: 50%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.4), transparent);
          transform: skewX(-25deg);
          animation: scan-line 4s linear infinite;
          pointer-events: none;
        }
        
        .static-success { 
          background: linear-gradient(135deg, #10b981, #34d399); 
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.6), 0 0 60px rgba(52, 211, 153, 0.2);
          animation: steady-glow 3s ease-in-out infinite;
        }
        
        .static-alert { 
          background: linear-gradient(135deg, #ef4444, #f87171); 
          box-shadow: 0 0 30px rgba(239, 68, 68, 0.6);
          animation: steady-glow 1s ease-in-out infinite;
        }
        
        .action-dial-static {
          width: 100%;
          max-width: 190px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          background: white;
          border: 1px solid rgba(0,0,0,0.05);
          z-index: 10;
          overflow: hidden;
        }
        .text-black-force { color: #000000 !important; font-weight: 900; }
        .vivid-status-pill {
          background: #2563eb;
          box-shadow: 0 0 20px rgba(37, 99, 235, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .liquid-glass-final {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(35px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
          z-index: 10;
        }
        .float-anim { animation: float-lock 3s ease-in-out infinite; }
        
        .dynamic-aura {
          position: absolute;
          width: 150%;
          height: 150%;
          top: -25%;
          left: -25%;
          filter: blur(80px);
          opacity: 0.15;
          z-index: 0;
          transition: background 1s ease;
          pointer-events: none;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass-final rounded-[32px] p-6 lg:p-8 flex flex-col items-center justify-center gap-6 min-h-[240px] lg:min-h-[260px] w-full relative overflow-hidden"
      >
        <div className={`dynamic-aura ${
          !windowOpen ? 'bg-gray-400' :
          isCheckedIn ? 'bg-emerald-400' :
          isOutsideZone ? 'bg-red-400' :
          'bg-blue-400'
        }`} />
        
        {/* Top Section: Time & System Status */}
        <div className="flex flex-col items-center text-center w-full z-10">
          <div className="text-black-force text-3xl lg:text-4xl tracking-tighter flex items-baseline justify-center w-full">
            <span className="font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
          <span className="text-black-force opacity-40 uppercase text-[9px] lg:text-[10px] tracking-[0.4em] mt-1 lg:mt-2 mb-3">Precision System Status</span>
          
          <AnimatePresence mode="wait">
            {activeScheduleForCountdown && windowOpen && !isCheckedIn && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm"
              >
                <Clock className="w-3 h-3 text-blue-500" />
                <span>
                  {new Date(`2000/01/01 ${activeScheduleForCountdown.time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(`2000/01/01 ${activeScheduleForCountdown.endTime}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </motion.div>
            )}
            {isCheckedIn && windowOpen && lastCheckIn && (
              <motion.div
                key="checkin"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm"
              >
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                <span>IN: {new Date(lastCheckIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Middle Section: Action Dial */}
        <div className="w-full flex justify-center relative z-10">
          <div className="relative w-full max-w-[200px]">
            {windowOpen && !isCheckedIn && <div className="sonar-wave text-blue-400/30" />}
            {isCheckedIn && windowOpen && <div className="sonar-wave text-emerald-400/20" />}

            <div className={`static-ring-system ${
              !windowOpen ? 'static-offline' :
              isCheckedIn ? 'static-success' :
              isOutsideZone ? 'static-alert' :
              'static-active'
            }`} />

            <div
              className={`action-dial-static ${
                !windowOpen ? 'text-slate-400' :
                isCheckedIn ? (checkedInStatus === 'Late' ? 'text-orange-500' : 'text-[#064e3b]') :
                lastCheckOut && checkoutReasonState?.startsWith('Classes Over') ? 'text-emerald-600 cursor-default' :
                lastCheckOut ? 'text-blue-600' :
                'text-[#1e40af]'
              }`}
              onClick={(!windowOpen) ? undefined : isCheckedIn ? handleCheckOutRequest : (lastCheckOut && !checkoutReasonState?.startsWith('Classes Over')) ? handleReJoinClick : undefined}
            >
              <AnimatePresence mode="wait">
                {!windowOpen ? (
                  <motion.div key="o" initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="flex items-center gap-2 float-anim">
                    <Lock className="w-6 h-6 opacity-40" /> <span>OFFLINE</span>
                  </motion.div>
                ) : isCheckedIn ? (
                  <motion.div key="v" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                    {checkedInStatus === 'Late' ? (
                      <>
                        <AlertCircle className="w-6 h-6 text-orange-500" /> <span>Late Verified</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6 text-emerald-500" /> <span>Verified</span>
                      </>
                    )}
                  </motion.div>
                ) : !windowOpen ? (
                  <motion.div key="o" initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="flex items-center gap-2 float-anim">
                    <Lock className="w-6 h-6 opacity-40" /> <span>OFFLINE</span>
                  </motion.div>
                ) : (lastCheckOut && !checkoutReasonState?.startsWith('Classes Over')) ? (
                  <motion.div key="co" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-500" /> <span className="text-blue-600 font-bold tracking-widest text-[11px] hover:scale-105 transition-transform">RE-JOIN</span>
                  </motion.div>
                ) : (lastCheckOut && checkoutReasonState?.startsWith('Classes Over')) ? (
                  <motion.div key="cdone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-500" /> <span>Verified</span>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="s" 
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    className="flex flex-col items-center gap-1"
                    onClick={() => {
                      if (verificationState === 'READY' && !isProcessing) {
                        performFinalCheckIn();
                      }
                    }}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    ) : verificationState === 'READY' ? (
                      <RefreshCw className="w-7 h-7 text-blue-600 animate-pulse" />
                    ) : (
                      <Navigation className="w-6 h-6 text-blue-400" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-tighter">
                      {isProcessing ? 'Verifying...' : 
                       verificationState === 'READY' ? 'REJOIN SESSION' : 
                       'Searching Zone...'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Section: Footer Pill */}
        <div className="vivid-status-pill flex items-center gap-2 px-6 py-2 rounded-full z-10 transition-transform hover:scale-105 shadow-lg">
          <Navigation className="w-4 h-4 text-white animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Geo-Synced Terminal</span>
        </div>
      </motion.div>

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-8 border border-blue-100"><LogOut className="w-10 h-10 text-blue-600" /></div>
              <h3 className="text-2xl font-black text-black-force mb-8 uppercase tracking-tighter">Exit Secure</h3>
              <div className="space-y-3 mb-6">
                {['Classes Over', 'Emergency', 'Other'].map(reason => (
                  <button key={reason} onClick={() => setCheckoutReason(reason)} className={`w-full py-4 border rounded-2xl text-xs uppercase tracking-widest font-black transition-all ${checkoutReason === reason ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-black-force border-gray-100 hover:border-blue-600'}`}>{reason}</button>
                ))}
              </div>
              {checkoutReason && (
                <div className="mb-6 text-left animate-in fade-in slide-in-from-top-4 duration-300">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Please Provide Details</label>
                  <textarea
                    value={checkoutDetails}
                    onChange={(e) => setCheckoutDetails(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="Describe the reason..."
                  />
                  <button 
                    onClick={handleConfirmCheckout} 
                    disabled={!checkoutDetails.trim()} 
                    className="w-full mt-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-red-200 transition-colors"
                  >
                    Confirm Exit
                  </button>
                </div>
              )}
              <button onClick={() => { setShowCheckoutModal(false); setCheckoutReason(''); setCheckoutDetails(''); }} className="text-gray-400 hover:text-black font-black text-[11px] uppercase tracking-widest">Cancel Request</button>
            </div>
          </div>
        </div>
      )}

      {showLateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-8 border border-orange-100">
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </div>
              <h3 className="text-2xl font-black text-center text-black-force mb-2 uppercase tracking-tighter">Late Check-in</h3>
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <p className="text-center text-red-700 text-xs font-bold uppercase tracking-wider">
          CRITICAL WARNING
        </p>
        <p className="text-center text-red-600 text-[10px] mt-1 font-medium">
          You missed the grace period. Your check-in time has been recorded, but you <strong className="font-black">MUST</strong> provide a valid reason below. <strong className="font-black underline">Failure to provide a reason will result in your attendance being marked as ABSENT by the administration.</strong>
        </p>
      </div>
              
              <div className="space-y-4 mb-8">
                <CustomTextarea
                  label="Reason for being late"
                  value={lateReasonText}
                  onChange={(e) => setLateReasonText(e.target.value)}
                  placeholder="E.g., Traffic, Transport issue..."
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleConfirmLateCheckIn}
                  disabled={isProcessing || !lateReasonText.trim()}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl font-black transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit & Verify Check-in
                </button>
                <button 
                  onClick={() => setShowLateModal(false)} 
                  className="text-gray-400 hover:text-black text-center w-full font-black text-[11px] uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showRejoinReasonModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6 border border-blue-100">
                <RefreshCw className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-center text-black-force mb-2 uppercase tracking-tighter">Cancel Leave</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-center text-blue-700 text-[10px] font-medium">
                  You requested an emergency leave. To cancel it and rejoin the session, you must provide a reason.
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <CustomTextarea
                  label="Reason for returning"
                  value={rejoinReasonText}
                  onChange={(e) => setRejoinReasonText(e.target.value)}
                  placeholder="E.g., Emergency resolved..."
                  required
                />
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => proceedWithRejoin(rejoinReasonText)}
                  disabled={isProcessing || !rejoinReasonText.trim()}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Re-join'}
                </button>
                <button 
                  onClick={() => { setShowRejoinReasonModal(false); setRejoinReasonText(''); }}
                  className="w-full py-3 text-gray-400 hover:text-black font-black text-[11px] uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentCheckInWidget;
