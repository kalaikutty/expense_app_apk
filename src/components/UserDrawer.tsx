import React, { useRef, useState } from 'react';
import {
  User,
  LogOut,
  Download,
  Upload,
  X,
  SlidersHorizontal,
  CheckCircle,
  AlertCircle,
  UserCheck,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction } from '../types';
import { generateExcelCsv, downloadExcelFile, parseExcelCsvText } from '../utils/excelHelper';

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    uid: string;
    displayName: string;
    username?: string;
    email?: string;
  } | null;
  transactions: Transaction[];
  onSignOut: () => void;
  onImportTransactions: (items: any[]) => Promise<number>;
  onOpenAuthModal: () => void;
  onOpenExcelModal: () => void;
}

export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  transactions,
  onSignOut,
  onImportTransactions,
  onOpenAuthModal,
  onOpenExcelModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const getUserLabel = () => {
    if (!currentUser) return 'Guest User';
    if (currentUser.displayName) return currentUser.displayName;
    if (currentUser.username) return currentUser.username;
    if (currentUser.email) return currentUser.email.split('@')[0];
    return 'User';
  };

  const usernameTag = currentUser
    ? currentUser.username || currentUser.email?.split('@')[0] || currentUser.displayName
    : 'Not logged in';

  // Export Excel CSV Data Handler
  const handleExportData = () => {
    if (!transactions || transactions.length === 0) {
      setImportMessage({ type: 'error', text: 'No transactions found in ledger to export.' });
      setTimeout(() => setImportMessage(null), 4000);
      return;
    }

    const csvContent = generateExcelCsv(transactions, usernameTag);
    const filename = `expense_ledger_${usernameTag}_${new Date().toISOString().slice(0, 10)}.csv`;

    downloadExcelFile(csvContent, filename);

    setImportMessage({
      type: 'success',
      text: `Exported ${transactions.length} expense record(s) to Excel CSV!`,
    });
    setTimeout(() => setImportMessage(null), 4000);
  };

  // Trigger file picker for Excel / CSV import
  const handleTriggerImport = () => {
    fileInputRef.current?.click();
  };

  // Process selected file (Excel / CSV / JSON)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = event.target?.result as string;
        let list: any[] = [];

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed)) list = parsed;
          else if (parsed && Array.isArray(parsed.transactions)) list = parsed.transactions;
        } else {
          // Parse CSV / Excel
          const parsedRows = parseExcelCsvText(rawContent);
          list = parsedRows;
        }

        if (!list || list.length === 0) {
          setImportMessage({ type: 'error', text: 'No valid transaction records found in file.' });
          setIsImporting(false);
          return;
        }

        const count = await onImportTransactions(list);
        setImportMessage({
          type: 'success',
          text: `Imported ${count} expense record(s) from Excel file!`,
        });
      } catch (err) {
        console.error('Import parse error:', err);
        setImportMessage({
          type: 'error',
          text: 'Failed to parse Excel file. Please upload a valid CSV/Excel file.',
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setImportMessage(null), 5000);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-fadeIn"
      />

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv,.xlsx,.xls,.json,.txt"
        className="hidden"
      />

      {/* Right Drawer Panel */}
      <div className="relative w-full max-w-sm bg-slate-900 text-white h-full shadow-2xl border-l border-slate-800 flex flex-col z-10 animate-slideLeft overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight text-white">Options & Settings</h2>
              <p className="text-xs text-slate-400">Account & Excel Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Options"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - One by One Stack */}
        <div className="p-5 space-y-6 flex-1">
          {/* Status Message Notification */}
          {importMessage && (
            <div
              className={`flex items-start space-x-2.5 p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                importMessage.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
              }`}
            >
              {importMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{importMessage.text}</span>
            </div>
          )}

          {/* User Profile Card */}
          <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 space-y-3 shadow-md">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-600/20">
                <User className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-base text-white truncate">{getUserLabel()}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Account Username: <span className="text-indigo-300 font-semibold">{usernameTag}</span>
                </p>
              </div>
            </div>

            {currentUser ? (
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center space-x-1">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>LoggedIn</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-xl border border-indigo-500/30 transition"
                >
                  Switch Account
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md transition"
              >
                Sign In / Register
              </button>
            )}
          </div>

          {/* Options Menu Items - One by One Stack */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">
              Data Controls
            </h3>

            {/* 1. Open Interactive Excel Sheet Viewer */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExcelModal();
              }}
              className="w-full flex items-center justify-between p-3.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 rounded-2xl border border-emerald-500/30 transition active:scale-[0.98]"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-emerald-200">Excel Sheet View</p>
                  <p className="text-xs text-emerald-400/80">View, edit & sync interactive spreadsheet</p>
                </div>
              </div>
            </button>

            {/* 2. Import Excel Data */}
            <button
              type="button"
              onClick={handleTriggerImport}
              disabled={isImporting || !currentUser}
              className="w-full flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-slate-800 text-slate-100 rounded-2xl border border-slate-700/70 transition active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Import Excel Data</p>
                  <p className="text-xs text-slate-400">Restore ledger from .csv / .xlsx file</p>
                </div>
              </div>
              {isImporting && <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />}
            </button>

            {/* 3. Export Excel Data */}
            <button
              type="button"
              onClick={handleExportData}
              disabled={!currentUser}
              className="w-full flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-slate-800 text-slate-100 rounded-2xl border border-slate-700/70 transition active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Download className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-white">Export Excel Sheet</p>
                  <p className="text-xs text-slate-400">Download full ledger as Excel .csv file</p>
                </div>
              </div>
            </button>

            {/* 4. Logout */}
            {currentUser && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="w-full flex items-center justify-between p-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/30 transition active:scale-[0.98] mt-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-rose-200">Logout</p>
                    <p className="text-xs text-rose-400/80">Sign out of active account</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          Expense Tracker • Interactive Excel Ledger
        </div>
      </div>
    </div>
  );
};
