-- Add arrears_amount to bills table
ALTER TABLE bills ADD COLUMN IF NOT EXISTS arrears_amount NUMERIC DEFAULT 0;
