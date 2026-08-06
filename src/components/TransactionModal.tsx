import React, { useState, useEffect } from 'react';
import { X, Check, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CURRENCY_SYMBOL } from '../constants';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    date: string;
    note?: string;
    source: 'MANUAL' | 'SMS';
  }) => Promise<void>;
  editTransaction?: Transaction | null;
  defaultDate?: Date;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editTransaction,
  defaultDate,
}) => {
  const [type, setType] = useState<TransactionType>('DEBIT');
  const [amount, setAmount] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [dateStr, setDateStr] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setAmount(editTransaction.amount.toString());
      setTitle(editTransaction.title);
      setCategory(editTransaction.category);
      setNote(editTransaction.note || '');
      
      const d = new Date(editTransaction.date);
      if (!isNaN(d.getTime())) {
        setDateStr(d.toISOString().slice(0, 16));
      } else {
        setDateStr(new Date().toISOString().slice(0, 16));
      }
    } else {
      setType('DEBIT');
      setAmount('');
      setTitle('');
      setCategory(EXPENSE_CATEGORIES[0]);
      setNote('');
      const initDate = defaultDate || new Date();
      setDateStr(initDate.toISOString().slice(0, 16));
    }
    setErrorMsg('');
  }, [editTransaction, isOpen, defaultDate]);

  // Update category dropdown if user switches Expense / Income toggle
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'DEBIT') {
      setCategory(EXPENSE_CATEGORIES[0]);
    } else {
      setCategory(INCOME_CATEGORIES[0]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a transaction title.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: editTransaction ? editTransaction.id : undefined,
        type,
        amount: Math.round(numericAmount * 100) / 100, // 2 decimal precision
        title: title.trim(),
        category,
        date: new Date(dateStr).toISOString(),
        note: note.trim() || undefined,
        source: editTransaction ? editTransaction.source : 'MANUAL',
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryList = type === 'DEBIT' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">
            {editTransaction ? 'Edit Transaction' : 'Add New Entry'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* DEBIT / CREDIT Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => handleTypeChange('DEBIT')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                type === 'DEBIT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Expense (Debit)</span>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('CREDIT')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
                type === 'CREDIT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Income (Credit)</span>
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Amount ({CURRENCY_SYMBOL}) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                {CURRENCY_SYMBOL}
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
                required
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              placeholder={type === 'DEBIT' ? 'e.g., Groceries at DMart' : 'e.g., Monthly Salary'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            >
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Note (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Additional details..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : editTransaction ? 'Update Entry' : 'Save Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
