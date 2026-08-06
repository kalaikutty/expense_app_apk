import React from 'react';
import {
  LogIn,
  UserPlus,
  Smartphone,
  ShieldCheck,
  TrendingUp,
  MessageSquareText,
  PieChart,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface WelcomeLandingProps {
  onOpenAuthModal: () => void;
  onOpenInstallModal: () => void;
}

export const WelcomeLanding: React.FC<WelcomeLandingProps> = ({
  onOpenAuthModal,
  onOpenInstallModal,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Personal Expense Tracker</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Manage Your Daily Expenses Simply & Securely
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Expense Tracker helps you log income, track daily debits, auto-parse bank SMS notifications, and analyze your financial health with real-time cloud sync.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg shadow-indigo-600/30 transition text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Login / Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenInstallModal}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-3.5 rounded-2xl border border-slate-700 transition text-sm"
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <span>Install PWA App</span>
            </button>
          </div>
        </div>
      </div>

      {/* Basic Info: How It Works */}
      <div className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">How It Works</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A quick overview of what you can do with Expense Tracker
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">1. User Accounts</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Register with your chosen username and password to create a private financial ledger stored safely in the cloud.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">2. Log Expenses</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Record daily debits and income credits with categories (Rent, Food, Salary, Groceries) and custom notes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">3. Bank SMS Sync</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste SMS notifications from HDFC, SBI, ICICI, Axis, or UPI to automatically parse amounts and merchants.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <PieChart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">4. Visual Analytics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              View daily, monthly, and yearly breakdowns with category charts, period switchers, and balance totals.
            </p>
          </div>
        </div>
      </div>

      {/* Account Callout Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Ready to take control of your expenses?</h3>
          <p className="text-xs text-slate-400">
            Sign in or register a free account now to get started.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onOpenAuthModal}
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md transition"
          >
            Get Started / Login
          </button>
        </div>
      </div>
    </div>
  );
};
