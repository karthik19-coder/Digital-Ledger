import React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, CalendarCheck } from 'lucide-react';

interface BusinessDateNavigatorProps {
  selectedDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onDateChange?: (date: Date) => void;
  disableNext?: boolean;
  maxDate?: string;
  showTodayBadge?: boolean;
}

export function BusinessDateNavigator({
  selectedDate,
  onPrevious,
  onNext,
  onDateChange,
  disableNext = false,
  maxDate,
  showTodayBadge
}: BusinessDateNavigatorProps) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  
  return (
    <div className="relative flex items-center bg-white/10 border border-white/20 rounded-lg backdrop-blur-sm p-1 shadow-sm shrink-0">
      <button 
        onClick={onPrevious}
        className="p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <div className="relative flex items-center px-2 border-x border-white/20 mx-1">
        <CalendarIcon className="w-4 h-4 text-white mr-1.5" />
        {onDateChange && (
          <input 
            type="date" 
            value={dateStr}
            max={maxDate || format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => {
              if (e.target.value) {
                onDateChange(new Date(e.target.value));
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
        <span className="font-bold text-white text-sm whitespace-nowrap pointer-events-none select-none">
          {format(selectedDate, 'dd MMM yyyy')}
        </span>
      </div>
      <button 
        onClick={onNext}
        disabled={disableNext}
        className={`p-1.5 rounded-md transition-colors ${
          disableNext
            ? 'text-white/30 cursor-not-allowed'
            : 'hover:bg-white/20 text-white'
        }`}
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {showTodayBadge && disableNext && (
        <div className="absolute -bottom-9 right-0 flex items-center gap-1.5 h-6 px-3 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm whitespace-nowrap">
          <CalendarCheck className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Today</span>
        </div>
      )}
    </div>
  );
}
