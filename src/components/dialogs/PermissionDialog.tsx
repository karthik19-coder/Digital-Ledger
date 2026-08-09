import React from 'react';
import { X, ShieldAlert } from 'lucide-react';

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PermissionDialog({ isOpen, onClose }: PermissionDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-800">Permission Required</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-slate-600">
            Only shop owners can perform this action. Please contact an owner if you need access.
          </p>
        </div>

        <div className="px-6 py-4 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm shadow-indigo-600/20"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
