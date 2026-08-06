import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  MessageSquare,
  User,
  Trash2,
  Edit2,
  Calendar,
  AlertTriangle,
  Receipt,
  Search,
} from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency, formatShortDate, formatTimeDisplay } from '../utils/formatters';

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const categories = Array.from(new Set(transactions.map((t) => t.category)));

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.note && tx.note.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = filterCategory === 'ALL' || tx.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteConfirm = () => {
    if (deleteCandidateId) {
      onDeleteTransaction(deleteCandidateId);
      setDeleteCandidateId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header & Controls */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-base">Transactions</h3>
            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {filtered.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 sm:w-44"
              />
            </div>

            {/* Category Dropdown Filter */}
            {categories.length > 0 && (
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="py-1 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-slate-400 space-y-2">
          <p className="text-sm font-medium">No transactions found for this period.</p>
          <p className="text-xs text-slate-400">
            Click "+ Add Entry" or sync bank SMS on Android to add transactions.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
          {filtered.map((tx) => {
            const isDebit = tx.type === 'DEBIT';
            return (
              <div
                key={tx.id}
                className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between group"
              >
                {/* Left side: Icon + Title + Category + Date */}
                <div
                  onClick={() => onEditTransaction(tx)}
                  className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0 pr-3"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isDebit
                        ? 'bg-rose-50 text-rose-600 border border-rose-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                    }`}
                  >
                    {isDebit ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">
                        {tx.title}
                      </span>
                      {tx.source === 'SMS' ? (
                        <span className="inline-flex items-center space-x-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>SMS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0">
                          <User className="w-2.5 h-2.5" />
                          <span>Manual</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5 truncate">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-600">
                        {tx.category}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="flex items-center space-x-1 text-slate-400 text-[11px]">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatShortDate(tx.date)} {formatTimeDisplay(tx.date)}
                        </span>
                      </span>
                    </div>

                    {tx.note && (
                      <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-md">
                        "{tx.note}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Right side: Amount + Actions */}
                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <span
                      className={`font-bold text-sm sm:text-base tracking-tight ${
                        isDebit ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {isDebit ? '-' : '+'}{formatCurrency(tx.amount)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Edit transaction"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteCandidateId(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidateId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-bold text-slate-900 text-lg">Delete Transaction?</h4>
              <p className="text-xs text-slate-500">
                Are you sure you want to delete this record? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteCandidateId(null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
