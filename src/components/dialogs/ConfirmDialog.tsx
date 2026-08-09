import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';

export type ConfirmDialogVariant = 'default' | 'warning' | 'danger' | 'success';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean; // deprecated: maps to variant="danger"
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  disabled?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  destructive = false,
  variant: propVariant,
  loading = false,
  disabled = false
}: ConfirmDialogProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const variant = propVariant || (destructive ? 'danger' : 'default');

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Small timeout ensures the dialog is mounted before focusing
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else {
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (!loading && !disabled) {
          onConfirm();
        }
      } else if (e.key === 'Tab') {
        // Focus trap
        if (!dialogRef.current) return;
        const focusableElements = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onConfirm, loading, disabled]);

  if (!isOpen) return null;

  const isDangerOrWarning = variant === 'danger' || variant === 'warning';
  
  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" aria-hidden="true" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />;
      default: return <Info className="w-5 h-5 text-blue-500" aria-hidden="true" />;
    }
  };

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger': return 'destructive';
      default: return 'default';
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 text-white border-transparent';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 text-white border-transparent';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent';
      default: return '';
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        ref={dialogRef}
        role={isDangerOrWarning ? 'alertdialog' : 'dialog'}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        aria-modal="true"
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {getIcon()}
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-800">
              {title}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 rounded-md"
            aria-label="Close dialog"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p id="confirm-dialog-description" className="text-slate-600 mb-6 whitespace-pre-wrap">
            {description}
          </p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button 
              ref={primaryButtonRef}
              variant={getButtonVariant()}
              className={getButtonClass()}
              disabled={loading || disabled}
              onClick={() => {
                onConfirm();
              }}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
