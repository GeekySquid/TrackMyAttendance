/**
 * dbService.ts — Supabase Backend Service
 * 
 * Replaces the previous Firebase + localStorage implementation.
 * All functions mirror the original API signatures for drop-in compatibility.
 * 
 * Table: public.profiles (maps to frontend "users" collection)
 * Table: public.attendance
 * Table: public.leave_requests
 * Table: public.roles
 * Table: public.documents
 * Table: public.geofence_schedules
 * Table: public.notifications
 */

import { supabase } from '../lib/supabase';

// ─── TYPE DEFINITIONS ──────────────────────────────────────────────────────────

type UnsubFn = () => void;

const MOCK_MENTORS = [
  { id: 'm1', name: 'Dr. Sarah Wilson', phone: '+91 98765 43210' },
  { id: 'm2', name: 'Prof. James Chen', phone: '+91 98765 43211' }
];

// ─── FIELD MAPPERS (DB snake_case → Frontend camelCase) ────────────────────────

export function mapProfile(row: any) {
  if (!row) return null;
  // NOTE: blood_group, profile_completed, mentor_id do NOT exist in the DB schema.
  // onboarded is derived from whether the student has completed their profile (has a phone number set).
  const isOnboarded = row.role === 'admin' || !!(row.phone) || !!(row.roll_no);
  return {
    id: row.id,
    uid: row.id,                        // legacy compat — frontend uses both uid and id
    name: row.name || '',
    email: row.email || '',
    photoURL: row.photo_url || '',
    role: row.role || 'student',
    rollNo: row.roll_no || '',
    course: row.course || '',
    phone: row.phone || '',
    gender: row.gender || '',
    bloodGroup: '',                     // column does not exist in DB schema
    status: row.status || 'Active',
    attendance: row.attendance_pct != null ? `${Math.round(row.attendance_pct)}%` : '100%',
    attendance_pct: row.attendance_pct ?? 100,
    roleId: row.role_id || null,
    mentorId: null,                     // column does not exist in DB schema
    onboarded: isOnboarded,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAttendance(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    rollNo: row.roll_no || '',
    course: row.course || '',
    date: row.date,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time,
    status: row.status,
    location: row.location || '',
    lateReason: row.late_reason || '',
    lateReasonStatus: row.late_reason_status || 'Pending',
    lateReasonReviewedAt: row.late_reason_reviewed_at || null,
    lateReasonImage: row.late_reason_image || null,
  };
}

export function mapLeaveRequest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    rollNo: row.roll_no || '',
    fromDate: row.from_date,
    toDate: row.to_date,
    type: row.type,
    reason: row.reason,
    status: row.status,
    appliedOn: row.applied_on,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

export function mapGeofence(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    time: row.time ? row.time.substring(0, 5) : '',  // 'HH:MM:SS' → 'HH:MM'
    days: row.days || [],
    lat: String(row.lat),
    lng: String(row.lng),
    radius: String(row.radius),
    isActive: row.is_active,
    autoActivate: row.auto_activate,
    gracePeriod: row.grace_period || 15,
  };
}

export function mapNotification(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: Array.isArray(row.data) ? row.data : [],
    unread: !row.is_read,
    time: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
  };
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function mapRow(table: string, row: any): any {
  switch (table) {
    case 'users':
    case 'profiles': return mapProfile(row);
    case 'attendance': return mapAttendance(row);
    case 'leave_requests':
    case 'leaveRequests': return mapLeaveRequest(row);
    case 'geofence_schedules': return mapGeofence(row);
    case 'notifications': return mapNotification(row);
    case 'mentors': return mapMentor(row);
    default: return row;
  }
}

export function mapMentor(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── TABLE RESOLVER ─────────────────────────────────────────────────────────────
// Maps legacy Firebase collection names to Supabase table names

function resolveTable(collectionName: string): string {
  const tableMap: Record<string, string> = {
    users: 'profiles',
    attendance: 'attendance',
    leaveRequests: 'leave_requests',
    roles: 'roles',
    documents: 'documents',
    notifications: 'notifications',
    mentors: 'mentors',
  };
  return tableMap[collectionName] || collectionName;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER / PROFILE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getUsers = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[dbService] getUsers error:', error.message);
    return [];
  }
  return (data || []).map(mapProfile);
};

export const getUserById = async (id: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // maybeSingle returns null without error if not found

    if (error) {
      console.error('[dbService] getUserById error:', error.message);
      throw error; // Let caller handle terminal errors
    }
    
    return data ? mapProfile(data) : null;
  } catch (err) {
    console.error('[dbService] getUserById failed:', err);
    return null;
  }
};

export const saveUser = async (user: any): Promise<boolean> => {
  try {
    const userId = user.uid || user.id;
    if (!userId) {
      console.error('[dbService] saveUser: no uid/id provided');
      return false;
    }
    console.log('[dbService] saveUser starting for:', userId);

    // Build upsert row using ONLY columns that exist in the schema.
    // Columns NOT in schema: blood_group, profile_completed, mentor_id.
    const row: Record<string, any> = {
      id: userId,
      name: user.name || '',
      email: user.email || '',
      updated_at: new Date().toISOString(),
    };
    if (user.photoURL) row.photo_url = user.photoURL;
    if (user.role)    row.role      = user.role;
    if (user.rollNo)  row.roll_no   = user.rollNo;
    if (user.course)  row.course    = user.course;
    if (user.phone)   row.phone     = user.phone;
    if (user.gender)  row.gender    = user.gender;
    if (user.status)  row.status    = user.status;

    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[dbService] saveUser upsert error:', error.message);
      return false;
    }
    console.log('[dbService] saveUser success');
    return true;
  } catch (err) {
    console.error('[dbService] saveUser exception:', err);
    return false;
  }
};

export const updateUserRole = async (
  userId: string,
  roleId: string | null
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ role_id: roleId })
    .eq('id', userId);
  if (error) console.error('[dbService] updateUserRole error:', error.message);
};

export const updateUserProfile = async (
  userId: string,
  updates: Partial<{
    name: string;
    phone: string;
    gender: string;
    photoURL: string;
    status: string;
  }>
): Promise<void> => {
  const row: Record<string, any> = {};
  if (updates.name !== undefined)     row.name      = updates.name;
  if (updates.phone !== undefined)    row.phone     = updates.phone;
  if (updates.gender !== undefined)   row.gender    = updates.gender;
  if (updates.photoURL !== undefined) row.photo_url = updates.photoURL;
  if (updates.status !== undefined)   row.status    = updates.status;
  // NOTE: blood_group column does not exist in the profiles schema

  const { error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId);
  if (error) console.error('[dbService] updateUserProfile error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendance = async (userId?: string): Promise<any[]> => {
  let query = supabase
    .from('attendance')
    .select('*')
    .order('date', { ascending: false });
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    console.error('[dbService] getAttendance error:', error.message);
    return [];
  }
  return (data || []).map(mapAttendance);
};

export const addAttendance = async (record: any): Promise<any> => {
  try {
    const params = {
      p_user_id: record.userId,
      p_user_name: record.userName || null,
      p_roll_no: record.rollNo || null,
      p_course: record.course || null,
      p_date: record.date,
      p_check_in: record.checkInTime || null,
      p_status: record.status,
      p_location: record.location || null,
      p_late_reason: record.lateReason || null,
      p_late_reason_image: record.lateReasonImage || null
    };

    const { data, error } = await supabase.rpc('record_attendance', params);

    if (error || (data && data.status === 'failure')) {
      const errorMsg = error?.message || data?.error;
      console.warn('[dbService] addAttendance RPC failed, trying direct insert:', errorMsg);
      
      const row = {
        user_id: record.userId,
        user_name: record.userName || null,
        roll_no: record.rollNo || null,
        course: record.course || null,
        date: record.date,
        check_in_time: record.checkInTime || null,
        status: record.status,
        location: record.location || null,
        late_reason: record.lateReason || null,
        late_reason_status: record.lateReasonStatus || 'Pending',
        late_reason_image: record.lateReasonImage || null,
      };

      const { data: directData, error: directError } = await supabase
        .from('attendance')
        .insert(row)
        .select()
        .single();

      if (directError) {
        console.error('[dbService] addAttendance final error:', directError.message);
        throw directError;
      }
      return mapAttendance(directData);
    }
    
    // If successful, we need the full record for the UI
    // The RPC currently returns {id, status}, so we might need to fetch the full record
    // but usually mapAttendance( {id, ...record} ) is enough.
    return { ...record, id: data.id };
  } catch (err) {
    console.error('[dbService] addAttendance exception:', err);
    throw err;
  }
};

export const updateAttendance = async (
  id: string,
  updates: any
): Promise<void> => {
  const row: Record<string, any> = {};
  if (updates.checkOutTime !== undefined) row.check_out_time = updates.checkOutTime;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.location !== undefined) row.location = updates.location;
  if (updates.lateReason !== undefined) row.late_reason = updates.lateReason;
  if (updates.lateReasonStatus !== undefined) row.late_reason_status = updates.lateReasonStatus;
  if (updates.lateReasonReviewedAt !== undefined) row.late_reason_reviewed_at = updates.lateReasonReviewedAt;
  if (updates.lateReasonImage !== undefined) row.late_reason_image = updates.lateReasonImage;

  const { error } = await supabase
    .from('attendance')
    .update(row)
    .eq('id', id);
  if (error) console.error('[dbService] updateAttendance error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE REQUEST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getLeaveRequests = async (userId?: string): Promise<any[]> => {
  let query = supabase
    .from('leave_requests')
    .select('*')
    .order('applied_on', { ascending: false });
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    console.error('[dbService] getLeaveRequests error:', error.message);
    return [];
  }
  return (data || []).map(mapLeaveRequest);
};

export const addLeaveRequest = async (request: any): Promise<any> => {
  const row = {
    user_id: request.userId,
    user_name: request.userName || null,
    roll_no: request.rollNo || null,
    from_date: request.fromDate,
    to_date: request.toDate,
    type: request.type,
    reason: request.reason,
    status: request.status || 'Pending',
    applied_on: request.appliedOn || new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('leave_requests')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[dbService] addLeaveRequest error:', error.message);
    throw error;
  }
  return mapLeaveRequest(data);
};

export const updateLeaveRequestStatus = async (
  id: string,
  status: string
): Promise<void> => {
  const { error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[dbService] updateLeaveRequestStatus error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLES OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getRoles = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');
  if (error) {
    console.error('[dbService] getRoles error:', error.message);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id,
    name: r.name,
    modules: r.modules || [],
  }));
};

export const saveRoles = async (roles: any[]): Promise<void> => {
  const rows = roles.map((r) => ({
    id: r.id,
    name: r.name,
    modules: r.modules || [],
  }));
  const { error } = await supabase
    .from('roles')
    .upsert(rows, { onConflict: 'id' });
  if (error) console.error('[dbService] saveRoles error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const addDocument = async (document: any): Promise<any> => {
  let storageKey: string | null = null;
  let publicUrl: string | null = null;

  // Upload file to Supabase Storage if base64 data URL is provided
  if (document.fileData && document.fileData.startsWith('data:')) {
    try {
      const [meta, base64] = document.fileData.split(',');
      const mimeType = meta.replace('data:', '').replace(';base64', '');
      const byteArray = Uint8Array.from(atob(base64), (c) =>
        c.charCodeAt(0)
      );
      const blob = new Blob([byteArray], { type: mimeType });
      const uploaderId = document.uploaderId || 'unknown';
      const fileName = `${uploaderId}/${Date.now()}_${document.name}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, blob, { contentType: mimeType, upsert: false });

      if (!uploadError) {
        storageKey = fileName;
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7-day URL
        publicUrl = urlData?.signedUrl || null;
      } else {
        console.warn('[dbService] Storage upload failed:', uploadError.message);
      }
    } catch (e) {
      console.warn('[dbService] File upload error:', e);
    }
  }

  const row = {
    name: document.name,
    type: document.type || null,
    size: document.size || null,
    size_bytes: document.sizeBytes || null,
    storage_key: storageKey,
    public_url: publicUrl,
    uploader: document.uploader || null,
    uploader_id: document.uploaderId || null,
  };

  const { data, error } = await supabase
    .from('documents')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[dbService] addDocument error:', error.message);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    size: data.size,
    date: data.created_at,
    uploader: data.uploader,
    storage_key: data.storage_key,
    fileData: publicUrl, // for download compatibility with frontend
  };
};

export const deleteDocument = async (id: string): Promise<void> => {
  // Fetch storage key first so we can remove from bucket
  const { data } = await supabase
    .from('documents')
    .select('storage_key')
    .eq('id', id)
    .single();

  if (data?.storage_key) {
    const { error: storageErr } = await supabase.storage
      .from('documents')
      .remove([data.storage_key]);
    if (storageErr)
      console.warn('[dbService] Storage delete failed:', storageErr.message);
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) {
    console.error('[dbService] deleteDocument error:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE SCHEDULE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getGeofenceSchedules = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('geofence_schedules')
    .select('*')
    .order('created_at');
  if (error) {
    console.error('[dbService] getGeofenceSchedules error:', error.message);
    return [];
  }
  return (data || []).map(mapGeofence);
};

export const addGeofenceSchedule = async (schedule: any): Promise<any> => {
  const row = {
    time: schedule.time,
    days: schedule.days || [],
    lat: parseFloat(schedule.lat),
    lng: parseFloat(schedule.lng),
    radius: parseInt(schedule.radius) || 500,
    is_active: schedule.isActive ?? true,
    auto_activate: schedule.autoActivate ?? true,
    grace_period: schedule.gracePeriod ?? 15,
  };

  const { data, error } = await supabase
    .from('geofence_schedules')
    .insert(row)
    .select()
    .single();

  if (error) {
    console.error('[dbService] addGeofenceSchedule error:', error.message);
    throw error;
  }
  return mapGeofence(data);
};

export const updateGeofenceSchedule = async (
  id: string,
  updates: Partial<any>
): Promise<void> => {
  const row: Record<string, any> = {};
  if (updates.time !== undefined) row.time = updates.time;
  if (updates.days !== undefined) row.days = updates.days;
  if (updates.lat !== undefined) row.lat = parseFloat(updates.lat);
  if (updates.lng !== undefined) row.lng = parseFloat(updates.lng);
  if (updates.radius !== undefined) row.radius = parseInt(updates.radius);
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.autoActivate !== undefined) row.auto_activate = updates.autoActivate;
  if (updates.gracePeriod !== undefined) row.grace_period = updates.gracePeriod;

  const { error } = await supabase
    .from('geofence_schedules')
    .update(row)
    .eq('id', id);
  if (error)
    console.error('[dbService] updateGeofenceSchedule error:', error.message);
};

export const deleteGeofenceSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('geofence_schedules')
    .delete()
    .eq('id', id);
  if (error)
    console.error('[dbService] deleteGeofenceSchedule error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getNotifications = async (userId?: string): Promise<any[]> => {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[dbService] getNotifications error:', error.message);
    return [];
  }
  return (data || []).map(mapNotification);
};

export const markNotificationRead = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) console.error('[dbService] markNotificationRead error:', error.message);
};

export const markAllNotificationsRead = async (userId?: string): Promise<void> => {
  let query = supabase.from('notifications').update({ is_read: true });
  if (userId) {
    query = query.or(`user_id.eq.${userId},user_id.is.null`);
  }
  const { error } = await query;
  if (error)
    console.error('[dbService] markAllNotificationsRead error:', error.message);
};

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

export const getLeaderboard = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .limit(20);
  if (error) {
    console.error('[dbService] getLeaderboard error:', error.message);
    return [];
  }
  return data || [];
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SUMMARY (per-student computed view)
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceSummary = async (userId?: string): Promise<any[]> => {
  let query = supabase.from('attendance_summary').select('*');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    console.error('[dbService] getAttendanceSummary error:', error.message);
    return [];
  }
  return data || [];
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENER (drop-in replacement for Firebase onSnapshot + localStorage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mimics the old Firebase listenToCollection() API.
 * Returns an unsubscribe function to clean up the channel.
 */
export const listenToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  userId?: string
): UnsubFn => {
  const table = resolveTable(collectionName);

  // Helper: attach userId filter when appropriate
  const buildQuery = () => {
    let query = supabase.from(table).select('*');

    if (
      userId &&
      (table === 'attendance' ||
        table === 'leave_requests' ||
        table === 'notifications')
    ) {
      if (table === 'notifications') {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      } else {
        query = query.eq('user_id', userId);
      }
    }

    // Default ordering
    if (table === 'leave_requests' || table === 'notifications') {
      query = (query as any).order(
        table === 'notifications' ? 'created_at' : 'applied_on',
        { ascending: false }
      );
    } else if (table === 'attendance') {
      query = (query as any).order('date', { ascending: false });
    }

    return query;
  };

  // Initial data load
  const fetchAndCallback = async () => {
    const { data } = await buildQuery();
    if (data) callback(data.map((row) => mapRow(table, row)));
  };

  fetchAndCallback();

  // Set up realtime channel with unique name to avoid conflicts
  const channelName = `listen-${table}-${userId || 'all'}-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      {
        event: '*',
        schema: 'public',
        table,
        // Remove server-side filter as it can be perfectly reliable depending on table state
        // filter: userId && table !== 'notifications' ? `user_id=eq.${userId}` : undefined
      },
      (payload: any) => {
        console.log(`[dbService] Realtime update on ${table} for ${userId}:`, payload.eventType);
        
        // If we have a userId and it's not a notification, verify the update belongs to this user
        if (userId && payload.new && payload.new.user_id !== userId) {
          return;
        }

        // Re-fetch all data on relevant changes
        fetchAndCallback();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[dbService] Subscribed to realtime updates for ${table}`);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};

// ─── MENTOR OPERATIONS ────────────────────────────────────────────────────────
export const getMentors = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase.rpc('fetch_mentors_list');
    
    if (error) {
      console.warn('[dbService] getMentors RPC error, trying direct table:', error.message);
      const { data: tableData, error: tableError } = await supabase
        .from('mentors')
        .select('*')
        .order('name');
      
      if (tableError) {
        console.error('[dbService] getMentors table error:', tableError.message);
        return [
          { id: 'm1', name: 'Dr. Sarah Wilson', phone: '+919876543210' },
          { id: 'm2', name: 'Prof. James Chen', phone: '+919876543211' },
        ];
      }
      return (tableData || []).map(mapMentor);
    }
    return (data || []).map(mapMentor);
  } catch (err) {
    console.error('[dbService] getMentors exception:', err);
    return [
      { id: 'm1', name: 'Dr. Sarah Wilson', phone: '+919876543210' },
      { id: 'm2', name: 'Prof. James Chen', phone: '+919876543211' },
    ];
  }
};

export const saveMentor = async (mentor: any): Promise<void> => {
  const row: Record<string, any> = {
    name: mentor.name,
    phone: mentor.phone,
  };
  if (mentor.id) row.id = mentor.id;

  const { error } = await supabase
    .from('mentors')
    .upsert(row);
  if (error) console.error('[dbService] saveMentor error:', error.message);
};

export const deleteMentor = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('mentors')
    .delete()
    .eq('id', id);
  if (error) console.error('[dbService] deleteMentor error:', error.message);
};

