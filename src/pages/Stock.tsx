import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Box, Plus, History, Users, Loader2, PackageSearch, TrendingDown, Warehouse, ShoppingCart, RefreshCw, CheckCircle2, Settings2 } from 'lucide-react';
import { stockService, StockOverviewData } from '../services/stock.service';
import { 
  AppHeaderBanner, 
  HeaderSummaryCard, 
  HeaderActionGroup, 
  ModuleActionButton,
  SummaryCard 
} from '../components/shared';
import { AddPurchaseModal } from '../components/AddPurchaseModal';
import { FinancialSettingsModal } from '../components/FinancialSettingsModal';
import { colors } from '../theme';
import { usePermissions } from '../hooks/usePermissions';
import { cn } from '../lib/utils';

import { useQueryCache } from '../hooks/useQueryCache';
import { useSmartBack } from '../hooks/useSmartBack';
import { useModalNavigation } from '../hooks/useModalNavigation';

export default function Stock() {
  const navigate = useNavigate();
  const location = useLocation();
  const { smartBack } = useSmartBack();
  const { isOwner, requirePermission } = usePermissions();
  
  const { data, loading: isLoading, mutate: loadStockOverview } = useQueryCache(
    'stock-overview',
    () => stockService.getStockOverview()
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOpen: isAddPurchaseOpen, openModal: openAddPurchase, closeModal: closeAddPurchase } = useModalNavigation('stock-add-purchase');
  const { isOpen: showSettingsModal, openModal: openSettingsModal, closeModal: closeSettingsModal } = useModalNavigation('stock-settings');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleRefresh = () => {
      loadStockOverview();
    };

    window.addEventListener('app-data-refresh', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      window.removeEventListener('app-data-refresh', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [loadStockOverview]);

  useEffect(() => {
    if (location.state?.openAdd) {
      const state = { ...location.state };
      delete state.openAdd;
      navigate(location.pathname, { replace: true, state });
      setTimeout(() => openAddPurchase(), 0);
    }
  }, [location.state, navigate, location.pathname, openAddPurchase]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStockOverview();
    setIsRefreshing(false);
  };

  const handlePurchaseSuccess = () => {
    setSuccessMessage('Purchase added successfully');
    setTimeout(() => setSuccessMessage(null), 3000);
    loadStockOverview();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
        <p className="text-slate-500 font-medium">Loading stock overview...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 pb-24 safe-page-pb">
      {/* Toast Notification */}
      {successMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-50 text-green-700 px-4 py-3 rounded-lg shadow-lg border border-green-100 flex items-center gap-2 z-50 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <p className="font-medium text-sm">{successMessage}</p>
        </div>
      )}

      {/* Header Banner */}
      <AppHeaderBanner
        theme="stock"
        title="Inventory"
        icon={PackageSearch}
        backTo="/"
        rightAction={
          <button 
            onClick={(e) => { if (requirePermission(e)) openSettingsModal(); }}
            className={cn("p-2 rounded-full hover:bg-white/10 text-white transition-colors", !isOwner() && "opacity-50 cursor-not-allowed")}
          >
            <Settings2 className="w-5 h-5" />
          </button>
        }
      >
        <HeaderSummaryCard 
          title="ESTIMATED STOCK VALUE" 
          amount={data?.estimatedStockValue || 0} 
        />
        <HeaderActionGroup>
          <ModuleActionButton 
            icon={Plus} 
            label="Add Purchase" 
            onClick={(e) => { if (requirePermission(e)) openAddPurchase(); }} 
            variant="glass" 
            className={!isOwner() ? 'opacity-50 cursor-not-allowed' : ''}
          />
          <ModuleActionButton 
            icon={History} 
            label="History" 
            onClick={() => navigate('/stock/history')} 
            variant="glass" 
          />
          <ModuleActionButton 
            icon={Users} 
            label="Vendors" 
            onClick={() => navigate('/stock/vendors')} 
            variant="glass" 
          />
          <ModuleActionButton 
            icon={RefreshCw} 
            label={isRefreshing ? "Refreshing..." : "Refresh"} 
            onClick={handleRefresh} 
            variant="glass" 
            disabled={isRefreshing}
          />
        </HeaderActionGroup>
      </AppHeaderBanner>

      {/* Metric Breakdown Cards */}
      <div className="px-4 sm:px-6 space-y-3 mt-6">
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard
            title="Opening Stock"
            amount={data?.openingStock || 0}
            icon={Warehouse}
          />
          <SummaryCard
            title="Purchases Added"
            amount={data?.totalPurchases || 0}
            icon={ShoppingCart}
          />
          <SummaryCard
            title="Est. COGS"
            amount={data?.estimatedCogs || 0}
            icon={TrendingDown}
          />
          <SummaryCard
            title="Current Vendor Due"
            amount={data?.currentVendorDue || 0}
            icon={Users}
            onClick={() => navigate('/stock/vendors')}
            className="border-red-100"
          />
        </div>
      </div>

      {/* Modals */}
      <AddPurchaseModal
        isOpen={isAddPurchaseOpen}
        onClose={closeAddPurchase}
        onSuccess={handlePurchaseSuccess}
      />
      <FinancialSettingsModal 
        isOpen={showSettingsModal}
        onClose={closeSettingsModal}
      />
    </div>
  );
}
