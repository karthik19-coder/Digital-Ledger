-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE payment_method_enum AS ENUM ('Cash', 'UPI', 'Bank');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('Present', 'Absent', 'Half Day', 'Leave');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE salary_type_enum AS ENUM ('Daily', 'Monthly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE salary_payment_type_enum AS ENUM ('Advance', 'Settlement', 'Bonus', 'Deduction');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE fund_type_enum AS ENUM ('Injection', 'Withdrawal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type_enum AS ENUM ('Income', 'Expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE customer_transaction_type_enum AS ENUM ('Credit', 'Payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE vendor_transaction_type_enum AS ENUM ('Purchase', 'Payment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_movement_enum AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE daily_closing_status_enum AS ENUM ('Open', 'Closed', 'Locked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE employee_status_enum AS ENUM ('Active', 'Inactive', 'Terminated');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION current_user_uuid()
RETURNS UUID AS $$
BEGIN
    RETURN (current_setting('request.jwt.claim.sub', true))::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    IF current_user_uuid() IS NOT NULL THEN
        NEW.updated_by = current_user_uuid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION trigger_update_variant_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.movement_type = 'IN' OR NEW.movement_type = 'ADJUSTMENT' THEN
            UPDATE product_variants SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.variant_id;
        ELSIF NEW.movement_type = 'OUT' THEN
            UPDATE product_variants SET current_stock = current_stock - NEW.quantity, updated_at = now() WHERE id = NEW.variant_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.movement_type = 'IN' OR OLD.movement_type = 'ADJUSTMENT' THEN
            UPDATE product_variants SET current_stock = current_stock - OLD.quantity, updated_at = now() WHERE id = OLD.variant_id;
        ELSIF OLD.movement_type = 'OUT' THEN
            UPDATE product_variants SET current_stock = current_stock + OLD.quantity, updated_at = now() WHERE id = OLD.variant_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.movement_type = 'IN' OR OLD.movement_type = 'ADJUSTMENT' THEN
            UPDATE product_variants SET current_stock = current_stock - OLD.quantity, updated_at = now() WHERE id = OLD.variant_id;
        ELSIF OLD.movement_type = 'OUT' THEN
            UPDATE product_variants SET current_stock = current_stock + OLD.quantity, updated_at = now() WHERE id = OLD.variant_id;
        END IF;
        
        IF NEW.movement_type = 'IN' OR NEW.movement_type = 'ADJUSTMENT' THEN
            UPDATE product_variants SET current_stock = current_stock + NEW.quantity, updated_at = now() WHERE id = NEW.variant_id;
        ELSIF NEW.movement_type = 'OUT' THEN
            UPDATE product_variants SET current_stock = current_stock - NEW.quantity, updated_at = now() WHERE id = NEW.variant_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. TABLES

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'My Supermarket',
    owner_name TEXT,
    phone TEXT,
    gst_number TEXT,
    address TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    business_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    average_profit_margin NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_balance_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_balance_upi NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_customer_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_vendor_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_inventory_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    daily_wage NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    salary_type salary_type_enum NOT NULL,
    phone TEXT,
    join_date DATE NOT NULL,
    status employee_status_enum NOT NULL DEFAULT 'Active',
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    sku TEXT,
    barcode TEXT,
    variant_name TEXT NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date DATE NOT NULL,
    customer_id UUID,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    upi_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method payment_method_enum,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL,
    variant_id UUID NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    business_date DATE NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    upi_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_method payment_method_enum,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL,
    variant_id UUID NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL,
    total_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    business_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    type customer_transaction_type_enum NOT NULL,
    payment_method payment_method_enum,
    -- reference_id is an application-level polymorphic reference linking to sales or other entities
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS vendor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    business_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    type vendor_transaction_type_enum NOT NULL,
    payment_method payment_method_enum,
    -- reference_id is an application-level polymorphic reference linking to purchases or other entities
    reference_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL,
    adjustment_date DATE NOT NULL,
    quantity_change NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL,
    movement_type stock_movement_enum NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    -- reference_id is an application-level polymorphic reference linking to sales, purchases, or adjustments
    reference_id UUID,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    category_id UUID NOT NULL,
    expense_type TEXT NOT NULL DEFAULT 'business',
    payment_method payment_method_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS business_funds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    type fund_type_enum NOT NULL,
    payment_method payment_method_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    date DATE NOT NULL,
    status attendance_status_enum NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    business_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_type salary_payment_type_enum NOT NULL,
    payment_method payment_method_enum NOT NULL,
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS daily_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date DATE NOT NULL UNIQUE,
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    opening_upi NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_cash NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    expected_upi NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    actual_upi NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    difference NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status daily_closing_status_enum NOT NULL DEFAULT 'Open',
    closing_notes TEXT,
    closed_by UUID,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID DEFAULT current_user_uuid(),
    updated_by UUID DEFAULT current_user_uuid()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    created_by UUID DEFAULT current_user_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CONSTRAINTS (Check constraints for data integrity, conditionally dropped and re-added for idempotency)
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS chk_sale_items_total;
ALTER TABLE sale_items ADD CONSTRAINT chk_sale_items_total CHECK (total_price = quantity * unit_price);
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS chk_sale_items_qty_positive;
ALTER TABLE sale_items ADD CONSTRAINT chk_sale_items_qty_positive CHECK (quantity >= 0);

ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS chk_purchase_items_total;
ALTER TABLE purchase_items ADD CONSTRAINT chk_purchase_items_total CHECK (total_price = quantity * unit_price);
ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS chk_purchase_items_qty_positive;
ALTER TABLE purchase_items ADD CONSTRAINT chk_purchase_items_qty_positive CHECK (quantity >= 0);

ALTER TABLE sales DROP CONSTRAINT IF EXISTS chk_sales_amounts;
ALTER TABLE sales ADD CONSTRAINT chk_sales_amounts CHECK (total_amount = cash_amount + upi_amount + credit_amount);
ALTER TABLE sales DROP CONSTRAINT IF EXISTS chk_sales_total_positive;
ALTER TABLE sales ADD CONSTRAINT chk_sales_total_positive CHECK (total_amount >= 0);

ALTER TABLE purchases DROP CONSTRAINT IF EXISTS chk_purchases_amounts;
ALTER TABLE purchases ADD CONSTRAINT chk_purchases_amounts CHECK (total_amount = cash_amount + upi_amount + credit_amount);
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS chk_purchases_total_positive;
ALTER TABLE purchases ADD CONSTRAINT chk_purchases_total_positive CHECK (total_amount >= 0);

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variants_purchase_price;
ALTER TABLE product_variants ADD CONSTRAINT chk_variants_purchase_price CHECK (purchase_price >= 0);
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variants_selling_price;
ALTER TABLE product_variants ADD CONSTRAINT chk_variants_selling_price CHECK (selling_price >= 0);
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS chk_variants_min_stock;
ALTER TABLE product_variants ADD CONSTRAINT chk_variants_min_stock CHECK (minimum_stock >= 0);

ALTER TABLE customer_transactions DROP CONSTRAINT IF EXISTS chk_customer_transactions_amt;
ALTER TABLE customer_transactions ADD CONSTRAINT chk_customer_transactions_amt CHECK (amount >= 0);

ALTER TABLE vendor_transactions DROP CONSTRAINT IF EXISTS chk_vendor_transactions_amt;
ALTER TABLE vendor_transactions ADD CONSTRAINT chk_vendor_transactions_amt CHECK (amount >= 0);

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS chk_stock_movements_qty;
ALTER TABLE stock_movements ADD CONSTRAINT chk_stock_movements_qty CHECK (quantity >= 0);

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS chk_expenses_amt;
ALTER TABLE expenses ADD CONSTRAINT chk_expenses_amt CHECK (amount >= 0);

ALTER TABLE business_funds DROP CONSTRAINT IF EXISTS chk_business_funds_amt;
ALTER TABLE business_funds ADD CONSTRAINT chk_business_funds_amt CHECK (amount >= 0);

ALTER TABLE salary_payments DROP CONSTRAINT IF EXISTS chk_salary_payments_amt;
ALTER TABLE salary_payments ADD CONSTRAINT chk_salary_payments_amt CHECK (amount >= 0);

-- 7. FOREIGN KEYS (With RESTRICT to protect financial consistency, conditionally dropped/re-added)
ALTER TABLE products DROP CONSTRAINT IF EXISTS fk_products_category;
ALTER TABLE products ADD CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;

ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS fk_variants_product;
ALTER TABLE product_variants ADD CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS fk_sales_customer;
ALTER TABLE sales ADD CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS fk_sale_items_sale;
ALTER TABLE sale_items ADD CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE;

ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS fk_sale_items_variant;
ALTER TABLE sale_items ADD CONSTRAINT fk_sale_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

ALTER TABLE purchases DROP CONSTRAINT IF EXISTS fk_purchases_vendor;
ALTER TABLE purchases ADD CONSTRAINT fk_purchases_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;

ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS fk_purchase_items_purchase;
ALTER TABLE purchase_items ADD CONSTRAINT fk_purchase_items_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE;

ALTER TABLE purchase_items DROP CONSTRAINT IF EXISTS fk_purchase_items_variant;
ALTER TABLE purchase_items ADD CONSTRAINT fk_purchase_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

ALTER TABLE customer_transactions DROP CONSTRAINT IF EXISTS fk_customer_transactions_customer;
ALTER TABLE customer_transactions ADD CONSTRAINT fk_customer_transactions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE vendor_transactions DROP CONSTRAINT IF EXISTS fk_vendor_transactions_vendor;
ALTER TABLE vendor_transactions ADD CONSTRAINT fk_vendor_transactions_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT;

ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS fk_inventory_adjustments_variant;
ALTER TABLE inventory_adjustments ADD CONSTRAINT fk_inventory_adjustments_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS fk_stock_movements_variant;
ALTER TABLE stock_movements ADD CONSTRAINT fk_stock_movements_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT;

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS fk_expenses_category;
ALTER TABLE expenses ADD CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE RESTRICT;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS fk_attendance_employee;
ALTER TABLE attendance ADD CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

ALTER TABLE salary_payments DROP CONSTRAINT IF EXISTS fk_salary_payments_employee;
ALTER TABLE salary_payments ADD CONSTRAINT fk_salary_payments_employee FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT;

-- 8. UNIQUE CONSTRAINTS
CREATE UNIQUE INDEX IF NOT EXISTS uq_customers_phone ON customers (NULLIF(TRIM(phone), ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_vendors_phone ON vendors (NULLIF(TRIM(phone), ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_barcode ON product_variants (NULLIF(TRIM(barcode), ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_variants_sku ON product_variants (NULLIF(TRIM(sku), ''));
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_name ON expense_categories (TRIM(LOWER(name)));
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_name ON categories (TRIM(LOWER(name)));

-- 9. INDEXES
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON sales(business_date);
CREATE INDEX IF NOT EXISTS idx_purchases_business_date ON purchases(business_date);
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON expenses(business_date);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_business_date ON customer_transactions(business_date);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_business_date ON vendor_transactions(business_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_salary_payments_business_date ON salary_payments(business_date);
CREATE INDEX IF NOT EXISTS idx_business_funds_business_date ON business_funds(business_date);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_variant_id ON sale_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_variant_id ON purchase_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_vendor_transactions_vendor_id ON vendor_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_id ON salary_payments(employee_id);

-- 10. TRIGGERS

-- Drop existing triggers for idempotency
DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON customers;
DROP TRIGGER IF EXISTS trg_vendors_updated_at ON vendors;
DROP TRIGGER IF EXISTS trg_employees_updated_at ON employees;
DROP TRIGGER IF EXISTS trg_expense_categories_updated_at ON expense_categories;
DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON product_variants;
DROP TRIGGER IF EXISTS trg_sales_updated_at ON sales;
DROP TRIGGER IF EXISTS trg_sale_items_updated_at ON sale_items;
DROP TRIGGER IF EXISTS trg_purchases_updated_at ON purchases;
DROP TRIGGER IF EXISTS trg_purchase_items_updated_at ON purchase_items;
DROP TRIGGER IF EXISTS trg_customer_transactions_updated_at ON customer_transactions;
DROP TRIGGER IF EXISTS trg_vendor_transactions_updated_at ON vendor_transactions;
DROP TRIGGER IF EXISTS trg_inventory_adjustments_updated_at ON inventory_adjustments;
DROP TRIGGER IF EXISTS trg_stock_movements_updated_at ON stock_movements;
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON expenses;
DROP TRIGGER IF EXISTS trg_business_funds_updated_at ON business_funds;
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
DROP TRIGGER IF EXISTS trg_salary_payments_updated_at ON salary_payments;
DROP TRIGGER IF EXISTS trg_daily_closings_updated_at ON daily_closings;
DROP TRIGGER IF EXISTS trg_stock_movement_update ON stock_movements;

-- Recreate Updated At Triggers
CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_expense_categories_updated_at BEFORE UPDATE ON expense_categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_sales_updated_at BEFORE UPDATE ON sales FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_sale_items_updated_at BEFORE UPDATE ON sale_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_purchases_updated_at BEFORE UPDATE ON purchases FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_purchase_items_updated_at BEFORE UPDATE ON purchase_items FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_customer_transactions_updated_at BEFORE UPDATE ON customer_transactions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_vendor_transactions_updated_at BEFORE UPDATE ON vendor_transactions FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_inventory_adjustments_updated_at BEFORE UPDATE ON inventory_adjustments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_stock_movements_updated_at BEFORE UPDATE ON stock_movements FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_business_funds_updated_at BEFORE UPDATE ON business_funds FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_salary_payments_updated_at BEFORE UPDATE ON salary_payments FOR EACH ROW EXECUTE FUNCTION update_modified_column();
CREATE TRIGGER trg_daily_closings_updated_at BEFORE UPDATE ON daily_closings FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Recreate Stock Update Trigger
CREATE TRIGGER trg_stock_movement_update AFTER INSERT OR UPDATE OR DELETE ON stock_movements FOR EACH ROW EXECUTE FUNCTION trigger_update_variant_stock();

-- 11. VIEWS (None explicitly required by blueprint for initial setup)

-- 12. RLS ENABLE
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. RLS POLICIES
DO $$ 
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
    LOOP
        -- Drop existing policies to ensure idempotency
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can read %I" ON %I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert %I" ON %I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update %I" ON %I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete %I" ON %I;', tbl, tbl);
        
        -- Create policies
        EXECUTE format('CREATE POLICY "Authenticated users can read %I" ON %I FOR SELECT TO authenticated USING (true);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Authenticated users can insert %I" ON %I FOR INSERT TO authenticated WITH CHECK (true);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Authenticated users can update %I" ON %I FOR UPDATE TO authenticated USING (true);', tbl, tbl);
        EXECUTE format('CREATE POLICY "Authenticated users can delete %I" ON %I FOR DELETE TO authenticated USING (true);', tbl, tbl);
    END LOOP;
END $$;

-- 14. DEFAULT SETTINGS SEED (Idempotent)
INSERT INTO settings (
    store_name, currency, timezone, average_profit_margin, 
    opening_balance_cash, opening_balance_upi, opening_customer_due, 
    opening_vendor_due, opening_inventory_value
) 
SELECT 
    'My Supermarket', 'INR', 'Asia/Kolkata', 0.00, 
    0.00, 0.00, 0.00, 
    0.00, 0.00
WHERE NOT EXISTS (SELECT 1 FROM settings);
