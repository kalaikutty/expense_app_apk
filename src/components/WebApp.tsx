import React, { useState } from 'react';
import { Plus, Laptop, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { Transaction, PeriodType } from '../types';
import { PeriodSwitcher } from './PeriodSwitcher';
import { DateNavigator } from './DateNavigator';
import { SummaryCards } from './SummaryCards';
import { TransactionList } from './TransactionList';
import { Charts } from './Charts';

interface WebAppProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedPeriod: PeriodType;
  setSelectedPeriod: (p: PeriodType) => void;
  onOpenExcelModal: () => void;
  onRefresh?: () => void;
}

export const WebApp: React.FC<WebAppProps> = ({
  transactions,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  currentDate,
  setCurrentDate,
  selectedPeriod,
  setSelectedPeriod,
  onOpenExcelModal,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date bounds
  const startOfDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    0,
    0,
    0
  );
  const endOfDay = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
    23,
    59,
    59,
    999
  );

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const startOfYear = new Date(currentDate.getFullYear(), 0, 1, 0, 0, 0);
  const endOfYear = new Date(currentDate.getFullYear(), 11, 31, 23, 59, 59, 999);

  // Filter transactions for period list & totals
  let periodTransactions: Transaction[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  if (selectedPeriod === 'Day') {
    // List for Day view: transactions occurred ON that day
    periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfDay && d <= endOfDay;
    });

    // CUMULATIVE totals up to and including endOfDay
    const cumulativeTransactions = transactions.filter((t) => new Date(t.date) <= endOfDay);
    cumulativeTransactions.forEach((t) => {
      if (t.type === 'CREDIT') totalIncome += t.amount;
      if (t.type === 'DEBIT') totalExpense += t.amount;
    });
  } else if (selectedPeriod === 'Month') {
    periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfMonth && d <= endOfMonth;
    });
    periodTransactions.forEach((t) => {
      if (t.type === 'CREDIT') totalIncome += t.amount;
      if (t.type === 'DEBIT') totalExpense += t.amount;
    });
  } else {
    // Year
    periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfYear && d <= endOfYear;
    });
    periodTransactions.forEach((t) => {
      if (t.type === 'CREDIT') totalIncome += t.amount;
      if (t.type === 'DEBIT') totalExpense += t.amount;
    });
  }

  const netBalance = totalIncome - totalExpense;

  // Date Navigation Handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    if (selectedPeriod === 'Day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (selectedPeriod === 'Month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24">
      {/* Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Top Controls Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Expense Dashboard</h2>
              <p className="text-xs text-slate-500">Live synchronized financial ledger</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Switcher */}
            <PeriodSwitcher selectedPeriod={selectedPeriod} onSelectPeriod={setSelectedPeriod} />

            {/* Excel Sheet View Button */}
            <button
              onClick={onOpenExcelModal}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center space-x-1.5 active:scale-95"
              title="Open Excel Sheet View"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel View</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={handleManualRefresh}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Refresh ledger"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <DateNavigator
          currentDate={currentDate}
          period={selectedPeriod}
          onNavigate={handleNavigate}
          onSelectDate={setCurrentDate}
        />

        {/* Summary Cards */}
        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netBalance={netBalance}
          period={selectedPeriod}
        />

        {/* Charts (Hidden for Day view) */}
        <Charts
          transactions={periodTransactions}
          period={selectedPeriod}
          currentDate={currentDate}
        />

        {/* Transaction List */}
        <TransactionList
          transactions={periodTransactions}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      </div>

      {/* Floating Action Button (+ Add Entry) */}
      <div className="fixed bottom-6 left-0 right-0 z-30 flex justify-center pointer-events-none">
        <button
          onClick={onOpenAddModal}
          className="pointer-events-auto flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm px-6 py-3.5 rounded-full shadow-xl shadow-indigo-600/30 transition-all duration-200 border-2 border-white/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Entry</span>
        </button>
      </div>
    </div>
  );
};
