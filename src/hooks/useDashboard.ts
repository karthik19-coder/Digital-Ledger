import { useCallback } from 'react';
import { useQueryCache } from './useQueryCache';
import { dashboardService } from '../services/dashboard.service';

export function useDashboard() {
  const fetchDashboardSummary = useCallback(async () => {
    return dashboardService.getDailySummary();
  }, []);

  const { data: summary, loading, error, mutate: refresh } = useQueryCache(
    'dashboard-summary',
    fetchDashboardSummary
  );

  return {
    summary,
    loading,
    error,
    refresh
  };
}
