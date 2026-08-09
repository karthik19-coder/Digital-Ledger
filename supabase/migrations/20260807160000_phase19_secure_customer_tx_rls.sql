-- Phase 19A: Secure Customer Transactions RLS

-- 1. Drop the unsafe default policies
DROP POLICY IF EXISTS "Authenticated users can read customer_transactions" ON public.customer_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert customer_transactions" ON public.customer_transactions;
DROP POLICY IF EXISTS "Authenticated users can update customer_transactions" ON public.customer_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete customer_transactions" ON public.customer_transactions;

-- 2. Force RLS
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_transactions FORCE ROW LEVEL SECURITY;

-- 3. Create strict policies following the Phase 12 pattern

-- SELECT: Any active user can read
DROP POLICY IF EXISTS customer_transactions_select_authenticated ON public.customer_transactions;
CREATE POLICY customer_transactions_select_authenticated ON public.customer_transactions
FOR SELECT TO authenticated USING (public.is_active_user());

-- INSERT: Only owners can create customer transactions
DROP POLICY IF EXISTS customer_transactions_insert_owner ON public.customer_transactions;
CREATE POLICY customer_transactions_insert_owner ON public.customer_transactions
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

-- UPDATE: Only owners can update customer transactions
DROP POLICY IF EXISTS customer_transactions_update_owner ON public.customer_transactions;
CREATE POLICY customer_transactions_update_owner ON public.customer_transactions
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

-- DELETE: Only owners can delete customer transactions
DROP POLICY IF EXISTS customer_transactions_delete_owner ON public.customer_transactions;
CREATE POLICY customer_transactions_delete_owner ON public.customer_transactions
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());
