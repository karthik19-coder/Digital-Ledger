-- Migration: 20260811000000_single_shop_rls_lockdown.sql
-- Purpose: Lock down the 14 un-hardened tables for the Single-Shop Launch Freeze.
-- 
-- Scope:
-- 1. Drops the exact permissive wildcard policies ("Authenticated users can...") created in the initial schema.
-- 2. Enforces Row Level Security (ENABLE and FORCE RLS) on all 14 tables.
-- 3. Read Access:
--    - Active users (public.is_active_user()) can read operational store data (customers, vendors,
--      catalog, employees, attendance, and salary totals needed by financial calculation engine).
--    - Confidential audit logs (audit_logs) are restricted strictly to active owners (public.is_owner()).
-- 4. Write Access:
--    - INSERT, UPDATE, and DELETE are strictly restricted to active owners (public.is_active_user() AND public.is_owner()).
--    - For UPDATE, both USING and WITH CHECK clauses are strictly enforced.
--    - For audit_logs, UPDATE and DELETE policies are completely omitted (immutability).

-- ==============================================================================
-- 1. CUSTOMERS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;
DROP POLICY IF EXISTS customers_select ON public.customers;
DROP POLICY IF EXISTS customers_insert_owner ON public.customers;
DROP POLICY IF EXISTS customers_update_owner ON public.customers;
DROP POLICY IF EXISTS customers_delete_owner ON public.customers;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers FORCE ROW LEVEL SECURITY;

CREATE POLICY customers_select ON public.customers
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY customers_insert_owner ON public.customers
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY customers_update_owner ON public.customers
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY customers_delete_owner ON public.customers
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 2. VENDORS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can update vendors" ON public.vendors;
DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON public.vendors;
DROP POLICY IF EXISTS vendors_select ON public.vendors;
DROP POLICY IF EXISTS vendors_insert_owner ON public.vendors;
DROP POLICY IF EXISTS vendors_update_owner ON public.vendors;
DROP POLICY IF EXISTS vendors_delete_owner ON public.vendors;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors FORCE ROW LEVEL SECURITY;

CREATE POLICY vendors_select ON public.vendors
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY vendors_insert_owner ON public.vendors
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY vendors_update_owner ON public.vendors
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY vendors_delete_owner ON public.vendors
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 3. EMPLOYEES
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can insert employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can update employees" ON public.employees;
DROP POLICY IF EXISTS "Authenticated users can delete employees" ON public.employees;
DROP POLICY IF EXISTS employees_select ON public.employees;
DROP POLICY IF EXISTS employees_insert_owner ON public.employees;
DROP POLICY IF EXISTS employees_update_owner ON public.employees;
DROP POLICY IF EXISTS employees_delete_owner ON public.employees;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

CREATE POLICY employees_select ON public.employees
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY employees_insert_owner ON public.employees
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY employees_update_owner ON public.employees
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY employees_delete_owner ON public.employees
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 4. ATTENDANCE
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can insert attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can update attendance" ON public.attendance;
DROP POLICY IF EXISTS "Authenticated users can delete attendance" ON public.attendance;
DROP POLICY IF EXISTS attendance_select ON public.attendance;
DROP POLICY IF EXISTS attendance_insert_owner ON public.attendance;
DROP POLICY IF EXISTS attendance_update_owner ON public.attendance;
DROP POLICY IF EXISTS attendance_delete_owner ON public.attendance;

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance FORCE ROW LEVEL SECURITY;

CREATE POLICY attendance_select ON public.attendance
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY attendance_insert_owner ON public.attendance
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY attendance_update_owner ON public.attendance
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY attendance_delete_owner ON public.attendance
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 5. SALARY PAYMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated users can insert salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated users can update salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS "Authenticated users can delete salary_payments" ON public.salary_payments;
DROP POLICY IF EXISTS salary_payments_select ON public.salary_payments;
DROP POLICY IF EXISTS salary_payments_insert_owner ON public.salary_payments;
DROP POLICY IF EXISTS salary_payments_update_owner ON public.salary_payments;
DROP POLICY IF EXISTS salary_payments_delete_owner ON public.salary_payments;

ALTER TABLE public.salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_payments FORCE ROW LEVEL SECURITY;

-- Note: Financial calculation engine requires salary totals for cumulative cash balance calculations
CREATE POLICY salary_payments_select ON public.salary_payments
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY salary_payments_insert_owner ON public.salary_payments
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY salary_payments_update_owner ON public.salary_payments
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY salary_payments_delete_owner ON public.salary_payments
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 6. CATEGORIES
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated users can delete categories" ON public.categories;
DROP POLICY IF EXISTS categories_select ON public.categories;
DROP POLICY IF EXISTS categories_insert_owner ON public.categories;
DROP POLICY IF EXISTS categories_update_owner ON public.categories;
DROP POLICY IF EXISTS categories_delete_owner ON public.categories;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

CREATE POLICY categories_select ON public.categories
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY categories_insert_owner ON public.categories
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY categories_update_owner ON public.categories
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY categories_delete_owner ON public.categories
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 7. EXPENSE CATEGORIES
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Authenticated users can insert expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Authenticated users can update expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Authenticated users can delete expense_categories" ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_select ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_insert_owner ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_update_owner ON public.expense_categories;
DROP POLICY IF EXISTS expense_categories_delete_owner ON public.expense_categories;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY expense_categories_select ON public.expense_categories
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY expense_categories_insert_owner ON public.expense_categories
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY expense_categories_update_owner ON public.expense_categories
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY expense_categories_delete_owner ON public.expense_categories
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 8. PRODUCTS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON public.products;
DROP POLICY IF EXISTS products_select ON public.products;
DROP POLICY IF EXISTS products_insert_owner ON public.products;
DROP POLICY IF EXISTS products_update_owner ON public.products;
DROP POLICY IF EXISTS products_delete_owner ON public.products;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;

CREATE POLICY products_select ON public.products
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY products_insert_owner ON public.products
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY products_update_owner ON public.products
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY products_delete_owner ON public.products
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 9. PRODUCT VARIANTS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can insert product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can update product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can delete product_variants" ON public.product_variants;
DROP POLICY IF EXISTS product_variants_select ON public.product_variants;
DROP POLICY IF EXISTS product_variants_insert_owner ON public.product_variants;
DROP POLICY IF EXISTS product_variants_update_owner ON public.product_variants;
DROP POLICY IF EXISTS product_variants_delete_owner ON public.product_variants;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants FORCE ROW LEVEL SECURITY;

CREATE POLICY product_variants_select ON public.product_variants
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY product_variants_insert_owner ON public.product_variants
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY product_variants_update_owner ON public.product_variants
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY product_variants_delete_owner ON public.product_variants
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 10. SALE ITEMS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can insert sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can update sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "Authenticated users can delete sale_items" ON public.sale_items;
DROP POLICY IF EXISTS sale_items_select ON public.sale_items;
DROP POLICY IF EXISTS sale_items_insert_owner ON public.sale_items;
DROP POLICY IF EXISTS sale_items_update_owner ON public.sale_items;
DROP POLICY IF EXISTS sale_items_delete_owner ON public.sale_items;

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items FORCE ROW LEVEL SECURITY;

CREATE POLICY sale_items_select ON public.sale_items
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY sale_items_insert_owner ON public.sale_items
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY sale_items_update_owner ON public.sale_items
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY sale_items_delete_owner ON public.sale_items
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 11. PURCHASE ITEMS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Authenticated users can insert purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Authenticated users can update purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS "Authenticated users can delete purchase_items" ON public.purchase_items;
DROP POLICY IF EXISTS purchase_items_select ON public.purchase_items;
DROP POLICY IF EXISTS purchase_items_insert_owner ON public.purchase_items;
DROP POLICY IF EXISTS purchase_items_update_owner ON public.purchase_items;
DROP POLICY IF EXISTS purchase_items_delete_owner ON public.purchase_items;

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items FORCE ROW LEVEL SECURITY;

CREATE POLICY purchase_items_select ON public.purchase_items
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY purchase_items_insert_owner ON public.purchase_items
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY purchase_items_update_owner ON public.purchase_items
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY purchase_items_delete_owner ON public.purchase_items
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 12. STOCK MOVEMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can insert stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can update stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "Authenticated users can delete stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_insert_owner ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_update_owner ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_delete_owner ON public.stock_movements;

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements FORCE ROW LEVEL SECURITY;

CREATE POLICY stock_movements_select ON public.stock_movements
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY stock_movements_insert_owner ON public.stock_movements
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY stock_movements_update_owner ON public.stock_movements
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY stock_movements_delete_owner ON public.stock_movements
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 13. INVENTORY ADJUSTMENTS
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read inventory_adjustments" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Authenticated users can insert inventory_adjustments" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Authenticated users can update inventory_adjustments" ON public.inventory_adjustments;
DROP POLICY IF EXISTS "Authenticated users can delete inventory_adjustments" ON public.inventory_adjustments;
DROP POLICY IF EXISTS inventory_adjustments_select ON public.inventory_adjustments;
DROP POLICY IF EXISTS inventory_adjustments_insert_owner ON public.inventory_adjustments;
DROP POLICY IF EXISTS inventory_adjustments_update_owner ON public.inventory_adjustments;
DROP POLICY IF EXISTS inventory_adjustments_delete_owner ON public.inventory_adjustments;

ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_adjustments FORCE ROW LEVEL SECURITY;

CREATE POLICY inventory_adjustments_select ON public.inventory_adjustments
FOR SELECT TO authenticated
USING (public.is_active_user());

CREATE POLICY inventory_adjustments_insert_owner ON public.inventory_adjustments
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY inventory_adjustments_update_owner ON public.inventory_adjustments
FOR UPDATE TO authenticated
USING (public.is_active_user() AND public.is_owner())
WITH CHECK (public.is_active_user() AND public.is_owner());

CREATE POLICY inventory_adjustments_delete_owner ON public.inventory_adjustments
FOR DELETE TO authenticated
USING (public.is_active_user() AND public.is_owner());


-- ==============================================================================
-- 14. AUDIT LOGS (Confidential System Log)
-- ==============================================================================
DROP POLICY IF EXISTS "Authenticated users can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can delete audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_select_owner ON public.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_owner ON public.audit_logs;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- Read: Strictly restricted to active owners (audit logs contain sensitive historical modifications)
CREATE POLICY audit_logs_select_owner ON public.audit_logs
FOR SELECT TO authenticated
USING (public.is_active_user() AND public.is_owner());

-- Insert: Generated exclusively during owner-initiated operations (e.g., settings mutations)
CREATE POLICY audit_logs_insert_owner ON public.audit_logs
FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND public.is_owner());

-- Note: UPDATE and DELETE policies are intentionally omitted to preserve audit log immutability.
