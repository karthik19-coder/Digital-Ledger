import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Store, Eye, EyeOff } from 'lucide-react';
import { Navigate } from 'react-router-dom';

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function Login() {
  const { signIn, signInWithGoogle, session, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Check URL parameters or hash for OAuth callback errors
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashString = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hashString);

      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const errorCode = searchParams.get('error') || hashParams.get('error');

      if (errorDescription || errorCode) {
        const rawMsg = decodeURIComponent(errorDescription || errorCode || '');
        if (
          rawMsg.toLowerCase().includes('user cancelled') || 
          rawMsg.toLowerCase().includes('access_denied') ||
          rawMsg.toLowerCase().includes('cancelled')
        ) {
          setError('Google sign-in was cancelled.');
        } else {
          setError(`Sign-in failed: ${rawMsg}`);
        }
        // Clean URL to prevent error banner persisting on page refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {
      // Suppress URL parsing errors in older browsers
    }
  }, []);

  // If already authenticated with an active session, redirect to home
  if (session && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      setIsGoogleSigningIn(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      const e = err as Error;
      setError((e instanceof Error ? e.message : String(e)) || 'Failed to initiate Google sign-in.');
      setIsGoogleSigningIn(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSigningIn(true);
      await signIn(email, password);
    } catch (err: unknown) {
      const e = err as Error;
      setError((e instanceof Error ? e.message : String(e)) || 'An error occurred during sign in.');
      setIsSigningIn(false);
    }
  };

  const isBusy = isSigningIn || isGoogleSigningIn || loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8 p-8 sm:p-10 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-6">
            <Store className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Supermarket Ledger</h2>
          <p className="mt-3 text-sm text-slate-500 font-medium">Sign in to manage your digital khata</p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* Google Sign-In */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isGoogleSigningIn ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5" />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-slate-400 font-medium tracking-wider">
              Or sign in with email
            </span>
          </div>
        </div>

        {/* Email & Password Form */}
        <form className="space-y-5" onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none"
                required
                disabled={isBusy}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all outline-none pr-12"
                  required
                  disabled={isBusy}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  disabled={isBusy}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 border border-transparent rounded-xl shadow-md bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isSigningIn ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
