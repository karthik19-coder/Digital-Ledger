-- Phase 12: Simplified RLS for Version 1
-- Protects sales, expenses, business_funds, and daily_closings (closing_records)

-- SALES
DROP POLICY IF EXISTS "Authenticated users can read sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can delete sales" ON public.sales;

-- EXPENSES
DROP POLICY IF EXISTS "Authenticated users can read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;

-- BUSINESS FUNDS
DROP POLICY IF EXISTS "Authenticated users can read business_funds" ON public.business_funds;
DROP POLICY IF EXISTS "Authenticated users can insert business_funds" ON public.business_funds;
DROP POLICY IF EXISTS "Authenticated users can update business_funds" ON public.business_funds;
DROP POLICY IF EXISTS "Authenticated users can delete business_funds" ON public.business_funds;

-- CLOSING RECORDS (table: daily_closings)
DROP POLICY IF EXISTS "Authenticated users can read daily_closings" ON public.daily_closings;
DROP POLICY IF EXISTS "Authenticated users can insert daily_closings" ON public.daily_closings;
DROP POLICY IF EXISTS "Authenticated users can update daily_closings" ON public.daily_closings;
DROP POLICY IF EXISTS "Authenticated users can delete daily_closings" ON public.daily_closings;

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

-- Force RLS
ALTER TABLE public.sales FORCE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.business_funds FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings FORCE ROW LEVEL SECURITY;

-- CREATE NEW STRICT POLICIES --

-- SALES
DROP POLICY IF EXISTS sales_select_authenticated ON public.sales;
CREATE POLICY sales_select_authenticated ON public.sales
FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS sales_insert_owner ON public.sales;
CREATE POLICY sales_insert_owner ON public.sales
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS sales_update_owner ON public.sales;
CREATE POLICY sales_update_owner ON public.sales
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS sales_delete_owner ON public.sales;
CREATE POLICY sales_delete_owner ON public.sales
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());

-- EXPENSES
DROP POLICY IF EXISTS expenses_select_authenticated ON public.expenses;
CREATE POLICY expenses_select_authenticated ON public.expenses
FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS expenses_insert_owner ON public.expenses;
CREATE POLICY expenses_insert_owner ON public.expenses
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS expenses_update_owner ON public.expenses;
CREATE POLICY expenses_update_owner ON public.expenses
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS expenses_delete_owner ON public.expenses;
CREATE POLICY expenses_delete_owner ON public.expenses
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());

-- BUSINESS FUNDS
DROP POLICY IF EXISTS business_funds_select_authenticated ON public.business_funds;
CREATE POLICY business_funds_select_authenticated ON public.business_funds
FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS business_funds_insert_owner ON public.business_funds;
CREATE POLICY business_funds_insert_owner ON public.business_funds
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS business_funds_update_owner ON public.business_funds;
CREATE POLICY business_funds_update_owner ON public.business_funds
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS business_funds_delete_owner ON public.business_funds;
CREATE POLICY business_funds_delete_owner ON public.business_funds
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());

-- CLOSING RECORDS (table: daily_closings)
DROP POLICY IF EXISTS closing_records_select_authenticated ON public.daily_closings;
CREATE POLICY closing_records_select_authenticated ON public.daily_closings
FOR SELECT TO authenticated USING (public.is_active_user());

DROP POLICY IF EXISTS closing_records_insert_owner ON public.daily_closings;
CREATE POLICY closing_records_insert_owner ON public.daily_closings
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS closing_records_update_owner ON public.daily_closings;
CREATE POLICY closing_records_update_owner ON public.daily_closings
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

DROP POLICY IF EXISTS closing_records_delete_owner ON public.daily_closings;
CREATE POLICY closing_records_delete_owner ON public.daily_closings
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());
