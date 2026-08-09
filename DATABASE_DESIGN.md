# Database Design Document: Supermarket Digital Ledger

## Overview
This document outlines the database schema for the Supermarket Digital Ledger. The architecture is strictly normalized to act as a single source of truth. No computed totals, redundant fields, or authentication layers are included. All business intelligence and metrics will be calculated dynamically from this raw data.

---

## 1. Tables & Schema

### `settings`
Stores the global, singleton configuration for the single supermarket.
*   **Columns**:
    *   `shop_name` (VARCHAR, NOT NULL)
    *   `owner_name` (VARCHAR, NOT NULL)
    *   `password_hash` (VARCHAR, NOT NULL) - *Note: Stores only the hashed password. During first-time setup, the application hashes the owner's password before saving it. Plain text passwords must never be stored.*
    *   `currency` (VARCHAR, NOT NULL DEFAULT 'INR')
    *   `opening_cash` (NUMERIC, NOT NULL DEFAULT 0)
    *   `opening_upi` (NUMERIC, NOT NULL DEFAULT 0)
    *   `opening_stock` (NUMERIC, NOT NULL DEFAULT 0)
    *   `average_profit_margin` (NUMERIC, NOT NULL DEFAULT 0) - Stored as a percentage (e.g., 15.00 for 15%).
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
    *   `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Constraints**:
    *   Only one row should exist (enforced via a check constraint, e.g., `id = 1` if an ID column is added, or managed purely via application logic).

### `sales`
Stores the daily aggregation of cash and UPI sales.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `sale_date` (DATE, NOT NULL, UNIQUE)
    *   `cash_sales` (NUMERIC, NOT NULL DEFAULT 0)
    *   `upi_sales` (NUMERIC, NOT NULL DEFAULT 0)
    *   `reference_number` (VARCHAR)
    *   `notes` (TEXT)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
    *   `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Indexes**:
    *   Index on `sale_date` for fast date-range filtering.

### `customers`
Stores customer profiles for tracking khata (credit).
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `name` (VARCHAR, NOT NULL) - *Note: Not unique at DB level. App warns on duplicates but allows creation.*
    *   `phone` (VARCHAR)
    *   `address` (TEXT)
    *   `notes` (TEXT)
    *   `is_active` (BOOLEAN, NOT NULL DEFAULT TRUE)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
    *   `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

### `customer_transactions`
Stores both credit given to a customer and payments received from them.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `customer_id` (UUID, NOT NULL, FOREIGN KEY to `customers(id)`)
    *   `transaction_type` (VARCHAR, NOT NULL)
    *   `payment_method` (VARCHAR)
    *   `amount` (NUMERIC, NOT NULL, CHECK (amount > 0))
    *   `reference_number` (VARCHAR)
    *   `notes` (TEXT)
    *   `transaction_date` (DATE, NOT NULL)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Constraints**:
    *   `CHECK (transaction_type IN ('credit', 'payment'))`
    *   `CHECK (payment_method IN ('cash', 'upi') OR payment_method IS NULL)`
    *   `CHECK ((transaction_type = 'payment' AND payment_method IS NOT NULL) OR (transaction_type = 'credit' AND payment_method IS NULL))`
*   **Indexes**:
    *   Index on `customer_id`.
    *   Index on `transaction_date`.

### `vendors`
Stores supplier/vendor profiles.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `vendor_name` (VARCHAR, NOT NULL) - *Note: Not unique at DB level. App warns on duplicates but allows creation.*
    *   `phone` (VARCHAR)
    *   `address` (TEXT)
    *   `notes` (TEXT)
    *   `is_active` (BOOLEAN, NOT NULL DEFAULT TRUE)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
    *   `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

### `stock_purchases`
Logs individual stock deliveries and their initial payment statuses.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `vendor_id` (UUID, NOT NULL, FOREIGN KEY to `vendors(id)`)
    *   `invoice_number` (VARCHAR)
    *   `purchase_date` (DATE, NOT NULL)
    *   `purchase_amount` (NUMERIC, NOT NULL, CHECK (purchase_amount >= 0))
    *   `payment_type` (VARCHAR, NOT NULL)
    *   `paid_amount` (NUMERIC, NOT NULL, CHECK (paid_amount >= 0))
    *   `notes` (TEXT)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Constraints**:
    *   `CHECK (payment_type IN ('paid', 'partial', 'credit'))`
    *   `CHECK (paid_amount <= purchase_amount)`
*   **Indexes**:
    *   Index on `vendor_id`.
    *   Index on `purchase_date`.

### `vendor_transactions`
Logs subsequent payments made to vendors to clear outstanding balances.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `vendor_id` (UUID, NOT NULL, FOREIGN KEY to `vendors(id)`)
    *   `amount` (NUMERIC, NOT NULL, CHECK (amount > 0))
    *   `payment_method` (VARCHAR, NOT NULL)
    *   `payment_date` (DATE, NOT NULL)
    *   `reference_number` (VARCHAR)
    *   `notes` (TEXT)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Constraints**:
    *   `CHECK (payment_method IN ('cash', 'upi'))`
*   **Indexes**:
    *   Index on `vendor_id`.
    *   Index on `payment_date`.

### `expenses`
Logs daily operational expenses for the shop.
*   **Columns**:
    *   `id` (UUID, PRIMARY KEY, DEFAULT gen_random_uuid())
    *   `expense_name` (VARCHAR, NOT NULL)
    *   `amount` (NUMERIC, NOT NULL, CHECK (amount > 0))
    *   `payment_method` (VARCHAR, NOT NULL)
    *   `expense_date` (DATE, NOT NULL)
    *   `reference_number` (VARCHAR)
    *   `notes` (TEXT)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
*   **Constraints**:
    *   `CHECK (payment_method IN ('cash', 'upi'))`
*   **Indexes**:
    *   Index on `expense_date`.

### `daily_summary`
Automatically maintained by the application to improve dashboard and report performance. This is NOT manual data.
*   **Columns**:
    *   `date` (DATE, PRIMARY KEY)
    *   `cash_sales` (NUMERIC, NOT NULL DEFAULT 0)
    *   `upi_sales` (NUMERIC, NOT NULL DEFAULT 0)
    *   `credit_sales` (NUMERIC, NOT NULL DEFAULT 0)
    *   `expenses` (NUMERIC, NOT NULL DEFAULT 0)
    *   `stock_added` (NUMERIC, NOT NULL DEFAULT 0)
    *   `customer_payments` (NUMERIC, NOT NULL DEFAULT 0)
    *   `vendor_payments` (NUMERIC, NOT NULL DEFAULT 0)
    *   `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
    *   `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

## 2. Design Explanations

### Why each table exists
*   **settings**: To hold global variables required for math formulas (like opening balances and margins) and the single master password.
*   **sales**: To record over-the-counter daily cash and UPI totals efficiently.
*   **customers**: To maintain a directory of people who owe the shop money (Khata).
*   **customer_transactions**: An immutable ledger of every time a customer took goods on credit or made a payment.
*   **vendors**: To maintain a directory of suppliers.
*   **stock_purchases**: To record when stock enters the shop, its total value, and how much was paid upfront.
*   **vendor_transactions**: To track subsequent payments made to vendors for past credit purchases.
*   **expenses**: To track money leaving the business for operations (bills, tea, salaries), required for accurate cash-in-hand and profit calculations.
*   **daily_summary**: To provide fast read performance for dashboards and reports by aggregating data daily. This acts as a materialized view updated automatically by the application.

### Why no duplicated values are stored
Storing running totals (like an `outstanding_balance` column on the `customers` table) leads to data anomalies. If a past transaction is edited or deleted, a statically stored balance becomes incorrect. By strictly logging *events* (transactions), the current state can always be reliably computed with 100% mathematical accuracy using SUM() operations. The `daily_summary` table is an exception designed explicitly for read performance (a standard CQRS-lite pattern).

### Application-Level Name Validations (Customers & Vendors)
Customer and Vendor names are explicitly **not unique** at the database level. Because the app is for a single owner who personally knows their contacts, the application will handle name collisions by showing a warning (e.g., "Customer with this name already exists") and providing options to either "Open Existing" or "Create New". If they choose to create new, they are encouraged to use a distinguishing name (like "Ramesh (Milk)" vs "Ramesh Kumar"). Only the name is required; Phone, Address, and Notes remain optional.

### How Customer Outstanding is calculated
`Customer Outstanding = (SUM of 'amount' where transaction_type = 'credit') - (SUM of 'amount' where transaction_type = 'payment')`
For a specific customer, we calculate the total value of goods they took on credit and subtract the total payments they have made over time.

### How Vendor Outstanding is calculated
`Vendor Outstanding = (SUM of 'purchase_amount' from stock_purchases) - (SUM of 'paid_amount' from stock_purchases) - (SUM of 'amount' from vendor_transactions)`
We calculate the total value of all stock bought from the vendor, subtract the upfront amounts paid at the time of delivery, and further subtract any subsequent payments made to them.

### How Credit Sales is calculated
`Credit Sales = SUM of 'amount' from customer_transactions where transaction_type = 'credit'`
Since the `sales` table intentionally omits credit sales, we dynamically calculate the total credit sales for any given day, month, or year directly from the customer ledger.

### How Estimated Stock Value will later be calculated
`Estimated Stock Value = Opening Stock + Total Stock Purchases - Cost of Goods Sold (COGS)`
*Where COGS is derived from:*
`Total Sales = (Cash Sales + UPI Sales + Credit Sales)`
`COGS = Total Sales * (1 - (average_profit_margin / 100))`
By taking the initial stock, adding all stock purchased, and subtracting the base cost of all goods sold (calculated using the global profit margin), we can estimate the current value of the stock sitting in the shop at any exact moment.
