/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { closingService } from './services/closing.service';
import AppLayout from './components/layout/AppLayout';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { PermissionProvider } from './hooks/usePermissions';
import { NavigationProvider } from './context/NavigationContext';
import { RouteTransitionProvider } from './context/RouteTransitionContext';
import { ScrollRestoration } from './components/shared/ScrollRestoration';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import AccessDenied from './pages/AccessDenied';
import Dashboard from './pages/Dashboard';
import DailyClosingPage from './pages/DailyClosing';
import Sales from './pages/Sales';
import Credit from './pages/Credit';
import CustomerDetails from './pages/CustomerDetails';
import Stock from './pages/Stock';
import PurchaseHistory from './pages/PurchaseHistory';
import StockVendors from './pages/StockVendors';
import VendorDetails from './pages/VendorDetails';
import Expenses from './pages/Expenses';
import ExpenseHistory from './pages/ExpenseHistory';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Employees from './pages/Employees';
import BusinessFundsHistory from './pages/BusinessFundsHistory';
import EmployeeDetails from './pages/EmployeeDetails';
import Attendance from './pages/Attendance';
import EmployeeAttendanceHistory from './pages/EmployeeAttendanceHistory';
import Salary from './pages/Salary';
import EmployeeLedger from './pages/EmployeeLedger';
import { InitialSetup } from './pages/InitialSetup';

export default function App() {

  useEffect(() => {
    const handleTransactionMutated = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const dateStr = customEvent.detail?.date;
      await closingService.invalidateAndRecalculateFromDate(dateStr);
    };

    window.addEventListener('transaction-mutated', handleTransactionMutated);
    return () => {
      window.removeEventListener('transaction-mutated', handleTransactionMutated);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <PermissionProvider>
          <BrowserRouter>
            <NavigationProvider>
              <RouteTransitionProvider>
                <ScrollRestoration />
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/access-denied" element={<AccessDenied />} />
                  
                  <Route path="/" element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="daily-closing" element={<DailyClosingPage />} />
                    <Route path="sales" element={<Sales />} />
                    <Route path="credit" element={<Credit />} />
                    <Route path="credit/customers" element={<Credit />} />
                    <Route path="credit/customers/:id" element={<CustomerDetails />} />
                    <Route path="stock" element={<Stock />} />
                    <Route path="stock/history" element={<PurchaseHistory />} />
                    <Route path="stock/vendors" element={<StockVendors />} />
                    <Route path="stock/vendors/:id" element={<VendorDetails />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="expenses/history" element={<ExpenseHistory />} />
                    <Route path="expenses/employees" element={<Employees />} />
                    <Route path="expenses/employees/attendance" element={<Attendance />} />
                    <Route path="expenses/employees/salary" element={<Salary />} />
                    <Route path="expenses/employees/:id" element={<EmployeeDetails />} />
                    <Route path="expenses/employees/:id/attendance" element={<EmployeeAttendanceHistory />} />
                    <Route path="expenses/employees/:id/ledger" element={<EmployeeLedger />} />
                    <Route path="business-funds" element={<BusinessFundsHistory />} />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RouteTransitionProvider>
            </NavigationProvider>
          </BrowserRouter>
        </PermissionProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
