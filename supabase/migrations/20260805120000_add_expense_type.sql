DO $$ BEGIN
    CREATE TYPE expense_type_enum AS ENUM ('business', 'personal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS expense_type expense_type_enum NOT NULL DEFAULT 'business';
