import React from 'react';
import { LucideIcon } from 'lucide-react';
import { moduleTheme, typography, radius, shadow } from '../../theme';
import { formatCurrency } from '../../utils/currency';

interface PageHeroProps {
  theme: keyof typeof moduleTheme;
  title: string;
  subtitle?: string;
  amount?: number | string;
  icon: LucideIcon;
  actions?: React.ReactNode;
}

export function PageHero({ theme, title, subtitle, amount, icon: Icon, actions }: PageHeroProps) {
  const currentTheme = moduleTheme[theme];

  return (
    <div className={`${currentTheme.bgGradient} min-h-[170px] pb-16 pt-6 px-4 sm:px-6 ${radius['2xl']} rounded-t-none ${shadow.soft} relative overflow-hidden shrink-0`}>
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
        <Icon className="w-48 h-48 sm:w-64 sm:h-64 text-white" />
      </div>

      <div className="relative max-w-md lg:max-w-6xl mx-auto z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-white/20 ${radius.xl} backdrop-blur-sm ${shadow.button}`}>
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-white ${typography.Heading}`}>{title}</h1>
              {subtitle && <p className="text-white/80 text-sm mt-0.5 font-medium">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>

        {amount !== undefined && (
          <div className={`bg-white/10 backdrop-blur-md ${radius['2xl']} p-4 sm:p-5 border border-white/20 ${shadow.soft} relative overflow-hidden group`}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <p className="text-white/80 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1">
                Total {title}
              </p>
              <h2 className={`text-white ${typography.AmountXL}`}>
                {typeof amount === 'number' 
                  ? formatCurrency(amount)
                  : amount}
              </h2>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
