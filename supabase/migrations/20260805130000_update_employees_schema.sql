-- Add missing columns to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS employment_type TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update employee_status_enum safely
DO $$ BEGIN
    ALTER TYPE employee_status_enum ADD VALUE 'On Leave';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
