-- Rollback for Phase 12B.1: RLS Helper Functions and Indexes

-- 1. Drop Indexes
DROP INDEX IF EXISTS public.idx_profiles_role;
DROP INDEX IF EXISTS public.idx_profiles_is_active;

DROP INDEX IF EXISTS public.idx_sales_customer_id;
DROP INDEX IF EXISTS public.idx_customer_transactions_customer_id;
DROP INDEX IF EXISTS public.idx_vendor_transactions_vendor_id;
DROP INDEX IF EXISTS public.idx_attendance_employee_id;
DROP INDEX IF EXISTS public.idx_salary_payments_employee_id;
DROP INDEX IF EXISTS public.idx_expenses_category_id;

-- 2. Drop Helper Functions
DROP FUNCTION IF EXISTS public.is_owner();
DROP FUNCTION IF EXISTS public.is_viewer();
DROP FUNCTION IF EXISTS public.is_active_user();
