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
} from '../services/dbService';
import {
  Phone, AlertCircle, Send, X, ClipboardList, LogOut,
  MapPin, Navigation, Lock, Unlock, Loader2, History, Timer, CheckCircle, Clock
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
  const [lastCheckOut, setLastCheckOut] = useState<string | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [activeScheduleForCountdown, setActiveScheduleForCountdown] = useState<any>(null);
  const [isOutsideZone, setIsOutsideZone] = useState(false);

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
      }
    };
    syncAttendance();

    const unsub = listenToCollection('attendance', (logs) => {
      const today = new Date().toISOString().split('T')[0];
      const myLogs = logs.filter((l: any) => l.userId === userId && l.date === today);
      const activeLog = myLogs[myLogs.length - 1];
      if (activeLog) {
        setIsCheckedIn(!activeLog.checkOutTime);
        setLastCheckOut(activeLog.checkOutTime || null);
      } else {
        setIsCheckedIn(false);
        setLastCheckOut(null);
      }
    }, userId);
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    const checkSchedule = async () => {
      try {
        const allSchedules = await getGeofenceSchedules();
        const activeSchedules = allSchedules.filter(isScheduleActive);
        const settings = await getSystemSettings();
        const active = activeSchedules.length > 0;
        setWindowOpen(active);
        if (active) {
          const currentSchedule = activeSchedules[0];
          setActiveScheduleForCountdown(currentSchedule);
          const now = new Date();
          const startParts = currentSchedule.time.split(':');
          const windowStart = new Date();
          windowStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
          const graceMinutes = settings.attendance_grace_period || 15;
          const graceEnd = new Date(windowStart.getTime() + graceMinutes * 60000);
          setGraceSecondsLeft(now < graceEnd ? Math.floor((graceEnd.getTime() - now.getTime()) / 1000) : 0);
        } else {
          setGraceSecondsLeft(null);
          setActiveScheduleForCountdown(null);
        }
      } catch (error) { console.error(error); }
    };
    checkSchedule();
    const interval = setInterval(checkSchedule, 10000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  useEffect(() => {
    if (graceSecondsLeft !== null && graceSecondsLeft > 0) {
      const timer = setInterval(() => setGraceSecondsLeft(prev => (prev && prev > 0 ? prev - 1 : 0)), 1000);
      return () => clearInterval(timer);
    }
  }, [graceSecondsLeft]);

  useEffect(() => {
    if (windowOpen && !isCheckedIn && !isProcessing) handleAutoCheckIn();
  }, [windowOpen, isCheckedIn, isProcessing]);

  const handleAutoCheckIn = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const allSchedules = await getGeofenceSchedules();
        const activeSchedules = allSchedules.filter(isScheduleActive);
        if (activeSchedules.length > 0) {
          const sched = activeSchedules[0];
          const dist = getDistance(latitude, longitude, parseFloat(sched.lat), parseFloat(sched.lng));
          if (dist <= parseFloat(sched.radius)) {
            setIsOutsideZone(false);
            const now = new Date().toISOString();
            const settings = await getSystemSettings();
            const startParts = sched.time.split(':');
            const windowStart = new Date();
            windowStart.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
            const graceMinutes = settings.attendance_grace_period || 15;
            const graceEnd = new Date(windowStart.getTime() + graceMinutes * 60000);
            const isLate = new Date() > graceEnd;
            await addAttendance({
              userId, userName: user.name, rollNo: user.rollNo, course: user.course,
              date: new Date().toISOString().split('T')[0], checkInTime: now, checkOutTime: null,
              status: isLate ? 'Late' : 'Present', locationName: sched.locationName,
              locationCoords: `${latitude}, ${longitude}`, lateReason: '', lateReasonImage: ''
            });
            setIsCheckedIn(true);
            toast.success(isLate ? 'Checked in (LATE)' : 'Checked in successfully!');
          } else { setIsOutsideZone(true); }
        }
      }, () => toast.error("Location access required."));
    } catch (e) { console.error(e); } finally { setIsProcessing(false); }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180; const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180; const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleCheckOutRequest = () => setShowCheckoutModal(true);
  const handleConfirmCheckout = async () => {
    setIsProcessing(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const logs = await getAttendance(userId);
      const activeLog = logs.find((l: any) => l.date === today && !l.checkOutTime);
      if (activeLog) {
        const finalReason = checkoutReason === 'Other' ? otherReason : checkoutReason;
        const now = new Date().toISOString();
        await updateAttendance(activeLog.id, { checkOutTime: now, checkoutReason: finalReason });
        setIsCheckedIn(false); setLastCheckOut(new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })); setShowCheckoutModal(false);
        toast.success('Checked out successfully!');
      }
    } catch (e) { toast.error('DB error.'); } finally { setIsProcessing(false); }
  };

  return (
    <>
      <style>{`
        @keyframes steady-glow { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        
        .static-ring-system {
          position: absolute;
          inset: -4px;
          border-radius: 24px;
          padding: 2px;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 5;
        }
        
        /* Clean Offline State - No Dark Border */
        .static-offline { 
          background: rgba(0, 0, 0, 0.04); 
          box-shadow: none; 
        }
        
        .static-active { 
          background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
          animation: steady-glow 2s ease-in-out infinite;
        }
        .static-success { 
          background: #10b981; 
          box-shadow: 0 0 25px rgba(16, 185, 129, 0.4);
          animation: steady-glow 3s ease-in-out infinite;
        }
        .static-alert { background: #ef4444; box-shadow: 0 0 25px rgba(239, 68, 68, 0.4); }
        
        .action-dial-static {
          width: 100%;
          max-width: 190px;
          height: 60px;
          border-radius: 0px;
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
        }
        .text-black-force { color: #000000 !important; font-weight: 900; }
        .vivid-status-pill {
          background: #2563eb;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .liquid-glass-final {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(35px) saturate(210%);
          border: 1px solid rgba(255, 255, 255, 0.95);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass-final rounded-[32px] p-5 lg:p-6 pb-8 lg:pb-10 flex flex-col items-center justify-between h-[200px] lg:h-[220px] w-full relative overflow-hidden"
      >
        <div className="flex flex-col items-center text-center w-full z-10">
          <div className="text-black-force text-3xl lg:text-4xl tracking-tighter flex items-baseline justify-center w-full">
            <span className="font-mono">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
          </div>
          <span className="text-black-force opacity-40 uppercase text-[9px] lg:text-[10px] tracking-[0.4em] mt-1 lg:mt-2">Precision System Status</span>
        </div>

        <div className="w-full flex justify-center py-2 relative z-10">
          <div className="relative w-full max-w-[190px]">
            <div className={`static-ring-system ${isCheckedIn ? 'static-success' :
              isOutsideZone && windowOpen ? 'static-alert' :
                windowOpen ? 'static-active' : 'static-offline'
              }`} />

            <div
              className={`action-dial-static ${isCheckedIn ? 'text-[#064e3b]' :
                windowOpen ? 'text-[#1e40af]' : 'text-slate-400'
                }`}
              onClick={isCheckedIn ? handleCheckOutRequest : undefined}
            >
              <AnimatePresence mode="wait">
                {isCheckedIn ? (
                  <motion.div key="v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" /> <span>Verified</span>
                  </motion.div>
                ) : !windowOpen ? (
                  <motion.div key="o" initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <Lock className="w-6 h-6" /> <span>Offline</span>
                  </motion.div>
                ) : (
                  <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6" /> <span>Syncing</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="vivid-status-pill flex items-center gap-2 px-6 py-2 rounded-full z-10 transition-transform hover:scale-105">
          <Navigation className="w-4 h-4 text-white" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Geo-Synced Terminal</span>
        </div>
      </motion.div>

      {showCheckoutModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-8 border border-blue-100"><LogOut className="w-10 h-10 text-blue-600" /></div>
              <h3 className="text-2xl font-black text-black-force mb-8 uppercase tracking-tighter">Exit Secure</h3>
              <div className="space-y-3 mb-8">
                {['Classes Over', 'Emergency', 'Other'].map(reason => (
                  <button key={reason} onClick={() => { setCheckoutReason(reason); handleConfirmCheckout(); }} className="w-full py-4 bg-gray-50 hover:bg-blue-600 hover:text-white border border-gray-100 hover:border-blue-600 rounded-2xl text-black-force font-black transition-all text-xs uppercase tracking-widest">{reason}</button>
                ))}
              </div>
              <button onClick={() => setShowCheckoutModal(false)} className="text-gray-400 hover:text-black font-black text-[11px] uppercase tracking-widest">Cancel Request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentCheckInWidget;
