import React from 'react';
import { AnimatePresence } from 'motion/react';
import { useNotifications } from '../../context/NotificationContext';
import NotificationItem from './NotificationItem';

export default function NotificationStack() {
  const { notifications } = useNotifications();

  // Show only top 3-5 notifications
  const visibleNotifications = notifications.slice(-5).reverse();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex flex-col items-end">
      <div className="relative w-80 sm:w-96 h-0 pointer-events-auto">
        <AnimatePresence mode="popLayout">
          {visibleNotifications.map((n, i) => (
            <NotificationItem 
              key={n.id} 
              notification={n} 
              index={i} 
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
