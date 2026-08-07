import React, { useState } from 'react';
import {
  Smartphone,
  Plus,
  RefreshCw,
  MessageSquare,
  Wifi,
  Battery,
  Signal,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { Transaction, PeriodType } from '../types';
import { PeriodSwitcher } from './PeriodSwitcher';
import { DateNavigator } from './DateNavigator';
import { SummaryCards } from './SummaryCards';
import { TransactionList } from './TransactionList';
import { Charts } from './Charts';

interface AndroidAppProps {
  transactions: Transaction[];
  onOpenAddModal: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedPeriod: PeriodType;
  setSelectedPeriod: (p: PeriodType) => void;
  onOpenSmsModal: () => void;
  onRefresh?: () => void;
  smsCount?: number;
}

export const AndroidApp: React.FC<AndroidAppProps> = ({
  transactions,
  onOpenAddModal,
  onEditTransaction,
  onDeleteTransaction,
  currentDate,
  setCurrentDate,
  selectedPeriod,
  setSelectedPeriod,
  onOpenSmsModal,
  onRefresh,
  smsCount = 0,
}) => {
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

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

  let periodTransactions: Transaction[] = [];
  let totalIncome = 0;
  let totalExpense = 0;

  if (selectedPeriod === 'Day') {
    periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startOfDay && d <= endOfDay;
    });

    // Cumulative totals up to selected day
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

  const handlePullToRefresh = () => {
    setIsPullRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsPullRefreshing(false), 800);
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative pb-20">
      {/* Mobile App Bar */}
      <div className="sticky top-0 z-30 bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-indigo-200" />
          <div>
            <h3 className="font-bold text-base leading-none">Expense Tracker</h3>
            <span className="text-[10px] text-indigo-200 font-medium">Personal Ledger</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Sync Bank SMS Button */}
          <button
            onClick={onOpenSmsModal}
            className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white text-xs px-3 py-1.5 rounded-xl transition font-bold shadow-xs cursor-pointer"
            title="Scan bank SMS for auto-import"
          >
            <MessageSquare className="w-3.5 h-3.5 text-white fill-white" />
            <span>Parse SMS</span>
          </button>

          {/* Pull / Manual Refresh trigger */}
          <button
            onClick={handlePullToRefresh}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white transition cursor-pointer"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-4 h-4 ${isPullRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pull to Refresh Indicator Bar */}
      {isPullRefreshing && (
        <div className="bg-indigo-50 dark:bg-indigo-950/80 border-b border-indigo-100 dark:border-indigo-900 py-1.5 text-center text-xs text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center space-x-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Refreshing live snapshot...</span>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-3.5 sm:p-5 space-y-4">
        {/* Period Switcher */}
        <div className="flex justify-center">
          <PeriodSwitcher
            selectedPeriod={selectedPeriod}
            onSelectPeriod={setSelectedPeriod}
          />
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

        {/* Charts (Month & Year) */}
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
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onOpenAddModal}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm px-5 py-3.5 rounded-full shadow-xl shadow-indigo-600/40 transition-all border border-white/20 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>+ Add Entry</span>
        </button>
      </div>
    </div>
  );
};
