import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Plus, Trash2, Map, Crosshair, Navigation, Loader2 } from 'lucide-react';
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
  days: string[];
  lat: string;
  lng: string;
  radius: string;
  isActive: boolean;
  autoActivate: boolean;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function GeofencingPage() {
  const [schedules, setSchedules] = useState<GeofenceSchedule[]>([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(true);

  // Load from Supabase on mount
  useEffect(() => {
    getGeofenceSchedules()
      .then(setSchedules)
      .catch((e) => console.error('[GeofencingPage] load error:', e))
      .finally(() => setIsLoadingSchedules(false));
  }, []);

  const [newTime, setNewTime] = useState('09:00');
  const [newDays, setNewDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [newLat, setNewLat] = useState('');
  const [newLng, setNewLng] = useState('');
  const [newRadius, setNewRadius] = useState('500');
  const [newAutoActivate, setNewAutoActivate] = useState(true);
  const [isLocating, setIsLocating] = useState(false);

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
    try {
      await updateGeofenceSchedule(id, { isActive: !schedule.isActive });
      setSchedules(prev =>
        prev.map(s =>
          s.id === id ? { ...s, isActive: !s.isActive } : s
        )
      );
    } catch (err: any) {
      toast.error('Failed to update schedule');
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      await deleteGeofenceSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLat || !newLng) {
      toast.error('Please enter coordinates');
      return;
    }
    try {
      const created = await addGeofenceSchedule({
        time: newTime,
        days: newDays,
        lat: newLat,
        lng: newLng,
        radius: newRadius,
        isActive: true,
        autoActivate: newAutoActivate,
      });
      setSchedules(prev => [...prev, created]);
      setNewLat('');
      setNewLng('');
      toast.success('Schedule saved to database!');
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Geofencing & Schedules</h2>
            <p className="text-sm text-gray-500">Set coordinates and auto-activation alarms</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        {/* Left Column: Saved Alarms/Schedules */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-gray-800 mb-2">Active Schedules</h3>
          
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">
              No geofence schedules set. Add one to get started.
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule.id} className={`bg-white rounded-xl border ${schedule.isActive ? 'border-blue-200 shadow-md' : 'border-gray-100 shadow-sm'} p-4 sm:p-6 transition-all`}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <h4 className={`text-3xl font-bold ${schedule.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                        {formatTime(schedule.time)}
                      </h4>
                      {schedule.autoActivate && (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Auto-Activate
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-3">
                      {DAYS_OF_WEEK.map(day => (
                        <span 
                          key={day} 
                          className={`text-xs font-medium px-1.5 py-0.5 rounded ${schedule.days.includes(day) ? (schedule.isActive ? 'text-blue-700 bg-blue-50' : 'text-gray-500 bg-gray-100') : 'text-gray-300'}`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center text-sm text-gray-500">
                      <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
                      <span>Lat: {schedule.lat}, Lng: {schedule.lng}</span>
                      <span className="mx-2">•</span>
                      <Crosshair className="w-4 h-4 mr-1.5 text-gray-400" />
                      <span>{schedule.radius}m radius</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-gray-100">
                    <button 
                      onClick={() => deleteSchedule(schedule.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={schedule.isActive}
                        onChange={() => toggleSchedule(schedule.id)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Add New Schedule Form */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 sticky top-4">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-gray-800">New Geofence Alarm</h3>
            </div>

            <form onSubmit={handleAddSchedule} className="space-y-5">
              {/* Time Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Activation Time</label>
                <input 
                  type="time" 
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  required
                />
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
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-colors flex items-center justify-center ${
                        newDays.includes(day) 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
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
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium disabled:opacity-50 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    {isLocating ? 'Locating...' : 'Track My Location'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Lat (e.g. 40.7128)"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      placeholder="Lng (e.g. -74.0060)"
                      value={newLng}
                      onChange={(e) => setNewLng(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    min="50" 
                    max="2000" 
                    step="50"
                    value={newRadius}
                    onChange={(e) => setNewRadius(e.target.value)}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-bold text-gray-700 w-12 text-right">{newRadius}m</span>
                </div>
              </div>

              {/* Auto Activate Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-800">Auto-Activate Window</p>
                  <p className="text-xs text-gray-500">Turn on when time is reached</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={newAutoActivate}
                    onChange={(e) => setNewAutoActivate(e.target.checked)}
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save Schedule
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Dynamic Map Preview */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Map className="w-5 h-5 text-gray-400" />
            Geofence Map Preview
          </h3>
          {isValidLocation && (
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
              <Crosshair className="w-3 h-3" />
              Live Preview
            </span>
          )}
        </div>
        <div className="w-full h-64 bg-gray-50 rounded-lg border border-gray-200 relative overflow-hidden">
          {isValidLocation ? (
            <>
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - 0.005},${latNum - 0.005},${lngNum + 0.005},${latNum + 0.005}&layer=mapnik&marker=${latNum},${lngNum}`}
                className="absolute inset-0"
              ></iframe>
              {/* Simulated Radius Overlay */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500/20 border border-blue-500/50 rounded-full pointer-events-none transition-all duration-300 z-10"
                style={{ 
                  width: `${Math.max(40, (parseInt(newRadius) / 2000) * 300)}px`, 
                  height: `${Math.max(40, (parseInt(newRadius) / 2000) * 300)}px` 
                }}
              ></div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <MapPin className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm font-medium">Enter coordinates or track location to view map</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
