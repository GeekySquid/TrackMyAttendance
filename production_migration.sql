-- Run this on your Production Supabase SQL Editor
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS blood_group text,
  ADD COLUMN IF NOT EXISTS mentor_id text,
  ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- In case notifications needs any updates from recent changes
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sender_id text;

-- Quick Actions Fixes
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS location_name text;
