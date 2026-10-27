# Supermarket Digital Ledger

A production-ready digital ledger and financial management web application built specifically for retail supermarkets, grocery stores, and local merchants. It centralizes daily sales tracking, customer credit khata, vendor payables, categorized expenses, employee attendance/payroll, and audited end-of-day cash reconciliation.

---

## Table of Contents
- [Project Overview](#project-overview)
- [Target Users & Role Capabilities](#target-users--role-capabilities)
- [Implemented Features](#implemented-features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Initial Store Setup](#initial-store-setup)
- [Available Scripts](#available-scripts)
- [Database Migrations & Backend Setup](#database-migrations--backend-setup)
- [Security Model](#security-model)
- [Known Limitations](#known-limitations)
- [Manual Testing Checklist](#manual-testing-checklist)

---

## Project Overview

Managing cash flow, customer credit, supplier debts, and daily cash counts in a high-volume retail supermarket is prone to bookkeeping discrepancies and dual-counting errors.

Supermarket Digital Ledger solves this with a unified ledger architecture:
- **Strict Cash & UPI Separation:** Inflows and outflows are tracked by payment method to accurately compute expected cash in hand versus bank balances.
- **Audited Daily Closings:** Calculates mathematically expected cash at closing, compares against physical cash counts, and freezes historical closing records as immutable snapshots.
- **Concurrent-Safe Customer Payments:** Prevents double-collection race conditions through a dedicated PostgreSQL stored procedure (`record_customer_payment`) with row-level locks.
- **Integrated Payroll:** Tracks staff attendance, calculates pro-rated wages, and deducts salary payments directly from the store ledger without duplicate expense entries.

---

## Target Users & Role Capabilities

The application implements role-based access control backed by Supabase Auth and database Row-Level Security (RLS):

| Role | Intended User | Capabilities | Restrictions |
|---|---|---|---|
| **Store Owner** (`is_owner`) | Shop proprietor / Primary administrator | Full access: configure store settings, run initial setup, edit/delete historical entries, disburse payroll, view reports, execute daily closing. | None |
| **Store Staff** (`is_active_user`) | Cashiers / Counter staff | Operational access: record sales, enter standard expenses, log customer collections, record attendance. | Cannot access store settings, perform initial setup, delete transactions, or submit daily closing. |

---

## Implemented Features

### 1. Daily Financial Dashboard
- Real-time balances: Cash balance, UPI balance, Customer Due (receivables), and Vendor Due (payables).
- Quick breakdown modals showing transaction-level math for Cash, UPI, Customer Due, and Vendor Due.
- Date navigator to inspect business day states across past dates.

### 2. Sales Management
- Record sales with payment breakdown (Cash, UPI, Credit).
- Real-time impact on cash drawer and UPI balances.
- Date-based sales history with transaction-level filtering.

### 3. Customer Credit Ledger (Khata)
- Customer profiles with transaction histories.
- Credit sales entries that increment customer balances.
- Concurrency-safe payment collection via `record_customer_payment` RPC.
- Balance overpayment prevention (rejects payments exceeding current credit balance).

### 4. Stock & Vendor Management
- Supplier directory with contact details and purchase histories.
- Stock purchase logging with partial or full payment allocation (Cash/UPI/Credit).
- Outstanding vendor payable tracking and inventory valuation estimates.

### 5. Categorized Expense Management
- Business expenses categorized by type (Utilities, Rent, Supplies, Transport, Maintenance, Misc).
- Personal drawings/withdrawals tracked separately from operational expenses.
- Payment method allocation (Cash vs. UPI).

### 6. Employee Attendance & Payroll
- Employee directory with base wage rates and role designations.
- Daily attendance tracking (Present, Half-day, Absent, Paid Leave).
- Salary disbursement interface that deducts from store balances and updates employee ledgers without double-counting expenses.

### 7. Daily Closing & Cash Reconciliation
- Computes **Expected Cash** directly from transactions: `Opening Cash + Cash Sales + Cash Collections + Cash Injections - Cash Expenses - Cash Purchases - Cash Payroll`.
- Input field for cashier's **Actual Cash Count**.
- Automatic variance calculation (Surplus / Shortage / Perfect match).
- **Side-Effect-Free Reads:** Opening the closing screen or breakdown modals performs zero database writes.
- **Immutable Closed Snapshots:** Submitting the closing form freezes the record with `status: 'Closed'`.

### 8. Financial Reports & Exporting
- Tabular reports for daily summaries, balance sheets, and category breakdowns.
- Client-side export capabilities to PDF (`jspdf`) and Excel spreadsheets (`xlsx`).

---

## Technology Stack

### Frontend
- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite 6](https://vite.dev/)
- **Language:** TypeScript 5.8
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Date Handling:** [date-fns v4](https://date-fns.org/)
- **Reporting & Exports:** [jsPDF](https://github.com/parallax/jsPDF) & [SheetJS (XLSX)](https://sheetjs.com/)

### Backend & Infrastructure
- **Database:** PostgreSQL (hosted via [Supabase](https://supabase.com/))
- **Authentication:** Supabase Auth (Email / Password)
- **Security:** PostgreSQL Row-Level Security (RLS) policies and security-definer stored procedures

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Single Page App             │
├────────────────────────────────────────────────────────┤
│  Pages (`src/pages/`)                                  │
│  ├── Dashboard, Sales, Credit, Stock, Expenses,        │
│  └── DailyClosing, Employees, Settings, InitialSetup   │
├────────────────────────────────────────────────────────┤
│  Services (`src/services/`)                            │
│  ├── businessDay.service.ts   (Daily aggregations)     │
│  ├── financialCalculation.service.ts (Balances & sums) │
│  ├── closing.service.ts       (Daily closing snapshot) │
│  ├── customer.service.ts      (Credit & collections)   │
│  └── payroll.service.ts       (Salaries & attendance)  │
├────────────────────────────────────────────────────────┤
│  Repositories (`src/repositories/`)                    │
│  ├── customer.repository.ts   (RPC invocations)        │
│  ├── sales.repository.ts, expense.repository.ts, etc.  │
│  └── closing.repository.ts    (daily_closings CRUD)    │
├────────────────────────────────────────────────────────┤
│  Supabase Client (`src/lib/supabase.ts`)               │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼─────────────────────────────┐
│                   Supabase Backend                     │
├────────────────────────────────────────────────────────┤
│  • Auth: Authenticated session management              │
│  • Tables: sales, expenses, customers, vendors,        │
│    employees, daily_closings, business_funds, settings │
│  • Stored Procedures: `record_customer_payment()`      │
│  • Policies: RLS enforcement (`is_owner`, etc.)       │
└────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher (v20+ LTS recommended)
- **npm:** v9.0.0 or higher
- A Supabase project with PostgreSQL 15+

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   git clone <repository-url>
   cd "supermarket-digital-ledger v1"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
   ```

> **Security Note:** Never commit `.env` or `.env.local` to Git. Only use the public `anon` key in the frontend. Never use the `service_role` key in client-side code.

### Initial Store Setup

1. Start the development server (`npm run dev`) and navigate to `http://localhost:3000`.
2. Sign in with an authenticated Store Owner account.
3. If this is a fresh database, the app automatically detects that setup is incomplete and routes to `/initial-setup`.
4. Enter baseline store values:
   - Initial Opening Cash in drawer
   - Initial Opening UPI / Bank balance
   - Opening Customer Credit balance (Receivables)
   - Opening Vendor Due balance (Payables)
   - Opening Estimated Stock Value
   - Average Store Profit Margin (%)
   - Business Start Date
5. Submit the form. The system initializes the store settings and redirects to the main Dashboard.

---

## Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Vite local development server on `http://localhost:3000` with host bound to `0.0.0.0`. |
| `npm run lint` | Runs TypeScript compiler (`tsc --noEmit`) to perform full project-wide type checking. |
| `npm run build` | Compiles and bundles production assets into the `dist/` directory using Vite. |
| `npm run preview` | Serves the production build locally for pre-deployment inspection. |
| `npm run clean` | Removes build artifacts (`dist/`). |

---

## Database Migrations & Backend Setup

Database migrations are located in `supabase/migrations/`.

### Migration Sequence
Migrations must be executed in chronological order:
1. `20260805000000_initial_schema.sql` — Core tables (customers, vendors, sales, expenses, settings, employees, daily_closings).
2. `20260805120000_add_expense_type.sql` — Expense categorization columns.
3. `20260805130000_update_employees_schema.sql` — Attendance and payroll schema.
4. `20260806140000_phase12_simplified_rls.sql` — Base Row-Level Security policies.
5. `20260808000000_secure_customer_payments.sql` — **Mandatory RPC**: Creates `record_customer_payment(payload jsonb)` to handle atomic customer payments and prevent race conditions.

### Migration Safety & Deferred Files
> **WARNING:** Always review migration scripts and test them in a non-production database before applying them to production.
- **Deferred Trigger:** `supabase/migrations/20260809000000_customer_balance_trigger.sql` is currently deferred. It recalculates balances dynamically via `SUM()` across `customer_transactions`. Do **not** apply this trigger to an existing production database without first reconciling historical transaction records against denormalized customer balance columns.

---

## Security Model

1. **Client vs. Server Validation:** Frontend UI checks (such as disabling buttons via `usePermissions`) improve user experience, but security is strictly enforced at the database level via PostgreSQL Row-Level Security policies (`is_owner()`, `is_active_user()`).
2. **Atomic RPC Transactions:** Financial mutations that update multiple tables (e.g., customer balance, customer transactions, cash ledger) execute inside PostgreSQL functions with `FOR UPDATE` row locks to prevent concurrent race conditions.
3. **Environment Security:** The Vite bundle only exposes `VITE_` prefixed variables. Secrets like database passwords or `service_role` keys are strictly forbidden in client-side code.

---

## Known Limitations

- **Staging Multi-User Concurrency:** Concurrency controls (client-side transaction mutex and database `record_customer_payment` RPC row locking) have been verified via code review and isolated math tests, but have not yet been subjected to high-throughput load tests on a distributed multi-node staging cluster.
- **Historical 'Open' Closing Rows:** Databases used prior to the Batch 1.9 fix may contain phantom rows in `daily_closings` with `status: 'Open'`. These do not break the UI, but store administrators may choose to clean them up in Supabase SQL editor if desired.

---

## Manual Testing Checklist

Use this checklist to verify core flows after deploying or pulling updates:

- [ ] **1. Authentication & Route Guarding**
  - Verify unauthenticated users are redirected to `/login`.
  - Verify authenticated staff users cannot access `/settings` or `/initial-setup`.
- [ ] **2. Initial Setup**
  - Verify a new store with `is_setup_complete: false` routes to `/initial-setup`.
  - Submit valid numbers and confirm redirection to `/` without infinite redirect loops.
- [ ] **3. Sales Recording**
  - Log a Cash Sale and verify Expected Cash increases.
  - Log a UPI Sale and verify UPI balance increases.
  - Log a Credit Sale and verify customer credit increases.
- [ ] **4. Customer Payment Collection**
  - Record a partial payment for a customer; verify customer balance decreases and ledger updates.
  - Attempt an overpayment (amount > current balance); confirm clear error message is displayed.
- [ ] **5. Expense Logging**
  - Record an operational expense (e.g., Utilities) via Cash; confirm Cash balance decreases.
  - Record a personal withdrawal; verify it is tracked under drawings.
- [ ] **6. Payroll Disbursal**
  - Record an employee salary payment via Cash; confirm Expected Cash decreases by the exact amount.
  - Verify the payment appears in Employee Ledger and does **not** create a duplicate record in general expenses.
- [ ] **7. Daily Closing**
  - Navigate to `/daily-closing` and inspect expected numbers.
  - Confirm by database query that simply opening the page did **not** insert or update `daily_closings`.
  - Enter the physical cash count, notes, and click "Close Today's Business".
  - Confirm the closing record is saved with `status: 'Closed'`.
- [ ] **8. Data Exporting**
  - Navigate to `/reports` and export a sample report as PDF and Excel; confirm downloads succeed.
