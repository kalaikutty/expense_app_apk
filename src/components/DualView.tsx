import React from 'react';
import { Smartphone, Monitor, Zap } from 'lucide-react';
import { Transaction, PeriodType } from '../types';
import { WebApp } from './WebApp';
import { AndroidApp } from './AndroidApp';

interface DualViewProps {
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
}

export const DualView: React.FC<DualViewProps> = ({
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
}) => {
  return (
    <div className="space-y-4 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Live Sync Banner */}
      <div className="bg-indigo-950/80 text-indigo-200 border border-indigo-800/80 p-3 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-medium shadow-sm">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse shrink-0" />
          <span>
            <strong>Dual Client Live Sync:</strong> Both clients listen to the same Firestore snapshot stream. Add or edit on Web or Android to witness instant sync.
          </span>
        </div>
        <span className="hidden md:inline bg-indigo-800/60 text-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
          {transactions.length} docs synced
        </span>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Web App (XL 7 cols) */}
        <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs font-bold">
            <span className="flex items-center space-x-2">
              <Monitor className="w-4 h-4 text-indigo-400" />
              <span>CLIENT 1: Web App (React)</span>
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
              Desktop / Tablet View
            </span>
          </div>

          <WebApp
            transactions={transactions}
            onOpenAddModal={onOpenAddModal}
            onEditTransaction={onEditTransaction}
            onDeleteTransaction={onDeleteTransaction}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            onRefresh={onRefresh}
          />
        </div>

        {/* Right Column: Android App (XL 5 cols) */}
        <div className="xl:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between text-xs font-bold">
            <span className="flex items-center space-x-2">
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>CLIENT 2: Android App (Native Frame)</span>
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              With Bank SMS Auto-Import
            </span>
          </div>

          <AndroidApp
            transactions={transactions}
            onOpenAddModal={onOpenAddModal}
            onEditTransaction={onEditTransaction}
            onDeleteTransaction={onDeleteTransaction}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            selectedPeriod={selectedPeriod}
            setSelectedPeriod={setSelectedPeriod}
            onOpenSmsModal={onOpenSmsModal}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
};
