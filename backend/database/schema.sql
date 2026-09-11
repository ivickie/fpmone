-- =============================================================================
-- FAITH PREACHERS MINISTRY (FPM) - FPM ONE
-- PRODUCTION POSTGRESQL & SUPABASE DATABASE SCHEMA
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing tables if needed (cascade order)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS media_items CASCADE;
DROP TABLE IF EXISTS notification_reads CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS testimonies CASCADE;
DROP TABLE IF EXISTS service_highlights CASCADE;
DROP TABLE IF EXISTS saved_posts CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS reactions CASCADE;
DROP TABLE IF EXISTS post_media CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_settings CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS user_ministry_roles CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS department_positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS ministry_roles CASCADE;
DROP TABLE IF EXISTS branches CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop sequences
DROP SEQUENCE IF EXISTS worker_id_seq;

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (Top Level)
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL DEFAULT 'Faith Preachers Ministry',
    short_name VARCHAR(50) NOT NULL DEFAULT 'FPM',
    slug VARCHAR(100) NOT NULL UNIQUE DEFAULT 'fpm-global',
    logo_url TEXT,
    primary_email VARCHAR(255) DEFAULT 'info@faithpreachers.org',
    headquarters_address TEXT DEFAULT 'Faith Cathedral, Lagos, Nigeria',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. BRANCHES / CHAPTERS
-- -----------------------------------------------------------------------------
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'Nigeria',
    phone VARCHAR(50),
    email VARCHAR(255),
    branch_pastor_name VARCHAR(255),
    branch_pastor_id UUID,
    logo_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    service_schedule JSONB DEFAULT '[]'::jsonb,
    is_headquarters BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_code ON branches(branch_code);
CREATE INDEX idx_branches_status ON branches(status);

-- -----------------------------------------------------------------------------
-- 3. MINISTRY ROLES (Dynamic & Configurable)
-- -----------------------------------------------------------------------------
CREATE TABLE ministry_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    hierarchy_level INT NOT NULL DEFAULT 10,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ministry_roles_code ON ministry_roles(code);

-- -----------------------------------------------------------------------------
-- 4. DEPARTMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL means organization-wide
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    hod_name VARCHAR(255),
    hod_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_departments_branch ON departments(branch_id);
CREATE INDEX idx_departments_code ON departments(code);

-- -----------------------------------------------------------------------------
-- 5. DEPARTMENT POSITIONS
-- -----------------------------------------------------------------------------
CREATE TABLE department_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_department_positions_dept ON department_positions(department_id);

-- -----------------------------------------------------------------------------
-- 6. USERS (Authentication & Account Security)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    account_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'suspended', 'rejected', 'archived')),
    rejection_reason TEXT,
    request_changes_notes TEXT,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    admin_level VARCHAR(50) DEFAULT 'none' CHECK (admin_level IN ('none', 'branch_admin', 'church_admin', 'super_admin')),
    last_login_at TIMESTAMPTZ,
    password_reset_token TEXT,
    password_reset_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(account_status);

-- -----------------------------------------------------------------------------
-- 7. MEMBERS (Member Profile & Personal Information)
-- -----------------------------------------------------------------------------
CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    primary_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    primary_role_id UUID NOT NULL REFERENCES ministry_roles(id) ON DELETE RESTRICT,
    is_worker BOOLEAN NOT NULL DEFAULT FALSE,
    gender VARCHAR(20) CHECK (gender IN ('Male', 'Female', 'Other')),
    date_of_birth DATE,
    residential_address TEXT,
    profile_picture_url TEXT,
    emergency_contact_name VARCHAR(150),
    emergency_contact_phone VARCHAR(50),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_members_branch ON members(primary_branch_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_members_is_worker ON members(is_worker);

-- -----------------------------------------------------------------------------
-- 8. USER MINISTRY ROLES (Allows members to hold multiple roles)
-- -----------------------------------------------------------------------------
CREATE TABLE user_ministry_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    ministry_role_id UUID NOT NULL REFERENCES ministry_roles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(member_id, ministry_role_id, branch_id)
);

-- -----------------------------------------------------------------------------
-- 9. WORKERS (Separated Worker Details with Unique Worker ID)
-- -----------------------------------------------------------------------------
CREATE SEQUENCE worker_id_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
    worker_id_code VARCHAR(50) NOT NULL UNIQUE, -- e.g. FPM-0001
    pin_hash TEXT NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    position_id UUID REFERENCES department_positions(id) ON DELETE SET NULL,
    position_name VARCHAR(150),
    date_started_serving DATE NOT NULL DEFAULT CURRENT_DATE,
    worker_status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (worker_status IN ('active', 'inactive', 'suspended', 'archived')),
    qr_code_token TEXT NOT NULL UNIQUE,
    biometric_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workers_member ON workers(member_id);
CREATE INDEX idx_workers_code ON workers(worker_id_code);
CREATE INDEX idx_workers_dept ON workers(department_id);
CREATE INDEX idx_workers_status ON workers(worker_status);

-- -----------------------------------------------------------------------------
-- 10. SERVICES & SCHEDULES
-- -----------------------------------------------------------------------------
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL, -- e.g. 'Sunday First Service'
    day_of_week VARCHAR(20) NOT NULL CHECK (day_of_week IN ('Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')),
    start_time TIME NOT NULL, -- e.g. '08:00:00'
    expected_end_time TIME NOT NULL, -- e.g. '10:30:00'
    grace_period_minutes INT NOT NULL DEFAULT 15,
    earliest_clock_in_minutes INT NOT NULL DEFAULT 60,
    attendance_duration_hours NUMERIC(4,2) NOT NULL DEFAULT 4.00,
    applicable_department_ids JSONB DEFAULT '[]'::jsonb, -- [] means all departments
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_branch ON services(branch_id);
CREATE INDEX idx_services_day ON services(day_of_week);

-- -----------------------------------------------------------------------------
-- 11. ATTENDANCE SETTINGS
-- -----------------------------------------------------------------------------
CREATE TABLE attendance_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID UNIQUE REFERENCES branches(id) ON DELETE CASCADE, -- NULL is global default
    default_grace_period_minutes INT NOT NULL DEFAULT 15,
    auto_clock_out_hours NUMERIC(4,2) NOT NULL DEFAULT 4.00,
    manual_clock_out_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    earliest_clock_in_minutes INT NOT NULL DEFAULT 60,
    allow_biometric_clock_in BOOLEAN NOT NULL DEFAULT TRUE,
    allow_qr_clock_in BOOLEAN NOT NULL DEFAULT TRUE,
    allow_pin_clock_in BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 12. ATTENDANCE RECORDS (Authoritative Server Time Only)
-- -----------------------------------------------------------------------------
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ, -- Authoritative server timestamp
    clock_out_time TIMESTAMPTZ,
    duration_minutes INT,
    clock_in_method VARCHAR(50) CHECK (clock_in_method IN ('pin', 'qr', 'biometric', 'manual_admin')),
    clock_out_source VARCHAR(50) CHECK (clock_out_source IN ('manual', 'automatic', 'admin')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('present', 'late', 'absent', 'excused')),
    is_auto_clock_out BOOLEAN NOT NULL DEFAULT FALSE,
    excuse_reason TEXT,
    excused_by UUID REFERENCES users(id) ON DELETE SET NULL,
    excused_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(worker_id, service_id, service_date) -- Prevents duplicate clock-ins
);

CREATE INDEX idx_attendance_worker ON attendance_records(worker_id);
CREATE INDEX idx_attendance_service_date ON attendance_records(service_id, service_date);
CREATE INDEX idx_attendance_branch ON attendance_records(branch_id);
CREATE INDEX idx_attendance_status ON attendance_records(status);

-- -----------------------------------------------------------------------------
-- 13. EVENTS & REGISTRATIONS
-- -----------------------------------------------------------------------------
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL, -- NULL = All FPM
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    banner_url TEXT,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    location VARCHAR(255) NOT NULL,
    speaker VARCHAR(255),
    category VARCHAR(100) NOT NULL CHECK (category IN (
        'Sunday Service', 'Bible Study', 'Prayer Meeting', 'Conference', 
        'Convention', 'Youth', 'Women''s Ministry', 'Men''s Ministry', 
        'Outreach', 'Training', 'Special Event'
    )),
    registration_required BOOLEAN NOT NULL DEFAULT FALSE,
    registration_capacity INT,
    current_registrations_count INT NOT NULL DEFAULT 0,
    target_scope VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (target_scope IN ('all', 'branch', 'department', 'role')),
    target_role_id UUID REFERENCES ministry_roles(id) ON DELETE SET NULL,
    target_dept_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_start ON events(start_datetime);
CREATE INDEX idx_events_branch ON events(branch_id);
CREATE INDEX idx_events_category ON events(category);

CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(event_id, member_id)
);

CREATE INDEX idx_event_reg_event ON event_registrations(event_id);

-- -----------------------------------------------------------------------------
-- 14. SOCIAL CHURCH FEED (Posts, Reactions, Comments)
-- -----------------------------------------------------------------------------
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    target_role_id UUID REFERENCES ministry_roles(id) ON DELETE SET NULL,
    visibility VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (visibility IN ('all', 'branch', 'department', 'workers_only', 'role')),
    title VARCHAR(255),
    content TEXT NOT NULL,
    scripture_reference VARCHAR(150),
    post_type VARCHAR(50) NOT NULL DEFAULT 'post' CHECK (post_type IN ('post', 'announcement', 'scripture', 'highlight')),
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_branch ON posts(branch_id);

CREATE TABLE post_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('image', 'video')),
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(50) NOT NULL CHECK (reaction_type IN ('like', 'amen', 'love', 'praise')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id);

CREATE TABLE saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- -----------------------------------------------------------------------------
-- 15. SERVICE HIGHLIGHTS (Post-Service Sermon Highlights)
-- -----------------------------------------------------------------------------
CREATE TABLE service_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    highlight_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    speaker VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    scripture VARCHAR(255),
    key_points JSONB DEFAULT '[]'::jsonb,
    quote TEXT,
    photos JSONB DEFAULT '[]'::jsonb,
    video_url TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_highlights_branch ON service_highlights(branch_id);
CREATE INDEX idx_highlights_date ON service_highlights(highlight_date DESC);

-- -----------------------------------------------------------------------------
-- 16. TESTIMONIES (Moderation Workflow)
-- -----------------------------------------------------------------------------
CREATE TABLE testimonies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    photo_url TEXT,
    video_url TEXT,
    allow_publish BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
    rejection_reason TEXT,
    request_changes_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    is_featured_on_feed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_testimonies_status ON testimonies(status);
CREATE INDEX idx_testimonies_branch ON testimonies(branch_id);

-- -----------------------------------------------------------------------------
-- 17. NOTIFICATIONS & READ RECEIPTS
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    notification_type VARCHAR(100) NOT NULL CHECK (notification_type IN (
        'announcement', 'registration_approved', 'registration_rejected', 
        'registration_changes_requested', 'upcoming_service', 'upcoming_event', 
        'event_reminder', 'attendance_confirmed', 'highlight_published', 
        'testimony_approved', 'admin_alert'
    )),
    target_scope VARCHAR(50) NOT NULL DEFAULT 'entire_church' CHECK (target_scope IN (
        'entire_church', 'branch', 'department', 'ministry_role', 'specific_member'
    )),
    target_id UUID, -- branch_id, dept_id, role_id, or member_id
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_scope ON notifications(target_scope, target_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE notification_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT TRUE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(notification_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 18. AUDIT LOGS (Immutable Activity Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
    actor_role VARCHAR(100) DEFAULT 'system',
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- =============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Base read policies
CREATE POLICY "Public branches read access" ON branches FOR SELECT USING (status = 'active');
CREATE POLICY "Public roles read access" ON ministry_roles FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public departments read access" ON departments FOR SELECT USING (status = 'active');
CREATE POLICY "Public services read access" ON services FOR SELECT USING (status = 'active');
CREATE POLICY "Public events read access" ON events FOR SELECT USING (status = 'published');
CREATE POLICY "Public service highlights read" ON service_highlights FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Public approved testimonies read" ON testimonies FOR SELECT USING (status = 'approved' AND allow_publish = TRUE);

-- -----------------------------------------------------------------------------
-- 19. MEDIA ITEMS (Supabase Storage Metadata)
-- -----------------------------------------------------------------------------
CREATE TABLE media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('event', 'feed', 'highlight', 'testimony', 'profile', 'church-asset')),
    entity_id UUID,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_entity ON media_items(entity_type, entity_id);
CREATE INDEX idx_media_branch ON media_items(branch_id);
CREATE INDEX idx_media_uploader ON media_items(uploaded_by);

ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public active media read access"
ON media_items FOR SELECT
USING (is_archived = FALSE);

-- =============================================================================
-- SUPABASE STORAGE BUCKET DECLARATION & POLICIES
-- =============================================================================
-- Create 'fpm-media' bucket if storage schema is present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'fpm-media',
    'fpm-media',
    true,
    10485760, -- 10MB ceiling
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Public read access to church media bucket
DROP POLICY IF EXISTS "Public Read Access fpm-media" ON storage.objects;
CREATE POLICY "Public Read Access fpm-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'fpm-media');

-- Authenticated member and worker upload access
DROP POLICY IF EXISTS "Authenticated Users Upload fpm-media" ON storage.objects;
CREATE POLICY "Authenticated Users Upload fpm-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fpm-media');

-- Admin update and delete authority
DROP POLICY IF EXISTS "Admin Delete Access fpm-media" ON storage.objects;
CREATE POLICY "Admin Delete Access fpm-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fpm-media');

