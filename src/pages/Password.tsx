import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { settingsService } from '../services/settings.service';
import { Eye, EyeOff, Store, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function Password() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const isValid = await settingsService.verifyPassword(password);
      if (isValid) {
        navigate('/', { replace: true });
      } else {
        setError('Incorrect Password');
      }
    } catch (err: unknown) {
      console.error('Password verification failed:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUnlock();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center space-y-4">
          <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
            <Store className="w-8 h-8 text-slate-700" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 tracking-tight">
            Supermarket Digital Ledger
          </h1>
          <p className="text-center text-slate-500 text-base">
            Please enter your password
          </p>
        </div>

        <Card className="w-full shadow-sm border-slate-200 overflow-hidden">
          <CardContent className="pt-8 pb-8 bg-white space-y-6 px-6 sm:px-8">
            <div className="space-y-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className={`h-14 text-base pr-12 focus:ring-2 transition-all shadow-sm ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'focus:ring-slate-900 focus:border-slate-900'}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-2"
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {error && (
                <p className="text-sm text-red-500 font-medium text-center">{error}</p>
              )}
            </div>

            <Button 
              type="button" 
              onClick={handleUnlock} 
              disabled={isSubmitting}
              className="w-full h-14 text-base font-medium bg-slate-900 text-white hover:bg-slate-800"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Unlocking...
                </>
              ) : (
                'Unlock Shop'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
