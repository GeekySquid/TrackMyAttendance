
import os

file_path = r'c:\Users\r4m0x\Downloads\trackmyattendance_rk\src\services\dbService.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Reconstruct the broken segment
# We know the segment between mapGeofence head and mapRow switch is broken.
# Let's find mapGeofence start and switch (table) start.

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if 'export function mapGeofence(row: any)' in line:
        start_idx = i
    if 'switch (table) {' in line and i > start_idx and start_idx != -1:
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    print(f"Found broken segment from line {start_idx+1} to {end_idx+1}")
    
    new_segment = """export function mapGeofence(row: any) {
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

export function isScheduleActive(s: any, nowOverride?: Date): boolean {
  if (!s) return false;
  if (!s.isActive) return false;

  if (s.endTime || s.time) {
    const now = nowOverride || new Date();
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    
    if (s.autoActivate && s.days?.length && !s.days.includes(currentDay)) {
      return false;
    }

    const [h, m] = (s.time || '00:00').split(':').map(Number);
    const [eh, em] = (s.endTime || '23:59').split(':').map(Number);

    const startTotal = h * 3600 + m * 60;
    const endTotal = eh * 3600 + em * 60;
    const nowTotal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

    if (!s.autoActivate) {
      if (endTotal < startTotal) {
        if (nowTotal > endTotal && nowTotal < startTotal) return false;
      } else {
        if (nowTotal > endTotal) return false;
      }
    } else {
      if (endTotal < startTotal) {
        if (nowTotal < startTotal && nowTotal > endTotal) return false;
      } else {
        if (nowTotal < startTotal || nowTotal > endTotal) return false;
      }
    }
  }

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
  """
    
    # We need to find the matching switch (table) { block
    # Actually, I'll just replace everything between mapGeofence and mapRow's switch.
    
    lines[start_idx:end_idx+1] = [new_segment]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Repair successful")
else:
    print("Could not find segment boundaries")
