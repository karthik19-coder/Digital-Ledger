import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useBusinessDateInit } from '../../hooks/useBusinessDateInit';
import { settingsService } from '../../services/settings.service';
import { setGlobalFormatSettings } from '../../utils/formatters';

export default function AppLayout() {
  const initialized = useBusinessDateInit();
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    settingsService.getSettings().then(s => {
      setGlobalFormatSettings(s.currency, s.timezone);
      setSetupComplete(s.is_setup_complete);
    });
  }, []);

  if (!initialized || setupComplete === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (setupComplete === false) {
    return <Navigate to="/initial-setup" replace />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <main className="flex-1 w-full max-w-md mx-auto bg-white min-h-screen safe-page-pb relative">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
