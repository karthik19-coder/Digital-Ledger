-- Phase 12: Simplified RLS for Version 1 (Rollback)

-- Drop policies for closing_records (daily_closings)
DROP POLICY IF EXISTS closing_records_delete_owner ON public.daily_closings;
DROP POLICY IF EXISTS closing_records_update_owner ON public.daily_closings;
DROP POLICY IF EXISTS closing_records_insert_owner ON public.daily_closings;
DROP POLICY IF EXISTS closing_records_select_authenticated ON public.daily_closings;

-- Drop policies for business_funds
DROP POLICY IF EXISTS business_funds_delete_owner ON public.business_funds;
DROP POLICY IF EXISTS business_funds_update_owner ON public.business_funds;
DROP POLICY IF EXISTS business_funds_insert_owner ON public.business_funds;
DROP POLICY IF EXISTS business_funds_select_authenticated ON public.business_funds;

-- Drop policies for expenses
DROP POLICY IF EXISTS expenses_delete_owner ON public.expenses;
DROP POLICY IF EXISTS expenses_update_owner ON public.expenses;
DROP POLICY IF EXISTS expenses_insert_owner ON public.expenses;
DROP POLICY IF EXISTS expenses_select_authenticated ON public.expenses;

-- Drop policies for sales
DROP POLICY IF EXISTS sales_delete_owner ON public.sales;
DROP POLICY IF EXISTS sales_update_owner ON public.sales;
DROP POLICY IF EXISTS sales_insert_owner ON public.sales;
DROP POLICY IF EXISTS sales_select_authenticated ON public.sales;

-- Disable RLS
ALTER TABLE public.daily_closings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_funds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales DISABLE ROW LEVEL SECURITY;
