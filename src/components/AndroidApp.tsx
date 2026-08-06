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
    <div className="flex justify-center items-start py-4 px-2">
      {/* Android Device Mockup Container */}
      <div className="w-full max-w-[420px] bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 relative">
        {/* Android Hardware Camera Punch Hole */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 rounded-full z-50 border border-slate-800" />

        {/* Phone Inner Screen */}
        <div className="bg-slate-50 text-slate-900 rounded-[34px] overflow-hidden flex flex-col h-[820px] relative">
          {/* Android Status Bar */}
          <div className="bg-slate-900 text-white px-6 pt-3 pb-2 flex items-center justify-between text-xs font-semibold z-40">
            <span>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
            <div className="flex items-center space-x-2">
              <Signal className="w-3.5 h-3.5" />
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* Android App Bar */}
          <div className="bg-indigo-600 text-white p-4 shadow-md flex items-center justify-between z-30">
            <div className="flex items-center space-x-2">
              <Smartphone className="w-5 h-5 text-indigo-200" />
              <div>
                <h3 className="font-bold text-base leading-none">Expense Tracker</h3>
                <span className="text-[10px] text-indigo-200 font-medium">Android Client</span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Sync Bank SMS Button */}
              <button
                onClick={onOpenSmsModal}
                className="flex items-center space-x-1 bg-white/15 hover:bg-white/25 text-white text-xs px-2.5 py-1.5 rounded-xl transition backdrop-blur-xs font-semibold"
                title="Scan bank SMS for auto-import"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-300" />
                <span>Sync SMS</span>
              </button>

              {/* Pull Refresh trigger */}
              <button
                onClick={handlePullToRefresh}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white transition"
                title="Pull to refresh"
              >
                <RefreshCw className={`w-4 h-4 ${isPullRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Pull to Refresh Indicator Bar */}
          {isPullRefreshing && (
            <div className="bg-indigo-50 border-b border-indigo-100 py-1.5 text-center text-xs text-indigo-700 font-semibold flex items-center justify-center space-x-2 animate-in slide-in-from-top duration-150">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Refreshing Firestore live snapshot...</span>
            </div>
          )}

          {/* Scrollable Main Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4 pb-20">
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

          {/* Android Floating Action Button (+ Add Entry) */}
          <div className="absolute bottom-5 left-0 right-0 z-40 flex justify-center pointer-events-none">
            <button
              onClick={onOpenAddModal}
              className="pointer-events-auto flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs px-5 py-3 rounded-full shadow-lg shadow-indigo-600/40 transition-all border border-white/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Entry</span>
            </button>
          </div>

          {/* Android Bottom Navigation Bar */}
          <div className="bg-slate-900 text-slate-400 py-2 px-6 flex items-center justify-around border-t border-slate-800 text-xs">
            <div className="w-3 h-3 border-l-2 border-b-2 border-slate-400 rotate-45" />
            <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded-full" />
            <div className="w-3.5 h-3.5 border-2 border-slate-400 rounded-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};
