import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Clock, CheckCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/dbService';
import { supabase } from '../lib/supabase';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import SwipeableNotificationItem from '../components/SwipeableNotificationItem';
import { AnimatePresence, motion } from 'framer-motion';

interface Notification {
  id: string;
  type: 'alert' | 'success' | 'info' | 'warning';
  title: string;
  message: string;
  data: string[];
  unread: boolean;
  time: string;
  createdAt: string;
  userId?: string | null;
}

export default function NotificationsPage({ userId }: { userId?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    const data = await getNotifications(userId);
    setNotifications(data as Notification[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to realtime updates with a unique channel name
    // to prevent ghost subscriptions on hot-reload or component remounts
    const channelName = `notifications-page-${userId ?? 'all'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    toast.success('All notifications marked as read');
  };

  const handleMarkAsRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alert': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBg = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-red-50 border-red-100';
      case 'success': return 'bg-green-50 border-green-100';
      case 'warning': return 'bg-orange-50 border-orange-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const { visibleItems, sentinelRef } = useInfiniteScroll(notifications, 10, 5);

  return (
    <div className="flex-1 overflow-y-auto mobile-container-padding">
      <div className="w-full">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800">Notifications</h2>
              {unreadCount > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white text-[10px] font-black rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">View your recent alerts and messages</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4 pb-10">
            <AnimatePresence initial={false}>
              {visibleItems.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  onClick={() => notif.unread && handleMarkAsRead(notif.id)}
                >
                  <SwipeableNotificationItem 
                    notification={notif} 
                    onRemove={handleRemoveNotification}
                    variant="full"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={sentinelRef} className="h-4" />
          </div>
        )}
      </div>
    </div>
  );
}
