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
    onboarded: isOnboarded,
    profileCompleted: row.profile_completed || false,
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
  };
}

export function isScheduleActive(s: any): boolean {
  if (!s) return false;
  // 1. Manual Global Override Row
  if (!s.isActive) return false;

  // Check Time Range if specified (for both manual and auto)
  if (s.endTime || s.time) {
    const now = new Date();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    
    // Day check (only for auto schedules with days array)
    if (s.autoActivate && s.days?.length && !s.days.includes(currentDay)) {
      return false;
    }

    const [h, m] = (s.time || '00:00').split(':').map(Number);
    const [eh, em] = (s.endTime || '23:59').split(':').map(Number);

    const schedStart = new Date();
    schedStart.setHours(h, m, 0, 0);

    const schedEnd = new Date();
    schedEnd.setHours(eh, em, 0, 0);

    // Span to next day if end < start
    if (schedEnd < schedStart) {
      schedEnd.setDate(schedEnd.getDate() + 1);
    }

    if (now < schedStart || now > schedEnd) return false;
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
    case 'attendance_windows': return mapGeofence(row);
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
    geofence_schedules: 'attendance_windows',
    app_settings: 'app_settings',
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
    if (!userId) {
      console.error('[dbService] saveUser: no uid/id provided');
      return false;
    }

    const row: Record<string, any> = {
      id: userId,
      name: user.name || '',
      email: user.email || '',
      updated_at: new Date().toISOString(),
    };
    if (user.photoURL !== undefined) row.photo_url = user.photoURL;
    if (user.role !== undefined) row.role = user.role;
    if (user.rollNo !== undefined) row.roll_no = user.rollNo;
    if (user.course !== undefined) row.course = user.course;
    if (user.phone !== undefined) row.phone = user.phone;
    if (user.gender !== undefined) row.gender = user.gender;
    if (user.bloodGroup !== undefined) row.blood_group = user.bloodGroup;
    if (user.status !== undefined) row.status = user.status;
    if (user.mentorId !== undefined) row.mentor_id = user.mentorId || null;
    if (user.profileCompleted !== undefined) row.profile_completed = user.profileCompleted;

    console.log('[dbService] Upserting row to profiles:', row);
    const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[dbService] saveUser upsert error:', error.message);
      return false;
    }
    console.log('[dbService] saveUser upsert success');
    return true;
  } catch (err) {
    console.error('[dbService] saveUser exception:', err instanceof Error ? err.message : err);
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
  let query = supabase
    .from('attendance')
    .select('*, profiles(photo_url)')
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
    // Construct combined location string if components provided
    const combinedLocation = record.location || (record.locationName ? `${record.locationName}${record.locationCoords ? ` | ${record.locationCoords}` : ''}` : null);

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
      p_late_reason_image: record.lateReasonImage || null
    };

    const { data, error } = await supabase.rpc('record_attendance', params);

    if (error || (data && data.status === 'failure')) {
      const errorMsg = error?.message || data?.error;
      console.warn('[dbService] addAttendance RPC failed, trying direct insert fallback check:', errorMsg);

      // FALLBACK SAFETY: Check if a record already exists for today before direct insert
      const { data: existing, error: checkError } = await supabase
        .from('attendance')
        .select('id')
        .eq('user_id', record.userId)
        .eq('date', record.date)
        .is('check_out_time', null)
        .maybeSingle();

      if (!checkError && existing) {
        return mapAttendance(existing);
      }

      const row = {
        user_id: record.userId,
        user_name: record.userName || null,
        roll_no: record.rollNo || null,
        course: record.course || null,
        date: record.date,
        check_in_time: record.checkInTime || null,
        status: record.status,
        location: combinedLocation,
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

    // RPC Success: handle both object and primitive returns for 'id'
    const finalId = data?.id || data;

    // ── Automated Trigger: Check-in Notification ──
    try {
      await addNotification({
        userId: record.userId,
        type: record.status === 'Present' ? 'success' : 'warning',
        title: `Attendance Marked: ${record.status}`,
        message: record.status === 'Present'
          ? `You have successfully checked in for ${record.course || 'your session'}.`
          : `You have been marked ${record.status} for ${record.course || 'your session'}.`,
        data: { sessionId: finalId }
      });
    } catch (e) {
      console.warn('[dbService] Automated check-in notification failed:', e);
    }

    return { ...record, id: finalId };
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
    const today = new Date().toISOString().split('T')[0];
    const time = checkoutTime || new Date().toISOString();

    const { data: records, error: fetchError } = await supabase
      .from('attendance')
      .select('id, user_id, user_name, course')
      .eq('date', today)
      .is('check_out_time', null);

    if (fetchError) throw fetchError;
    if (!records || records.length === 0) return;

    const ids = records.map(r => r.id);

    const { error: updateError } = await supabase
      .from('attendance')
      .update({ check_out_time: time })
      .in('id', ids);

    if (updateError) throw updateError;

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
    console.error('[dbService] markBulkCheckOut error:', err.message);
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

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    size: data.size,
    date: data.created_at,
    uploader: data.uploader,
    storage_key: data.storage_key,
    fileData: publicUrl,
    revisions: data.revisions || []
  };
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

  const { error } = await supabase
    .from('documents')
    .update({ revisions: newRevisions })
    .eq('id', docId);

  if (error) {
    console.error('[dbService] removeDocumentRevision error:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GEOFENCE SCHEDULE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export const getGeofenceSchedules = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('attendance_windows')
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
    .from('attendance_windows')
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
    .from('attendance_windows')
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
    .from('attendance_windows')
    .update(row)
    .in('id', ids);
  if (error)
    console.error('[dbService] bulkUpdateGeofenceSchedules error:', error.message);
};

export const deleteGeofenceSchedule = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('attendance_windows')
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
    
    console.log('[dbService] toggleManualAttendanceWindow:', { active, lat, lng, radius, locationName, endTime });

    const { data, error } = await supabase
      .from('attendance_windows')
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
      console.log('[dbService] Manual window ACTIVATED');
    } else {
      console.log('[dbService] Manual window CLOSED');
      try {
        await markBulkCheckOut();
      } catch (e) {
        console.warn('[dbService] Automated bulk check-out failed:', e);
      }
    }

    if (!data || data.length === 0) {
      console.log('[dbService] No manual record found, inserting new sentinel...');
      const { data: insData, error: insError } = await supabase
        .from('attendance_windows')
        .insert({
          lat: String(lat),
          lng: String(lng),
          radius: -999,
          is_active: active,
          time: '00:00',
          end_time: endTime || '23:59',
          days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          auto_activate: false,
          location_name: locationName,
          grace_period: gracePeriod
        })
        .select();
      if (insError) throw insError;
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
    .from('attendance_windows')
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

export const addNotification = async (notification: any): Promise<void> => {
  const row = {
    user_id: notification.userId || null,
    type: notification.type || 'info',
    title: notification.title,
    message: notification.message,
    data: notification.data || [],
    is_read: false,
    created_at: new Date().toISOString()
  };
  const { error } = await supabase.from('notifications').insert(row);
  if (error) {
    console.error('[dbService] addNotification error:', error.message);
    throw error;
  }
};

export const broadcastNotification = async (notification: { title: string, message: string, type?: string }): Promise<void> => {
  await addNotification({
    userId: null, // This triggers broadcast logic in listenToCollection
    type: notification.type || 'info',
    title: notification.title,
    message: notification.message,
    data: { isBroadcast: true }
  });
};

export const bulkAddNotifications = async (notifications: any[]): Promise<void> => {
  const rows = notifications.map(n => ({
    user_id: n.userId || null,
    type: n.type || 'info',
    title: n.title,
    message: n.message,
    data: n.data || [],
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

export const toggleNotificationImportant = async (id: string, current: boolean): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ is_important: !current })
    .eq('id', id);
  if (error) console.error('[dbService] toggleNotificationImportant error:', error.message);
};

export const deleteNotification = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id);
  if (error) console.error('[dbService] deleteNotification error:', error.message);
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
    .limit(50); // Increased limit for better "Full Rankings" scroll

  if (error) {
    console.error('[dbService] getLeaderboard error:', error.message);
    return [];
  }

  // Explicitly assign rank based on sort order to ensure consistency
  return (data || []).map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SUMMARY (per-student computed view)
// ─────────────────────────────────────────────────────────────────────────────

export const getAttendanceSummary = async (userId?: string): Promise<any[]> => {
  let query = supabase.from('attendance_summary').select('*, photo_url');
  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query;
  if (error) {
    console.error('[dbService] getAttendanceSummary error:', error.message);
    return [];
  }
  return data || [];
};

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENER — optimised bi-directional Supabase Realtime
// ─────────────────────────────────────────────────────────────────────────────

/**
 * listenToCollection()
 *
 * Subscribes to a Supabase table and calls `callback` with the full,
 * mapped dataset whenever a change occurs.
 *
 * Optimisations vs. the previous version:
 *  • Payload-level INSERT/UPDATE/DELETE diff applied locally before re-fetch,
 *    so the UI updates in <10ms instead of waiting for a full round-trip.
 *  • Re-fetch still happens afterwards to guarantee consistency.
 *  • Unique channel names prevent ghost subscriptions on hot-reload.
 *  • Notification broadcast fix: null user_id rows pass through for everyone.
 */
export const listenToCollection = (
  collectionName: string,
  callback: (data: any[]) => void,
  userId?: string
): UnsubFn => {
  const table = resolveTable(collectionName);

  // ── Build the base query ──────────────────────────────────────────────────
  const buildQuery = () => {
    let selectStr = '*';
    if (table === 'attendance' || table === 'leave_requests') {
      selectStr = '*, profiles(photo_url)';
    }
    let query = supabase.from(table).select(selectStr);

    if (userId && (table === 'attendance' || table === 'leave_requests')) {
      query = query.eq('user_id', userId);
    }
    if (userId && table === 'notifications') {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }

    if (table === 'leave_requests') {
      query = (query as any).order('applied_on', { ascending: false });
    } else if (table === 'notifications') {
      query = (query as any).order('created_at', { ascending: false });
    } else if (table === 'attendance') {
      query = (query as any).order('date', { ascending: false });
    } else if (table === 'profiles') {
      query = (query as any).order('created_at', { ascending: true });
    } else if (table === 'app_settings') {
      query = (query as any).limit(1);
    }

    return query;
  };

  // ── Cache (to apply optimistic local diffs) ───────────────────────────────
  let cache: any[] = [];
  let hasInitialLoaded = false;

  const fetchAndCallback = async () => {
    try {
      const { data, error } = await buildQuery();
      if (error) {
        console.error(`[dbService] listenToCollection fetch error (${table}):`, error.message);
        // UNBLOCK UI: Even on error, we must signal that we "loaded" (likely empty)
        if (!hasInitialLoaded) {
          hasInitialLoaded = true;
          callback(cache || []);
        }
        return;
      }


      const mapped = (data || []).map((row) => mapRow(table, row));

      // OPTIMIZATION: Only trigger callback if data actually changed to prevent re-render loops
      // EXCEPTION: First load must always trigger callback to unblock UI loading states
      if (JSON.stringify(mapped) !== JSON.stringify(cache) || !hasInitialLoaded) {
        cache = mapped;
        hasInitialLoaded = true;
        callback(cache);
      }
    } catch (e) {
      console.error(`[dbService] listenToCollection catch error (${table}):`, e);
      if (!hasInitialLoaded) {
        hasInitialLoaded = true;
        callback(cache || []);
      }
    }
  };

  // Initial load
  fetchAndCallback();

  // ── Realtime channel ──────────────────────────────────────────────────────
  const channelName = `rt-${table}-${userId ?? 'all'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes' as any,
      { event: '*', schema: 'public', table },
      (payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;

        // ── Scope filter ──────────────────────────────────────────────────
        if (userId && table !== 'notifications' && table !== 'profiles' && table !== 'attendance_windows' && table !== 'app_settings') {
          const rowUserId = newRow?.user_id ?? oldRow?.user_id;
          if (rowUserId && rowUserId !== userId) return;
        }


        // ── Optimistic local diff (With Deep Merge) ───────────────────────
        if (eventType === 'INSERT' && newRow) {
          const mapped = mapRow(table, newRow);
          if (!cache.some((r) => r.id === mapped.id)) {
            cache = [mapped, ...cache];
            callback([...cache]);
          }
        } else if (eventType === 'UPDATE' && newRow) {
          const existing = cache.find((r) => r.id === newRow.id);
          const mappedNew = mapRow(table, newRow);

          // IMPORTANT: Merge with existing to prevent partial updates from wiping out 
          // fields that weren't included in the UPDATE payload (like userName, rollNo)
          const updated = existing ? { ...existing, ...mappedNew } : mappedNew;

          cache = cache.map((r) => (r.id === updated.id ? updated : r));
          callback([...cache]);
        } else if (eventType === 'DELETE' && oldRow) {
          cache = cache.filter((r) => r.id !== oldRow.id);
          callback([...cache]);
        }

        // Proactive sync for eventual consistency
        fetchAndCallback();
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        // Subscribed successfully
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Attempt a one-time re-fetch on timeout for immediate UI consistency
        fetchAndCallback();
      }
    });

  // ── Polling Fallback (Auto-Refresh Guarantee) ──────────────────────────────
  // Even if Supabase Realtime publication isn't perfectly configured in the
  // dashboard, this visually guarantees the app universally auto-refreshes.
  const intervalId = setInterval(() => {
    fetchAndCallback();
  }, 3000); // Poll every 3 seconds as a relaxed fallback (was 5s)

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
    await supabase.from('users').delete().eq('role', 'student');
    await supabase.from('profiles').delete().eq('role', 'student');

    return true;
  } catch (err) {
    console.error('[dbService] clearDatabase error:', err instanceof Error ? err.message : err);
    return false;
  }
};

// ─── SYSTEM SETTINGS ────────────────────────────────────────────────────────

export const getSystemSettings = async (): Promise<any> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('[dbService] getSystemSettings error:', error.message);
    return null;
  }
  return data;
};

export const updateSystemSettings = async (updates: any): Promise<boolean> => {
  // Clean the updates object to prevent issues with primary keys or protected fields
  const { id, created_at, ...payload } = updates;

  console.log('[dbService] updateSystemSettings payload:', payload);
  const { error } = await supabase
    .from('app_settings')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      ...payload,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

  if (error) {
    console.error('[dbService] updateSystemSettings error:', error.message, error.details, error.hint);
    return false;
  }
  console.log('[dbService] updateSystemSettings success');
  return true;
};

