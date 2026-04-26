import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  CheckSquare, 
  Megaphone, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Info, 
  X,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Notification, NotificationType, useNotifications } from '../../context/NotificationContext';
import { updateLeaveRequestStatus } from '../../services/dbService';
import toast from 'react-hot-toast';

const icons: Record<NotificationType, React.ReactNode> = {
  leave_report: <Calendar className="w-5 h-5 text-indigo-500" />,
  task: <CheckSquare className="w-5 h-5 text-emerald-500" />,
  announcement: <Megaphone className="w-5 h-5 text-amber-500" />,
  attendance: <UserCheck className="w-5 h-5 text-blue-500" />,
  success: <CheckCircle2 className="w-5 h-5 text-green-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-sky-500" />
};

interface NotificationItemProps {
  notification: Notification;
  index: number;
}

export default function NotificationItem({ notification, index }: NotificationItemProps) {
  const { removeNotification, role } = useNotifications();
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const duration = notification.duration || 20000; // Increased to 20 seconds as requested

  useEffect(() => {
    if (isPaused) return;

    const startTime = Date.now() - ((100 - progress) / 100 * duration);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        removeNotification(notification.id);
        clearInterval(timer);
      }
    }, 10);

    return () => clearInterval(timer);
  }, [notification.id, duration, removeNotification, isPaused]);

  const [isUpdating, setIsUpdating] = useState(false);

  const handleApprove = async () => {
    if (!notification.data?.id) return;
    setIsUpdating(true);
    try {
      await updateLeaveRequestStatus(notification.data.id, 'Approved');
      toast.success('Leave request approved!');
      removeNotification(notification.id);
    } catch (err) {
      toast.error('Failed to approve leave request.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Stacking logic: if index > 0, we apply scaling and translation
  const stackOffset = index * 12;
  const stackScale = 1 - index * 0.05;
  const stackOpacity = 1 - index * 0.2;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ 
        opacity: stackOpacity, 
        x: 0, 
        y: -stackOffset,
        scale: stackScale,
        zIndex: 100 - index
      }}
      exit={{ opacity: 0, x: 200, transition: { duration: 0.2 } }}
      whileHover={{ scale: stackScale + 0.02, brightness: 1.1 }}
      transition={{ 
        type: "spring", 
        stiffness: 400, 
        damping: 25 
      }}
      className="absolute bottom-0 right-0 w-80 sm:w-96"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl shadow-2xl shadow-black/10">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-2 rounded-xl bg-white/20 border border-white/30 shadow-inner">
              {icons[notification.type]}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-gray-800 truncate">
                {notification.title}
              </h4>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
              
              {/* Quick Actions (Admin Only) */}
              {role === 'admin' && notification.type === 'leave_report' && (
                <div className="flex gap-2 mt-3">
                  <button 
                    onClick={handleApprove}
                    disabled={isUpdating}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[10px] font-bold hover:bg-indigo-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'} <ArrowRight className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => removeNotification(notification.id)}
                    className="px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-gray-700 text-[10px] font-bold hover:bg-white/40 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            <button 
              onClick={() => removeNotification(notification.id)}
              className="shrink-0 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-gray-500 hover:text-red-500 transition-all border border-white/30 shadow-sm"
              title="Close notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Life Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100/10">
          <motion.div 
            className={`h-full bg-gradient-to-r ${
              notification.type === 'error' ? 'from-red-400 to-pink-500' :
              notification.type === 'success' ? 'from-emerald-400 to-teal-500' :
              'from-indigo-400 to-purple-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
