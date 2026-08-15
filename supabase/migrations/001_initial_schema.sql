-- =============================================
-- ThaiBann Database Schema - Phase 1 (Standard PostgreSQL)
-- =============================================

-- ENUM Types
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'committee');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_status') THEN
        CREATE TYPE billing_status AS ENUM ('unpaid', 'pending_verify', 'paid', 'overdue');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'utility_type') THEN
        CREATE TYPE utility_type AS ENUM ('water', 'garbage', 'funeral');
    END IF;
END $$;

-- =============================================
-- 1. Communities (ชุมชน) — Multi-tenant root
-- =============================================
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,                    -- ชื่อชุมชน/หมู่บ้าน
    address TEXT,                          -- ที่อยู่ชุมชน
    line_channel_id TEXT,                  -- LINE Channel ID ของชุมชนนี้
    line_channel_secret TEXT,
    line_channel_access_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. Staff (กรรมการ/เจ้าหน้าที่)
-- =============================================
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,            -- สำหรับระบบ Login ของกรรมการ
    password_hash TEXT NOT NULL,           -- รหัสผ่านแบบเข้ารหัส
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'committee',
    phone TEXT,
    line_user_id TEXT,                     -- LINE user ID (ถ้า login ด้วย LINE)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 3. Houses (บ้าน)
-- =============================================
CREATE TABLE IF NOT EXISTS houses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    house_number TEXT NOT NULL,            -- บ้านเลขที่
    owner_name TEXT,                       -- ชื่อเจ้าของบ้าน
    address TEXT,                          -- ที่อยู่เพิ่มเติม
    water_meter_id TEXT,                   -- เลขมิเตอร์น้ำ
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, house_number)
);

-- =============================================
-- 4. House Members (สมาชิกบ้าน — ผูก LINE)
-- =============================================
CREATE TABLE IF NOT EXISTS house_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    line_user_id TEXT NOT NULL,            -- LINE user ID
    display_name TEXT,                     -- ชื่อที่แสดงจาก LINE
    picture_url TEXT,                      -- รูปโปรไฟล์จาก LINE
    is_primary BOOLEAN DEFAULT false,      -- สมาชิกหลัก
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(house_id, line_user_id)
);

-- =============================================
-- 5. Utility Rates (อัตราค่าสาธารณูปโภค)
-- =============================================
CREATE TABLE IF NOT EXISTS utility_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    utility_type utility_type NOT NULL,
    name TEXT NOT NULL,                    -- ชื่อที่แสดง เช่น "ค่าน้ำประปา"
    is_metered BOOLEAN DEFAULT false,      -- คิดตามมิเตอร์หรือเหมาจ่าย
    flat_rate DECIMAL(10,2),               -- อัตราเหมาจ่าย (ถ้า is_metered = false)
    rate_tiers JSONB,                      -- อัตราขั้นบันได [{min:0, max:10, rate:10}, ...]
    is_active BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. Billing Periods (รอบบิล)
-- =============================================
CREATE TABLE IF NOT EXISTS billing_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    period_month INTEGER NOT NULL,         -- เดือน (1-12)
    period_year INTEGER NOT NULL,          -- ปี (พ.ศ./ค.ศ.)
    is_closed BOOLEAN DEFAULT false,       -- ปิดรอบแล้วหรือยัง
    created_by UUID REFERENCES staff(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, period_month, period_year)
);

-- =============================================
-- 7. Bills (บิลรายบ้าน)
-- =============================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    billing_period_id UUID REFERENCES billing_periods(id) ON DELETE CASCADE,
    house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
    status billing_status DEFAULT 'unpaid',
    total_amount DECIMAL(10,2) DEFAULT 0,  -- ยอดรวมทั้งหมด
    notified_at TIMESTAMPTZ,               -- เวลาที่ส่งแจ้งเตือน LINE
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(billing_period_id, house_id)
);

-- =============================================
-- 8. Bill Items (รายการย่อยในบิล)
-- =============================================
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    utility_type utility_type NOT NULL,
    -- สำหรับค่าน้ำ (metered)
    previous_reading DECIMAL(10,2),        -- เลขมิเตอร์ครั้งก่อน
    current_reading DECIMAL(10,2),         -- เลขมิเตอร์ครั้งนี้
    units_used DECIMAL(10,2),              -- หน่วยที่ใช้ (current - previous)
    -- ยอดเงิน
    amount DECIMAL(10,2) NOT NULL,         -- จำนวนเงิน
    rate_snapshot JSONB,                   -- snapshot ของ rate ที่ใช้คำนวณ
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 9. Payments (การชำระเงิน)
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    house_id UUID REFERENCES houses(id),
    amount DECIMAL(10,2) NOT NULL,
    slip_image_url TEXT,                   -- URL รูปสลิป (บันทึกในเครื่อง Local/Public Folder)
    paid_at TIMESTAMPTZ DEFAULT now(),     -- เวลาที่ลูกบ้านส่ง
    verified_at TIMESTAMPTZ,               -- เวลาที่กรรมการยืนยัน
    verified_by UUID REFERENCES staff(id),
    note TEXT,                             -- หมายเหตุ
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes for Query Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_houses_community ON houses(community_id);
CREATE INDEX IF NOT EXISTS idx_house_members_line ON house_members(line_user_id);
CREATE INDEX IF NOT EXISTS idx_bills_period ON bills(billing_period_id);
CREATE INDEX IF NOT EXISTS idx_bills_house ON bills(house_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_staff_community ON staff(community_id);
