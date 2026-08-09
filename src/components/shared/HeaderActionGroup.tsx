import React from 'react';
import { cn } from '../../lib/utils';

interface HeaderActionGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function HeaderActionGroup({ children, className }: HeaderActionGroupProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-3 mt-2", className)}>
      {children}
    </div>
  );
}
