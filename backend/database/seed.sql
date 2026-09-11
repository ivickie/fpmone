-- =============================================================================
-- FAITH PREACHERS MINISTRY (FPM) - FPM ONE
-- COMPREHENSIVE PRODUCTION SEED DATA
-- =============================================================================

DO $$
DECLARE
    -- Org ID
    v_org_id UUID := '00000000-0000-0000-0000-000000000001';

    -- Branch IDs
    v_branch_hq UUID := 'b1111111-1111-1111-1111-111111111111';
    v_branch_lekki UUID := 'b2222222-2222-2222-2222-222222222222';
    v_branch_london UUID := 'b3333333-3333-3333-3333-333333333333';
    v_branch_houston UUID := 'b4444444-4444-4444-4444-444444444444';

    -- Role IDs
    v_role_super_admin UUID := 'a1111111-1111-1111-1111-111111111111';
    v_role_branch_pastor UUID := 'a2222222-2222-2222-2222-222222222222';
    v_role_assoc_pastor UUID := 'a3333333-3333-3333-3333-333333333333';
    v_role_pastor UUID := 'a4444444-4444-4444-4444-444444444444';
    v_role_hod UUID := 'a5555555-5555-5555-5555-555555555555';
    v_role_worker UUID := 'a6666666-6666-6666-6666-666666666666';
    v_role_member UUID := 'a7777777-7777-7777-7777-777777777777';

    -- Department IDs
    v_dept_choir UUID := 'd1111111-1111-1111-1111-111111111111';
    v_dept_media UUID := 'd2222222-2222-2222-2222-222222222222';
    v_dept_ushering UUID := 'd3333333-3333-3333-3333-333333333333';
    v_dept_security UUID := 'd4444444-4444-4444-4444-444444444444';
    v_dept_prayer UUID := 'd5555555-5555-5555-5555-555555555555';
    v_dept_welfare UUID := 'd6666666-6666-6666-6666-666666666666';
    v_dept_children UUID := 'd7777777-7777-7777-7777-777777777777';

    -- Position IDs
    v_pos_choir_dir UUID := gen_random_uuid();
    v_pos_choir_lead UUID := gen_random_uuid();
    v_pos_media_stream UUID := gen_random_uuid();
    v_pos_media_cam UUID := gen_random_uuid();
    v_pos_usher_head UUID := gen_random_uuid();
    v_pos_welfare_lead UUID := gen_random_uuid();
    v_pos_children_lead UUID := gen_random_uuid();

    -- User IDs
    v_user_admin UUID := 'c1111111-1111-1111-1111-111111111111';
    v_user_pastor UUID := 'c2222222-2222-2222-2222-222222222222';
    v_user_hod_choir UUID := 'c3333333-3333-3333-3333-333333333333';
    v_user_worker_sarah UUID := 'c4444444-4444-4444-4444-444444444444';
    v_user_worker_john UUID := 'c5555555-5555-5555-5555-555555555555';
    v_user_member_grace UUID := 'c6666666-6666-6666-6666-666666666666';
    v_user_pending_daniel UUID := 'c7777777-7777-7777-7777-777777777777';

    -- Member IDs
    v_member_admin UUID := 'e1111111-1111-1111-1111-111111111111';
    v_member_pastor UUID := 'e2222222-2222-2222-2222-222222222222';
    v_member_hod_choir UUID := 'e3333333-3333-3333-3333-333333333333';
    v_member_worker_sarah UUID := 'e4444444-4444-4444-4444-444444444444';
    v_member_worker_john UUID := 'e5555555-5555-5555-5555-555555555555';
    v_member_member_grace UUID := 'e6666666-6666-6666-6666-666666666666';
    v_member_pending_daniel UUID := 'e7777777-7777-7777-7777-777777777777';

    -- Worker IDs
    v_worker_sarah UUID := 'f1111111-1111-1111-1111-111111111111';
    v_worker_john UUID := 'f2222222-2222-2222-2222-222222222222';
    v_worker_hod UUID := 'f3333333-3333-3333-3333-333333333333';

    -- Service IDs
    v_svc_sun_first UUID := '11111111-1111-1111-1111-111111111111';
    v_svc_sun_second UUID := '22222222-2222-2222-2222-222222222222';
    v_svc_wed_study UUID := '33333333-3333-3333-3333-333333333333';
    v_svc_fri_prayer UUID := '44444444-4444-4444-4444-444444444444';
    v_svc_sat_rehearsal UUID := '55555555-5555-5555-5555-555555555555';
    v_svc_special_thanksgiving UUID := '66666666-6666-6666-6666-666666666666';

    -- Event IDs
    v_evt_convention UUID := gen_random_uuid();
    v_evt_retreat UUID := gen_random_uuid();
    v_evt_youth UUID := gen_random_uuid();

    -- Post IDs
    v_post_welcome UUID := gen_random_uuid();
    v_post_sermon UUID := gen_random_uuid();

    -- Default encrypted password for "Password123!"
    v_pass_hash TEXT := crypt('Password123!', gen_salt('bf'));
    v_pin_hash TEXT := crypt('1234', gen_salt('bf'));
BEGIN

    -- 1. Insert Organization
    INSERT INTO organizations (id, name, short_name, slug, logo_url, primary_email, headquarters_address)
    VALUES (v_org_id, 'Faith Preachers Ministry', 'FPM', 'fpm-global', 'https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=300', 'info@faithpreachers.org', 'Faith Cathedral, 10 Victory Way, Lagos, Nigeria');

    -- 2. Insert Branches
    INSERT INTO branches (id, organization_id, name, branch_code, address, city, state, country, phone, email, branch_pastor_name, status, is_headquarters)
    VALUES 
    (v_branch_hq, v_org_id, 'Cathedral of Grace (HQ)', 'FPM-HQ', '10 Victory Way, Ikeja', 'Lagos', 'Lagos State', 'Nigeria', '+234 800 000 0001', 'hq@faithpreachers.org', 'Pastor David Adeleke', 'active', TRUE),
    (v_branch_lekki, v_org_id, 'Lekki City of Praise', 'FPM-LEK', 'Plot 15 Admiralty Way, Lekki Phase 1', 'Lagos', 'Lagos State', 'Nigeria', '+234 800 000 0002', 'lekki@faithpreachers.org', 'Pastor Emmanuel Okafor', 'active', FALSE),
    (v_branch_london, v_org_id, 'London Glory Center', 'FPM-LON', '44 Gracechurch Street', 'London', 'Greater London', 'United Kingdom', '+44 20 7946 0001', 'london@faithpreachers.org', 'Pastor Michael Davies', 'active', FALSE),
    (v_branch_houston, v_org_id, 'Houston Faith Tabernacle', 'FPM-HOU', '8820 Westheimer Road', 'Houston', 'Texas', 'United States', '+1 713 555 0199', 'houston@faithpreachers.org', 'Pastor Joshua Vance', 'active', FALSE);

    -- 3. Insert Ministry Roles
    INSERT INTO ministry_roles (id, name, code, description, hierarchy_level, is_system_role)
    VALUES
    (v_role_super_admin, 'Administrator', 'SUPER_ADMIN', 'Overall global administrative control of FPM ONE', 1, TRUE),
    (v_role_branch_pastor, 'Branch Pastor', 'BRANCH_PASTOR', 'Spiritual and administrative head of a branch/chapter', 2, TRUE),
    (v_role_assoc_pastor, 'Associate Pastor', 'ASSOCIATE_PASTOR', 'Assistant pastoral minister in a branch', 3, FALSE),
    (v_role_pastor, 'Pastor', 'PASTOR', 'Ordained minister of the gospel', 4, FALSE),
    (v_role_hod, 'HOD', 'HOD', 'Head of Department supervising departmental operations', 5, FALSE),
    (v_role_worker, 'Worker', 'WORKER', 'Dedicated ministry worker serving in departments and services', 6, FALSE),
    (v_role_member, 'Member', 'MEMBER', 'Valued member of Faith Preachers Ministry church family', 7, FALSE);

    -- 4. Insert Departments
    INSERT INTO departments (id, branch_id, name, code, description, hod_name, status)
    VALUES
    (v_dept_choir, v_branch_hq, 'Choir (Voices of Faith)', 'CHOIR', 'Ministering praises, worship, and choral orchestration in services', 'Sister Rachel Adams', 'active'),
    (v_dept_media, v_branch_hq, 'Media & Technology', 'MEDIA', 'Audio/visual broadcast, live streaming, digital screens, photography', 'Brother John Mensah', 'active'),
    (v_dept_ushering, v_branch_hq, 'Ushering & Protocol', 'USHER', 'Sanctuary seating coordination, hospitality, VIP protocol', 'Deacon Paul Eke', 'active'),
    (v_dept_security, v_branch_hq, 'Security & Logistics', 'SEC', 'Premises safety, traffic management, emergency response', 'Brother James Obi', 'active'),
    (v_dept_prayer, v_branch_hq, 'Prayer & Intercession', 'PRAYER', 'Intercessory prayer tower, prayer vigils, counseling support', 'Pastor Deborah Mark', 'active'),
    (v_dept_welfare, v_branch_hq, 'Welfare & Hospitality', 'WELFARE', 'Caring for the needy, benevolence, refreshments, guest reception', 'Sister Ruth Adeleke', 'active'),
    (v_dept_children, v_branch_hq, 'Children & Teens Church', 'CHILDREN', 'Nurturing the younger generation with age-appropriate biblical teaching', 'Sister Mary Johnson', 'active');

    -- 5. Insert Department Positions
    INSERT INTO department_positions (id, department_id, name, description)
    VALUES
    (v_pos_choir_dir, v_dept_choir, 'Choir Director', 'Directs rehearsals and leads vocal arrangement'),
    (v_pos_choir_lead, v_dept_choir, 'Lead Vocalist', 'Solos and worship leading'),
    (v_pos_media_stream, v_dept_media, 'Broadcast Director', 'Directs live multi-camera switches and streaming output'),
    (v_pos_media_cam, v_dept_media, 'Camera Operator', 'Operates robotic and manual pedestal cameras'),
    (v_pos_usher_head, v_dept_ushering, 'Floor Coordinator', 'Supervises sanctuary zones and seating flow'),
    (v_pos_welfare_lead, v_dept_welfare, 'Welfare Coordinator', 'Oversees food distribution, hospital visits, and benevolence packages'),
    (v_pos_children_lead, v_dept_children, 'Teens Teacher', 'Leads scripture study and mentorship for teenagers');

    -- 6. Insert Users
    INSERT INTO users (id, email, phone, password_hash, account_status, is_admin, admin_level)
    VALUES
    (v_user_admin, 'admin@fpmchurch.org', '+2348000000010', v_pass_hash, 'active', TRUE, 'super_admin'),
    (v_user_pastor, 'pastor.david@fpmchurch.org', '+2348000000020', v_pass_hash, 'active', TRUE, 'branch_admin'),
    (v_user_hod_choir, 'hod.choir@fpmchurch.org', '+2348000000030', v_pass_hash, 'active', FALSE, 'none'),
    (v_user_worker_sarah, 'worker.sarah@fpmchurch.org', '+2348000000040', v_pass_hash, 'active', FALSE, 'none'),
    (v_user_worker_john, 'worker.john@fpmchurch.org', '+2348000000050', v_pass_hash, 'active', FALSE, 'none'),
    (v_user_member_grace, 'member.grace@fpmchurch.org', '+2348000000060', v_pass_hash, 'active', FALSE, 'none'),
    (v_user_pending_daniel, 'daniel.new@fpmchurch.org', '+2348000000070', v_pass_hash, 'pending', FALSE, 'none');

    -- 7. Insert Members
    INSERT INTO members (id, user_id, primary_branch_id, first_name, middle_name, last_name, primary_role_id, is_worker, gender, date_of_birth, residential_address, emergency_contact_name, emergency_contact_phone)
    VALUES
    (v_member_admin, v_user_admin, v_branch_hq, 'Ezekiel', 'K.', 'Adeyemi', v_role_super_admin, TRUE, 'Male', '1982-05-14', '15 Victoria Island Blvd, Lagos', 'Grace Adeyemi', '+2348011112222'),
    (v_member_pastor, v_user_pastor, v_branch_hq, 'David', 'O.', 'Adeleke', v_role_branch_pastor, TRUE, 'Male', '1976-11-23', 'Cathedral Residence, Ikeja, Lagos', 'Ruth Adeleke', '+2348022223333'),
    (v_member_hod_choir, v_user_hod_choir, v_branch_hq, 'Rachel', 'Ann', 'Adams', v_role_hod, TRUE, 'Female', '1988-08-19', '24 Opebi Street, Ikeja, Lagos', 'Thomas Adams', '+2348033334444'),
    (v_member_worker_sarah, v_user_worker_sarah, v_branch_hq, 'Sarah', 'Blessing', 'Williams', v_role_worker, TRUE, 'Female', '1995-02-11', '8 Allen Avenue, Ikeja, Lagos', 'Samuel Williams', '+2348044445555'),
    (v_member_worker_john, v_user_worker_john, v_branch_hq, 'John', 'Kofi', 'Mensah', v_role_worker, TRUE, 'Male', '1992-09-30', '12 Isaac John Street, GRA Ikeja', 'Kofi Mensah Sr.', '+2348055556666'),
    (v_member_member_grace, v_user_member_grace, v_branch_hq, 'Grace', 'Oluwaseun', 'Bello', v_role_member, FALSE, 'Female', '1998-04-15', '45 Maryland Crescent, Lagos', 'Olumide Bello', '+2348066667777'),
    (v_member_pending_daniel, v_user_pending_daniel, v_branch_hq, 'Daniel', 'Emeka', 'Nwosu', v_role_worker, TRUE, 'Male', '1994-07-21', '33 Toyin Street, Ikeja, Lagos', 'Chinyere Nwosu', '+2348077778888');

    -- 8. Insert Workers
    INSERT INTO workers (id, member_id, worker_id_code, pin_hash, department_id, position_id, position_name, date_started_serving, worker_status, qr_code_token, biometric_enabled)
    VALUES
    (v_worker_sarah, v_member_worker_sarah, 'FPM-0001', v_pin_hash, v_dept_choir, v_pos_choir_lead, 'Lead Vocalist', '2022-01-15', 'active', 'FPM-QR-SARAH-0001', TRUE),
    (v_worker_john, v_member_worker_john, 'FPM-0002', v_pin_hash, v_dept_media, v_pos_media_stream, 'Broadcast Director', '2021-06-10', 'active', 'FPM-QR-JOHN-0002', TRUE),
    (v_worker_hod, v_member_hod_choir, 'FPM-0003', v_pin_hash, v_dept_choir, v_pos_choir_dir, 'Choir Director / HOD', '2019-03-01', 'active', 'FPM-QR-RACHEL-0003', TRUE);

    -- 9. Insert Services
    INSERT INTO services (id, branch_id, name, day_of_week, start_time, expected_end_time, grace_period_minutes, earliest_clock_in_minutes, attendance_duration_hours, status)
    VALUES
    (v_svc_sun_first, v_branch_hq, 'Sunday First Service (Celebration of Grace)', 'Sunday', '08:00:00', '10:30:00', 15, 60, 4.00, 'active'),
    (v_svc_sun_second, v_branch_hq, 'Sunday Second Service (Victory Impartation)', 'Sunday', '10:45:00', '13:00:00', 15, 45, 4.00, 'active'),
    (v_svc_wed_study, v_branch_hq, 'Wednesday Midweek Word Feast & Communion', 'Wednesday', '18:00:00', '20:00:00', 15, 45, 3.00, 'active'),
    (v_svc_fri_prayer, v_branch_hq, 'Friday Night of Dominion Vigil', 'Friday', '22:00:00', '02:30:00', 20, 60, 5.00, 'active'),
    (v_svc_sat_rehearsal, v_branch_hq, 'Saturday Departmental Rehearsal & Workers Meeting', 'Saturday', '16:00:00', '18:30:00', 15, 45, 3.00, 'active'),
    (v_svc_special_thanksgiving, v_branch_hq, 'Special Miracle & Thanksgiving Service', 'Sunday', '09:00:00', '12:30:00', 20, 60, 4.00, 'active');

    -- 10. Attendance Settings
    INSERT INTO attendance_settings (branch_id, default_grace_period_minutes, auto_clock_out_hours, manual_clock_out_enabled, earliest_clock_in_minutes)
    VALUES (v_branch_hq, 15, 4.00, TRUE, 60);

    -- 11. Attendance Records (Recent historical records)
    INSERT INTO attendance_records (worker_id, service_id, branch_id, service_date, clock_in_time, clock_out_time, duration_minutes, clock_in_method, clock_out_source, status)
    VALUES
    -- Last Sunday: Sarah was Present (arrived 7:55 AM)
    (v_worker_sarah, v_svc_sun_first, v_branch_hq, CURRENT_DATE - INTERVAL '3 days', (CURRENT_DATE - INTERVAL '3 days' + TIME '07:55:00')::TIMESTAMPTZ, (CURRENT_DATE - INTERVAL '3 days' + TIME '11:45:00')::TIMESTAMPTZ, 230, 'biometric', 'manual', 'present'),
    -- Last Sunday: John was Late (arrived 8:22 AM - after 15m grace)
    (v_worker_john, v_svc_sun_first, v_branch_hq, CURRENT_DATE - INTERVAL '3 days', (CURRENT_DATE - INTERVAL '3 days' + TIME '08:22:00')::TIMESTAMPTZ, (CURRENT_DATE - INTERVAL '3 days' + TIME '12:05:00')::TIMESTAMPTZ, 223, 'qr', 'manual', 'late'),
    -- Last Sunday: HOD Rachel was Present (arrived 7:40 AM)
    (v_worker_hod, v_svc_sun_first, v_branch_hq, CURRENT_DATE - INTERVAL '3 days', (CURRENT_DATE - INTERVAL '3 days' + TIME '07:40:00')::TIMESTAMPTZ, (CURRENT_DATE - INTERVAL '3 days' + TIME '12:15:00')::TIMESTAMPTZ, 275, 'pin', 'manual', 'present');

    -- 12. Insert Events
    INSERT INTO events (id, branch_id, title, description, banner_url, start_datetime, end_datetime, location, speaker, category, registration_required, registration_capacity, status)
    VALUES
    (v_evt_convention, NULL, 'FPM Annual Global Faith Convention 2026', 'A 5-day spiritual convergence of nations under open heavens featuring prophetic insights, healings, and miraculous testimonies.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800', NOW() + INTERVAL '14 days', NOW() + INTERVAL '19 days', 'Faith Cathedral Mega Auditorium, Lagos & Online Broadcast', 'Pastor David Adeleke & Guest Ministers', 'Convention', TRUE, 5000, 'published'),
    (v_evt_retreat, v_branch_hq, 'Kingdom Workers & Ministers Summit', 'An equipping retreat for all department workers, choir members, ushers, protocol, media personnel, and pastors.', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800', NOW() + INTERVAL '5 days', NOW() + INTERVAL '6 days', 'Grace Multipurpose Hall, Cathedral of Grace', 'Pastor David Adeleke', 'Training', TRUE, 800, 'published'),
    (v_evt_youth, v_branch_hq, 'Ignite Youth Worship & Power Night', 'An electrifying encounter for youths, teenagers, and young professionals passionate about Christ and purpose.', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800', NOW() + INTERVAL '9 days', NOW() + INTERVAL '10 days', 'Lekki City of Praise Sanctuary', 'Pastor Emmanuel Okafor', 'Youth', FALSE, 1200, 'published');

    -- 13. Insert Feed Posts
    INSERT INTO posts (id, author_id, author_name, branch_id, visibility, title, content, scripture_reference, post_type, is_pinned, likes_count, comments_count)
    VALUES
    (v_post_welcome, v_user_pastor, 'Pastor David Adeleke', v_branch_hq, 'all', 'Welcome to the New Month of Supernatural Acceleration!', 'Beloved family of Faith Preachers Ministry, the Lord has declared this season as our appointed time for supernatural momentum and favor. Whatever seemed delayed is now entering divine acceleration. Be steadfast, serve with joy, and expect uncommon open doors!', 'Amos 9:13', 'announcement', TRUE, 48, 12),
    (v_post_sermon, v_user_pastor, 'Pastor David Adeleke', v_branch_hq, 'all', 'Keys to Supernatural Breakthrough in Challenging Times', 'Faith is not the absence of trials; faith is the unwavering anchor that speaks God''s victory in the presence of challenges. Keep your confession strong and your dedication unshakeable.', 'Hebrews 11:1', 'post', FALSE, 34, 7);

    -- 14. Insert Service Highlights
    INSERT INTO service_highlights (service_id, branch_id, highlight_date, title, speaker, summary, scripture, key_points, quote, photos, is_published)
    VALUES
    (v_svc_sun_first, v_branch_hq, CURRENT_DATE - INTERVAL '3 days', 'Operating in Supernatural Dimension', 'Pastor David Adeleke', 'During Sunday First Service, God reminded us that our faith is our greatest spiritual currency. Miracles were wrought, burdens were lifted, and prophetic direction was given for the season.', 'Mark 9:23', '["Faith is an active spiritual force, not passive hoping.", "Your words frame your world - declare what God says.", "Purity and prayer preserve the oil of God upon your life."]'::jsonb, 'When faith speaks, natural laws submit to the supremacy of divine authority.', '["https://images.unsplash.com/photo-1544427920-c49ccfb85579?w=600"]'::jsonb, TRUE);

    -- 15. Insert Testimonies
    INSERT INTO testimonies (member_id, branch_id, title, content, category, allow_publish, status, is_featured_on_feed)
    VALUES
    (v_member_member_grace, v_branch_hq, 'Instant Healing from 7 Years of Severe Spinal Pain', 'For seven continuous years I battled degenerative spinal inflammation that prevented me from bending or lifting my child. During the Communion Service last month, as Pastor prayed, I felt intense warmth down my spine. The pain dissolved completely! My doctor confirmed 100% restoration!', 'Healing', TRUE, 'approved', TRUE),
    (v_member_worker_sarah, v_branch_hq, 'Miraculous Employment & International Visa Granted', 'After two years of unemployment following graduation, I dedicated myself to serving in the choir faithfully. Two weeks ago, I received an unapplied job offer with a multinational firm in London with full relocation sponsorship! God truly honors selfless service!', 'Promotion', TRUE, 'approved', TRUE),
    (v_member_pending_daniel, v_branch_hq, 'Safe Delivery of Healthy Twins after Medical Doubts', 'Doctors had warned of severe complications, but through the prayer intercession of the ministry, my wife gave birth safely without surgery!', 'Childbirth', TRUE, 'pending_review', FALSE);

    -- 16. Insert Initial Notifications
    INSERT INTO notifications (title, body, notification_type, target_scope, target_id)
    VALUES
    ('Welcome to FPM ONE', 'Faith Preachers Ministry mobile portal is officially live. Connect, serve, and grow!', 'announcement', 'entire_church', NULL),
    ('Upcoming Service: Sunday Celebration of Grace', 'Join us this Sunday at 8:00 AM for an encounter of grace and victory.', 'upcoming_service', 'branch', v_branch_hq),
    ('Workers Punctuality Reminder', 'All department workers are expected to clock in at least 15 minutes before service commences.', 'admin_alert', 'ministry_role', v_role_worker);

    -- 17. Insert Audit Logs
    INSERT INTO audit_logs (actor_id, actor_name, actor_role, action, target_type, target_id, new_state)
    VALUES
    (v_user_admin, 'Ezekiel Adeyemi', 'Super Administrator', 'SYSTEM_INITIALIZED', 'system', 'fpm-global', '{"status": "initialized", "version": "1.0.0"}'::jsonb),
    (v_user_admin, 'Ezekiel Adeyemi', 'Super Administrator', 'BRANCH_CREATED', 'branch', v_branch_hq::TEXT, '{"name": "Cathedral of Grace (HQ)", "code": "FPM-HQ"}'::jsonb);

END $$;
