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
 * Table: public.attendance_windows
 * Table: public.notifications
 */

import { supabase } from '../lib/supabase';
import { localDb } from './OfflineDatabase';
import { syncService } from './SyncService';
import { checkCacheVersion } from '../utils/cacheManager';

// ─── TYPE DEFINITIONS ──────────────────────────────────────────────────────────

type UnsubFn = () => void;

// ─── FIELD MAPPERS (DB snake_case → Frontend camelCase) ────────────────────────

export function mapProfile(row: any) {
  if (!row) return null;
  const isOnboarded = row.role === 'admin' || !!(row.phone) || !!(row.roll_no) || !!(row.profile_completed);
  return {
    id: row.id,
    uid: row.id || row.uid,
    name: row.name || row.full_name || row.display_name || '',
    email: row.email || row.user_email || '',
    photoURL: row.photo_url || row.avatar_url || '',
    role: row.role || 'student',
    rollNo: row.roll_no || row.roll_number || row.student_id || '',
    course: row.course || row.department || '',
    phone: row.phone || row.mobile || '',
    gender: row.gender || '',
    bloodGroup: row.blood_group || '',
    status: row.status || 'Active',
    attendance: row.attendance_pct != null ? `${Math.round(row.attendance_pct)}%` : '0%',
    attendance_pct: row.attendance_pct ?? 0,
    roleId: row.role_id || null,
    mentorId: row.mentor_id || null,
    mentors: row.mentors || null,
    onboarded: isOnboarded,
    profileCompleted: row.profile_completed || false,
    isAwardWinner: row.is_award_winner || false,
    createdAt: row.created_at || row.joined_at,
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
    date: row.date || row.created_at?.split('T')[0],
    checkInTime: row.check_in_time || row.time || row.check_in || (row.created_at ? new Date(row.created_at).toLocaleTimeString() : ''),
    checkOutTime: row.check_out_time || row.check_out || row.end_time,
    status: row.status || 'Present',
    location: row.location || row.address || (row.location_lat ? `${row.location_lat},${row.location_lng}` : ''),
    locationName: row.location_name || row.location || 'Campus',
    lateReason: row.late_reason || row.reason || '',
    lateReasonStatus: row.late_reason_status || 'Pending',
    lateReasonReviewedAt: row.late_reason_reviewed_at || null,
    lateReasonImage: row.late_reason_image || null,
    userPhoto: row.profiles?.photo_url || row.user_photo || '',
    checkoutReason: row.checkout_reason || null,
    rejoins: row.rejoins || [],
  };
}

export function mapLeaveRequest(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || '',
    rollNo: row.roll_no || '',
    fromDate: row.from_date || row.start_date,
    toDate: row.to_date || row.end_date,
    type: row.type,
    reason: row.reason,
    status: row.status,
    appliedOn: row.applied_on || row.created_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    userPhoto: row.profiles?.photo_url || row.user_photo || '',
  };
}

export function mapGeofence(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    locationName: row.location_name || '',
    time: row.time ? row.time.substring(0, 5) : '',
    endTime: row.end_time ? row.end_time.substring(0, 5) : '',
    days: row.days || [],
    lat: String(row.lat),
    lng: String(row.lng),
    radius: String(row.radius),
    isActive: row.is_active,
    autoActivate: row.auto_activate,
    gracePeriod: row.grace_period || 15,
    // Server-side timestamp — used as the authoritative session open time
    // for the student grace-period countdown.
    updatedAt: row.updated_at || null,
  };
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

export function mapNotification(n: any) {
  if (!n) return null;
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    message: n.message,
    unread: !n.is_read,
    isImportant: !!n.is_important,
    time: formatRelativeTime(n.created_at),
    data: n.data || null,
    senderId: n.sender_id,
  };
}

export function isScheduleActive(s: any, nowOverride?: Date): boolean {
  if (!s) return false;
  // 1. Manual Global Override Row
  if (!s.isActive) return false;

  // Check Time Range if specified (for both manual and auto)
  if (s.endTime || s.time) {
    const now = (nowOverride instanceof Date) ? nowOverride : new Date();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    
    // Day check (only for auto schedules with days array)
    if (s.autoActivate && s.days?.length && !s.days.includes(currentDay)) {
      return false;
    }

    const [h, m] = (s.time || '00:00').split(':').map(Number);
    const [eh, em] = (s.endTime || '23:59').split(':').map(Number);

    // Precise comparison using seconds
    const startTotal = h * 3600 + m * 60;
    const endTotal = eh * 3600 + em * 60;
    const nowTotal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    if (endTotal < startTotal) {
      // Spans midnight: active if now is after start OR before end
      if (nowTotal < startTotal && nowTotal > endTotal) return false;
    } else {
      // Normal range: active if now is between start and end
      if (nowTotal < startTotal || nowTotal > endTotal) return false;
    }
  }

  // 2. Auto-Activation Location Check
  if (s.autoActivate) {
    const lat = parseFloat(s.lat), lng = parseFloat(s.lng), r = parseFloat(s.radius);
    return !isNaN(lat) && !isNaN(lng) && !isNaN(r) && r > 0;
  }

  return true;
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
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
    case 'documents': return {
      id: row.id,
      name: row.name,
      type: row.type,
      size: row.size,
      date: row.created_at || row.upload_date,
      uploader: row.uploader,
      storage_key: row.storage_key,
      fileData: row.public_url || row.url,
      revisions: row.revisions || []
    };
    default: return row;
  }
}



// ─── TABLE RESOLVER ─────────────────────────────────────────────────────────────

function resolveTable(collectionName: string): string {
  const tableMap: Record<string, string> = {
    users: 'profiles',
    attendance: 'attendance',
    leaveRequests: 'leave_requests',
    roles: 'roles',
    documents: 'documents',
    notifications: 'notifications',
    mentors: 'mentors',
    geofence_schedules: 'geofence_schedules',
    app_settings: 'system_configuration',
    subscribers: 'subscribers',
  };
  return tableMap[collectionName] || collectionName;
}

// ─────────────────────────────────────────────────────────────────────────────
// USER / PROFILE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getUsers = async (): Promise<any[]> => {
  // 1. Return local data first for instant UI
  const localData = await localDb.profiles.toArray();
  
  // 2. Fetch from network in background
  supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (!error && data) {
        // Update local cache
        const mapped = data.map(mapProfile);
        localDb.profiles.bulkPut(mapped);
      }
    });

  return localData.length > 0 ? localData : [];
};

export const getUserById = async (id: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[dbService] getUserById error:', error.message);
      throw error;
    }

    return data ? mapProfile(data) : null;
  } catch (err) {
    console.error('[dbService] getUserById failed:', err instanceof Error ? err.message : err);
    return null;
  }
};

export const saveUser = async (user: any): Promise<boolean> => {
  try {
    const userId = user.uid || user.id;
    if (!userId) return false;

    const mapped = {
      ...user,
      id: userId,
      updatedAt: new Date().toISOString()
    };

    // 1. Update local DB immediately
    await localDb.profiles.put(mapped);

    // 2. Queue for sync
    const dbRow: Record<string, any> = {
      id: userId,
      name: user.name || '',
      email: user.email || '',
      updated_at: new Date().toISOString(),
    };
    if (user.photoURL !== undefined) dbRow.photo_url = user.photoURL;
    if (user.role !== undefined) dbRow.role = user.role;
    if (user.rollNo !== undefined) dbRow.roll_no = user.rollNo;
    if (user.course !== undefined) dbRow.course = user.course;
    if (user.phone !== undefined) dbRow.phone = user.phone;
    if (user.gender !== undefined) dbRow.gender = user.gender;
    if (user.bloodGroup !== undefined) dbRow.blood_group = user.bloodGroup;
    if (user.status !== undefined) dbRow.status = user.status;
    if (user.mentorId !== undefined) dbRow.mentor_id = user.mentorId || null;
    if (user.profileCompleted !== undefined) dbRow.profile_completed = user.profileCompleted;

    await syncService.queueAction({
      table: 'profiles',
      action: 'INSERT', // Upsert is handled by INSERT in our SyncService logic or Supabase triggers
      data: dbRow
    });

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

export const updateProfile = async (userId: string, updates: Record<string, any>): Promise<boolean> => {
  try {
    if (!userId) return false;

    // 1. Map camelCase to snake_case and STRIP protected fields
    const { id, created_at, updated_at, ...rawUpdates } = updates;
    const dbUpdates: Record<string, any> = { ...rawUpdates };

    if (updates.photoURL !== undefined) {
      dbUpdates.photo_url = updates.photoURL;
      delete dbUpdates.photoURL;
    }
    if (updates.rollNo !== undefined) {
      dbUpdates.roll_no = updates.rollNo;
      delete dbUpdates.rollNo;
    }
    if (updates.mentorId !== undefined) {
      dbUpdates.mentor_id = updates.mentorId;
      delete dbUpdates.mentorId;
    }
    if (updates.profileCompleted !== undefined) {
      dbUpdates.profile_completed = updates.profileCompleted;
      delete dbUpdates.profileCompleted;
    }

    // 2. Update Supabase
    const { error } = await supabase
      .from('profiles')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('[dbService] updateProfile Supabase Error:', error);
      throw error;
    }

    // 3. Update Local Cache
    const existing = await localDb.profiles.get(userId);
    if (existing) {
      await localDb.profiles.put({
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }

    return true;
  } catch (err) {
    console.error('[dbService] updateProfile Exception:', err);
    return false;
  }
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
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.gender !== undefined) row.gender = updates.gender;
  if (updates.photoURL !== undefined) row.photo_url = updates.photoURL;
  if (updates.status !== undefined) row.status = updates.status;

  const { error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId);
  if (error) console.error('[dbService] updateUserProfile error:', error.message);
};

export const deleteUser = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('[dbService] deleteUser error:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendance = async (userId?: string): Promise<any[]> => {
  // 1. Return local data first
  let localData = userId 
    ? await localDb.attendance.where('user_id').equals(userId).reverse().sortBy('date')
    : await localDb.attendance.reverse().sortBy('date');

  // 2. Background sync from network
  let query = supabase
    .from('attendance')
    .select('*, profiles(photo_url)')
    .order('date', { ascending: false });
  if (userId) query = query.eq('user_id', userId);

  query.then(({ data, error }) => {
    if (!error && data) {
      const mapped = data.map(mapAttendance);
      localDb.attendance.bulkPut(mapped);
    }
  });

  return localData;
};

export const addAttendance = async (record: any): Promise<any> => {
  try {
    const combinedLocation = record.location || (record.locationName ? `${record.locationName}${record.locationCoords ? ` | ${record.locationCoords}` : ''}` : null);
    
    // Generate a temporary ID for local storage if one doesn't exist
    const tempId = record.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const mappedRecord = { ...record, id: tempId, location: combinedLocation };

    // 1. Save to local DB immediately
    await localDb.attendance.put(mappedRecord);

    // 2. Queue for server sync via RPC
    const params = {
      p_user_id: record.userId,
      p_user_name: record.userName || null,
      p_roll_no: record.rollNo || null,
      p_course: record.course || null,
      p_date: record.date,
      p_check_in: record.checkInTime || null,
      p_status: record.status,
      p_location: combinedLocation,
      p_late_reason: record.lateReason || null,
      p_late_reason_image: record.lateReasonImage || null,
      p_rejoin_reason: record.rejoinReason || null
    };

    await syncService.queueAction({
      table: 'attendance',
      action: 'RPC',
      rpcMethod: 'record_attendance',
      data: params
    });

    return mappedRecord;
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
  
  if (updates.location !== undefined) {
    row.location = updates.location;
  } else if (updates.locationName !== undefined) {
    row.location = updates.locationName + (updates.locationCoords ? ` | ${updates.locationCoords}` : '');
  }
  
  if (updates.lateReason !== undefined) row.late_reason = updates.lateReason;
  if (updates.lateReasonStatus !== undefined) row.late_reason_status = updates.lateReasonStatus;
  if (updates.lateReasonImage !== undefined) row.late_reason_image = updates.lateReasonImage;
  if (updates.checkoutReason !== undefined) row.checkout_reason = updates.checkoutReason;

  if (Object.keys(row).length === 0) return; // nothing to update

  const { data, error } = await supabase
    .from('attendance')
    .update(row)
    .eq('id', id)
    .select('user_id, status, user_name, course')
    .single();

  if (error) {
    console.error('[dbService] updateAttendance error:', error.message);
    throw error;
  }

  // ── Automated Trigger: Late Reason Status Update ──
  if (updates.lateReasonStatus && data) {
    try {
      await addNotification({
        userId: data.user_id,
        type: updates.lateReasonStatus === 'Approved' ? 'success' : 'alert',
        title: `Late Reason ${updates.lateReasonStatus}`,
        message: `Your late reason for ${data.course || 'session'} has been ${updates.lateReasonStatus.toLowerCase()}.`,
        data: { attendanceId: id }
      });
    } catch (e) {
      console.warn('[dbService] Automated late reason notification failed:', e);
    }
  }
};

export const bulkMarkAttendance = async (records: any[]): Promise<void> => {
  const rows = records.map(r => ({
    user_id: r.userId,
    user_name: r.userName || null,
    roll_no: r.rollNo || null,
    course: r.course || null,
    date: r.date,
    status: r.status,
    check_in_time: r.checkInTime || new Date().toISOString(),
    location: r.location || null,
    location_name: r.locationName || null
  }));

  const { error } = await supabase.from('attendance').insert(rows);
  if (error) {
    console.error('[dbService] bulkMarkAttendance error:', error.message);
    throw error;
  }

  // ── Automated Trigger: Bulk Notifications ──
  try {
    const notifications = records.map(r => ({
      user_id: r.userId,
      type: 'success',
      title: 'Attendance Marked (Bulk)',
      message: `Your attendance for ${r.course || 'the session'} on ${r.date} has been marked as ${r.status} by Admin.`,
      is_read: false,
      created_at: new Date().toISOString()
    }));
    await supabase.from('notifications').insert(notifications);
  } catch (e) {
    console.warn('[dbService] Bulk attendance notifications failed:', e);
  }
};

/**
 * Marks all students who checked in today but haven't checked out yet as checked out.
 * Usually called when the admin manually closes the attendance window.
 */
export const markBulkCheckOut = async (checkoutTime?: string): Promise<void> => {
  try {
    const now = new Date();
    const time = checkoutTime || now.toISOString();
    
    // Closing ALL active sessions...

    const { data: records, error: fetchError } = await supabase
      .from('attendance')
      .select('id, user_id, user_name, course')
      .is('check_out_time', null);

    if (fetchError) {
      console.error('[dbService] markBulkCheckOut fetch error');
      throw fetchError;
    }

    if (!records || records.length === 0) {
      return;
    }

    const ids = records.map(r => r.id);

    const { error: updateError } = await supabase
      .from('attendance')
      .update({ check_out_time: time })
      .in('id', ids);

    if (updateError) {
      console.error('[dbService] markBulkCheckOut update error');
      throw updateError;
    }

    // Send notifications
    try {
      const notifications = records.map(r => ({
        user_id: r.user_id,
        type: 'info',
        title: 'Check-out Marked',
        message: `Your session for ${r.course || 'the class'} has ended. You have been checked out automatically.`,
        is_read: false,
        created_at: new Date().toISOString()
      }));
      await supabase.from('notifications').insert(notifications);
    } catch (e) {
      console.warn('[dbService] Bulk check-out notifications failed:', e);
    }
  } catch (err: any) {
    console.error('[dbService] markBulkCheckOut exception:', err.message);
    throw err;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEAVE REQUEST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getLeaveRequests = async (userId?: string): Promise<any[]> => {
  let query = supabase
    .from('leave_requests')
    .select('*, profiles(photo_url)')
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
  const tempId = request.id || `lr-temp-${Date.now()}`;
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

  // We don't await the insert here for the return value, we return the mapped row with tempId
  // The actual insert happens, and Realtime will replace the temp row with the real one.
  supabase
    .from('leave_requests')
    .insert(row)
    .select()
    .single()
    .then(({ data, error }) => {
      if (error) console.error('[dbService] addLeaveRequest async error:', error.message);
    });

  return mapLeaveRequest({ ...row, id: tempId });
};

export const updateLeaveRequestStatus = async (
  id: string,
  status: string
): Promise<void> => {
  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .select('user_id, type')
    .single();

  if (error) {
    console.error('[dbService] updateLeaveRequestStatus error:', error.message);
    return;
  }

  // ── Automated Trigger: Leave Request Update ──
  if (data) {
    try {
      await addNotification({
        userId: data.user_id,
        type: status === 'Approved' ? 'success' : 'alert',
        title: `Leave Request ${status}`,
        message: `Your ${data.type || 'leave'} request has been ${status.toLowerCase()}.`,
        data: { requestId: id }
      });
    } catch (e) {
      console.warn('[dbService] Automated leave notification failed:', e);
    }
  }
};

export const bulkUpdateLeaveRequestStatus = async (
  ids: string[],
  status: string
): Promise<void> => {
  if (!ids.length) return;

  const { data: records, error: fetchError } = await supabase
    .from('leave_requests')
    .select('id, user_id, type')
    .in('id', ids);

  if (fetchError) {
    console.error('[dbService] bulkUpdateLeaveRequestStatus fetch error:', fetchError.message);
    throw fetchError;
  }

  const { error: updateError } = await supabase
    .from('leave_requests')
    .update({ status, reviewed_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) {
    console.error('[dbService] bulkUpdateLeaveRequestStatus update error:', updateError.message);
    throw updateError;
  }

  // Bulk notifications
  if (records && records.length > 0) {
    const notifications = records.map(r => ({
      user_id: r.user_id,
      type: status === 'Approved' ? 'success' : 'alert',
      title: `Leave Request ${status}`,
      message: `Your ${r.type || 'leave'} request has been ${status.toLowerCase()} in a bulk action.`,
      is_read: false,
      created_at: new Date().toISOString(),
      data: { requestId: r.id }
    }));
    await supabase.from('notifications').insert(notifications);
  }
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

export const addDocument = async (document: any, file?: File | Blob): Promise<any> => {
  let storageKey: string | null = null;
  let publicUrl: string | null = null;

  // Use direct file upload if provided (much faster than base64)
  if (file) {
    try {
      const uploaderId = document.uploaderId || 'unknown';
      const fileName = `${uploaderId}/${Date.now()}_${document.name}`;
      const mimeType = file.type || 'application/octet-stream';

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { contentType: mimeType, upsert: false });

      if (!uploadError) {
        storageKey = fileName;
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        publicUrl = urlData?.publicUrl || null;
      } else {
        console.warn('[dbService] Storage upload failed:', uploadError.message);
      }
    } catch (e) {
      console.warn('[dbService] File upload error:', e);
    }
  } else if (document.fileData && document.fileData.startsWith('data:')) {
    // Legacy / Fallback for base64
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
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        publicUrl = urlData?.publicUrl || null;
      }
    } catch (e) {
      console.warn('[dbService] Base64 upload error:', e);
    }
  }

  // Handle Versioning / Replacement
  if (document.isReplacement && document.originalId) {
    const { data: existing } = await supabase.from('documents').select('*').eq('id', document.originalId).single();
    if (existing) {
      const currentVersion = {
        name: existing.name,
        type: existing.type,
        size: existing.size,
        date: existing.created_at,
        uploader: existing.uploader,
        storage_key: existing.storage_key,
        fileData: existing.public_url
      };
      const newRevisions = [currentVersion, ...(existing.revisions || [])];
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          name: document.name,
          type: document.type || null,
          size: document.size || null,
          size_bytes: document.size_bytes || document.sizeBytes || null,
          storage_key: storageKey || existing.storage_key,
          public_url: publicUrl || existing.public_url,
          uploader: document.uploader || null,
          uploader_id: document.uploaderId || null,
          revisions: newRevisions,
          created_at: new Date().toISOString()
        })
        .eq('id', document.originalId);

      if (updateError) throw updateError;
      return { id: document.originalId, date: new Date().toISOString() };
    }
  }

  // Normal Insert
  const row = {
    name: document.name,
    type: document.type || null,
    size: document.size || null,
    size_bytes: document.size_bytes || document.sizeBytes || null,
    storage_key: storageKey,
    public_url: publicUrl,
    uploader: document.uploader || null,
    uploader_id: document.uploaderId || null,
    revisions: []
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

  return mapRow('documents', data);
};

export const deleteDocument = async (id: string): Promise<void> => {
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

export const removeDocumentRevision = async (docId: string, revisionIndex: number): Promise<void> => {
  const { data: existing } = await supabase
    .from('documents')
    .select('revisions')
    .eq('id', docId)
    .single();

  if (!existing || !existing.revisions) return;

  const newRevisions = [...existing.revisions];
  const removedRev = newRevisions.splice(revisionIndex, 1)[0];

  // Optional: Delete from storage if storage_key exists
  if (removedRev?.storage_key) {
    await supabase.storage.from('documents').remove([removedRev.storage_key]);
  }

  const { data, error } = await supabase
    .from('documents')
    .update({ revisions: newRevisions })
    .eq('id', docId)
    .select()
    .single();

  if (error) {
    console.error('[dbService] removeDocumentRevision error:', error.message);
    throw error;
  }
  return mapRow('documents', data);
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
    end_time: schedule.endTime || '17:00:00',
    days: schedule.days || [],
    lat: parseFloat(schedule.lat),
    lng: parseFloat(schedule.lng),
    radius: parseInt(schedule.radius) || 500,
    is_active: schedule.isActive ?? true,
    auto_activate: schedule.autoActivate ?? true,
    location_name: schedule.locationName || '',
    grace_period: schedule.gracePeriod || 15
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
  if (updates.endTime !== undefined) row.end_time = updates.endTime;
  if (updates.days !== undefined) row.days = updates.days;
  if (updates.lat !== undefined) row.lat = parseFloat(updates.lat);
  if (updates.lng !== undefined) row.lng = parseFloat(updates.lng);
  if (updates.radius !== undefined) row.radius = parseInt(updates.radius);
  if (typeof updates.isActive === 'boolean') row.is_active = updates.isActive;
  if (typeof updates.autoActivate === 'boolean') row.auto_activate = updates.autoActivate;
  if (updates.locationName !== undefined) row.location_name = updates.locationName;
  if (updates.gracePeriod !== undefined) row.grace_period = updates.gracePeriod;

  const { error } = await supabase
    .from('geofence_schedules')
    .update(row)
    .eq('id', id);
  if (error)
    console.error('[dbService] updateGeofenceSchedule error:', error.message);
};

export const bulkUpdateGeofenceSchedules = async (
  ids: string[],
  updates: Partial<any>
): Promise<void> => {
  if (!ids.length) return;
  const row: Record<string, any> = {};
  if (typeof updates.isActive === 'boolean') row.is_active = updates.isActive;
  if (typeof updates.autoActivate === 'boolean') row.auto_activate = updates.autoActivate;

  const { error } = await supabase
    .from('geofence_schedules')
    .update(row)
    .in('id', ids);
  if (error)
    console.error('[dbService] bulkUpdateGeofenceSchedules error:', error.message);
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
// MANUAL ATTENDANCE WINDOW (Admin quick-toggle from Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * We use a TEXT primary key sentinel via a special row where
 *   lat  = 0, lng = 0, radius = -999
 * That combination is never created by the UI (radius slider min=1, grace=0-120)
 * so it uniquely identifies the manual-override row.
 */
const MANUAL_OVERRIDE_SENTINEL = { lat: 0, lng: 0, radius: -999 };

export const toggleManualAttendanceWindow = async (
  active: boolean,
  lat: number = 0,
  lng: number = 0,
  radius: number = -999,
  locationName: string = 'Manual Selection',
  gracePeriod: number = 15,
  endTime?: string
): Promise<any> => {
  try {
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    

    const { data, error } = await supabase
      .from('geofence_schedules')
      .update({
        is_active: active,
        lat: String(lat),
        lng: String(lng),
        radius: radius,
        location_name: locationName,
        grace_period: gracePeriod,
        end_time: endTime || '23:59',
        time: currentTimeStr
      })
      .eq('auto_activate', false)
      .select();

    if (error) {
      console.error('[dbService] Update error:', error.message);
      throw error;
    }

    if (active) {
      // Manual window ACTIVATED
    } else {
      // Manual window CLOSED
      try {
        await markBulkCheckOut();
      } catch (e) {
        console.warn('[dbService] Automated bulk check-out failed:', e);
      }
    }

    if (!data || data.length === 0) {
      console.log('[dbService] No manual record found, inserting new sentinel...');
      const { data: insData, error: insError } = await supabase
        .from('geofence_schedules')
        .insert({
          lat: String(lat),
          lng: String(lng),
          radius: radius,
          is_active: active,
          time: '00:00',
          end_time: endTime || '23:59',
          days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          auto_activate: false,
          location_name: locationName,
          grace_period: gracePeriod
        })
        .select();
      if (insError) {
        console.error('[dbService] toggleManualAttendanceWindow insert error:', insError.message);
        throw insError;
      }
      return insData?.[0];
    }
    return data?.[0];
  } catch (err: any) {
    console.error('[dbService] toggleManualAttendanceWindow failed:', err.message);
    throw err;
  }
};

/** Returns true if the admin has manually activated the window. */
export const getManualWindowStatus = async (): Promise<boolean> => {
  const { data } = await supabase
    .from('geofence_schedules')
    .select('*')
    .eq('auto_activate', false)
    .maybeSingle();
  
  if (!data) return false;
  return isScheduleActive(mapGeofence(data));
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

// ── Notification Deduplication Cache ──
const notificationCache = new Map<string, number>();
const CLEANUP_INTERVAL = 30000; // 30 seconds

export const addNotification = async (notification: any): Promise<void> => {
  const userId = notification.userId || 'broadcast';
  const cacheKey = `${userId}-${notification.type || 'info'}-${notification.title}`;
  const now = Date.now();

  // 1. In-Memory Guard: Prevent exact same notification within 30s (UI double-clicks, rapid GPS bounces)
  const lastSent = notificationCache.get(cacheKey);
  if (lastSent && now - lastSent < CLEANUP_INTERVAL && !notification.allowDuplicates) {
    console.log('[dbService] Blocking rapid-fire duplicate notification:', notification.title);
    return;
  }

  // 2. Database Guard: Prevent "Daily" duplicates (e.g., Attendance marked twice)
  if (notification.type === 'success' || notification.type === 'attendance') {
    try {
      const today = new Date().toISOString().split('T')[0];
      let query = supabase
        .from('notifications')
        .select('id')
        .eq('title', notification.title)
        .gte('created_at', today);

      if (notification.userId) {
        query = query.eq('user_id', notification.userId);
      } else {
        query = query.is('user_id', null);
      }

      const { data: existing, error: checkError } = await query.limit(1);

      if (!checkError && existing && existing.length > 0 && !notification.allowDuplicates) {
        console.log('[dbService] Skipping daily duplicate notification:', notification.title);
        return;
      }
    } catch (e) {
      console.warn('[dbService] Deduplication check failed, proceeding anyway:', e);
    }
  }

  const row = {
    user_id: notification.userId || null,
    type: notification.type || 'info',
    title: notification.title,
    message: notification.message,
    sender_id: notification.senderId || notification.sender_id || null,
    is_read: false,
    created_at: new Date().toISOString()
  };

  const { error } = await supabase.from('notifications').insert(row);
  if (error) {
    console.error('[dbService] addNotification error:', error.message);
    throw error;
  }

  // Update cache
  notificationCache.set(cacheKey, now);
};

export const broadcastNotification = async (notification: { title: string, message: string, type?: string, sender_id?: string }): Promise<void> => {
  await addNotification({
    userId: null, // This triggers broadcast logic in listenToCollection
    type: notification.type || 'announcement',
    title: notification.title,
    message: notification.message,
    senderId: notification.sender_id,
    data: { isBroadcast: true }
  });
};

export const toggleNotificationImportant = async (id: string, current: boolean): Promise<void> => {
  // Update local
  await localDb.notifications.update(id, { isImportant: !current });
  
  // Sync server
  const { error } = await supabase
    .from('notifications')
    .update({ is_important: !current })
    .eq('id', id);
  if (error) console.error('[dbService] toggleNotificationImportant error:', error.message);
};

export const deleteNotification = async (id: string): Promise<void> => {
  // Update local
  await localDb.notifications.delete(id);
  
  // Sync server
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  if (error) console.error('[dbService] deleteNotification error:', error.message);
};

export const bulkAddNotifications = async (notifications: any[]): Promise<void> => {
  if (!notifications.length) return;

  // Pre-filter duplicates from this batch itself (if any)
  const uniqueInBatch = notifications.reduce((acc, current) => {
    const key = `${current.userId}-${current.title}`;
    if (!acc.has(key)) acc.set(key, current);
    return acc;
  }, new Map()).values();

  const filteredNotifications = Array.from(uniqueInBatch);

  const rows = filteredNotifications.map(n => ({
    user_id: n.userId || null,
    type: n.type || 'info',
    title: n.title,
    message: n.message,
    sender_id: n.senderId || n.sender_id || null,
    data: n.data || null,
    is_read: false,
    created_at: new Date().toISOString()
  }));
  const { error } = await supabase.from('notifications').insert(rows);
  if (error) {
    console.error('[dbService] bulkAddNotifications error:', error.message);
    throw error;
  }
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
    .select('*, photo_url')
    .order('score', { ascending: false })
    .order('attendance_pct', { ascending: false })
    .order('name', { ascending: true })
    .limit(50);

  if (error) {
    console.error('[dbService] getLeaderboard error:', error.message);
    return [];
  }

  return (data || []).map((entry, index) => ({
    ...entry,
    rank: entry.rank || index + 1
  }));
};

export const getStudentLeaderboardStats = async (userId: string): Promise<any> => {
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[dbService] getStudentLeaderboardStats error:', error.message);
    return null;
  }
  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENER — Offline-First Optimized
// ─────────────────────────────────────────────────────────────────────────────

export const listenToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  userId?: string
): UnsubFn => {
  const table = resolveTable(collectionName);
  const dexieTable = localDb[table as keyof typeof localDb] as any;

  const buildQuery = () => {
    let selectStr = '*';
    if (table === 'attendance' || table === 'leave_requests') {
      selectStr = '*, profiles(photo_url)';
    } else if (table === 'profiles' || table === 'users') {
      selectStr = '*, mentors(name)';
    }
    let query = supabase.from(table).select(selectStr);

    if (userId && (table === 'attendance' || table === 'leave_requests')) {
      query = query.eq('user_id', userId);
    }
    if (userId && table === 'notifications') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    if (table === 'leave_requests') query = (query as any).order('applied_on', { ascending: false });
    else if (table === 'notifications') query = (query as any).order('created_at', { ascending: false });
    else if (table === 'attendance') query = (query as any).order('date', { ascending: false });
    else if (table === 'profiles') query = (query as any).order('created_at', { ascending: true });
    else if (table === 'documents') query = (query as any).order('created_at', { ascending: false });

    return query;
  };

  const loadLocal = async () => {
    if (!dexieTable) return;
    try {
      let data;
      if (userId && (table === 'attendance' || table === 'leave_requests' || table === 'notifications')) {
        data = await dexieTable.where('user_id').equals(userId).toArray();
      } else {
        data = await dexieTable.toArray();
      }
      if (data && data.length > 0) callback(data);
    } catch (e) {
      console.warn('[dbService] Local load failed:', e);
    }
  };

  const fetchAndSync = async () => {
    try {
      const { data, error } = await buildQuery();
      if (error) throw error;
      if (data) {
        const mapped = data.map(row => mapRow(table, row));
        if (dexieTable) {
          await dexieTable.bulkPut(mapped);
        }
        callback(mapped);
      }
    } catch (e) {
      // Fetch/Sync failed
    }
  };

  loadLocal();
  fetchAndSync();

  const channelId = Math.random().toString(36).substring(2, 10);
  const channel = supabase
    .channel(`rt-${table}-${userId ?? 'all'}-${channelId}`)
    .on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => fetchAndSync())
    .subscribe();

  const intervalId = setInterval(fetchAndSync, 15000);

  return () => {
    clearInterval(intervalId);
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
        return [];
      }
      return (tableData || []).map(mapMentor);
    }
    return (data || []).map(mapMentor);
  } catch (err) {
    console.error('[dbService] getMentors exception:', err);
    return [];
  }
};

export const saveMentor = async (mentor: any): Promise<boolean> => {
  try {
    const row: Record<string, any> = {
      name: mentor.name,
      phone: mentor.phone,
    };
    if (mentor.id) row.id = mentor.id;

    const { error } = await supabase
      .from('mentors')
      .upsert(row);
    if (error) {
      console.error('[dbService] saveMentor error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[dbService] saveMentor exception:', err);
    return false;
  }
};

export const deleteMentor = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('mentors')
    .delete()
    .eq('id', id);
  if (error) console.error('[dbService] deleteMentor error:', error.message);
};
export const clearDatabase = async (): Promise<boolean> => {
  try {
    // 1. Delete all attendance records
    await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. Delete all leave requests
    await supabase.from('leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 3. Delete all documents and clear storage
    const { data: docs } = await supabase.from('documents').select('storage_key');
    if (docs && docs.length > 0) {
      const keys = docs.map(d => d.storage_key).filter(Boolean);
      if (keys.length > 0) {
        await supabase.storage.from('documents').remove(keys);
      }
    }
    await supabase.from('documents').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 4. Delete all notifications
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 5. Reset all profiles' attendance percentages and mentor associations
    await supabase.from('profiles').update({
      attendance_pct: 0,
      mentor_id: null
    }).neq('id', '00000000-0000-0000-0000-000000000000');

    // 6. Delete all mentors
    await supabase.from('mentors').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 7. Delete all student users (keep admins)
    await supabase.from('profiles').delete().eq('role', 'student');

    return true;
  } catch (err) {
    console.error('[dbService] clearDatabase error:', err instanceof Error ? err.message : err);
    return false;
  }
};
// ─── ATTENDANCE SUMMARY ──────────────────────────────────────────────────────

export const getAttendanceSummary = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('attendance')
    .select('user_id, status');

  if (error) {
    console.error('[dbService] getAttendanceSummary error:', error.message);
    return [];
  }

  // Group by user_id
  const stats: Record<string, { total: number; present: number }> = {};
  data.forEach(record => {
    if (!stats[record.user_id]) {
      stats[record.user_id] = { total: 0, present: 0 };
    }
    stats[record.user_id].total++;
    if (['Present', 'Late', 'Half Day'].includes(record.status)) {
      stats[record.user_id].present++;
    }
  });

  return Object.entries(stats).map(([user_id, s]) => ({
    user_id,
    attendance_pct: (s.present / s.total) * 100
  }));
};

export const getMonthlyLeaderboard = async (): Promise<any[]> => {
  const now = new Date();
  // Calculate start and end of PREVIOUS month
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('attendance')
    .select('user_id, status, check_in_time')
    .gte('date', startOfPrevMonth)
    .lte('date', endOfPrevMonth);

  if (error) {
    console.error('[dbService] getMonthlyLeaderboard error:', error.message);
    return [];
  }

  const stats: Record<string, { total: number; present: number; late: number; punctuality: number[] }> = {};
  data.forEach(record => {
    if (!stats[record.user_id]) {
      stats[record.user_id] = { total: 0, present: 0, late: 0, punctuality: [] };
    }
    stats[record.user_id].total++;
    if (record.status === 'Present') stats[record.user_id].present++;
    if (record.status === 'Late') {
      stats[record.user_id].present++;
      stats[record.user_id].late++;
    }

    if (record.check_in_time) {
      const [h, m] = record.check_in_time.split(':').map(Number);
      stats[record.user_id].punctuality.push(h * 60 + m);
    }
  });

  return Object.entries(stats)
    .filter(([_, s]) => s.total >= 1) // ELIGIBILITY CRITERIA: Lowered for better visibility
    .map(([user_id, s]) => {
      const attendancePct = (s.present / s.total) * 100;
      const avgTime = s.punctuality.length > 0 
        ? s.punctuality.reduce((a, b) => a + b, 0) / s.punctuality.length 
        : 1440;
      
      // STRONG MATHEMATICAL ANALYSIS:
      // Primary Factor: Attendance % (Weight 1.0)
      // Late Penalty: -10 points per Late
      // Punctuality: Compare against 9:00 AM (540 mins). 
      // Bonus: +0.5 points for every 10 mins earlier than 9:00 AM.
      // Penalty: -1 point for every 10 mins later than 9:00 AM.
      const punctualityFactor = (540 - avgTime) / 10;
      const score = attendancePct - (s.late * 10) + punctualityFactor;

      return {
        user_id,
        attendance_pct: attendancePct,
        late_count: s.late,
        avg_time: avgTime,
        score: Math.max(0, score)
      };
    })
    .sort((a, b) => b.score - a.score);
};

// ─── SYSTEM SETTINGS ────────────────────────────────────────────────────────

export const getSystemSettings = async (): Promise<any> => {
  const { data, error } = await supabase
    .from('system_configuration')
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('[dbService] getSystemSettings error:', error.message);
    return null;
  }
  
  if (data && data.cache_version !== undefined) {
    checkCacheVersion(data.cache_version);
  }
  
  return data;
};

export const updateSystemSettings = async (updates: any): Promise<boolean> => {
  if (!updates) return false;
  
  // Clean the updates object to prevent issues with primary keys or protected fields
  const { id, created_at, updated_at, ...rawPayload } = updates;

  // Explicitly define the columns we want to save to avoid "undefined_column" errors
  // if the frontend state contains extra UI-only properties.
  const validColumns = [
    'institution_name', 'academic_year', 'timezone', 'date_format',
    'check_in_time', 'check_out_time', 'late_threshold_mins',
    'half_day_threshold_hours', 'low_attendance_threshold',
    'consecutive_absences_threshold', 'auto_notify_parents',
    'enable_monthly_awards', 'min_attendance_for_award',
    'max_late_for_award', 'auto_generate_certificates',
    'strict_device_binding', 'brand_color_word', 'brand_color_type',
    'cache_version', 'role_permissions'
  ];

  const payload: any = {};
  validColumns.forEach(col => {
    if (rawPayload[col] !== undefined) {
      payload[col] = rawPayload[col];
    }
  });

  const { error } = await supabase
    .from('system_configuration')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      ...payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('[dbService] updateSystemSettings error:', error.message, error.code);
    return false;
  }
  return true;
};

export const getBackupData = async (): Promise<any> => {
  const [
    { data: attendance },
    { data: users },
    { data: leave_requests },
    { data: mentors },
    { data: settings },
    { data: schedules }
  ] = await Promise.all([
    supabase.from('attendance').select('*'),
    supabase.from('users').select('*'),
    supabase.from('leave_requests').select('*'),
    supabase.from('mentors').select('*'),
    supabase.from('system_configuration').select('*'),
    supabase.from('geofence_schedules').select('*')
  ]);
  
  return {
    attendance: attendance || [],
    users: users || [],
    leave_requests: leave_requests || [],
    mentors: mentors || [],
    app_settings: settings || [],
    geofence_schedules: schedules || []
  };
};

// ─── SUBSCRIBERS ─────────────────────────────────────────────────────────────

export const subscribeEmail = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase
      .from('subscribers')
      .insert({ email, status: 'active' });
      
    if (error) {
      if (error.code === '23505') {
        return { success: false, message: 'You are already subscribed!' };
      }
      throw error;
    }
    return { success: true, message: 'Successfully subscribed to updates!' };
  } catch (err) {
    console.error('[dbService] subscribeEmail error:', err);
    return { success: false, message: 'Subscription failed. Please try again.' };
  }
};

export const getSubscribers = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[dbService] getSubscribers error:', err);
    return [];
  }
};

export const updateSubscriberStatus = async (id: string, status: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('subscribers')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dbService] updateSubscriberStatus error:', err);
    return false;
  }
};

export const markSubscriberMailed = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('subscribers')
      .update({ last_mailed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[dbService] markSubscriberMailed error:', err);
    return false;
  }
};

