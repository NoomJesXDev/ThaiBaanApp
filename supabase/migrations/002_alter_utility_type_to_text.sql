-- 1. Alter utility_type columns from Enum to Text
ALTER TABLE utility_rates ALTER COLUMN utility_type TYPE TEXT;
ALTER TABLE bill_items ALTER COLUMN utility_type TYPE TEXT;

-- 2. Add selected_items array column to billing_periods
ALTER TABLE billing_periods ADD COLUMN IF NOT EXISTS selected_items JSONB DEFAULT '[]'::jsonb;

-- 3. Create billing_sets table to store fee bundles
CREATE TABLE IF NOT EXISTS billing_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
