import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, User, Phone, Loader2, Users,
  X, MapPin, AlertCircle, CheckCircle2, Edit, Trash2,
  ChevronRight, ShoppingBag, IndianRupee, Calendar, Clock,
  SearchX, FileText
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { vendorService } from '../services/vendor.service';
import { stockService } from '../services/stock.service';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  ModuleSearchBar,
  EmptyState,
  FinancialCard,
  SummaryCard,
  CardActionBar,
  ExportButton
} from '../components/shared';
import { vendorsListExportProvider } from '../services/export/providers/vendorsListExportProvider';
import { Vendor } from '../types/vendor';
import { StockPurchase } from '../types/stock';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { moduleTheme, colors, spacing, radius, shadow, typography } from '../theme';


import { useQueryCache } from '../hooks/useQueryCache';
import { useCachedState } from '../hooks/useCachedState';
import { formatCurrency } from '../utils/formatters';
import { usePermissions } from '../hooks/usePermissions';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';

interface VendorWithPurchaseStats extends Vendor {
  purchaseCount: number;
  lastPurchaseDate: string | null;
}

export default function StockVendors() {
  const navigate = useNavigate();
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  
  const fetchData = async () => {
    const [vendorList, purchaseList] = await Promise.all([
      vendorService.getVendors(),
      stockService.getPurchases(),
    ]);
    return { vendors: vendorList, purchases: purchaseList };
  };

  const { data: cachedRes, loading: isLoading, mutate: loadData } = useQueryCache(
    'stock-vendors',
    fetchData
  );

  const vendors = cachedRes?.vendors || [];
  const purchases = cachedRes?.purchases || [];

  const [searchQuery, setSearchQuery] = useCachedState('stock-vendors-search', '');

  // Add / Edit modal
  const { isOpen: isAddDialogOpen, openModal: openAddDialogState, closeModal: closeAddDialog } = useModalNavigation('stock-vendors-add');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '', notes: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [vendorToDelete, setVendorToDelete] = useState<VendorWithPurchaseStats | null>(null);
  const { isOpen: isDeleteDialogOpen, openModal: openDeleteDialogState, closeModal: closeDeleteDialog } = useModalNavigation('stock-vendors-delete');
  const [isDeleting, setIsDeleting] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRefresh = () => loadData();
    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);
    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadData]);

  // ── Computed: vendor + purchase stats ────────────────────────────────────────
  const vendorsWithStats = useMemo((): VendorWithPurchaseStats[] => {
    return vendors.map((vendor) => {
      const vendorPurchases = purchases.filter((p) => p.vendor_id === vendor.id);
      const purchaseCount = vendorPurchases.length;

      const sortedByDate = [...vendorPurchases].sort(
        (a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
      );
      const lastPurchaseDate = sortedByDate.length > 0 ? sortedByDate[0].purchase_date : null;

      return { ...vendor, purchaseCount, lastPurchaseDate };
    });
  }, [vendors, purchases]);

  // ── Summary Cards ────────────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const totalDue = vendors.reduce((sum, v) => sum + v.total_due, 0);
    const totalVendors = vendors.length;
    const withOutstanding = vendors.filter((v) => v.total_due > 0).length;
    return { totalDue, totalVendors, withOutstanding };
  }, [vendors]);

  // ── Search Filtering ─────────────────────────────────────────────────────────
  const filteredVendors = useMemo(() => {
    let result = vendorsWithStats;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          (v.phone && v.phone.includes(q))
      );
    }
    return [...result].sort((a, b) => b.total_due - a.total_due);
  }, [vendorsWithStats, searchQuery]);

  // ── Formatters ───────────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return format(parseISO(dateStr), 'dd MMM yyyy');
    } catch {
      return '—';
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ── Add / Edit Vendor ────────────────────────────────────────────────────────
  const openAddDialog = () => {
    setEditingVendor(null);
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setFormError(null);
    openAddDialogState();
  };

  const openEditDialog = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      phone: vendor.phone || '',
      address: vendor.address || '',
      notes: '',
    });
    setFormError(null);
    openAddDialogState();
  };

  const closeDialog = () => {
    closeAddDialog();
    setEditingVendor(null);
    setFormData({ name: '', phone: '', address: '', notes: '' });
    setFormError(null);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Vendor Name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingVendor) {
        await vendorService.updateVendor(editingVendor.id, {
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });
        showSuccess('Vendor updated successfully');
      } else {
        // Duplicate check
        const all = await vendorService.getVendors();
        const dup = all.find(
          (v) => v.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (dup) {
          setFormError('A vendor with this name already exists.');
          setIsSaving(false);
          return;
        }
        await vendorService.createVendor({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          address: formData.address.trim(),
        });
        showSuccess('Vendor added successfully');
      }
      closeDialog();
      loadData();
    } catch (err: unknown) {
      setFormError((err instanceof Error ? err.message : String(err)) || 'Failed to save vendor');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete Vendor ─────────────────────────────────────────────────────────────
  const openDeleteDialog = (vendor: VendorWithPurchaseStats) => {
    setVendorToDelete(vendor);
    openDeleteDialogState();
  };

  const handleCloseDeleteDialog = () => {
    setVendorToDelete(null);
    closeDeleteDialog();
  };

  const handleConfirmDelete = async () => {
    if (!vendorToDelete) return;
    setIsDeleting(true);
    try {
      await vendorService.deleteVendor(vendorToDelete.id);
      handleCloseDeleteDialog();
      showSuccess('Vendor deleted successfully');
      loadData();
    } catch (err: unknown) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading vendors...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-6 pb-24 safe-page-pb ${colors.neutral.bg} min-h-screen`}>
      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="vendorCredit"
        title="Vendors"
        subtitle="Manage vendors and view outstanding balances"
        icon={Users}
        onBack={() => smartBack('/stock')}
      >
        <div className="relative">
          <HeaderSummaryCard 
            title="TOTAL DUE" 
            amount={summaryStats.totalDue} 
          />
          {filteredVendors.length > 0 && (
            <div className="absolute top-4 right-4 z-20">
              <ExportButton 
                data={() => vendorsListExportProvider.getExportData(filteredVendors)}
                className="!w-[140px] !bg-white/10 hover:!bg-white/15 !text-white !border-white/20 !border backdrop-blur-md !rounded-full shadow-sm hover:scale-[1.02] transition-all duration-200 h-10 sm:h-[42px] px-4 justify-between [&_span]:!inline"
              />
            </div>
          )}
        </div>
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Plus} 
            label="Add Vendor" 
            onClick={(e) => { if (requirePermission(e)) openAddDialog(); }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      <div className="px-4 sm:px-6 lg:px-8 mt-6 max-w-md lg:max-w-5xl mx-auto w-full">
      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <SummaryCard title="Total Vendors" amount={summaryStats.totalVendors} icon={Users} isCurrency={false} />
        <SummaryCard title="With Balance" amount={summaryStats.withOutstanding} icon={AlertCircle} isCurrency={false} />
      </div>

      {/* ── Search ── */}
      <div className="mb-4">
        <ModuleSearchBar
          placeholder="Search by vendor name or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* ── Empty States ── */}
      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Vendors Yet"
          subtitle="Add a vendor to start tracking purchases and outstanding balances."
          action={
            <ModuleActionButton
              icon={Plus}
              label="Add Vendor"
              onClick={(e) => { if (requirePermission(e)) openAddDialog(); }}
              variant="primary"
              className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
            />
          }
        />
      ) : filteredVendors.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No results found"
          subtitle={`No vendors match "${searchQuery}"`}
        />
      ) : (
        /* ── Vendor Card List ── */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredVendors.map((vendor) => (
              <FinancialCard
                key={vendor.id}
                theme="vendorCredit"
                title={vendor.name}
                subtitle={vendor.phone ? `+91 ${vendor.phone}` : 'No phone'}
                amount={vendor.total_due}
                amountColor={vendor.total_due > 0 ? 'text-red-600' : 'text-emerald-600'}
                icon={User}
                onClick={() => navigate(`/stock/vendors/${vendor.id}`)}
                onEdit={(e) => {
                  e.stopPropagation();
                  openEditDialog(vendor);
                }}
                onDelete={(e) => {
                  e.stopPropagation();
                  openDeleteDialog(vendor);
                }}
              >
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 px-5 pb-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <div>
                      <span className="text-slate-400 block mb-0.5">Last Purchase</span>
                      <p className="font-medium text-slate-700">{formatDate(vendor.lastPurchaseDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <div>
                      <span className="text-slate-400 block mb-0.5">Purchases</span>
                      <p className="font-medium text-slate-700">
                        {vendor.purchaseCount} {vendor.purchaseCount === 1 ? 'purchase' : 'purchases'}
                      </p>
                    </div>
                  </div>
                </div>
              </FinancialCard>
            ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* Add / Edit Vendor Modal */}
      {isAddDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDialog}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh] shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h2 className="text-xl font-bold text-slate-900">
                {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
              </h2>
              <button
                onClick={closeDialog}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveVendor} className="flex flex-col overflow-hidden min-h-0">
              <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start border border-red-100">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Vendor Name */}
              <div className="space-y-2">
                <Label htmlFor="vdName" className="text-sm font-medium text-slate-700">
                  Vendor Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    id="vdName"
                    autoFocus
                    placeholder="e.g. Metro Wholesalers"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="vdPhone" className="text-sm font-medium text-slate-700">
                  Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <Input
                    id="vdPhone"
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="vdAddress" className="text-sm font-medium text-slate-700">
                  Address <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea
                    id="vdAddress"
                    placeholder="Enter vendor address..."
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className={`w-full min-h-[70px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 resize-none`}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="vdNotes" className="text-sm font-medium text-slate-700">
                  Notes <span className="text-slate-400 font-normal">(Optional)</span>
                </Label>
                <div className="relative">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea
                    id="vdNotes"
                    placeholder="Any additional notes..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className={`w-full min-h-[60px] text-sm rounded-md border ${colors.neutral.border} bg-white px-3 py-2 pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 resize-none`}
                  />
                </div>
              </div>

              </div>

              {/* Footer */}
              <div className={`p-4 sm:p-6 border-t border-slate-100 ${colors.neutral.bg} flex flex-col sm:flex-row gap-3 shrink-0`}>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full sm:flex-1 bg-white hover:${colors.neutral.bg}`}
                  onClick={closeDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    editingVendor ? 'Update Vendor' : 'Save Vendor'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && vendorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={closeDeleteDialog}>
          <div className="bg-white w-[92%] sm:w-full max-w-[420px] sm:max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Delete Vendor</h2>
              <button
                onClick={handleCloseDeleteDialog}
                className={`w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:${colors.neutral.text} hover:bg-slate-100 transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Cannot delete — has outstanding or purchases */}
              {(vendorToDelete.total_due > 0 || vendorToDelete.purchaseCount > 0) ? (
                <>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-900">Cannot Delete Vendor</h4>
                      {vendorToDelete.total_due > 0 ? (
                        <p className="text-sm text-amber-800 mt-1">
                          <strong>{vendorToDelete.name}</strong> has an outstanding balance of{' '}
                          <strong>{formatCurrency(vendorToDelete.total_due)}</strong>. Clear the balance before deleting.
                        </p>
                      ) : (
                        <p className="text-sm text-amber-800 mt-1">
                          <strong>{vendorToDelete.name}</strong> has purchase history and cannot be deleted.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleCloseDeleteDialog}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                /* Can delete */
                <>
                  <p className={`${colors.neutral.text} text-sm`}>
                    Are you sure you want to delete{' '}
                    <strong>{vendorToDelete.name}</strong>? This action cannot be undone.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:flex-1"
                      onClick={handleCloseDeleteDialog}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                      ) : (
                        'Delete Vendor'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
