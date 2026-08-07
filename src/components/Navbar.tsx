import React from 'react';
import { FileSpreadsheet, Download, SlidersHorizontal, User, Moon, Sun, MessageSquare, Smartphone, Monitor } from 'lucide-react';

interface NavbarProps {
  isFirestoreConnected: boolean;
  onOpenInstallModal: () => void;
  onOpenExcelModal: () => void;
  currentUser: any;
  onOpenAuthModal: () => void;
  onOpenDrawer: () => void;
  isNativeApk?: boolean;
  onOpenSmsModal?: () => void;
  viewMode?: 'web' | 'android' | 'dual';
  onChangeViewMode?: (mode: 'web' | 'android' | 'dual') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isFirestoreConnected,
  onOpenInstallModal,
  onOpenExcelModal,
  currentUser,
  onOpenAuthModal,
  onOpenDrawer,
  isNativeApk = false,
  onOpenSmsModal,
  viewMode = 'web',
  onChangeViewMode,
}) => {
  const getUserLabel = () => {
    if (!currentUser) return null;
    if (currentUser.displayName) return currentUser.displayName;
    if (currentUser.username) return currentUser.username;
    if (currentUser.email) {
      return currentUser.email.replace('@expensetracker.app', '');
    }
    return 'User';
  };

  const usernameLabel = getUserLabel();

  return (
    <header className="sticky top-0 z-40 border-b shadow-md transition-colors bg-slate-900 text-white border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Name */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg shadow-indigo-500/20 shadow-lg text-white">
              ₹
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight">Expense Tracker</span>
              </div>
              <p className="text-xs hidden sm:block text-slate-400">
                Personal Expense Ledger
              </p>
            </div>
          </div>

          {/* Action Icons Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Logged in User Name Chip Pill */}
            {currentUser && usernameLabel && (
              <button
                onClick={onOpenDrawer}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full border bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-100 shadow-sm transition cursor-pointer active:scale-95"
                title="View Profile / Options"
              >
                <User className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="max-w-[140px] sm:max-w-[180px] truncate">{usernameLabel}</span>
              </button>
            )}

            {/* Dedicated SMS Sync Trigger Button (Shown ONLY in Native APK when logged in) */}
            {currentUser && isNativeApk && onOpenSmsModal && (
              <button
                onClick={onOpenSmsModal}
                className="p-2 sm:px-3 sm:py-2 flex items-center space-x-1.5 font-bold rounded-xl border transition active:scale-95 bg-amber-500 hover:bg-amber-600 text-white border-amber-400/40 shadow-md shadow-amber-500/20 cursor-pointer animate-pulse"
                title="Scan & Parse Bank SMS (Android APK)"
              >
                <MessageSquare className="w-5 h-5 sm:w-4 sm:h-4 text-white fill-white" />
                <span className="hidden sm:inline text-xs">Sync Bank SMS</span>
              </button>
            )}

            {/* Options Icon (Opens Right Sidebar Drawer - Always Present) */}
            <button
              onClick={onOpenDrawer}
              className="p-2.5 rounded-xl border transition active:scale-95 flex items-center justify-center relative shadow-sm cursor-pointer bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-slate-700"
              title="Options & Account Menu"
            >
              <SlidersHorizontal className="w-5 h-5 text-slate-200" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
