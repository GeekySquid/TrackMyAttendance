import React, { useState, useEffect } from 'react';
import { MapPin, Bell, CheckCircle2, ShieldCheck, ArrowRight, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PermissionGateProps {
  children: React.ReactNode;
}

const PermissionGate: React.FC<PermissionGateProps> = ({ children }) => {
  const [locationStatus, setLocationStatus] = useState<PermissionState | 'loading'>('loading');
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission | 'loading'>('loading');
  const [showPrompt, setShowPrompt] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      // 1. Check Location
      if ('permissions' in navigator) {
        try {
          const loc = await navigator.permissions.query({ name: 'geolocation' });
          setLocationStatus(loc.state);
          loc.onchange = () => setLocationStatus(loc.state);
        } catch (e) {
          setLocationStatus('prompt');
        }
      } else {
        setLocationStatus('prompt');
      }

      // 2. Check Notifications
      if ('Notification' in window) {
        setNotificationStatus(Notification.permission);
      } else {
        setNotificationStatus('granted'); // Fallback if not supported
      }
    };

    checkPermissions();
  }, []);

  useEffect(() => {
    // Show prompt if either is not granted
    if (locationStatus !== 'loading' && notificationStatus !== 'loading') {
      if (locationStatus !== 'granted' || notificationStatus !== 'granted') {
        setShowPrompt(true);
      } else {
        setShowPrompt(false);
      }
    }
  }, [locationStatus, notificationStatus]);

  const requestPermissions = async () => {
    setIsRequesting(true);
    
    // Request Location
    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      setLocationStatus('granted');
    } catch (e) {
      console.warn('Location permission denied or failed');
    }

    // Request Notifications
    if ('Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotificationStatus(res);
      } catch (e) {
        console.warn('Notification permission failed');
      }
    }

    setIsRequesting(false);
    
    // After requesting, check again. If both granted, showPrompt will go false via useEffect
  };

  if (!showPrompt) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden"
        >
          <div className="p-8 sm:p-10 text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-blue-200 animate-pulse">
              <ShieldCheck className="w-10 h-10" />
            </div>
            
            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Setup Permissions</h2>
            <p className="text-gray-500 font-bold text-sm leading-relaxed mb-10 px-4">
              To provide the best attendance experience, we need access to your location and notifications.
            </p>

            <div className="space-y-4 mb-10">
              {/* Geolocation Item */}
              <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${locationStatus === 'granted' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${locationStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-black text-sm text-gray-900 uppercase tracking-tight">Precise Location</h3>
                  <p className="text-[11px] font-bold text-gray-500">For automatic geofence check-ins</p>
                </div>
                {locationStatus === 'granted' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                )}
              </div>

              {/* Notifications Item */}
              <div className={`flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${notificationStatus === 'granted' ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-100'}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${notificationStatus === 'granted' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                  <Bell className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-black text-sm text-gray-900 uppercase tracking-tight">Smart Alerts</h3>
                  <p className="text-[11px] font-bold text-gray-500">Stay updated on window status</p>
                </div>
                {notificationStatus === 'granted' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-orange-600 animate-ping" />
                )}
              </div>
            </div>

            <button
              onClick={requestPermissions}
              disabled={isRequesting}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 group"
            >
              {isRequesting ? (
                <>Requesting Access...</>
              ) : (
                <>
                  Allow Required Access 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            <p className="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Secured & Encrypted Terminal
            </p>
          </div>

          <div className="bg-gray-50 p-6 border-t border-gray-100 flex items-center justify-center gap-2">
            <Settings className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Manage via Browser Settings</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PermissionGate;
