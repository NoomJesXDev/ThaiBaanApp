-- Allow multiple billing rounds in the same month (e.g., regular monthly utilities + multiple funeral/special collections)

ALTER TABLE billing_periods
  ADD COLUMN IF NOT EXISTS round_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS round_name TEXT;

ALTER TABLE billing_periods
  DROP CONSTRAINT IF EXISTS billing_periods_community_id_period_month_period_year_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_periods_community_month_year_round_key'
  ) THEN
    ALTER TABLE billing_periods
      ADD CONSTRAINT billing_periods_community_month_year_round_key
      UNIQUE (community_id, period_month, period_year, round_number);
  END IF;
END $$;
