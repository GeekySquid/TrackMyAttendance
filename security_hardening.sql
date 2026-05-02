-- ============================================================
-- TrackMyAttendance — SECURITY HARDENING MIGRATION (Global Standard)
-- ============================================================
-- This migration tightens RLS policies to prevent students from
-- tampering with their own attendance status or timestamps.

-- 1. Drop the overly-permissive update policy
DROP POLICY IF EXISTS "attendance_update" ON public.attendance;

-- 2. Create a restricted update policy for Students
-- Students can only update their own records, and only specific fields.
-- NOTE: Postgres RLS doesn't natively support column-level restrictions in the 'USING' clause,
-- but we can enforce it by checking if other columns remain unchanged in a trigger or
-- by using a more specific 'WITH CHECK' logic if available.
-- However, the most robust way in Supabase is to use a Trigger or a restricted RPC.

-- For now, let's use a trigger to prevent tampering with sensitive columns.
CREATE OR REPLACE FUNCTION public.check_attendance_tampering()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is NOT an admin
  IF (SELECT role FROM public.profiles WHERE id = auth.uid()) != 'admin' THEN
    -- Prevent changing core attendance data after insert
    IF (OLD.status != NEW.status AND NEW.status != 'Absent') OR 
       (OLD.checkInTime != NEW.checkInTime) OR
       (OLD.date != NEW.date) OR
       (OLD.userId != NEW.userId) THEN
      RAISE EXCEPTION 'Tampering detected: You cannot modify core attendance data.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger
DROP TRIGGER IF EXISTS tr_check_attendance_tampering ON public.attendance;
CREATE TRIGGER tr_check_attendance_tampering
BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.check_attendance_tampering();

-- 3. Re-enable a safer update policy
CREATE POLICY "attendance_update_secure"
  ON public.attendance FOR UPDATE
  USING (
    user_id = auth.uid() 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- GLOBAL STANDARD: Audit Logs (Optional but recommended)
-- ============================================================
-- CREATE TABLE IF NOT EXISTS public.security_logs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id TEXT,
--   action TEXT,
--   details JSONB,
--   created_at TIMESTAMPTZ DEFAULT now()
-- );
-- ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "admin_only_logs" ON public.security_logs FOR ALL USING (role = 'admin');
