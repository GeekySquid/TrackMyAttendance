import React, { useState, useEffect } from 'react';
import { addAttendance, updateAttendance, getAttendance, getGeofenceSchedules, getMentors } from '../services/dbService';
import { Phone, AlertCircle, Send, X, ClipboardList, LogOut, MapPin, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

// Helper for calculating distance in meters between two lat/lng coordinates (Haversine formula)
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function StudentCheckInWidget({ user }: { user?: any }) {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAction, setShowAction] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutReason, setCheckoutReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLateModal, setShowLateModal] = useState(false);
  const [lateReasonText, setLateReasonText] = useState('');
  const [mentor, setMentor] = useState<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Check if user already checked in today
    const checkTodayAttendance = async () => {
      if (!user) return;
      const records = await getAttendance(user.uid);
      const today = new Date().toISOString().split('T')[0];
      
      const todayRecords = records
        .filter((r: any) => r.date === today)
        .sort((a: any, b: any) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
      
      const latestRecord = todayRecords[0];
      
      if (latestRecord) {
        setShowAction(true);
        if (!latestRecord.checkOutTime) {
          setIsCheckedIn(true);
          setCurrentRecordId(latestRecord.id);
        } else {
          setIsCheckedIn(false);
        }
      }
    }
    checkTodayAttendance();

    // Fetch mentor info if user has one
    const fetchMentor = async () => {
      if (user?.mentorId) {
        const mentors = await getMentors();
        const m = mentors.find((mnt: any) => mnt.id === user.mentorId);
        if (m) setMentor(m);
      }
    };
    fetchMentor();
  }, [user]);

  const geofenceCheck = async (): Promise<{ passed: boolean; isLate: boolean; schedule?: any }> => {
    const schedules = await getGeofenceSchedules();
    
    // Determine active windows
    const activeSchedules = schedules.filter((s: any) => {
      // Manual Admin Override
      if (s.isActive) return true;
      
      // Automatic Activation checking
      if (s.autoActivate && s.time && s.days) {
        const currentDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
        if (!s.days.includes(currentDay)) return false;

        const [hour, min] = s.time.split(':').map(Number);
        if (isNaN(hour) || isNaN(min)) return false;

        const now = new Date();
        const scheduleTime = new Date();
        scheduleTime.setHours(hour, min, 0, 0);

        const diffMs = now.getTime() - scheduleTime.getTime();
        // Allow check-in from 30 mins before class start time, up to 2 hours after.
        if (diffMs >= -1800000 && diffMs <= 7200000) {
          return true;
        }
      }
      return false;
    });

    if (activeSchedules.length === 0) {
      toast.error('Window is not activated. Attendance is currently closed!', { duration: 4000, icon: '🔒', id: 'window-closed' });
      return { passed: false, isLate: false };
    }

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser', { id: 'geo-error' });
        resolve({ passed: false, isLate: false });
        return;
      }

      toast.loading('Verifying your location securely...', { id: 'location-check' });
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          let passed = false;
          for (const s of activeSchedules) {
            const geofenceLat = parseFloat(s.lat);
            const geofenceLng = parseFloat(s.lng);
            const radius = parseFloat(s.radius);
            
            if (isNaN(geofenceLat) || isNaN(geofenceLng)) continue;
            
            const distance = getDistance(latitude, longitude, geofenceLat, geofenceLng);
            
            // If distance in meters is less than or equal to radius, it's valid
            if (distance <= radius) {
              passed = true;
              break;
            }
          }
          
          toast.dismiss('location-check');
          
          if (passed) {
            toast.success('Location verified. You are inside the campus zone!', { id: 'location-check' });
            
            // Determine if late (beyond grace period)
            let isLate = false;
            let bestSchedule = activeSchedules[0];

            for (const s of activeSchedules) {
              const [hour, min] = (s.time || "00:00").split(':').map(Number);
              const scheduleTime = new Date();
              scheduleTime.setHours(hour, min, 0, 0);
              
              const diffMins = (new Date().getTime() - scheduleTime.getTime()) / 60000;
              const gracePeriod = s.gracePeriod || 15;
              
              if (diffMins > gracePeriod) {
                isLate = true;
                bestSchedule = s;
              } else if (diffMins >= -30) {
                // If within grace (or early), it's not late
                isLate = false;
                bestSchedule = s;
                break; 
              }
            }

            resolve({ passed: true, isLate, schedule: bestSchedule });
          } else {
            toast.error('You are outside the permitted campus geofence! Cannot record attendance.', { id: 'location-check', duration: 4000 });
            resolve({ passed: false, isLate: false });
          }
        },
        (error) => {
          console.error(error);
          let errorMessage = 'Failed to get location';
          if (error.code === 1) errorMessage = 'Location permission denied by user. Please allow location access.';
          else if (error.code === 2) errorMessage = 'Location network unavailable.';
          else if (error.code === 3) errorMessage = 'Location request timed out. Getting poor GPS signal.';
          
          toast.error(errorMessage, { id: 'location-check', duration: 4000 });
          resolve({ passed: false, isLate: false });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleActionClick = async () => {
    if (!isCheckedIn) {
      setIsProcessing(true);
      const { passed, isLate } = await geofenceCheck();
      setIsProcessing(false);
      
      if (!passed) return;

      setIsCheckedIn(true);
      setShowAction(true);
      if (user) {
        const record = {
          userId: user.uid,
          userName: user.name,
          rollNo: user.rollNo,
          course: user.course,
          date: new Date().toISOString().split('T')[0],
          checkInTime: new Date().toISOString(),
          checkOutTime: null,
          status: isLate ? 'Late' : 'Present',
          location: 'Verified Campus Geofence'
        };
        const saved = await addAttendance(record);
        setCurrentRecordId(saved.id);
        
        if (isLate) {
          toast.error("You are late! Please provide a reason.", { icon: '⏰' });
          setShowLateModal(true);
        } else {
          toast.success("Checked in successfully!");
        }
      }
    } else {
      // Trigger Check Out Modal
      setShowCheckoutModal(true);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutReason) return;
    if (checkoutReason === 'Other' && !otherReason) return;
    
    setIsCheckedIn(false);
    setShowCheckoutModal(false);
    
    if (currentRecordId) {
      setIsProcessing(true);
      await updateAttendance(currentRecordId, {
        checkOutTime: new Date().toISOString(),
        checkoutReason: checkoutReason === 'Other' ? otherReason : checkoutReason // assuming service ignores checkoutReason if missing from DB
      });
      setIsProcessing(false);
      toast.success("Checked out successfully.");
    }
    
    setCheckoutReason('');
    setOtherReason('');
  };

  const [lateReasonImage, setLateReasonImage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image too large. Please keep it under 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLateReasonImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitLateReason = async () => {
    if (!lateReasonText.trim() || !currentRecordId) return;
    
    setIsProcessing(true);
    await updateAttendance(currentRecordId, {
      lateReason: lateReasonText,
      lateReasonStatus: 'Pending',
      lateReasonImage: lateReasonImage
    });
    setIsProcessing(false);
    
    toast.success("Reason submitted for mentor approval.");
    setShowLateModal(false);
    setLateReasonText('');
    setLateReasonImage(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col items-center justify-center text-center relative overflow-hidden h-full min-h-[300px]">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-blue-400"></div>
        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wider">Current Time</h3>
        <div className="text-4xl font-black text-gray-800 mb-6 font-mono tracking-tight">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        
        {!showAction ? (
          <button 
            onClick={handleActionClick}
            disabled={isProcessing}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-200 ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isProcessing ? (
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
            ) : (
               <ClipboardList className="w-8 h-8 mb-2 mx-auto" />
            )}
            {isProcessing ? 'VERIFYING...' : 'ATTENDANCE'}
          </button>
        ) : (
          <button 
            onClick={handleActionClick}
            disabled={isProcessing}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center text-white font-bold text-xl shadow-xl transition-all transform hover:scale-105 active:scale-95 ${
              isCheckedIn 
                ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-red-200' 
                : 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200'
            } ${isProcessing ? 'opacity-70 cursor-wait' : ''}`}
          >
            {isProcessing ? (
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2 mx-auto"></div>
            ) : (
               <MapPin className="w-8 h-8 mb-2 mx-auto" />
            )}
            {isProcessing ? 'VERIFYING...' : (isCheckedIn ? 'CHECK OUT' : 'CHECK IN')}
          </button>
        )}
        
        <p className="mt-6 text-sm font-medium text-gray-500 flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-green-500" />
          Location verified on check-in
        </p>
      </div>

      {/* Checkout Reason Modal */}
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
                    <input 
                      type="radio" 
                      name="reason" 
                      value={reason}
                      checked={checkoutReason === reason}
                      onChange={(e) => setCheckoutReason(e.target.value)}
                      className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className={`text-sm font-medium ${checkoutReason === reason ? 'text-blue-700' : 'text-gray-700'}`}>{reason}</span>
                  </label>
                ))}
                {checkoutReason === 'Other' && (
                  <input 
                    type="text" 
                    placeholder="Please specify your reason..." 
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    autoFocus
                  />
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCheckoutModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmCheckout}
                  disabled={!checkoutReason || (checkoutReason === 'Other' && !otherReason)}
                  className="flex-1 py-2.5 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 transition-colors shadow-md shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Check Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Late Reason Modal */}
      {showLateModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
              <button 
                onClick={() => setShowLateModal(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30">
                <AlertCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black mb-1">Attendance Grace Period Exceeded</h3>
              <p className="text-orange-100 text-sm font-medium">You are marked as <span className="underline decoration-2 underline-offset-2">LATE</span> today.</p>
            </div>

            <div className="p-6 sm:p-8">
              {/* Mentor Card */}
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
                  <a 
                    href={`tel:${mentor.phone}`}
                    className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-md hover:scale-110 active:scale-95 transition-all border border-blue-200 group-hover:bg-blue-600 group-hover:text-white"
                  >
                    <Phone className="w-5 h-5" />
                  </a>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Reason for Late Entry</label>
                  <textarea 
                    placeholder="Briefly explain why you were late (e.g., Traffic, Medical, Personal)" 
                    value={lateReasonText}
                    onChange={(e) => setLateReasonText(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none shadow-inner font-medium mb-4"
                  />
                  
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 px-1">Evidence / Proof (Optional)</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      id="late-image-upload"
                    />
                    <label 
                      htmlFor="late-image-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 transition-all cursor-pointer overflow-hidden group"
                    >
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
                  <button 
                    onClick={handleSubmitLateReason}
                    disabled={!lateReasonText.trim() || isProcessing}
                    className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-orange-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
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
