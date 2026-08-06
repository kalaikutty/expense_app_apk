import React from 'react';
import { PeriodType } from '../types';

interface PeriodSwitcherProps {
  selectedPeriod: PeriodType;
  onSelectPeriod: (period: PeriodType) => void;
}

export const PeriodSwitcher: React.FC<PeriodSwitcherProps> = ({
  selectedPeriod,
  onSelectPeriod,
}) => {
  const periods: PeriodType[] = ['Day', 'Month', 'Year'];

  return (
    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
      {periods.map((period) => {
        const isActive = selectedPeriod === period;
        return (
          <button
            key={period}
            onClick={() => onSelectPeriod(period)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {period}
          </button>
        );
      })}
    </div>
  );
};
