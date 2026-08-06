import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import { PeriodType } from '../types';
import { formatDateDisplay } from '../utils/formatters';

interface DateNavigatorProps {
  currentDate: Date;
  period: PeriodType;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onSelectDate: (date: Date) => void;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  currentDate,
  period,
  onNavigate,
  onSelectDate,
}) => {
  const isToday = () => {
    const today = new Date();
    if (period === 'Day') {
      return (
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getDate() === today.getDate()
      );
    } else if (period === 'Month') {
      return (
        currentDate.getFullYear() === today.getFullYear() &&
        currentDate.getMonth() === today.getMonth()
      );
    } else {
      return currentDate.getFullYear() === today.getFullYear();
    }
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const selected = new Date(e.target.value);
      if (!isNaN(selected.getTime())) {
        onSelectDate(selected);
      }
    }
  };

  // Convert currentDate to YYYY-MM-DD for standard date input
  const dateInputValue = `${currentDate.getFullYear()}-${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onNavigate('prev')}
          className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition border border-slate-100"
          title={`Previous ${period}`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="relative group flex items-center">
          <label className="flex items-center space-x-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 cursor-pointer transition border border-transparent hover:border-slate-200">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm sm:text-base">
              {formatDateDisplay(currentDate, period)}
            </span>
            <input
              type="date"
              value={dateInputValue}
              onChange={handleDateInputChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </label>
        </div>

        <button
          onClick={() => onNavigate('next')}
          className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-slate-100 transition border border-slate-100"
          title={`Next ${period}`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {!isToday() && (
        <button
          onClick={() => onNavigate('today')}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition border border-indigo-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Jump to Today</span>
        </button>
      )}
    </div>
  );
};
