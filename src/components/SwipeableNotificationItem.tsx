import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, Trash2, Star, X } from 'lucide-react';
import { deleteNotification, toggleNotificationImportant } from '../services/dbService';

interface SwipeableNotificationItemProps {
  notification: any;
  onRemove: (id: string) => void;
  variant?: 'compact' | 'full';
}

export default function SwipeableNotificationItem({ 
  notification, 
  onRemove, 
  variant = 'compact' 
}: SwipeableNotificationItemProps) {
  const x = useMotionValue(0);
  
  // Dynamic background colors based on drag direction
  // Left drag (negative x) -> Red for delete
  // Right drag (positive x) -> Yellow/Gold for star
  const background = useTransform(
    x,
    [-100, 0, 100],
    ['rgba(239, 68, 68, 0.2)', 'rgba(255, 255, 255, 0)', 'rgba(234, 179, 8, 0.2)']
  );

  const starOpacity = useTransform(x, [20, 80], [0, 1]);
  const deleteOpacity = useTransform(x, [-80, -20], [1, 0]);

  const [localIsImportant, setLocalIsImportant] = useState(notification.isImportant);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      // Star/Important
      const nextState = !localIsImportant;
      setLocalIsImportant(nextState);
      // Non-blocking server sync
      toggleNotificationImportant(notification.id, localIsImportant);
    } else if (info.offset.x < -100) {
      // Delete - Optimistic removal
      onRemove(notification.id);
      // Background server sync
      deleteNotification(notification.id);
    }
  };

  return (
    <div className="relative overflow-hidden border-b border-gray-50 last:border-0 group">
      {/* Action Backgrounds */}
      <motion.div 
        style={{ background }}
        className="absolute inset-0 flex items-center justify-between px-6 z-0"
      >
        <motion.div style={{ opacity: starOpacity }} className="flex items-center text-yellow-600">
          <Star className={`w-5 h-5 ${localIsImportant ? 'fill-yellow-500' : ''}`} />
          <span className="ml-2 text-xs font-bold uppercase tracking-wider">Save</span>
        </motion.div>
        
        <motion.div style={{ opacity: deleteOpacity }} className="flex items-center text-red-600">
          <span className="mr-2 text-xs font-bold uppercase tracking-wider">Remove</span>
          <Trash2 className="w-5 h-5" />
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`relative z-10 bg-white transition-colors cursor-grab active:cursor-grabbing
          ${variant === 'compact' ? 'p-4 hover:bg-gray-50' : 'p-5 rounded-xl border border-transparent hover:border-gray-100 hover:shadow-md'}
          ${notification.unread ? 'bg-blue-50/30' : ''}`}
      >
        <div className="flex gap-4">
          <div className={`shrink-0 flex items-center justify-center
            ${variant === 'compact' ? 'w-5 h-5 mt-1' : 'w-12 h-12 rounded-full border border-gray-100 bg-gray-50'}
            ${notification.type === 'alert' ? 'text-red-500' : notification.type === 'success' ? 'text-green-500' : 'text-blue-500'}`}
          >
            {notification.type === 'alert' ? <AlertCircle className={variant === 'compact' ? "w-5 h-5" : "w-6 h-6"} /> : notification.type === 'success' ? <CheckCircle2 className={variant === 'compact' ? "w-5 h-5" : "w-6 h-6"} /> : <Bell className={variant === 'compact' ? "w-5 h-5" : "w-6 h-6"} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-2 overflow-hidden">
                <p className={`font-bold truncate ${variant === 'compact' ? 'text-sm' : 'text-base'} ${notification.unread ? 'text-gray-900' : 'text-gray-700'}`}>
                  {notification.title}
                </p>
                {localIsImportant && (
                  <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 shrink-0" />
                )}
              </div>
              <span className="text-[10px] font-medium text-gray-400 whitespace-nowrap mt-1">{notification.time}</span>
            </div>
            
            <p className={`text-gray-600 mt-1 ${variant === 'compact' ? 'text-xs line-clamp-2' : 'text-sm'}`}>
              {notification.message}
            </p>

            {/* Data Badges (Page only) */}
            {variant === 'full' && notification.data && notification.data.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {notification.data.map((item: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-gray-100 text-gray-800 border border-gray-200 shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Unread dot for Page view */}
          {variant === 'full' && notification.unread && (
            <div className="hidden sm:flex items-center justify-center w-6">
              <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
            </div>
          )}
        </div>
        
        {/* Glow indicators on the edges */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 opacity-0 group-hover:opacity-20 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 opacity-0 group-hover:opacity-20 transition-opacity" />
      </motion.div>
    </div>
  );
}
