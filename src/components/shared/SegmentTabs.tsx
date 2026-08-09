import React from 'react';
import { cn } from '../../lib/utils';
import { colors } from '../../theme';

interface SegmentTabsProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SegmentTabs({ tabs, activeTab, onChange, className }: SegmentTabsProps) {
  return (
    <div className={cn(`flex p-1 ${colors.neutral.bg} rounded-2xl`, className)}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200",
            activeTab === tab.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
