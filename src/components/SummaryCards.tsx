import React from 'react';
import { ArrowDownRight, ArrowUpRight, Wallet, Info } from 'lucide-react';
import { PeriodType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  period: PeriodType;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpense,
  netBalance,
  period,
}) => {
  return (
    <div className="space-y-3">
      {period === 'Day' && (
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 bg-indigo-50/80 border border-indigo-100 px-3 py-1.5 rounded-xl">
          <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span>
            <strong>Day View:</strong> Showing cumulative all-time running totals up to selected day.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Total Expense */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-110 transition-transform pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Expense
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
            {formatCurrency(totalExpense)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {period === 'Day' ? 'Cumulative debits' : `${period} total expenses`}
          </p>
        </div>

        {/* Total Income */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-110 transition-transform pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Income
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {period === 'Day' ? 'Cumulative credits' : `${period} total income`}
          </p>
        </div>

        {/* Net Balance */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full opacity-50 group-hover:scale-110 transition-transform pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Net Balance
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              netBalance >= 0 ? 'text-indigo-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(netBalance)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {netBalance >= 0 ? 'Surplus / Savings' : 'Deficit'}
          </p>
        </div>
      </div>
    </div>
  );
};
