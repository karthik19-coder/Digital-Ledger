import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, AlertCircle } from 'lucide-react';
import { transactionDateService } from '../services/transaction-date.service';
import { Label } from '@/components/ui/label';

interface TransactionDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string | null;
  minDate?: string;
  maxDate?: string;
  helperText?: string;
  warningMessage?: string;
}

export function TransactionDatePicker({
  value,
  onChange,
  label = 'Transaction Date',
  required = true,
  disabled = false,
  error,
  minDate,
  maxDate,
  helperText,
  warningMessage
}: TransactionDatePickerProps) {
  const [isDayClosed, setIsDayClosed] = useState(false);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const maxAllowedDate = maxDate || todayStr;

  // Validate value on mount/change
  useEffect(() => {
    // Check if the selected day is closed
    if (value && !transactionDateService.isToday(value)) {
      transactionDateService.isClosedBusinessDay(value).then(closed => {
        setIsDayClosed(closed);
      }).catch(console.error);
    } else {
      setIsDayClosed(false);
    }
  }, [value, maxAllowedDate, todayStr]);

  const isPastDate = transactionDateService.isPreviousDate(value);
  const isFutureDate = value > maxAllowedDate;
  
  const currentWarningMessage = warningMessage || transactionDateService.getDateWarning(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        
        {isPastDate && (
          <button
            type="button"
            onClick={() => onChange(todayStr)}
            className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="date"
          required={required}
          disabled={disabled}
          min={minDate}
          max={maxAllowedDate}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full pl-9 pr-3 py-2 text-sm rounded-md border bg-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-slate-950 transition-colors ${
            error || isFutureDate ? 'border-red-500 ring-red-100' : 'border-slate-200'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
        />
      </div>

      {/* Errors */}
      {(error || isFutureDate) && (
        <p className="text-xs text-red-500 font-medium mt-1">
          {error || 'Future transactions are not allowed. Please select today or an earlier date.'}
        </p>
      )}

      {/* Warnings & Helpers */}
      {!error && !isFutureDate && (
        <>
          {isDayClosed ? (
            <div className="mt-2 p-2 bg-slate-50 text-slate-700 text-xs rounded-md border border-slate-200 flex items-start gap-1.5 leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-500" />
              <span>This business day has already been closed. Saving will automatically update that day's records and Dashboard Balances.</span>
            </div>
          ) : isPastDate && currentWarningMessage ? (
            <div className="mt-2 p-2 bg-amber-50 text-amber-800 text-xs rounded-md border border-amber-200 flex items-start gap-1.5 leading-relaxed">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
              <span>{currentWarningMessage}</span>
            </div>
          ) : helperText ? (
            <p className="text-xs text-slate-500 mt-1">{helperText}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
