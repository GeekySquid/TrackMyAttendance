import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, CircleF, Autocomplete } from '@react-google-maps/api';
const LIBRARIES: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];
import { MapPin, Clock, Plus, Trash2, Map, Crosshair, Navigation, Loader2, Pencil, X, AlertCircle, Search, Minus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getGeofenceSchedules,
  addGeofenceSchedule,
  updateGeofenceSchedule,
  deleteGeofenceSchedule,
} from '../services/dbService';

interface GeofenceSchedule {
  id: string;
  time: string;
  endTime: string;
  days: string[];
  lat: string;
  lng: string;
  radius: string;
  isActive: boolean;
  autoActivate: boolean;
  gracePeriod: number;
  locationName: string;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function GeofencingPage() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [schedules, setSchedules] = useState<GeofenceSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    getGeofenceSchedules()
      .then((data) => {
        // Filter out manual-override records (autoActivate === false)
        setSchedules(data.filter((s: GeofenceSchedule) => s.autoActivate !== false));
      })
      .catch((e) => console.error('[GeofencingPage] load error:', e))
      .finally(() => setIsLoadingSchedules(false));
  }, []);

  const [newTime, setNewTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('17:00');
  const [newDays, setNewDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newRadius, setNewRadius] = useState('500');
  const [newGracePeriod, setNewGracePeriod] = useState(15);
  const [newAutoActivate, setNewAutoActivate] = useState(true);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [newLocationName, setNewLocationName] = useState('Main Campus');
  const [mapType, setMapType] = useState<string>('roadmap');
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onSearchLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        setNewLat(place.geometry.location.lat().toFixed(6));
        setNewLng(place.geometry.location.lng().toFixed(6));
        if (place.name) setNewLocationName(place.name);
        toast.success(`Location set to ${place.name || 'selected area'}`);
      }
    }
  };

  const handleTrackLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewLat(position.coords.latitude.toFixed(6));
        setNewLng(position.coords.longitude.toFixed(6));
        setIsLocating(false);
      },
      (error) => {
        toast.error('Unable to retrieve your location. Please check your browser permissions.');
        setIsLocating(false);
      }
    );
  };

  const latNum = parseFloat(newLat);
  const lngNum = parseFloat(newLng);
  const isValidLocation = !isNaN(latNum) && !isNaN(lngNum) && newLat !== '' && newLng !== '';

  const toggleDay = (day: string) => {
    setNewDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleSchedule = async (id: string) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    
    // Optimistic update
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s));
    
    try {
      await updateGeofenceSchedule(id, { isActive: !schedule.isActive });
    } catch (err: any) {
      toast.error('Failed to update schedule');
      // State will reconcile automatically via fetch or manual restore
    }
  };

  const deleteSchedule = async (id: string) => {
    // Optimistic update
    setSchedules(prev => prev.filter(s => s.id !== id));
    try {
      await deleteGeofenceSchedule(id);
      toast.success('Schedule deleted');
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleEdit = (schedule: GeofenceSchedule) => {
    setEditingScheduleId(schedule.id);
    setNewTime(schedule.time);
    setNewEndTime(schedule.endTime || '17:00');
    setNewDays(schedule.days);
    setNewLat(schedule.lat);
    setNewLng(schedule.lng);
    setNewRadius(schedule.radius);
    setNewGracePeriod(schedule.gracePeriod || 15);
    setNewAutoActivate(schedule.autoActivate);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingScheduleId(null);
    setNewTime('09:00');
    setNewEndTime('17:00');
    setNewDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    setNewLat('');
    setNewLng('');
    setNewRadius('500');
    setNewGracePeriod(15);
    setNewAutoActivate(true);
    setNewLocationName('Main Campus');
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLocation) {
      toast.error('Please enter valid coordinates');
      return;
    }
    try {
      if (editingScheduleId) {
        await updateGeofenceSchedule(editingScheduleId, {
          time: newTime,
          endTime: newEndTime,
          days: newDays,
          lat: newLat,
          lng: newLng,
          radius: newRadius,
          gracePeriod: newGracePeriod,
          autoActivate: newAutoActivate,
          locationName: newLocationName
        });
        setSchedules(prev =>
          prev.map(s =>
            s.id === editingScheduleId
              ? { ...s, time: newTime, endTime: newEndTime, days: newDays, lat: newLat, lng: newLng, radius: newRadius, gracePeriod: newGracePeriod, autoActivate: newAutoActivate, locationName: newLocationName }
              : s
          )
        );
        toast.success('Schedule updated successfully!');
        cancelEdit();
      } else {
        const created = await addGeofenceSchedule({
          time: newTime,
          endTime: newEndTime,
          days: newDays,
          lat: newLat,
          lng: newLng,
          radius: newRadius,
          gracePeriod: newGracePeriod,
          isActive: true,
          autoActivate: newAutoActivate,
          locationName: newLocationName
        });
        setSchedules(prev => [...prev, created]);
        setNewLat('');
        setNewLng('');
        setNewLocationName('Main Campus');
        toast.success('Schedule saved to database!');
      }
    } catch (err: any) {
      toast.error('Failed to save schedule: ' + (err.message || 'Unknown error'));
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
  };

  return (
    <div className="flex-1 overflow-y-auto mobile-container-padding">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl font-bold text-gray-800">Geofencing Setup & Active Alarms</h2>
        <p className="text-sm text-gray-500">Configure spatial boundaries and automate class attendance windows</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-8 mb-6 sm:mb-10">
        {/* Left Column: Add New Schedule Form */}
        <div className="col-span-1 border-r border-gray-100 lg:pr-8">
          <div className="bg-white rounded-3xl border border-gray-100/80 shadow-sm p-4 sm:p-6 sticky top-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-gray-800">
                  {editingScheduleId ? 'Edit Geofence Alarm' : 'New Geofence Alarm'}
                </h3>
              </div>
              {editingScheduleId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cancel Edit"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-5">
              {/* Location Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wider">Location Label</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g. Science Block, Main Entrance"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium shadow-sm transition-all"
                    required
                  />
                </div>
              </div>

              {/* Time Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Activation Time</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold shadow-sm bg-gray-50/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-bold shadow-sm bg-gray-50/50"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Days Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Repeat Days</label>
                <div className="flex justify-between gap-1">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${newDays.includes(day)
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-105'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                      {day.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-gray-700">Coordinates</label>
                  <button
                    type="button"
                    onClick={handleTrackLocation}
                    disabled={isLocating}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold disabled:opacity-50 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    {isLocating ? 'Locating...' : 'Track GPS'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Lat (e.g. 40.7128)"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Lng (e.g. -74.0060)"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Radius (meters)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="1000"
                    step="1"
                    value={newRadius}
                    onChange={(e) => setNewRadius(e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={newRadius}
                      onChange={(e) => setNewRadius(e.target.value)}
                      className="w-20 text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 pr-6 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold pointer-events-none">m</span>
                  </div>
                </div>
              </div>
              {/* Grace Period */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Grace Period (minutes)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="120"
                    step="5"
                    value={newGracePeriod}
                    onChange={(e) => setNewGracePeriod(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={newGracePeriod}
                      onChange={(e) => setNewGracePeriod(parseInt(e.target.value))}
                      className="w-16 text-sm font-bold text-gray-700 bg-gray-50 px-2 py-1.5 pr-6 rounded-xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-right transition-all"
                    />
                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold pointer-events-none uppercase">min</span>
                  </div>
                </div>
              </div>

              {/* Auto Activate Toggle */}
              <div className="flex items-center justify-between p-4 bg-blue-50/40 backdrop-blur-sm rounded-2xl border border-blue-100/50 shadow-sm transition-all hover:bg-blue-50/60">
                <div>
                  <p className="text-sm font-black text-blue-900 tracking-tight">Auto-Activate Window</p>
                  <p className="text-[10px] text-blue-600/70 leading-tight mt-0.5 font-medium">Smart automation for this zone</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={newAutoActivate}
                    onChange={(e) => setNewAutoActivate(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner group-hover:after:scale-110"></div>
                </label>
              </div>

              <button
                type="submit"
                className={`w-full ${editingScheduleId ? 'bg-gradient-to-br from-indigo-600 to-violet-700 shadow-indigo-200' : 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-200'} text-white py-4 rounded-2xl font-black text-base shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
              >
                {editingScheduleId ? (
                  <>
                    <Pencil className="w-5 h-5" />
                    Update Geofence Zone
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Deploy Zone
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Dynamic Map Editor */}
        <div className="col-span-1 lg:col-span-2 flex flex-col h-[400px] sm:h-full min-h-[400px]">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 h-full flex flex-col">
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Map className="w-4 h-4 text-blue-500" />
                Interactive Visual Editor
              </h3>
              {isValidLocation ? (
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Tracking Active
                </span>
              ) : (
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Waiting for Coordinates...
                </span>
              )}
            </div>

            <div className="w-full flex-1 rounded-lg overflow-hidden relative bg-gray-50">
              {isLoaded ? (
                <GoogleMap
                  onLoad={m => setMap(m)}
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={isValidLocation ? { lat: latNum, lng: lngNum } : { lat: 20.5937, lng: 78.9629 }}
                  zoom={isValidLocation ? 16 : 4}
                  mapTypeId={mapType}
                  options={{
                    disableDefaultUI: true,
                    zoomControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: false
                  }}
                  onClick={(e) => {
                    if (e.latLng) {
                      setNewLat(e.latLng.lat().toFixed(6));
                      setNewLng(e.latLng.lng().toFixed(6));
                    }
                  }}
                >
                  {/* Dashboard-style Glassmorphic Search */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] sm:w-2/3 z-10">
                    <Autocomplete
                      onLoad={onSearchLoad}
                      onPlaceChanged={onPlaceChanged}
                    >
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/20 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30" />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-600 transition-colors z-10" />
                        <input
                          type="text"
                          placeholder="Search for a location or campus..."
                          className="w-full pl-12 pr-12 py-3 bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 text-sm font-bold relative z-10"
                          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
                        />
                        <button
                          type="button"
                          onClick={handleTrackLocation}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-blue-600 hover:text-blue-700 transition-colors z-20"
                          title="Pin My Current Location"
                        >
                          <Navigation className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
                        </button>
                      </div>
                    </Autocomplete>
                  </div>

                  {/* Dashboard-style Unified Map Controls */}
                  <div className="absolute bottom-6 left-6 z-10 flex flex-col bg-white/90 backdrop-blur-md rounded-2xl border border-white/50 shadow-2xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => map?.setZoom((map.getZoom() || 16) + 1)}
                      className="p-3 text-blue-600 hover:bg-white transition-colors border-b border-gray-100 active:scale-95"
                      title="Zoom In"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => map?.setZoom((map.getZoom() || 16) - 1)}
                      className="p-3 text-blue-600 hover:bg-white transition-colors border-b border-gray-100 active:scale-95"
                      title="Zoom Out"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapType(mapType === 'roadmap' ? 'hybrid' : 'roadmap')}
                      className="p-3 text-blue-600 hover:bg-white transition-colors active:scale-95"
                      title="Toggle Satellite/Map View"
                    >
                      <Map className={`w-5 h-5 ${mapType === 'hybrid' ? 'text-blue-800' : 'text-blue-600'}`} />
                    </button>
                  </div>
                  {isValidLocation && (
                    <>
                      <MarkerF
                        position={{ lat: latNum, lng: lngNum }}
                        draggable={true}
                        onDragEnd={(e) => {
                          if (e.latLng) {
                            setNewLat(e.latLng.lat().toFixed(6));
                            setNewLng(e.latLng.lng().toFixed(6));
                          }
                        }}
                      />
                      <CircleF
                        center={{ lat: latNum, lng: lngNum }}
                        radius={parseInt(newRadius) || 500}
                        options={{
                          fillColor: '#3b82f6',
                          fillOpacity: 0.25,
                          strokeColor: '#2563eb',
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                          clickable: false,
                          draggable: false,
                          editable: false,
                          visible: true,
                          zIndex: 1
                        }}
                      />
                    </>
                  )}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-sm font-medium text-gray-500">Loading Google Maps Core...</p>
                </div>
              )}
            </div>
            {!isValidLocation && (
              <div className="p-3 bg-blue-50 text-blue-700 text-xs font-medium text-center rounded-b-lg mt-2">
                👆 Click anywhere on the globe to instantly teleport your geofence.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Saved Alarms/Schedules */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Deployed Schedules</h3>

        {schedules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Crosshair className="w-8 h-8" />
            </div>
            <h4 className="text-gray-900 font-bold mb-1">No Active Boundaries</h4>
            <p className="text-gray-500 text-sm max-w-sm">Use the map editor above to drop your first location pin and schedule an attendance window.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {schedules.map((schedule) => (
              <div key={schedule.id} className={`bg-white rounded-xl border ${schedule.isActive ? 'border-blue-300 shadow-lg shadow-blue-900/5' : 'border-gray-100 shadow-sm opacity-75'} p-5 transition-all relative overflow-hidden group`}>
                {schedule.isActive && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-xl"></div>
                )}

                <div className="flex justify-between items-start mb-4 pl-2">
                  <div>
                    <h4 className={`text-2xl font-extrabold tracking-tight ${schedule.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                      {formatTime(schedule.time)} - {formatTime(schedule.endTime || '17:00')}
                    </h4>
                    {schedule.autoActivate && (
                      <span className="inline-flex items-center gap-1 mt-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> Auto-Scheduler
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 mt-1 bg-orange-50 border border-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ml-1">
                      <AlertCircle className="w-3 h-3" /> {schedule.gracePeriod || 15}m Grace
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={schedule.isActive}
                      onChange={() => toggleSchedule(schedule.id)}
                    />
                    <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 shadow-inner"></div>
                  </label>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-5 pl-2">
                  {DAYS_OF_WEEK.map(day => (
                    <span
                      key={day}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${schedule.days.includes(day) ? (schedule.isActive ? 'text-blue-800 bg-blue-100 border border-blue-200' : 'text-gray-600 bg-gray-100 border border-gray-200') : 'text-gray-300 border border-transparent'}`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 grid grid-cols-1 gap-2 mb-3 ml-2 border border-gray-100 relative group-hover:border-blue-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-mono text-gray-500">{parseFloat(schedule.lat).toFixed(4)}, {parseFloat(schedule.lng).toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <Crosshair className="w-3.5 h-3.5 text-gray-400" />
                    Perimeter: <span className="text-blue-600 font-bold">{schedule.radius} meters</span>
                  </div>
                </div>

                <div className="flex justify-end mt-2 gap-2">
                  <button
                    onClick={() => handleEdit(schedule)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="Edit Boundary"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete Boundary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
