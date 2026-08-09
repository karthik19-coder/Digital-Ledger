import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../../services/settings.service';
import { Loader2, AlertCircle, RefreshCw, Settings2 } from 'lucide-react';

export function Bootstrap({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorType, setErrorType] = useState<'config' | 'connection'>('connection');
  const navigate = useNavigate();

  const checkSettings = async () => {
    setStatus('loading');
    setErrorMessage('');
    
    // 1. Attempt Supabase connection
    try {
      const settings = await settingsService.getSettings();
      
      if (!settings.is_setup_complete) {
        navigate('/setup', { replace: true });
      } else {
        // If they are on /setup or root, go to password or dashboard
        const path = window.location.pathname;
        if (path === '/setup' || path === '/') {
          navigate('/password', { replace: true });
        }
      }
      
      setStatus('done');
    } catch (error: unknown) {
      console.error('Failed to fetch settings:', error);
      setStatus('error');
      
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('environment variables are missing') || msg.includes('Invalid supabaseUrl') || msg.includes('URL')) {
        setErrorType('config');
        setErrorMessage(msg || 'Invalid Supabase URL format.');
      } else {
        setErrorType('connection');
        setErrorMessage(msg || 'Unable to connect to the database. Please check your network connection.');
      }
    }
  };

  useEffect(() => {
    checkSettings();
    // Justification: checkSettings is a stable init function that only needs to run exactly once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Initializing application...</p>
      </div>
    );
  }

  if (status === 'error') {
    const isConfig = errorType === 'config';
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center max-w-sm w-full">
          <div className={`p-3 rounded-full mb-4 ${isConfig ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isConfig ? (
              <Settings2 className="w-8 h-8 text-amber-500" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-500" />
            )}
          </div>
          
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {isConfig ? 'Configuration Required' : 'Connection Error'}
          </h2>
          
          <div className="text-sm text-slate-500 mb-6 flex flex-col space-y-3 w-full">
            <p>{isConfig ? 'Please configure your database connection to continue.' : errorMessage}</p>
            
            {isConfig && (
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-left">
                <p className="font-medium text-slate-700 mb-2 text-xs uppercase tracking-wider">Required Variables:</p>
                <code className="block text-xs bg-white border border-slate-200 p-2 rounded mb-2 text-blue-600 font-mono break-all">
                  VITE_SUPABASE_URL
                </code>
                <code className="block text-xs bg-white border border-slate-200 p-2 rounded text-blue-600 font-mono break-all">
                  VITE_SUPABASE_ANON_KEY
                </code>
                <p className="text-xs text-slate-500 mt-3">
                  Add these values to your <span className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded">.env.local</span> file or environment configuration.
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={checkSettings}
            className="flex items-center justify-center w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {isConfig ? 'Verify Configuration' : 'Retry Connection'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
