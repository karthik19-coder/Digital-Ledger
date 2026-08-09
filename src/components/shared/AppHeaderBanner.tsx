import React from 'react';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSmartBack } from '../../hooks/useSmartBack';
import { moduleTheme, typography, radius, shadow } from '../../theme';
import { cn } from '../../lib/utils';

interface AppHeaderBannerProps {
  theme: keyof typeof moduleTheme;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onBack?: () => void;
  backTo?: string | -1;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function AppHeaderBanner({ 
  theme, 
  title, 
  subtitle, 
  icon: Icon, 
  onBack, 
  backTo,
  rightAction,
  children,
  className
}: AppHeaderBannerProps) {
  let currentTheme = moduleTheme[theme];
  if (!currentTheme) {
    console.warn(`Unknown AppHeaderBanner variant: ${theme}`);
    currentTheme = moduleTheme.dashboard;
  }
  const { smartBack } = useSmartBack();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      smartBack(typeof backTo === 'string' ? backTo : '/');
    }
  };

  return (
    <div className={cn(
      `${currentTheme.bgGradient} pt-4 sm:pt-6 pb-6 px-4 sm:px-6 ${radius['2xl']} rounded-t-none ${shadow.soft} relative overflow-hidden shrink-0 flex flex-col`,
      className
    )}>
      {/* Background Icon */}
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
        <Icon className="w-48 h-48 sm:w-64 sm:h-64 text-white" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto flex flex-col flex-1">
        {/* Top Navigation Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className={`text-white text-lg font-bold flex items-center gap-2`}>
                {title}
              </h1>
              {subtitle && <p className="text-white/80 text-xs font-medium">{subtitle}</p>}
            </div>
          </div>
          {rightAction && (
            <div className="flex items-center">
              {rightAction}
            </div>
          )}
        </div>

        {/* Children (Summary Card, Action Buttons) */}
        <div className="flex flex-col gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
