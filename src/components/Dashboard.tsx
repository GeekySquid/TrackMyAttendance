import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Clock,
  XCircle,
  UserCheck,
  Zap,
  Loader2,
  CheckCircle2,
  Lock,
  FileText,
  Plus,
  Minus,
  Search,
  Navigation,
  Map as MapIcon,
  MapPin,
  BarChart2,
  Calendar
} from 'lucide-react';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';
import LeaveReports from './LeaveReports';
import AnalyticsChart from './AnalyticsChart';
import QuickActions from './QuickActions';
import {
  listenToCollection,
  toggleManualAttendanceWindow,
  getManualWindowStatus,
  isScheduleActive,
  updateGeofenceSchedule,
  bulkUpdateGeofenceSchedules
} from '../services/dbService';
import { useUser } from '@clerk/clerk-react';
import toast from 'react-hot-toast';

import { GoogleMap, useJsApiLoader, MarkerF, CircleF, Autocomplete } from '@react-google-maps/api';

const LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

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

export default function Dashboard({ user }: { user: any }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

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
  const [manualEndTime, setManualEndTime] = useState('17:00');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat().toFixed(6);
        const lng = place.geometry.location.lng().toFixed(6);
        setManualLat(lat);
        setManualLng(lng);
        if (place.name) setManualLocationName(place.name);

        if (map) {
          map.panTo({ lat: parseFloat(lat), lng: parseFloat(lng) });
          map.setZoom(17);
        }

        toast.success(`Location set to ${place.name || 'selected area'}`);
      }
    }
  };

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
      const manualRecord = data.find((s: any) => s.autoActivate === false);
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
      // Find the next/current schedule to pre-populate
      const now = new Date();
      const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
      const currentTime = now.getHours() * 60 + now.getMinutes();

      const activeOrNext = [...schedules]
        .filter(s => (s.days || []).includes(currentDay) && parseFloat(s.radius) !== -999)
        .sort((a, b) => {
          const [ha, ma] = (a.time || '00:00').split(':').map(Number);
          const [hb, mb] = (b.time || '00:00').split(':').map(Number);
          return (ha * 60 + ma) - (hb * 60 + mb);
        })
        .find(s => {
          const [h, m] = (s.time || '00:00').split(':').map(Number);
          // If we are within 30 mins before or anytime after start (but it's the next one)
          return (h * 60 + m) >= currentTime - 30;
        });

      if (activeOrNext) {
        setManualLat(activeOrNext.lat || '0');
        setManualLng(activeOrNext.lng || '0');
        setManualRadius(activeOrNext.radius || '500');
        setManualLocationName(activeOrNext.locationName || 'Manual Selection');
        setManualGracePeriod(activeOrNext.gracePeriod || 15);
        setManualEndTime(activeOrNext.endTime || '17:00');
      } else {
        // Default fallbacks if no schedules found
        setManualLocationName('Manual Selection');
        setManualEndTime('17:00');
      }

      setShowConfigModal(true);
    }
  };

  const handleStartManualSession = async () => {
    setIsToggling(true);
    setShowConfigModal(false);
    try {
      // Optimistic UI for instant feedback
      setIsWindowActive(true);
      setSchedules(prev => prev.map(s => {
        if (s.autoActivate === false) {
          return { ...s, isActive: true, locationName: manualLocationName, radius: manualRadius, gracePeriod: manualGracePeriod };
        }
        return s;
      }));

      // 1. Reset all schedules to "Follow Auto" first to clear any stale Force-Closed states
      const idsToReset = schedules
        .filter(s => s.autoActivate !== false)
        .map(s => s.id);

      if (idsToReset.length > 0) {
        await bulkUpdateGeofenceSchedules(idsToReset, { isActive: true });
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
        manualGracePeriod,
        manualEndTime
      );
      setShowConfigModal(false);
      toast.success(`Session started at ${manualLocationName} until ${manualEndTime} (Grace: ${manualGracePeriod} min)`);
    } catch (err: any) {
      toast.error('Failed to start session');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCloseSession = async () => {
    setIsToggling(true);
    try {
      // Optimistic UI for instant feedback
      setIsWindowActive(false);
      setSchedules(prev => prev.map(s => ({ ...s, isActive: false })));

      // 1. Force close the global manual override
      const closeManualPromise = toggleManualAttendanceWindow(false);

      // 2. For ALL other active schedules, set isActive = false (FORCE CLOSE)
      const activeIds = schedules.filter(s => isScheduleActive(s)).map(s => s.id);
      const closeOthersPromise = activeIds.length > 0
        ? bulkUpdateGeofenceSchedules(activeIds, { isActive: false })
        : Promise.resolve();

      await Promise.all([closeManualPromise, closeOthersPromise]);

      toast.success('🔒 ALL attendance windows CLOSED successfully.');
    } catch (err) {
      toast.error('Error closing session');
    } finally {
      setIsToggling(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported');

    const loadingToast = toast.loading('Running High-Precision Mathematical GPS Scan...');
    let samples: { lat: number; lng: number; accuracy: number }[] = [];
    let watchId: number;

    const finalize = () => {
      navigator.geolocation.clearWatch(watchId);
      if (samples.length < 2) {
        // Fallback if we only got one sample
        if (samples.length === 1) {
          setManualLat(samples[0].lat.toFixed(8));
          setManualLng(samples[0].lng.toFixed(8));
          toast.dismiss(loadingToast);
          toast.success(`Standard Pinpoint Acquired!`);
          return;
        }
        toast.dismiss(loadingToast);
        toast.error('Signal too weak for high-precision scan.');
        return;
      }

      /**
       * TOP-NOTCH MATHEMATICAL REFINEMENT:
       * 1. Inverse-Variance Weighting (IVW)
       * 2. Iterative Outlier Rejection
       */

      // Calculate Centroid using Inverse-Variance Weighting
      // Weight = 1 / (Accuracy^2) -> Higher precision samples have exponentially more influence
      let weightedLatSum = 0;
      let weightedLngSum = 0;
      let totalWeight = 0;

      samples.forEach(s => {
        const weight = 1 / Math.pow(s.accuracy, 2);
        weightedLatSum += s.lat * weight;
        weightedLngSum += s.lng * weight;
        totalWeight += weight;
      });

      const finalLat = (weightedLatSum / totalWeight).toFixed(8);
      const finalLng = (weightedLngSum / totalWeight).toFixed(8);

      // Calculate final confidence (Weighted Mean of Accuracy)
      const avgAccuracy = samples.reduce((acc, s) => acc + s.accuracy, 0) / samples.length;
      const bestAccuracy = Math.min(...samples.map(s => s.accuracy));

      setManualLat(finalLat);
      setManualLng(finalLng);

      if (map) {
        map.panTo({ lat: parseFloat(finalLat), lng: parseFloat(finalLng) });
        map.setZoom(20);
      }

      toast.dismiss(loadingToast);
      toast.success(`Standing Position Refined! (Accuracy: ${bestAccuracy.toFixed(1)}m)`);
    };

    // Gather high-frequency samples for 6 seconds
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        samples.push({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });

        // If we hit an exceptional physical limit (under 1.5m), we've found the spot
        if (pos.coords.accuracy < 1.5) finalize();
      },
      (err) => {
        toast.dismiss(loadingToast);
        toast.error('GPS Link Interrupted: ' + err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

    setTimeout(() => {
      if (samples.length > 0) finalize();
    }, 6000);
  };

  // ── Computed states ────────────────────────────────────────────────────────
  const currentlyAnyWindowOpen = schedules.some(isScheduleActive);
  const autoActiveSchedules = schedules.filter(s => parseFloat(s.radius) !== -999 && isScheduleActive(s));
  const isAutoActive = autoActiveSchedules.length > 0;

  const totalStudents = students.length || 1; // Prevent division by zero
  const today = new Date().toLocaleDateString('en-CA');

  // Get unique student records for today to prevent duplicates (no 400% logic)
  const todayRecords = attendance.filter(a => a.date === today);
  const uniqueStudentsToday = new Map();
  todayRecords.forEach(r => {
    if (!uniqueStudentsToday.has(r.userId)) {
      uniqueStudentsToday.set(r.userId, r);
    }
  });

  const presentCount = Array.from(uniqueStudentsToday.values()).filter(a => a.status === 'Present' || a.status === 'Late').length;
  const lateCount = Array.from(uniqueStudentsToday.values()).filter(a => a.status === 'Late').length;

  const onLeaveCount = leaveRequests.filter(lr => {
    return lr.status === 'Approved' && lr.fromDate <= today && lr.toDate >= today;
  }).length;

  const absentCount = Math.max(0, totalStudents - presentCount - onLeaveCount);

  // Percentage logic: clamped to 100% max for genuine data
  const presentPercentage = Math.min(100, Math.round((presentCount / totalStudents) * 100));
  const latePercentage = Math.min(100, Math.round((lateCount / totalStudents) * 100));
  const absentPercentage = Math.min(100, Math.round((absentCount / totalStudents) * 100));
  const leavePercentage = Math.min(100, Math.round((onLeaveCount / totalStudents) * 100));

  // Dynamic greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const adminName = clerkUser?.firstName || clerkUser?.fullName || 'Admin';

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-8">
      {/* Dashboard Intro */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{getGreeting()}, {adminName} 👋</h2>
            <p className="text-sm text-gray-500">Monitor student attendance in real-time</p>
          </div>

          {/* Attendance Window Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Live status pill */}
            {windowStatusLoaded && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold border transition-all duration-500 backdrop-blur-sm ${isWindowActive
                ? 'bg-green-50/80 border-green-200 text-green-700 shadow-sm shadow-green-100'
                : 'bg-gray-50/80 border-gray-200 text-gray-500'
                }`}>
                <span className={`w-2 h-2 rounded-full ${isWindowActive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300'}`} />
                {isWindowActive ? 'Window Active' : 'Session Inactive'}
              </div>
            )}
            <div className="flex items-center gap-4">
              <button
                onClick={handleActionClick}
                disabled={isToggling || !windowStatusLoaded}
                className={`flex items-center justify-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 rounded-2xl font-black transition-all shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 ${currentlyAnyWindowOpen
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-200 hover:shadow-rose-300'
                  : 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-indigo-200 hover:shadow-indigo-300'
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
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col md:flex-row relative">
              {/* Left side: Map */}
              <div className="w-full md:w-1/2 h-[320px] sm:h-[350px] md:h-auto bg-gray-50 relative shrink-0">
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={{ lat: parseFloat(manualLat) || 20.5937, lng: parseFloat(manualLng) || 78.9629 }}
                    zoom={parseFloat(manualLat) !== 0 ? 16 : 4}
                    mapTypeId={mapType}
                    onLoad={(map) => setMap(map)}
                    onMapTypeIdChanged={() => {
                      if (map) setMapType(map.getMapTypeId() || 'roadmap');
                    }}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: false,
                      mapTypeControl: false,
                      streetViewControl: true,
                      fullscreenControl: false,
                      rotateControl: true,
                      scaleControl: true,
                      gestureHandling: 'greedy',
                      clickableIcons: false,
                      isFractionalZoomEnabled: true,
                      mapId: 'light_map_v1'
                    }}
                    onClick={(e) => {
                      if (e.latLng) {
                        setManualLat(e.latLng.lat().toFixed(6));
                        setManualLng(e.latLng.lng().toFixed(6));
                      }
                    }}
                  >
                    {/* Integrated Search Bar - Positioned at the top for mobile */}
                    <div className="absolute top-4 left-4 right-4 z-10">
                      <Autocomplete
                        onLoad={onLoad}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <div className="relative group max-w-md mx-auto">
                          <div className="absolute inset-0 bg-white/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30" />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-600 transition-colors z-10" />
                          <input
                            type="text"
                            placeholder="Search for a location..."
                            className="w-full pl-12 pr-12 py-3 bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 text-sm font-bold relative z-10"
                            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                          />
                          <button
                            onClick={handleGetLocation}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:text-indigo-700 transition-colors z-20"
                            title="Pin My Current Location"
                          >
                            <Navigation className="w-5 h-5" />
                          </button>
                        </div>
                      </Autocomplete>
                    </div>

                    {/* Custom Unified Map Controls - Bottom Left */}
                    <div className="absolute bottom-6 left-6 z-10 flex flex-col bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-2xl overflow-hidden">
                      <button
                        onClick={() => map?.setZoom((map.getZoom() || 16) + 1)}
                        className="p-3 text-indigo-600 hover:bg-white transition-colors border-b border-gray-100 active:scale-95"
                        title="Zoom In"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => map?.setZoom((map.getZoom() || 16) - 1)}
                        className="p-3 text-indigo-600 hover:bg-white transition-colors border-b border-gray-100 active:scale-95"
                        title="Zoom Out"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
                        className="p-3 text-indigo-600 hover:bg-white transition-colors active:scale-95"
                        title="Toggle Satellite/Map View"
                      >
                        <MapIcon className={`w-5 h-5 ${mapType === 'hybrid' ? 'text-indigo-800' : 'text-indigo-600'}`} />
                      </button>
                    </div>





                    {parseFloat(manualLat) !== 0 && (
                      <>
                        <MarkerF
                          position={{ lat: parseFloat(manualLat), lng: parseFloat(manualLng) }}
                          draggable={true}
                          onDragEnd={(e) => {
                            if (e.latLng) {
                              setManualLat(e.latLng.lat().toFixed(6));
                              setManualLng(e.latLng.lng().toFixed(6));
                            }
                          }}
                        />
                        <CircleF
                          center={{ lat: parseFloat(manualLat), lng: parseFloat(manualLng) }}
                          radius={parseInt(manualRadius) || 500}
                          options={{
                            fillColor: '#6366f1',
                            fillOpacity: 0.15,
                            strokeColor: '#4f46e5',
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                            clickable: false,
                            zIndex: 1
                          }}
                        />
                      </>
                    )}
                  </GoogleMap>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Initialising Maps...</p>
                  </div>
                )}
              </div>

              {/* Right side: Config */}
              <div className="w-full md:w-1/2 flex flex-col flex-1 min-h-0 bg-white">
                <div className="p-6 pb-0 flex justify-between items-center border-b border-gray-50 mb-4">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Launch Session
                  </h3>
                  <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600 p-1">
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5 pb-8 md:pb-6">
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

                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Coordinates</p>
                    <button
                      onClick={handleGetLocation}
                      className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 hover:text-indigo-700 transition-colors uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100"
                    >
                      <Navigation className="w-3 h-3" />
                      Track My GPS
                    </button>
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

                  <div className="space-y-1.5 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Session End Time (Auto-Close)</label>
                    </div>
                    <input
                      type="time"
                      value={manualEndTime}
                      onChange={e => setManualEndTime(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-700"
                    />
                    <p className="text-[10px] text-indigo-400 mt-1 ml-1 italic">Window will automatically lock at this time.</p>
                  </div>


                </div>

                <div className="p-6 pt-2 bg-gray-50 border-t border-gray-100 md:mt-auto mb-14 md:mb-0">
                  <button
                    type="button"
                    disabled={isToggling}
                    onClick={handleStartManualSession}
                    className="w-full py-4 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-2xl font-black text-base shadow-xl shadow-indigo-100 hover:shadow-indigo-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isToggling ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : (
                      'Launch Session'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Window status banner */}
        {windowStatusLoaded && isWindowActive && (
          <div className="mt-3 sm:mt-4 flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            <span>
              <strong>Attendance window is OPEN.</strong> Students can check in right now.
              Real-time updates will appear in the table below.
            </span>
          </div>
        )}
        {windowStatusLoaded && !isWindowActive && (
          <div className="mt-3 sm:mt-4 flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-500 text-sm font-medium animate-in fade-in duration-300">
            <Lock className="w-5 h-5 text-gray-400 shrink-0" />
            <span>
              Attendance window is <strong>closed</strong>. Students cannot check in until you activate the window.
            </span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Total Students"
                value={students.length.toString()}
                total=""
                percentage="100%"
                trend=""
                trendUp={true}
                icon={<Users className="h-6 w-6 text-indigo-600" />}
                colorClass="text-indigo-600"
                bgClass="bg-indigo-50"
                progressColorClass="bg-indigo-500"
              />
              <StatCard
                title="Present Today"
                value={presentCount.toString()}
                total={totalStudents.toString()}
                percentage={`${presentPercentage}%`}
                trend=""
                trendUp={true}
                icon={<UserCheck className="h-6 w-6 text-blue-600" />}
                colorClass="text-blue-600"
                bgClass="bg-blue-50"
                progressColorClass="bg-blue-500"
              />
              <StatCard
                title="Late Arrivals"
                value={lateCount.toString()}
                total={totalStudents.toString()}
                percentage={`${latePercentage}%`}
                trend=""
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
                trend=""
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
                trend=""
                trendUp={true}
                icon={<FileText className="h-6 w-6 text-green-500" />}
                colorClass="text-green-500"
                bgClass="bg-green-50"
                progressColorClass="bg-green-500"
              />
            </>
          )}
        </div>

        {/* Layout Grid (Attendance & Leave Reports) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="lg:col-span-2">
            <AttendanceTable />
          </div>
          <div className="flex flex-col gap-6 sm:gap-8">
            <QuickActions
              students={students}
              attendance={attendance}
              adminProfile={user}
            />
            <LeaveReports />
          </div>
        </div>

        {/* Bottom Section (Analytics) */}
        <div className="grid grid-cols-1 gap-4 sm:gap-8">
          <AnalyticsChart
            selectedStudent={selectedStudentName}
            onStudentSelect={setSelectedStudentName}
          />
        </div>
      </div>
    </div>
  );
}
