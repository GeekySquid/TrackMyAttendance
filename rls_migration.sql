-- ============================================================
-- TrackMyAttendance — Row Level Security (RLS) Migration
-- ============================================================
-- Apply this in the Supabase SQL Editor to enable tenant isolation.
-- The app uses Clerk for auth. Clerk user IDs are stored in
-- public.profiles.id. The anon key is used client-side, so we
-- rely on request.jwt.claims or a custom session variable
-- (set via a Supabase Edge Function / JWT claims template).
--
-- STRATEGY:
--   • Admin role → full read/write on every table.
--   • Student role → read own rows, insert own rows, no delete.
--   • Notifications → read own + broadcast (user_id IS NULL).
--   • Geofence / Roles → public read-only (needed for check-in).
--   • Documents → authenticated read, uploader can delete own.
--
-- NOTE: Because Clerk supplies the JWT, ensure your Supabase project
-- has a JWT Secret that matches Clerk's JWKS endpoint, OR use the
-- service-role key only from server-side Edge Functions and keep
-- the anon key for read-only public data.
--
-- For a quick, secure setup without custom JWT:
--   → Keep RLS enabled below.
--   → Grant the anon role scoped permissions only.
--   → Students and admins are identified by clerk_user_id passed
--     as a trusted header from your backend / Edge Function.
-- ============================================================

-- ── Enable RLS on all tables ────────────────────────────────

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles             ENABLE ROW LEVEL SECURITY;

-- ── Drop existing open grants to anon ───────────────────────
-- (The init_schema.sql gave full DML to anon — revoke to enforce RLS)
REVOKE ALL ON public.profiles          FROM anon;
REVOKE ALL ON public.attendance         FROM anon;
REVOKE ALL ON public.leave_requests     FROM anon;
REVOKE ALL ON public.documents          FROM anon;
REVOKE ALL ON public.notifications      FROM anon;
REVOKE ALL ON public.geofence_schedules FROM anon;
REVOKE ALL ON public.roles              FROM anon;

-- ── Re-grant scoped permissions ─────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.profiles             TO anon;
GRANT SELECT, INSERT, UPDATE ON public.attendance           TO anon;
GRANT SELECT, INSERT, UPDATE ON public.leave_requests       TO anon;
GRANT SELECT, INSERT          ON public.documents           TO anon;
GRANT SELECT, UPDATE          ON public.notifications       TO anon;
GRANT SELECT                  ON public.geofence_schedules  TO anon;
GRANT SELECT                  ON public.roles               TO anon;
GRANT SELECT                  ON public.leaderboard         TO anon;
GRANT SELECT                  ON public.attendance_summary  TO anon;

-- ── Helper: extract Clerk user ID from JWT ──────────────────
-- NOTE: Replace 'sub' with your JWT claim key if different.
CREATE OR REPLACE FUNCTION auth.clerk_uid() RETURNS text AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    current_setting('request.jwt.claim.sub',  true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.clerk_role() RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = auth.clerk_uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- PROFILES
-- ============================================================

-- Anyone can read all profiles (needed for student list / leaderboard)
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT USING (true);

-- A user can insert their own profile (first sign-in)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.clerk_uid());

-- A user can update their own profile; admins can update any
CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  USING (id = auth.clerk_uid() OR auth.clerk_role() = 'admin')
  WITH CHECK (id = auth.clerk_uid() OR auth.clerk_role() = 'admin');

-- ============================================================
-- ATTENDANCE
-- ============================================================

-- Students see only their own records; admins see all
CREATE POLICY "attendance_select"
  ON public.attendance FOR SELECT
  USING (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- Students can insert their own attendance
CREATE POLICY "attendance_insert_own"
  ON public.attendance FOR INSERT
  WITH CHECK (user_id = auth.clerk_uid());

-- Students update their own (check-out); admins update any (late appeal review)
CREATE POLICY "attendance_update"
  ON public.attendance FOR UPDATE
  USING (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  )
  WITH CHECK (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- Only admins can delete attendance records
CREATE POLICY "attendance_delete_admin"
  ON public.attendance FOR DELETE
  USING (auth.clerk_role() = 'admin');

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================

-- Students see their own; admins see all
CREATE POLICY "leave_select"
  ON public.leave_requests FOR SELECT
  USING (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- Students apply their own leave
CREATE POLICY "leave_insert_own"
  ON public.leave_requests FOR INSERT
  WITH CHECK (user_id = auth.clerk_uid());

-- Admins review (update status); students cannot update
CREATE POLICY "leave_update_admin"
  ON public.leave_requests FOR UPDATE
  USING (auth.clerk_role() = 'admin')
  WITH CHECK (auth.clerk_role() = 'admin');

-- ============================================================
-- DOCUMENTS
-- ============================================================

-- All authenticated users can list documents
CREATE POLICY "documents_select_all"
  ON public.documents FOR SELECT USING (true);

-- Any authenticated user can upload
CREATE POLICY "documents_insert"
  ON public.documents FOR INSERT
  WITH CHECK (auth.clerk_uid() IS NOT NULL);

-- Only uploader or admin can delete
CREATE POLICY "documents_delete"
  ON public.documents FOR DELETE
  USING (
    uploader_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

-- Users see their own + broadcast (user_id IS NULL)
CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT
  USING (
    user_id IS NULL
    OR user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- Only admins create notifications
CREATE POLICY "notifications_insert_admin"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.clerk_role() = 'admin');

-- Users mark their own as read; admins update any
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE
  USING (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  )
  WITH CHECK (
    user_id = auth.clerk_uid()
    OR auth.clerk_role() = 'admin'
  );

-- ============================================================
-- GEOFENCE SCHEDULES  (public read; admin write)
-- ============================================================

CREATE POLICY "geofence_select_all"
  ON public.geofence_schedules FOR SELECT USING (true);

CREATE POLICY "geofence_insert_admin"
  ON public.geofence_schedules FOR INSERT
  WITH CHECK (auth.clerk_role() = 'admin');

CREATE POLICY "geofence_update_admin"
  ON public.geofence_schedules FOR UPDATE
  USING (auth.clerk_role() = 'admin')
  WITH CHECK (auth.clerk_role() = 'admin');

CREATE POLICY "geofence_delete_admin"
  ON public.geofence_schedules FOR DELETE
  USING (auth.clerk_role() = 'admin');

-- ============================================================
-- ROLES  (public read; admin write)
-- ============================================================

CREATE POLICY "roles_select_all"
  ON public.roles FOR SELECT USING (true);

CREATE POLICY "roles_write_admin"
  ON public.roles FOR ALL
  USING (auth.clerk_role() = 'admin')
  WITH CHECK (auth.clerk_role() = 'admin');

-- ============================================================
-- REALTIME publication — enable change events on all tables
-- ============================================================

-- Add tables to the realtime publication if not already added
DO $$
BEGIN
  -- attendance
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;

  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;

  -- leave_requests
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'leave_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;
  END IF;

  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- geofence_schedules
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'geofence_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.geofence_schedules;
  END IF;
END $$;
