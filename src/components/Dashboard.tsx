import React, { useState, useEffect } from 'react';
import { Users, Clock, XCircle, UserCheck, Zap, Loader2, CheckCircle2, Lock } from 'lucide-react';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';
import LeaveReports from './LeaveReports';
import AnalyticsChart from './AnalyticsChart';
import {
  listenToCollection,
  toggleManualAttendanceWindow,
  getManualWindowStatus,
  isScheduleActive,
  updateGeofenceSchedule
} from '../services/dbService';
import { useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';
import { MapPin, Navigation } from 'lucide-react';

// Skeleton for stat cards
function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-2.5 bg-gray-100 rounded w-24" />
          <div className="h-7 bg-gray-100 rounded w-12" />
        </div>
        <div className="w-10 h-10 rounded-lg bg-gray-100" />
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full w-full mb-3" />
      <div className="h-2.5 bg-gray-100 rounded w-20" />
    </div>
  );
}

export default function Dashboard() {
  const { user: clerkUser } = useUser();
  const [selectedStudentName, setSelectedStudentName] = useState('All Students');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Window state ──────────────────────────────────────────────────────────
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isWindowActive, setIsWindowActive] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [windowStatusLoaded, setWindowStatusLoaded] = useState(false);
  
  // Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [manualLat, setManualLat] = useState('0');
  const [manualLng, setManualLng] = useState('0');
  const [manualRadius, setManualRadius] = useState('500');
  const [manualLocationName, setManualLocationName] = useState('Manual Selection');
  const [manualGracePeriod, setManualGracePeriod] = useState(15);

  // Sync window status from DB on mount
  useEffect(() => {
    getManualWindowStatus().then((active) => {
      setIsWindowActive(active);
      setWindowStatusLoaded(true);
    });
  }, []);

  // Listen to geofence_schedules for realtime window changes
  useEffect(() => {
    const unsub = listenToCollection('geofence_schedules', (data) => {
      setSchedules(data);
      const manualRecord = data.find((s: any) => parseFloat(s.radius) === -999);
      if (manualRecord) {
        setIsWindowActive(manualRecord.isActive);
      }
      // Always unblock the UI once we have data from the DB
      setWindowStatusLoaded(true);
    });
    return () => unsub();
  }, []);

  // ── Attendance / student data ─────────────────────────────────────────────
  useEffect(() => {
    let studentsLoaded = false;
    let attendanceLoaded = false;
    let leaveLoaded = false;

    const checkAllLoaded = () => {
      if (studentsLoaded && attendanceLoaded && leaveLoaded) {
        setIsLoading(false);
      }
    };

    const unsubUsers = listenToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
      studentsLoaded = true;
      checkAllLoaded();
    });
    const unsubAtt = listenToCollection('attendance', (data) => {
      setAttendance(data);
      attendanceLoaded = true;
      checkAllLoaded();
    });
    const unsubLeave = listenToCollection('leaveRequests', (data) => {
      setLeaveRequests(data);
      leaveLoaded = true;
      checkAllLoaded();
    });

    return () => {
      unsubUsers();
      unsubAtt();
      unsubLeave();
    };
  }, []);

  // ── Session Control Handlers ──────────────────────────────────────────────
  const handleActionClick = () => {
    if (currentlyAnyWindowOpen) {
      handleCloseSession();
    } else {
      setShowConfigModal(true);
    }
  };

  const handleStartManualSession = async () => {
    setIsToggling(true);
    setShowConfigModal(false);
    try {
      // 1. Reset all schedules to "Follow Auto" first to clear any stale Force-Closed states
      for (const s of schedules) {
        if (parseFloat(s.radius) !== -999) {
          await updateGeofenceSchedule(s.id, { isActive: null as any }); // Clear force-closed override
        }
      }
      // 2. Open the manual window (with grace period)
      // Note: toggleManualAttendanceWindow updates the row, which triggers 
      // the DB's updated_at column to refresh to "Now".
      await toggleManualAttendanceWindow(
        true, 
        parseFloat(manualLat), 
        parseFloat(manualLng), 
        parseInt(manualRadius),
        manualLocationName,
        manualGracePeriod
      );
      setIsWindowActive(true);
      setShowConfigModal(false);
      toast.success(`Session started at ${manualLocationName} (Grace: ${manualGracePeriod} min)`);
    } catch (err: any) {
      toast.error('Failed to start session');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCloseSession = async () => {
    setIsToggling(true);
    try {
      // 1. Force close the global manual override
      await toggleManualAttendanceWindow(false);

      // 2. For ALL other active schedules, set isActive = false (FORCE CLOSE)
      // This ensures that even if one was automatically triggered by an alarm, it stays CLOSED now.
      const activeRightNow = schedules.filter(s => isScheduleActive(s));
      for (const s of activeRightNow) {
        await updateGeofenceSchedule(s.id, { isActive: false });
      }
      
      toast.success('🔒 ALL attendance windows CLOSED successfully.');
    } catch (err) {
      toast.error('Error closing session');
    } finally {
      setIsToggling(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');
    navigator.geolocation.getCurrentPosition((pos) => {
      setManualLat(pos.coords.latitude.toFixed(6));
      setManualLng(pos.coords.longitude.toFixed(6));
      toast.success('Location updated!');
    });
  };

  // ── Computed states ────────────────────────────────────────────────────────
  const currentlyAnyWindowOpen = schedules.some(isScheduleActive);
  const autoActiveSchedules = schedules.filter(s => parseFloat(s.radius) !== -999 && isScheduleActive(s));
  const isAutoActive = autoActiveSchedules.length > 0;
  
  const totalStudents = students.length;
  const today = new Date().toLocaleDateString('en-CA');
  const todayAttendance = attendance.filter(a => a.date === today);

  const presentCount = todayAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
  const absentCount = todayAttendance.filter(a => a.status === 'Absent').length;

  const onLeaveCount = leaveRequests.filter(lr => {
    return lr.status === 'Approved' && lr.fromDate <= today && lr.toDate >= today;
  }).length;

  const presentPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const latePercentage = totalStudents > 0 ? Math.round((lateCount / totalStudents) * 100) : 0;
  const absentPercentage = totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0;
  const leavePercentage = totalStudents > 0 ? Math.round((onLeaveCount / totalStudents) * 100) : 0;

  // Dynamic greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const adminName = clerkUser?.firstName || clerkUser?.fullName || 'Admin';

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      {/* Dashboard Intro */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{getGreeting()}, {adminName} 👋</h2>
            <p className="text-sm text-gray-500">Monitor student attendance in real-time</p>
          </div>

          {/* Attendance Window Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Live status pill */}
            {windowStatusLoaded && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all duration-500 ${
                isWindowActive
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isWindowActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                {isWindowActive ? 'Window Open' : 'Window Closed'}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={handleActionClick}
                disabled={isToggling || !windowStatusLoaded}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all shadow-lg active:scale-95 ${
                  currentlyAnyWindowOpen
                    ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-red-200 hover:shadow-red-300'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-200 hover:shadow-indigo-300'
                }`}
              >
                {isToggling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : currentlyAnyWindowOpen ? (
                  <>
                    <XCircle className="w-5 h-5" />
                    Close Window
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Activate Window
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Manual Activation Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 pb-0 flex justify-between items-center border-b border-gray-50 mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  Start Attendance Session
                </h3>
                <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 pt-0 space-y-4">
                <p className="text-sm text-gray-500">Configure geofencing boundaries for this manual session.</p>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Location Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Lab 2, Meeting Hall"
                    value={manualLocationName}
                    onChange={e => setManualLocationName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Latitude</label>
                    <input 
                      type="text" value={manualLat} onChange={e => setManualLat(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Longitude</label>
                    <input 
                      type="text" value={manualLng} onChange={e => setManualLng(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Geofence Radius (m)</label>
                    <input 
                      type="number" value={manualRadius} onChange={e => setManualRadius(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Grace Time (min)</label>
                    <input 
                      type="number" 
                      min={0} max={120}
                      value={manualGracePeriod} 
                      onChange={e => setManualGracePeriod(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-orange-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400/30 font-bold text-orange-700"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleGetLocation}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Use My Current Location
                </button>

                <div className="pt-2">
                  <button 
                    onClick={handleStartManualSession}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-[0.98]"
                  >
                    Start Session
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Window status banner */}
        {windowStatusLoaded && isWindowActive && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <span>
              <strong>Attendance window is OPEN.</strong> Students can check in right now.
              Real-time updates will appear in the table below.
            </span>
          </div>
        )}
        {windowStatusLoaded && !isWindowActive && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm font-medium animate-in fade-in duration-300">
            <Lock className="w-5 h-5 text-gray-400 shrink-0" />
            <span>
              Attendance window is <strong>closed</strong>. Students cannot check in until you activate the window.
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Present Today"
              value={presentCount.toString()}
              total={totalStudents.toString()}
              percentage={`${presentPercentage}%`}
              trend="Today"
              trendUp={true}
              icon={<Users className="h-6 w-6 text-blue-600" />}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              progressColorClass="bg-blue-500"
            />
            <StatCard
              title="Late Arrivals"
              value={lateCount.toString()}
              total={totalStudents.toString()}
              percentage={`${latePercentage}%`}
              trend="Needs Attention"
              trendUp={false}
              icon={<Clock className="h-6 w-6 text-orange-400" />}
              colorClass="text-orange-400"
              bgClass="bg-orange-50"
              progressColorClass="bg-orange-400"
            />
            <StatCard
              title="Absent"
              value={absentCount.toString()}
              total={totalStudents.toString()}
              percentage={`${absentPercentage}%`}
              trend="Action Required"
              trendUp={false}
              icon={<XCircle className="h-6 w-6 text-red-500" />}
              colorClass="text-red-500"
              bgClass="bg-red-50"
              progressColorClass="bg-red-400"
            />
            <StatCard
              title="On Leave"
              value={onLeaveCount.toString()}
              total={totalStudents.toString()}
              percentage={`${leavePercentage}%`}
              trend="Approved"
              trendUp={true}
              icon={<UserCheck className="h-6 w-6 text-green-500" />}
              colorClass="text-green-500"
              bgClass="bg-green-50"
              progressColorClass="bg-green-500"
            />
          </>
        )}
      </div>

      {/* Layout Grid (Attendance & Leave Reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <AttendanceTable />
        <LeaveReports />
      </div>

      {/* Bottom Section (Analytics) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-8">
        <AnalyticsChart
          selectedStudent={selectedStudentName}
          onStudentSelect={setSelectedStudentName}
        />
      </div>
    </div>
  );
}
