import { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Sidebar } from './Sidebar';
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-md lg:max-w-none mx-auto lg:mx-0 bg-white lg:bg-[#F8FAFC] min-h-screen safe-page-pb lg:pb-8 relative overflow-x-hidden min-w-0">
        <div className="w-full lg:max-w-[1320px] lg:mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
