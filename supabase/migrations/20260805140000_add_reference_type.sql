-- Add reference_type to customer_transactions and vendor_transactions

ALTER TABLE customer_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT NULL;
ALTER TABLE vendor_transactions ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT NULL;
