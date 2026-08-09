# Supermarket Digital Ledger – Architecture & Patterns

This document outlines the core architectural patterns and flows of the application, establishing strict consistency rules to ensure stability, especially prior to Row Level Security (RLS) implementation.

## 1. Authentication & AuthContext
Authentication is managed exclusively via Supabase and centralized in `AuthContext`.
- **Session State**: `AuthContext` continuously listens to `supabase.auth.onAuthStateChange`.
- **Route Guards**: `ProtectedRoute` checks `isAuthenticated`. If not authenticated, users are strictly routed to `/login`.
- **Session Restoration**: On app load, `AuthContext` initializes the session from Supabase, restoring state seamlessly without flash-of-unauthenticated-content.

## 2. RBAC (Role-Based Access Control)
Authorization is decoupled from Authentication.
- **Provider**: `RBACContext` fetches the user's role (`owner` | `viewer`) from the `profiles` table after successful authentication.
- **Enforcement**: 
  - `usePermissions` hook provides `isOwner()` and `requirePermission(e)`.
  - Action buttons and mutating forms invoke `requirePermission(e)`. If the user is a `viewer`, the action is blocked and a `PermissionDialog` is shown, explaining why they cannot proceed.
  - No mutations are allowed for viewers on the client-side.

## 3. Navigation Infrastructure
Navigation uses a custom hybrid system ensuring predictability across web and mobile.
- **SmartBack (`useSmartBack`)**: Every fallback or back navigation uses `smartBack('/fallback')`. It intelligently checks the history stack; if a local history exists, it goes back natively (`history.back()`), otherwise, it routes to the provided fallback. This entirely prevents infinite history loops and app exiting.
- **Modal Navigation (`useModalNavigation`)**: All modals synchronize with the browser's URL hash (e.g., `#modal=expense-modal`). This enables Android swipe-back and browser back buttons to securely close modals without breaking the route history.
- **Form Blocker (`useFormBlocker`)**: Warns users against accidental navigation (via back or refresh) when unsubmitted form data exists.

## 4. Repository Pattern & RepoResult<T>
The application enforces a strict repository pattern to abstract all Supabase interactions.
- **No Direct Supabase Calls**: Services and Components NEVER invoke Supabase directly.
- **Contract**: Every repository method returns `Promise<RepoResult<T>>`, structured as:
  ```ts
  type RepoResult<T> = 
    | { success: true; data: T } 
    | { success: false; error: { code: string; message: string } };
  ```
- **No Throws**: Repositories NEVER throw exceptions. All database errors are caught and transformed via `handleDbError(error)`, ensuring predictable error handling upstream.

## 5. Service Layer
The service layer sits between React components and repositories.
- **Business Logic**: Performs all complex aggregations (e.g., `financialCalculation.service.ts` or `closing.service.ts`).
- **Data Fetching**: Dispatches custom events (e.g., `transaction-mutated`) to trigger UI updates without deeply passing callback props.
- **Orchestration**: Orchestrates calls to multiple repositories for transactions (e.g., adding an expense + updating cash balance).

## 6. ConfirmDialog
The `ConfirmDialog` is the centralized, accessible confirmation standard replacing all native `window.confirm` calls.
- **Variants**: Supports `default`, `warning`, `danger`, and `success` to automate visual signaling (colors and icons).
- **Accessibility**: Enforces a strict focus trap, initial autofocus, Enter/Escape keyboard bindings, and ARIA attributes (`role="alertdialog"` for danger).
- **State management**: Fully supports internal `loading` spinners and `disabled` action states, preventing double submissions during async resolutions.
