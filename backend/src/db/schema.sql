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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password_hash VARCHAR(255),
    must_change_password BOOLEAN DEFAULT TRUE
);

-- Ensure columns exist for legacy databases
ALTER TABLE guards ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE guards ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE;

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

-- 9. Salary Configurations Table
CREATE TABLE IF NOT EXISTS salary_configurations (
    id SERIAL PRIMARY KEY,
    guard_id INT NOT NULL UNIQUE REFERENCES guards(id) ON DELETE CASCADE,
    salary_type VARCHAR(20) NOT NULL, -- 'DAILY', 'MONTHLY', 'HOURLY'
    basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ot_rate_per_hour NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_ot_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Salary Advances Table
CREATE TABLE IF NOT EXISTS salary_advances (
    id SERIAL PRIMARY KEY,
    guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    created_by INT REFERENCES managers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Overtime Records Table
CREATE TABLE IF NOT EXISTS overtime_records (
    id SERIAL PRIMARY KEY,
    guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    attendance_id INT REFERENCES attendance(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    overtime_hours NUMERIC(4, 2) NOT NULL DEFAULT 0.00 CHECK (overtime_hours >= 0),
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    approved_by INT REFERENCES managers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_guard_daily_ot UNIQUE (guard_id, date)
);

-- 12. Payroll Table
CREATE TABLE IF NOT EXISTS payrolls (
    id SERIAL PRIMARY KEY,
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    year INT NOT NULL CHECK (year >= 2000),
    status VARCHAR(20) DEFAULT 'DRAFT', -- 'DRAFT', 'APPROVED', 'PAID'
    total_basic_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_ot_earnings NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_advance_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net_salary NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    generated_by INT REFERENCES managers(id),
    approved_by INT REFERENCES managers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_payroll_period UNIQUE (month, year)
);

-- 13. Payroll Details Table
CREATE TABLE IF NOT EXISTS payroll_details (
    id SERIAL PRIMARY KEY,
    payroll_id INT NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    guard_id INT NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    present_days INT NOT NULL DEFAULT 0,
    absent_days INT NOT NULL DEFAULT 0,
    half_days INT NOT NULL DEFAULT 0,
    overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    basic_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    ot_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    advance_deduction NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_payroll_guard UNIQUE (payroll_id, guard_id)
);

-- 14. Holiday Calendars
CREATE TABLE IF NOT EXISTS holiday_calendars (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    year INT NOT NULL,
    weekly_offs TEXT[] NOT NULL DEFAULT '{}',
    saturday_policy VARCHAR(50) DEFAULT 'ALL_WORKING',
    sandwich_policy BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Alter posts to link to holiday_calendars
ALTER TABLE posts ADD COLUMN IF NOT EXISTS holiday_calendar_id INT REFERENCES holiday_calendars(id) ON DELETE SET NULL;

-- 16. Calendar Holidays Table
CREATE TABLE IF NOT EXISTS calendar_holidays (
    id SERIAL PRIMARY KEY,
    calendar_id INT REFERENCES holiday_calendars(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'NATIONAL', 'RESTRICTED', 'FLOATING'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Floating Holiday Requests
CREATE TABLE IF NOT EXISTS floating_holiday_requests (
    id SERIAL PRIMARY KEY,
    guard_id INT REFERENCES guards(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    holiday_id INT REFERENCES calendar_holidays(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    approved_by INT REFERENCES managers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_guard_holiday_request UNIQUE (guard_id, date)
);

