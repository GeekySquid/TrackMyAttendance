import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../context/NotificationContext';
import { formatPersonalityMessage, PersonalityType } from '../utils/notificationFormatter';

export function useSupabaseNotifications(profile: any) {
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (!profile) return;

    // 1. Subscribe to Leave Requests
    const leaveChannel = supabase
      .channel('realtime:leave_requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leave_requests' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // ONLY ADMINS see new leave reports
            if (profile.role !== 'admin') return;

            const personality = formatPersonalityMessage('info', {
              userName: profile.name,
              senderName: payload.new.user_name,
              actionType: 'leave report'
            });
            addNotification({
              type: 'leave_report',
              ...personality,
              data: payload.new
            });
          } else if (payload.eventType === 'UPDATE') {
            // ONLY THE STUDENT WHO OWNED THE REQUEST sees the update
            if (payload.new.user_id !== profile.id) return;

            const personality = formatPersonalityMessage(
              payload.new.status === 'Approved' ? 'success' : 'alert',
              {
                userName: profile.name,
                actionType: 'leave request',
                metadata: { reason: payload.new.rejection_reason }
              }
            );
            addNotification({
              type: payload.new.status === 'Approved' ? 'success' : 'info',
              ...personality,
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    // 2. Subscribe to Attendance
    const attendanceChannel = supabase
      .channel('realtime:attendance')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance' },
        (payload) => {
          if (profile.role === 'admin') {
            const personality = formatPersonalityMessage('attendance_admin', {
              userName: profile.name,
              senderName: payload.new.user_name,
              actionType: 'check-in',
              metadata: { location: payload.new.location_name }
            });
            addNotification({
              type: 'attendance',
              ...personality,
              data: payload.new
            });
          } else if (payload.new.user_id === profile.id) {
            const personality = formatPersonalityMessage('attendance_student', {
              userName: profile.name,
              senderName: 'Admin',
              actionType: 'check-in',
              metadata: { location: payload.new.location_name }
            });
            addNotification({
              type: 'attendance',
              ...personality,
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    // 3. Subscribe to App-wide Notifications (Announcements)
    const announcementChannel = supabase
      .channel('realtime:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          // Check if it's a broadcast (no user_id) OR specifically for this user
          const isTargeted = payload.new.user_id === profile.id;
          const isBroadcast = !payload.new.user_id;

          if (isTargeted || isBroadcast) {
            // Skip if the current user is the one who sent it
            if (payload.new.sender_id === profile.id) return;

            const personality = formatPersonalityMessage('announcement', {
              userName: profile.name,
              actionType: payload.new.title,
              metadata: { message: payload.new.message }
            });
            addNotification({
              type: 'announcement',
              ...personality,
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leaveChannel);
      supabase.removeChannel(attendanceChannel);
      supabase.removeChannel(announcementChannel);
    };
  }, [addNotification, profile]);
}
