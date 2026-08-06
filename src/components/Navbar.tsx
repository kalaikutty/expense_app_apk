import React from 'react';
import { FileSpreadsheet, Download, SlidersHorizontal, LogIn, User, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  isFirestoreConnected: boolean;
  onOpenInstallModal: () => void;
  onOpenExcelModal: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  currentUser: any;
  onOpenAuthModal: () => void;
  onOpenDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isFirestoreConnected,
  onOpenInstallModal,
  onOpenExcelModal,
  theme,
  onToggleTheme,
  currentUser,
  onOpenAuthModal,
  onOpenDrawer,
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
  const isDark = theme === 'dark';

  return (
    <header
      className={`sticky top-0 z-40 border-b shadow-md transition-colors ${
        isDark ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-slate-200'
      }`}
    >
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
              <p className={`text-xs hidden sm:block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Personal Expense Ledger
              </p>
            </div>
          </div>

          {/* Action Icons Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* User Chip if Logged in */}
            {currentUser ? (
              <div className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs ${isDark ? 'bg-slate-800/80 border-slate-700/70' : 'bg-slate-100 border-slate-200'}`}>
                <User className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <span className={`font-semibold max-w-[120px] truncate ${isDark ? 'text-indigo-200' : 'text-indigo-700'}`}>
                  {usernameLabel}
                </span>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-3 py-2 rounded-xl shadow-md transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-2 sm:px-3 sm:py-2 flex items-center space-x-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun className="w-5 h-5 sm:w-4 sm:h-4" /> : <Moon className="w-5 h-5 sm:w-4 sm:h-4" />}
              <span className="hidden lg:inline text-xs font-semibold">{isDark ? 'Light' : 'Dark'}</span>
            </button>

            {/* Excel Sheet Interactive View Button */}
            <button
              onClick={onOpenExcelModal}
              className={`p-2 sm:px-3 sm:py-2 flex items-center space-x-1.5 rounded-xl border transition active:scale-95 cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-emerald-700 border-slate-200'
              }`}
              title="Open Excel Sheet View"
            >
              <FileSpreadsheet className={`w-5 h-5 sm:w-4 sm:h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span className="hidden lg:inline text-xs font-semibold">Excel Sheet</span>
            </button>

            {/* Download Icon (Install Standalone App & APK) */}
            <button
              onClick={onOpenInstallModal}
              className="p-2 sm:px-3 sm:py-2 flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl border border-indigo-500/40 shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
              title="Install App & Download Android APK"
            >
              <Download className="w-5 h-5 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline text-xs">Install / APK</span>
            </button>

            {/* Options Icon (Opens Right Sidebar Drawer) */}
            <button
              onClick={onOpenDrawer}
              className={`p-2.5 rounded-xl border transition active:scale-95 flex items-center justify-center relative shadow-sm cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 border-slate-200'
              }`}
              title="Options & Account Menu"
            >
              <SlidersHorizontal className={`w-5 h-5 ${isDark ? 'text-slate-200' : 'text-slate-700'}`} />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
