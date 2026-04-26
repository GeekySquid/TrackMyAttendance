-- ==========================================
-- TrackMyAttendance Schema (Clerk Auth Ready)
-- ==========================================

-- 1. Create Roles Table
CREATE TABLE public.roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text
);

INSERT INTO public.roles (id, name, description) VALUES
  ('admin', 'Administrator', 'Full system access'),
  ('student', 'Student', 'Student access');

-- 2. Create Profiles Table (Uses TEXT id to match Clerk user IDs)
CREATE TABLE public.profiles (
  id text PRIMARY KEY,
  uid text UNIQUE,
  name text,
  email text,
  photo_url text,
  role text DEFAULT 'student',
  role_id text REFERENCES public.roles(id) ON DELETE SET NULL,
  roll_no text,
  course text,
  phone text,
  gender text,
  status text DEFAULT 'Active',
  attendance_pct numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 3. Create Attendance Table
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time without time zone NOT NULL,
  status text NOT NULL,
  location_lat numeric,
  location_lng numeric,
  device_info text,
  photo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 4. Create Leave Requests Table
CREATE TABLE public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  format text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'Pending',
  reviewed_by text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 5. Create Documents Table
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  size text NOT NULL,
  upload_date date DEFAULT CURRENT_DATE,
  category text NOT NULL,
  url text NOT NULL,
  uploader_id text,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Create Notifications Table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Create Geofence Schedules Table
CREATE TABLE public.geofence_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time text NOT NULL,
  days jsonb NOT NULL,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  radius numeric NOT NULL,
  is_active boolean DEFAULT true,
  auto_activate boolean DEFAULT false,
  created_by text,
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- Triggers and Functions
-- ==========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Views
-- ==========================================

CREATE OR REPLACE VIEW public.attendance_summary AS
SELECT
  p.id AS user_id,
  p.name,
  p.roll_no,
  p.course,
  p.photo_url,
  p.status AS student_status,
  COUNT(a.id) FILTER (WHERE a.status IN ('Present', 'Late', 'Half Day')) AS present_count,
  COUNT(a.id) FILTER (WHERE a.status = 'Absent') AS absent_count,
  COUNT(a.id) AS total_count,
  CASE
    WHEN COUNT(a.id) = 0 THEN 100::numeric
    ELSE ROUND(COUNT(a.id) FILTER (WHERE a.status IN ('Present', 'Late', 'Half Day'))::numeric / COUNT(a.id)::numeric * 100)
  END AS attendance_pct
FROM public.profiles p
LEFT JOIN public.attendance a ON a.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id, p.name, p.roll_no, p.course, p.photo_url, p.status;

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY attendance_pct DESC, present_count DESC) AS rank,
  user_id,
  name,
  roll_no,
  course,
  photo_url,
  attendance_pct,
  (present_count * 100)::integer AS score,
  present_count,
  absent_count,
  total_count
FROM public.attendance_summary
ORDER BY attendance_pct DESC, present_count DESC;

-- ==========================================
-- Storage Buckets Configuration
-- ==========================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES 
('documents', 'documents', false),
('attendance-photos', 'attendance-photos', true),
('student-photos', 'student-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (Allow public/anon access for Clerk integration)
CREATE POLICY "Public full access documents" ON storage.objects FOR ALL USING (bucket_id = 'documents');
CREATE POLICY "Public full access attendance photos" ON storage.objects FOR ALL USING (bucket_id = 'attendance-photos');
CREATE POLICY "Public full access student photos" ON storage.objects FOR ALL USING (bucket_id = 'student-photos');

-- ==========================================
-- Grants and RLS (Disabled for Clerk Client-Side Access)
-- ==========================================

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofence_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leave_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.geofence_schedules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO anon;
GRANT SELECT ON public.leaderboard TO anon;
GRANT SELECT ON public.attendance_summary TO anon;
