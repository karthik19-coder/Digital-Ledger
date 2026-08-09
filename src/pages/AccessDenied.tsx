import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AccessDenied() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(4);

  useEffect(() => {
    let isMounted = true;
    
    // Start countdown
    const timer = setInterval(() => {
      if (isMounted) setCountdown((prev) => prev - 1);
    }, 1000);

    // After 4 seconds, sign out and redirect
    const timeout = setTimeout(async () => {
      try {
        await signOut();
      } catch (error) {
        // Suppress signout errors during auto-logout
      } finally {
        if (isMounted) navigate('/login');
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden text-center">
        <div className="bg-red-50 p-8 flex justify-center border-b border-red-100">
          <div className="bg-red-100 p-4 rounded-full text-red-600 shadow-sm shadow-red-200">
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>
        </div>
        
        <div className="p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your account does not have permission to access this application. If you believe this is a mistake, please contact the shop owner to have your profile added.
          </p>
          
          <div className="text-sm text-slate-500 font-medium">
            Signing you out in {countdown}s...
          </div>
        </div>
      </div>
    </div>
  );
}
