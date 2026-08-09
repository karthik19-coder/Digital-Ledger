import React from 'react';
import { ChevronRight, Edit, Trash2 } from 'lucide-react';
import { moduleTheme, colors } from '../../theme';

interface CardActionBarProps {
  onViewDetails?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  viewDetailsLabel?: string;
  theme?: keyof typeof moduleTheme;
}

export function CardActionBar({
  onViewDetails,
  onEdit,
  onDelete,
  viewDetailsLabel = "View Details",
  theme = "dashboard"
}: CardActionBarProps) {
  const themeColors = moduleTheme[theme];

  return (
    <div className="flex h-12 w-full bg-white rounded-b-[20px] border-t border-slate-100 overflow-hidden">
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className={`flex-1 flex items-center justify-between px-4 font-semibold text-sm transition-colors hover:bg-slate-50 active:bg-slate-100 ${themeColors.text}`}
        >
          {viewDetailsLabel}
          <ChevronRight className="w-4 h-4 opacity-50" />
        </button>
      )}

      {onEdit && (
        <>
          <div className="w-[1px] bg-slate-100 my-2" />
          <button
            onClick={onEdit}
            className={`w-12 flex items-center justify-center shrink-0 transition-colors hover:bg-slate-50 active:bg-slate-100 ${colors.neutral.text}`}
          >
            <Edit className="w-4 h-4" />
          </button>
        </>
      )}

      {onDelete && (
        <>
          <div className="w-[1px] bg-slate-100 my-2" />
          <button
            onClick={onDelete}
            className="w-12 flex items-center justify-center shrink-0 transition-colors text-red-500 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
