-- Phase 23D: Secure Purchases & Vendor Transactions RLS

-- 1. Drop the unsafe default policies on purchases
DROP POLICY IF EXISTS "Authenticated users can read purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.purchases;
DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.purchases;

-- 2. Drop the unsafe default policies on vendor_transactions
DROP POLICY IF EXISTS "Authenticated users can read vendor_transactions" ON public.vendor_transactions;
DROP POLICY IF EXISTS "Authenticated users can insert vendor_transactions" ON public.vendor_transactions;
DROP POLICY IF EXISTS "Authenticated users can update vendor_transactions" ON public.vendor_transactions;
DROP POLICY IF EXISTS "Authenticated users can delete vendor_transactions" ON public.vendor_transactions;

-- 3. Force RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases FORCE ROW LEVEL SECURITY;

ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_transactions FORCE ROW LEVEL SECURITY;

-- 4. Create strict policies following the Phase 12 pattern for purchases

-- SELECT: Any active user can read
DROP POLICY IF EXISTS purchases_select_authenticated ON public.purchases;
CREATE POLICY purchases_select_authenticated ON public.purchases
FOR SELECT TO authenticated USING (public.is_active_user());

-- INSERT: Only owners can create purchases
DROP POLICY IF EXISTS purchases_insert_owner ON public.purchases;
CREATE POLICY purchases_insert_owner ON public.purchases
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

-- UPDATE: Only owners can update purchases
DROP POLICY IF EXISTS purchases_update_owner ON public.purchases;
CREATE POLICY purchases_update_owner ON public.purchases
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

-- DELETE: Only owners can delete purchases
DROP POLICY IF EXISTS purchases_delete_owner ON public.purchases;
CREATE POLICY purchases_delete_owner ON public.purchases
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());

-- 5. Create strict policies following the Phase 12 pattern for vendor_transactions

-- SELECT: Any active user can read
DROP POLICY IF EXISTS vendor_transactions_select_authenticated ON public.vendor_transactions;
CREATE POLICY vendor_transactions_select_authenticated ON public.vendor_transactions
FOR SELECT TO authenticated USING (public.is_active_user());

-- INSERT: Only owners can create vendor transactions
DROP POLICY IF EXISTS vendor_transactions_insert_owner ON public.vendor_transactions;
CREATE POLICY vendor_transactions_insert_owner ON public.vendor_transactions
FOR INSERT TO authenticated WITH CHECK (public.is_active_user() AND public.is_owner());

-- UPDATE: Only owners can update vendor transactions
DROP POLICY IF EXISTS vendor_transactions_update_owner ON public.vendor_transactions;
CREATE POLICY vendor_transactions_update_owner ON public.vendor_transactions
FOR UPDATE TO authenticated USING (public.is_active_user() AND public.is_owner()) WITH CHECK (public.is_active_user() AND public.is_owner());

-- DELETE: Only owners can delete vendor transactions
DROP POLICY IF EXISTS vendor_transactions_delete_owner ON public.vendor_transactions;
CREATE POLICY vendor_transactions_delete_owner ON public.vendor_transactions
FOR DELETE TO authenticated USING (public.is_active_user() AND public.is_owner());
