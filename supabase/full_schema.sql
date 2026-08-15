-- ==========================================================
-- ThaiBann (ไทบ้าน) - Unified Cloud Database Schema
-- Run this in Supabase / Neon.tech SQL Editor
-- ==========================================================

-- 1. Roles Enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('super_admin', 'community_admin', 'committee');
    END IF;
END $$;

-- 2. Communities (ชุมชน)
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    line_channel_id TEXT,
    line_channel_secret TEXT,
    line_channel_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Staff (กรรมการ/เจ้าหน้าที่)
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'committee',
    phone TEXT,
    line_user_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Houses (บ้าน)
CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    house_number TEXT NOT NULL,
    owner_name TEXT,
    address TEXT,
    water_meter_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, house_number)
);

-- 5. House Members (สมาชิกบ้าน — ผูก LINE)
CREATE TABLE IF NOT EXISTS house_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    line_user_id TEXT NOT NULL,
    display_name TEXT,
    picture_url TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(house_id, line_user_id)
);

-- 6. Utility Rates (อัตราค่าบริการและเทมเพลต)
CREATE TABLE IF NOT EXISTS utility_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    utility_type TEXT NOT NULL,
    name TEXT NOT NULL,
    is_metered BOOLEAN DEFAULT false,
    flat_rate DECIMAL(10,2),
    rate_tiers JSONB,
    effective_from DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Billing Sets (ชุดรายการเก็บเงิน)
CREATE TABLE IF NOT EXISTS billing_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Billing Periods (รอบบิล)
CREATE TABLE IF NOT EXISTS billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES staff(id),
    funeral_occurrences INTEGER DEFAULT 0,
    funeral_events JSONB DEFAULT '[]'::jsonb,
    selected_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, period_month, period_year)
);

-- 9. Bills (บิลของแต่ละบ้าน)
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_period_id UUID REFERENCES billing_periods(id) ON DELETE CASCADE,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    arrears_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unpaid',
    notified_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(billing_period_id, house_id)
);

-- 10. Bill Items (รายการย่อยในบิล)
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    utility_type TEXT NOT NULL,
    previous_reading DECIMAL(10,2),
    current_reading DECIMAL(10,2),
    units_used DECIMAL(10,2),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    rate_snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Payments (การชำระเงินและสลิป)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    slip_url TEXT,
    payment_method TEXT DEFAULT 'promptpay',
    status TEXT NOT NULL DEFAULT 'pending',
    verified_by UUID REFERENCES staff(id),
    verified_at TIMESTAMPTZ,
    submitted_by_line_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================================
-- Initial Seed Data
-- ==========================================================

-- Insert Community: บ้านดงคงสุข
INSERT INTO communities (id, name, address)
VALUES ('d451d753-4303-4e30-81ef-88e2e5270e0a', 'บ้านดงคงสุข', 'ต.ดงคงสุข อ.เมือง')
ON CONFLICT (id) DO NOTHING;

-- Insert Committee Staff: noomjes.si@gmail.com (Password: password)
INSERT INTO staff (id, email, password_hash, community_id, full_name, role)
VALUES (
    '4b1550b8-32b4-4667-af4a-86c518a6d85c',
    'noomjes.si@gmail.com',
    '$2b$10$eCvlcILpiVwOGPg/FbZ6jOsrXcDoj6y9jQz/jFANmsEh2TCnOlulu',
    'd451d753-4303-4e30-81ef-88e2e5270e0a',
    'คุณเจษฎา (กรรมการหลัก)',
    'community_admin'
)
ON CONFLICT (email) DO NOTHING;

-- Insert Sample Houses
INSERT INTO houses (community_id, house_number, owner_name, water_meter_id)
VALUES 
    ('d451d753-4303-4e30-81ef-88e2e5270e0a', '1/1', 'นายสมชาย ใจดี', 'M-001'),
    ('d451d753-4303-4e30-81ef-88e2e5270e0a', '1/2', 'นางสมศรี มีสุข', 'M-002'),
    ('d451d753-4303-4e30-81ef-88e2e5270e0a', '1/3', 'นายสมศักดิ์ รักสงบ', 'M-003'),
    ('d451d753-4303-4e30-81ef-88e2e5270e0a', '2/1', 'นางสาวมาลี ชื่นบาน', 'M-004'),
    ('d451d753-4303-4e30-81ef-88e2e5270e0a', '2/2', 'นายบุญมี มั่งคั่ง', 'M-005')
ON CONFLICT (community_id, house_number) DO NOTHING;

-- Insert Default Utility Rates
INSERT INTO utility_rates (id, community_id, utility_type, name, is_metered, flat_rate, rate_tiers)
VALUES
    ('e54919e7-a11e-4142-9233-ddfde43d3e51', 'd451d753-4303-4e30-81ef-88e2e5270e0a', 'water', 'ค่าน้ำประปา', true, null, '[{"min": 0, "max": 99999, "rate": 5}]'::jsonb),
    ('79218884-0915-4c72-95cc-e9e462da33ca', 'd451d753-4303-4e30-81ef-88e2e5270e0a', 'garbage', 'ค่าเก็บขยะ', false, 40.00, null),
    ('1a76d700-360e-4280-8384-958ab90d8ee8', 'd451d753-4303-4e30-81ef-88e2e5270e0a', 'funeral', 'เงินสงเคราะห์ฌาปนกิจ', false, 20.00, null)
ON CONFLICT (id) DO NOTHING;
