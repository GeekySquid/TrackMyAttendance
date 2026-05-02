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
  MapPin, Navigation, Lock, Unlock, Loader2, History, Timer, CheckCircle, Clock, RefreshCw, Zap, WifiOff
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
        await attemptCheckIn(false);
      }
    } catch (e) { 
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
        /* GLOBAL STANDARD DESIGN SYSTEM: AESTHETIC EXCELLENCE */
        .widget-card-master {
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border-radius: 40px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 10px 30px -10px rgba(0, 0, 0, 0.05),
            0 20px 60px -20px rgba(0, 0, 0, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.6);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          min-height: 280px;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .widget-card-master:before {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
          opacity: 0.02;
          pointer-events: none;
        }

        .time-display-master {
          font-weight: 950;
          letter-spacing: -0.06em;
          color: #0f172a;
          line-height: 0.9;
          margin-bottom: 0.5rem;
          font-size: 3.5rem;
          font-variant-numeric: tabular-nums;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.05));
        }

        .status-badge-master {
          font-weight: 900;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #64748b;
          font-size: 10px;
          margin-bottom: 2rem;
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.03);
          padding: 6px 16px;
          border-radius: 100px;
        }

        .btn-master {
          width: 100%;
          max-width: 300px;
          height: 72px;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          font-size: 12px;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 10;
          position: relative;
          overflow: hidden;
        }

        .btn-master-primary { 
          background: #0f172a; 
          color: #ffffff; 
          box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.3);
        }
        
        .btn-master-primary:hover { 
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 30px 60px -15px rgba(15, 23, 42, 0.4);
        }

        .btn-master-verified { 
          background: #f0fdf4; 
          color: #166534; 
          border: 1px solid rgba(22, 101, 52, 0.1);
          box-shadow: 0 10px 30px -10px rgba(22, 163, 74, 0.15);
        }

        .btn-master-disabled { 
          background: rgba(0,0,0,0.02); 
          color: #94a3b8; 
          border: 1px solid rgba(0,0,0,0.05);
          cursor: not-allowed;
        }

        .status-ring-container {
          position: absolute;
          width: 380px;
          height: 380px;
          z-index: 0;
          opacity: 0.4;
          pointer-events: none;
        }

        .glow-aura-master {
          position: absolute;
          inset: 0;
          filter: blur(120px);
          opacity: 0.15;
          z-index: -1;
          transition: all 1s ease;
        }

        @media (max-width: 640px) {
          .time-display-master { font-size: 2.75rem; }
          .btn-master { height: 64px; border-radius: 20px; font-size: 11px; }
          .widget-card-master { padding: 1.5rem; min-height: 240px; }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="widget-card-master group"
      >
        {/* Dynamic Glow Aura */}
        <div className={`glow-aura-master ${
          !windowOpen ? 'bg-slate-500' : 
          isCheckedIn ? 'bg-emerald-500' : 
          isOutsideZone ? 'bg-amber-500' : 'bg-blue-500'
        }`} />

        {/* SVG Status Ring */}
        <div className="status-ring-container">
          <svg viewBox="0 0 100 100" className="w-full h-full rotate-[-90deg]">
            <motion.circle
              cx="50" cy="50" r="48"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className={!windowOpen ? 'text-slate-200' : isCheckedIn ? 'text-emerald-200' : 'text-blue-200'}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
            {windowOpen && (
              <motion.circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="2 6"
                className={isCheckedIn ? 'text-emerald-500' : 'text-blue-500'}
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              />
            )}
          </svg>
        </div>
        
        {/* Unified Content Container */}
        <div className="relative z-10 flex flex-col items-center w-full text-center">
          <div className="time-display-master">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
          </div>
          
          <div className="status-badge-master">
            <motion.span 
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-2 h-2 rounded-full ${windowOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} 
            />
            {windowOpen ? 'Protocol Active' : 'System Standby'}
          </div>

          <AnimatePresence mode="wait">
            {!windowOpen ? (
              <motion.div key="off" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="btn-master btn-master-disabled">
                <WifiOff className="w-5 h-5 opacity-40" /> OFFLINE
              </motion.div>
            ) : isCheckedIn ? (
              <motion.div key="verified" onClick={handleCheckOutRequest} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="btn-master btn-master-verified cursor-pointer hover:bg-emerald-100/50 transition-colors">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                <CheckCircle className="w-5 h-5" /> VERIFIED ACCESS
              </motion.div>
            ) : (lastCheckOut && !checkoutReasonState?.startsWith('Classes Over')) ? (
              <motion.button key="rejoin" onClick={handleReJoinClick} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="btn-master btn-master-primary">
                <RefreshCw className="w-5 h-5" /> RE-JOIN SESSION
              </motion.button>
            ) : (
              <motion.button 
                key="checkin"
                onClick={() => { if (verificationState === 'READY') performFinalCheckIn(); }} 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`btn-master ${verificationState === 'READY' ? 'btn-master-primary' : 'btn-master-disabled'}`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : (verificationState === 'READY' ? <Zap className="w-5 h-5 text-yellow-400" /> : <Navigation className="w-5 h-5" />)}
                {verificationState === 'READY' ? 'INITIALIZE CHECK-IN' : 'SCANNING ZONE...'}
              </motion.button>
            )}
          </AnimatePresence>

          <div className="w-full flex flex-col gap-1 mt-8 opacity-40">
            <div className="flex justify-between px-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-900">
              <span>{activeScheduleForCountdown?.locationName || 'GLOBAL'}</span>
              <span>GPS SECURED</span>
            </div>
            <div className="h-[1px] w-full bg-slate-900/10" />
            <div className="text-[7px] font-bold text-slate-500 uppercase tracking-widest text-center mt-1">
              Verified by Global Attendance Protocol v2.4
            </div>
          </div>
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
