import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import NotificationStack from '../components/notifications/NotificationStack';

export type NotificationType = 'leave_report' | 'task' | 'announcement' | 'attendance' | 'success' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  duration?: number;
}

interface NotificationContextType {
  notifications: Notification[];
  role: 'admin' | 'student';
  setRole: (role: 'admin' | 'student') => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [role, setRole] = useState<'admin' | 'student'>('student');

  const addNotification = useCallback((n: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { ...n, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, role, setRole, addNotification, removeNotification }}>
      {children}
      <NotificationStack />
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
