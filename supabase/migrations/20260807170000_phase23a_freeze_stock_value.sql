-- PHASE 23A: Freeze Estimated Stock Value in daily_closings

ALTER TABLE daily_closings 
ADD COLUMN IF NOT EXISTS estimated_stock_value NUMERIC(12,2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN daily_closings.estimated_stock_value IS 'Snapshots the estimated stock value at the time the day is closed, preventing historical recalculation if profit margin changes.';
