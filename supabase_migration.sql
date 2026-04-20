-- ============================================================
-- TrackMyAttendance — COMPLETE DB MIGRATION
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. FIX THE ATTENDANCE TABLE (Crucial for late reason persistence)
ALTER TABLE attendance 
  ADD COLUMN IF NOT EXISTS late_reason TEXT,
  ADD COLUMN IF NOT EXISTS late_reason_status TEXT DEFAULT 'Pending Review',
  ADD COLUMN IF NOT EXISTS late_reason_image TEXT,
  ADD COLUMN IF NOT EXISTS checkout_reason TEXT;

-- 2. FIX THE DOCUMENTS TABLE (For version tracking)
ALTER TABLE documents 
  ADD COLUMN IF NOT EXISTS revisions JSONB DEFAULT '[]'::jsonb;

-- 3. FIX THE GEOFENCE_SCHEDULES TABLE
ALTER TABLE geofence_schedules
  ADD COLUMN IF NOT EXISTS location_name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS grace_period INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. AUTO-UPDATE TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON geofence_schedules;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON geofence_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VERIFICATION:
-- After running, visit 'Table Editor' in Supabase to confirm columns:
-- - attendance: [late_reason, late_reason_status, late_reason_image]
-- - geofence_schedules: [location_name, grace_period, updated_at]
-- ============================================================
