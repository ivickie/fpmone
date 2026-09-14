-- =============================================================================
-- FAITH PREACHERS MINISTRY (FPM) - FPM ONE
-- STORED PROCEDURES & ATTENDANCE / APPROVAL FUNCTIONS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. FUNCTION: Generate Next Worker ID Code (e.g. FPM-0001, FPM-0002)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_next_worker_id()
RETURNS VARCHAR
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    next_val INT;
    worker_code VARCHAR(50);
BEGIN
    SELECT nextval('worker_id_seq') INTO next_val;
    worker_code := 'FPM-' || LPAD(next_val::TEXT, 4, '0');
    RETURN worker_code;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. FUNCTION: Authoritative Worker Clock-In
-- Evaluates grace period, calculates Present/Late strictly using server time
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_worker_clock_in(
    p_worker_id UUID,
    p_service_id UUID,
    p_method VARCHAR(50) -- 'pin', 'qr', 'biometric'
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_worker RECORD;
    v_service RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_today DATE := CURRENT_DATE;
    v_start_timestamp TIMESTAMPTZ;
    v_grace_cutoff TIMESTAMPTZ;
    v_earliest_cutoff TIMESTAMPTZ;
    v_status VARCHAR(50);
    v_attendance_id UUID;
    v_existing RECORD;
BEGIN
    -- 1. Identify and validate worker
    SELECT w.*, m.primary_branch_id, m.first_name, m.last_name, u.account_status
    INTO v_worker
    FROM workers w
    JOIN members m ON w.member_id = m.id
    JOIN users u ON m.user_id = u.id
    WHERE w.id = p_worker_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Worker record not found.';
    END IF;

    IF v_worker.worker_status <> 'active' OR v_worker.account_status <> 'active' THEN
        RAISE EXCEPTION 'Worker is not currently active (Status: %)', v_worker.worker_status;
    END IF;

    -- 2. Identify and validate service
    SELECT * INTO v_service
    FROM services
    WHERE id = p_service_id AND status = 'active';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found or is inactive.';
    END IF;

    -- Branch isolation check
    IF v_service.branch_id IS NOT NULL AND v_worker.primary_branch_id IS NOT NULL AND v_service.branch_id <> v_worker.primary_branch_id THEN
        RAISE EXCEPTION 'Worker branch mismatch: Worker belongs to branch % but service is for branch %', v_worker.primary_branch_id, v_service.branch_id;
    END IF;

    -- 3. Check for existing clock-in today for this service
    SELECT * INTO v_existing
    FROM attendance_records
    WHERE worker_id = p_worker_id 
      AND service_id = p_service_id 
      AND service_date = v_today;

    IF FOUND THEN
        IF v_existing.clock_in_time IS NOT NULL THEN
            RAISE EXCEPTION 'Duplicate clock-in detected: Worker already clocked in at %', v_existing.clock_in_time;
        END IF;
    END IF;

    -- 4. Calculate authoritative start time and grace cutoffs
    v_start_timestamp := (v_today || ' ' || v_service.start_time)::TIMESTAMPTZ;
    v_earliest_cutoff := v_start_timestamp - (v_service.earliest_clock_in_minutes || ' minutes')::INTERVAL;
    v_grace_cutoff := v_start_timestamp + (v_service.grace_period_minutes || ' minutes')::INTERVAL;

    -- 5. Determine Present vs. Late status
    IF v_now <= v_grace_cutoff THEN
        v_status := 'present';
    ELSE
        v_status := 'late';
    END IF;

    -- 6. Insert attendance record
    IF v_existing.id IS NOT NULL THEN
        -- If an absent record was pre-generated, update it
        UPDATE attendance_records
        SET clock_in_time = v_now,
            clock_in_method = p_method,
            status = v_status,
            updated_at = v_now
        WHERE id = v_existing.id
        RETURNING id INTO v_attendance_id;
    ELSE
        INSERT INTO attendance_records (
            worker_id,
            service_id,
            branch_id,
            service_date,
            clock_in_time,
            clock_in_method,
            status,
            created_at,
            updated_at
        ) VALUES (
            p_worker_id,
            p_service_id,
            v_service.branch_id,
            v_today,
            v_now,
            p_method,
            v_status,
            v_now,
            v_now
        )
        RETURNING id INTO v_attendance_id;
    END IF;

    -- 7. Return summary
    RETURN jsonb_build_object(
        'success', TRUE,
        'attendance_id', v_attendance_id,
        'worker_id_code', v_worker.worker_id_code,
        'worker_name', v_worker.first_name || ' ' || v_worker.last_name,
        'service_name', v_service.name,
        'service_date', v_today,
        'clock_in_time', v_now,
        'status', v_status,
        'grace_period_minutes', v_service.grace_period_minutes
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. FUNCTION: Worker Clock-Out (Manual, Automatic, or Admin)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_worker_clock_out(
    p_attendance_id UUID,
    p_source VARCHAR(50) -- 'manual', 'automatic', 'admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rec RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_duration_minutes INT;
BEGIN
    SELECT * INTO v_rec FROM attendance_records WHERE id = p_attendance_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Attendance record not found.';
    END IF;

    IF v_rec.clock_out_time IS NOT NULL THEN
        RAISE EXCEPTION 'Worker has already clocked out at %', v_rec.clock_out_time;
    END IF;

    IF v_rec.clock_in_time IS NULL THEN
        RAISE EXCEPTION 'Cannot clock out: no clock-in recorded.';
    END IF;

    -- Calculate duration
    v_duration_minutes := EXTRACT(EPOCH FROM (v_now - v_rec.clock_in_time)) / 60;

    UPDATE attendance_records
    SET clock_out_time = v_now,
        duration_minutes = v_duration_minutes,
        clock_out_source = p_source,
        is_auto_clock_out = (p_source = 'automatic'),
        updated_at = v_now
    WHERE id = p_attendance_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'attendance_id', p_attendance_id,
        'clock_in_time', v_rec.clock_in_time,
        'clock_out_time', v_now,
        'duration_minutes', v_duration_minutes,
        'clock_out_source', p_source,
        'is_auto_clock_out', (p_source = 'automatic')
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. FUNCTION: Automatic Clock-Out for Stale Sessions (> configured hours, default 4)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_clock_out_expired_sessions()
RETURNS INT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_count INT := 0;
    v_rec RECORD;
    v_auto_hours NUMERIC := 4.0;
    v_cutoff TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    FOR v_rec IN 
        SELECT a.id, a.clock_in_time, COALESCE(s.attendance_duration_hours, 4.0) as duration_limit
        FROM attendance_records a
        LEFT JOIN services s ON a.service_id = s.id
        WHERE a.clock_in_time IS NOT NULL
          AND a.clock_out_time IS NULL
    LOOP
        v_cutoff := v_rec.clock_in_time + (v_rec.duration_limit || ' hours')::INTERVAL;
        IF v_now >= v_cutoff THEN
            PERFORM record_worker_clock_out(v_rec.id, 'automatic');
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5. FUNCTION: Mark Service Absences for Expected Workers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_service_absences(
    p_service_id UUID,
    p_service_date DATE DEFAULT CURRENT_DATE
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_service RECORD;
    v_worker RECORD;
    v_inserted_count INT := 0;
BEGIN
    SELECT * INTO v_service FROM services WHERE id = p_service_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Service not found.';
    END IF;

    -- Find all active workers for this branch (and matching departments if specified)
    FOR v_worker IN
        SELECT w.id as worker_id
        FROM workers w
        JOIN members m ON w.member_id = m.id
        JOIN users u ON m.user_id = u.id
        WHERE m.primary_branch_id = v_service.branch_id
          AND w.worker_status = 'active'
          AND u.account_status = 'active'
          -- Exclude workers who already have an attendance record today
          AND w.id NOT IN (
              SELECT worker_id FROM attendance_records 
              WHERE service_id = p_service_id AND service_date = p_service_date
          )
    LOOP
        INSERT INTO attendance_records (
            worker_id,
            service_id,
            branch_id,
            service_date,
            status,
            created_at,
            updated_at
        ) VALUES (
            v_worker.worker_id,
            p_service_id,
            v_service.branch_id,
            p_service_date,
            'absent',
            NOW(),
            NOW()
        );
        v_inserted_count := v_inserted_count + 1;
    END LOOP;

    RETURN v_inserted_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. FUNCTION: Approve Member Registration & Worker Creation
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_member_registration(
    p_user_id UUID,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user RECORD;
    v_member RECORD;
    v_worker_code VARCHAR(50);
    v_worker_id UUID;
    v_default_dept UUID;
BEGIN
    SELECT * INTO v_user FROM users WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    SELECT * INTO v_member FROM members WHERE user_id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Member profile not found for user.';
    END IF;

    -- Update user to active
    UPDATE users
    SET account_status = 'active',
        rejection_reason = NULL,
        request_changes_notes = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update member approval details
    UPDATE members
    SET approved_by = p_admin_id,
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = v_member.id;

    -- If registered as a worker, ensure worker profile is created
    IF v_member.is_worker THEN
        -- Check if worker record already exists
        IF NOT EXISTS (SELECT 1 FROM workers WHERE member_id = v_member.id) THEN
            v_worker_code := generate_next_worker_id();
            
            -- Pick default or first department for the branch if not assigned
            SELECT id INTO v_default_dept FROM departments 
            WHERE branch_id = v_member.primary_branch_id OR branch_id IS NULL 
            LIMIT 1;

            INSERT INTO workers (
                member_id,
                worker_id_code,
                pin_hash,
                department_id,
                position_name,
                date_started_serving,
                worker_status,
                qr_code_token,
                created_at,
                updated_at
            ) VALUES (
                v_member.id,
                v_worker_code,
                -- Default PIN 1234 hashed with crypt
                crypt('1234', gen_salt('bf')),
                v_default_dept,
                'Worker',
                CURRENT_DATE,
                'active',
                'FPM-QR-' || gen_random_uuid()::TEXT,
                NOW(),
                NOW()
            ) RETURNING id INTO v_worker_id;
        END IF;
    END IF;

    -- Log to audit trail
    INSERT INTO audit_logs (
        actor_id,
        actor_name,
        action,
        target_type,
        target_id,
        previous_state,
        new_state,
        created_at
    ) VALUES (
        p_admin_id,
        'Administrator',
        'MEMBER_APPROVED',
        'user',
        p_user_id::TEXT,
        jsonb_build_object('account_status', v_user.account_status),
        jsonb_build_object('account_status', 'active', 'worker_code', v_worker_code),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'user_id', p_user_id,
        'account_status', 'active',
        'worker_code', v_worker_code
    );
END;
$$;
