-- PostgreSQL Database Schema for Guard Attendance Management System

-- 1. Managers Table
CREATE TABLE IF NOT EXISTS managers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'MANAGER',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Field Officers Table
CREATE TABLE IF NOT EXISTS field_officers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    must_change_password BOOLEAN DEFAULT TRUE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Posts / Locations Table
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    allowed_radius_metres INT DEFAULT 100,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Shifts Table
CREATE TABLE IF NOT EXISTS shifts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    grace_period_minutes INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Guards Table
CREATE TABLE IF NOT EXISTS guards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15),
    assigned_post_id INT REFERENCES posts(id) ON DELETE SET NULL,
    assigned_shift_id INT REFERENCES shifts(id) ON DELETE SET NULL,
    date_of_joining DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Officer Assignments Table
CREATE TABLE IF NOT EXISTS officer_assignments (
    id SERIAL PRIMARY KEY,
    officer_id INT NOT NULL REFERENCES field_officers(id) ON DELETE CASCADE,
    guard_id INT REFERENCES guards(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    from_date DATE,
    to_date DATE,
    created_by INT REFERENCES managers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_target CHECK (guard_id IS NOT NULL OR post_id IS NOT NULL)
);

-- 7. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    marked_by_officer_id INT NOT NULL REFERENCES field_officers(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_in_latitude NUMERIC(10, 7),
    check_in_longitude NUMERIC(10, 7),
    check_in_gps_accuracy NUMERIC(8, 2),
    check_in_distance_from_post NUMERIC(10, 2),
    check_in_photo_url TEXT,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_out_latitude NUMERIC(10, 7),
    check_out_longitude NUMERIC(10, 7),
    check_out_photo_url TEXT,
    post_id_snapshot INT REFERENCES posts(id),
    radius_snapshot INT,
    status VARCHAR(30) DEFAULT 'PENDING', -- CHECKED_IN, CHECKED_OUT, LATE, ABSENT, MISSED_CHECKOUT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_guard_daily_attendance UNIQUE (guard_id, date)
);

-- 8. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_by_role VARCHAR(20) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
