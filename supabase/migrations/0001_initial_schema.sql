-- ==========================================
-- 0. Functions and Triggers
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- 1. settings
-- ==========================================
CREATE TABLE settings (
    id INT PRIMARY KEY DEFAULT 1,
    shop_name VARCHAR NOT NULL,
    owner_name VARCHAR NOT NULL,
    password_hash VARCHAR NOT NULL,
    currency VARCHAR NOT NULL DEFAULT 'INR',
    opening_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
    opening_upi NUMERIC(12,2) NOT NULL DEFAULT 0,
    opening_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
    average_profit_margin NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT settings_single_row CHECK (id = 1)
);

COMMENT ON TABLE settings IS 'Stores the global, singleton configuration for the single supermarket.';
COMMENT ON COLUMN settings.password_hash IS 'Stores only the hashed password. During first-time setup, the application hashes the owner''s password before saving it. Plain text passwords must never be stored.';
COMMENT ON COLUMN settings.average_profit_margin IS 'Stored as a percentage (e.g., 15.00 for 15%).';

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 2. sales
-- ==========================================
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_date DATE NOT NULL UNIQUE,
    cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    upi_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    reference_number VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sales IS 'Stores the daily aggregation of cash and UPI sales.';

CREATE INDEX idx_sales_sale_date ON sales(sale_date);

CREATE TRIGGER update_sales_updated_at
    BEFORE UPDATE ON sales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 3. customers
-- ==========================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE customers IS 'Stores customer profiles for tracking khata (credit). Name is explicitly not unique at DB level to allow application-level warnings over blocking.';

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 4. customer_transactions
-- ==========================================
CREATE TABLE customer_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    transaction_type VARCHAR NOT NULL,
    payment_method VARCHAR,
    amount NUMERIC(12,2) NOT NULL,
    reference_number VARCHAR,
    notes TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_customer_transaction_type
        CHECK (transaction_type IN ('credit', 'payment')),
    CONSTRAINT chk_customer_payment_method
        CHECK (payment_method IN ('cash', 'upi') OR payment_method IS NULL),
    CONSTRAINT chk_customer_transaction_logic
        CHECK (
            (transaction_type = 'payment' AND payment_method IS NOT NULL) OR
            (transaction_type = 'credit' AND payment_method IS NULL)
        ),
    CONSTRAINT chk_customer_amount
        CHECK (amount > 0)
);

COMMENT ON TABLE customer_transactions IS 'Stores both credit given to a customer and payments received from them.';

CREATE INDEX idx_customer_transactions_customer_id ON customer_transactions(customer_id);
CREATE INDEX idx_customer_transactions_date ON customer_transactions(transaction_date);

-- ==========================================
-- 5. vendors
-- ==========================================
CREATE TABLE vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name VARCHAR NOT NULL,
    phone VARCHAR,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE vendors IS 'Stores supplier/vendor profiles. Name is explicitly not unique at DB level.';

CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. stock_purchases
-- ==========================================
CREATE TABLE stock_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    invoice_number VARCHAR,
    purchase_date DATE NOT NULL,
    purchase_amount NUMERIC(12,2) NOT NULL,
    payment_type VARCHAR NOT NULL,
    paid_amount NUMERIC(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_vendor_stock
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_stock_payment_type
        CHECK (payment_type IN ('paid', 'partial', 'credit')),
    CONSTRAINT chk_stock_purchase_amount
        CHECK (purchase_amount >= 0),
    CONSTRAINT chk_stock_paid_amount
        CHECK (paid_amount >= 0),
    CONSTRAINT chk_stock_paid_vs_purchase
        CHECK (paid_amount <= purchase_amount)
);

COMMENT ON TABLE stock_purchases IS 'Logs individual stock deliveries and their initial payment statuses.';

CREATE INDEX idx_stock_purchases_vendor_id ON stock_purchases(vendor_id);
CREATE INDEX idx_stock_purchases_date ON stock_purchases(purchase_date);

-- ==========================================
-- 7. vendor_transactions
-- ==========================================
CREATE TABLE vendor_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR NOT NULL,
    payment_date DATE NOT NULL,
    reference_number VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_vendor_transaction
        FOREIGN KEY (vendor_id)
        REFERENCES vendors(id)
        ON DELETE RESTRICT,
    CONSTRAINT chk_vendor_payment_method
        CHECK (payment_method IN ('cash', 'upi')),
    CONSTRAINT chk_vendor_amount
        CHECK (amount > 0)
);

COMMENT ON TABLE vendor_transactions IS 'Logs subsequent payments made to vendors to clear outstanding balances.';

CREATE INDEX idx_vendor_transactions_vendor_id ON vendor_transactions(vendor_id);
CREATE INDEX idx_vendor_transactions_date ON vendor_transactions(payment_date);

-- ==========================================
-- 8. expenses
-- ==========================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_name VARCHAR NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR NOT NULL,
    expense_date DATE NOT NULL,
    reference_number VARCHAR,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expense_payment_method
        CHECK (payment_method IN ('cash', 'upi')),
    CONSTRAINT chk_expense_amount
        CHECK (amount > 0)
);

COMMENT ON TABLE expenses IS 'Logs daily operational expenses for the shop.';

CREATE INDEX idx_expenses_date ON expenses(expense_date);

-- ==========================================
-- 9. daily_summary
-- ==========================================
CREATE TABLE daily_summary (
    date DATE PRIMARY KEY,
    cash_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    upi_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    credit_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
    expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
    stock_added NUMERIC(12,2) NOT NULL DEFAULT 0,
    customer_payments NUMERIC(12,2) NOT NULL DEFAULT 0,
    vendor_payments NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE daily_summary IS 'Automatically maintained by the application to improve dashboard and report performance.';

CREATE TRIGGER update_daily_summary_updated_at
    BEFORE UPDATE ON daily_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
