import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Info,
  Edit3,
} from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants';
import { ExcelRow, generateExcelCsv, downloadExcelFile, parseExcelCsvText } from '../utils/excelHelper';

interface ExcelViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onSaveExcelRowsToLedger: (rows: ExcelRow[]) => Promise<number>;
  usernameTag: string;
}

export const ExcelViewerModal: React.FC<ExcelViewerModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onSaveExcelRowsToLedger,
  usernameTag,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Editable rows state for the spreadsheet
  const [rows, setRows] = useState<ExcelRow[]>([]);
  const [isTemporaryView, setIsTemporaryView] = useState<boolean>(false);
  const [openedFileName, setOpenedFileName] = useState<string>('Live_Expense_Ledger.csv');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Initialize rows from live ledger transactions whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (transactions && transactions.length > 0) {
        setRows(
          transactions.map((t) => ({
            id: t.id,
            date: t.date.slice(0, 10),
            title: t.title,
            category: t.category,
            type: t.type,
            amount: t.amount,
            note: t.note || '',
            source: t.source || 'MANUAL',
          }))
        );
        setIsTemporaryView(false);
        setOpenedFileName(`Ledger_${usernameTag || 'User'}_${new Date().toISOString().slice(0, 10)}.csv`);
      } else {
        // Empty template row if no data exists
        setRows([
          {
            date: new Date().toISOString().slice(0, 10),
            title: 'Sample Expense',
            category: 'Food & Dining',
            type: 'DEBIT',
            amount: 250,
            note: 'Lunch at Cafe',
            source: 'EXCEL',
          },
        ]);
        setIsTemporaryView(true);
      }
    }
  }, [isOpen, transactions, usernameTag]);

  if (!isOpen) return null;

  // Calculate Sheet Totals
  const totalIncome = rows.reduce((acc, r) => (r.type === 'CREDIT' ? acc + (Number(r.amount) || 0) : acc), 0);
  const totalExpense = rows.reduce((acc, r) => (r.type === 'DEBIT' ? acc + (Number(r.amount) || 0) : acc), 0);
  const netBalance = totalIncome - totalExpense;

  // Cell Change Handler
  const handleCellChange = (index: number, field: keyof ExcelRow, value: any) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'amount' ? Math.abs(parseFloat(value) || 0) : value,
      };
      return updated;
    });
  };

  // Add New Row to Sheet
  const handleAddRow = () => {
    const newRow: ExcelRow = {
      date: new Date().toISOString().slice(0, 10),
      title: 'New Transaction',
      category: 'Other',
      type: 'DEBIT',
      amount: 0,
      note: '',
      source: 'EXCEL',
    };
    setRows((prev) => [...prev, newRow]);
  };

  // Delete Row from Sheet
  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Export current interactive grid to CSV/Excel File
  const handleExportSheet = () => {
    const csvData = generateExcelCsv(
      rows.map((r, i) => ({
        id: r.id || `temp-${i}`,
        date: r.date.length === 10 ? `${r.date}T12:00:00.000Z` : r.date,
        title: r.title,
        category: r.category,
        type: r.type,
        amount: Number(r.amount) || 0,
        note: r.note || '',
        source: 'EXCEL',
        createdAt: new Date().toISOString(),
      })),
      usernameTag
    );

    const filename = openedFileName.endsWith('.csv') ? openedFileName : `${openedFileName}.csv`;
    downloadExcelFile(csvData, filename);

    setStatusMessage({
      type: 'success',
      text: `Successfully exported ${rows.length} row(s) to ${filename}!`,
    });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Open/Import external CSV or Excel file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOpenedFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = parseExcelCsvText(text);

        if (parsed.length === 0) {
          setStatusMessage({ type: 'error', text: 'No valid rows found in the selected file.' });
          return;
        }

        setRows(parsed);
        setIsTemporaryView(true); // Marked as temporary view until user clicks Sync/Save
        setStatusMessage({
          type: 'success',
          text: `Opened "${file.name}" with ${parsed.length} rows (Temporary View). Click "Sync to Ledger" to save permanently.`,
        });
      } catch (err) {
        console.error('Failed to parse file:', err);
        setStatusMessage({ type: 'error', text: 'Could not read file. Please select a valid CSV/Excel file.' });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setTimeout(() => setStatusMessage(null), 6000);
      }
    };

    reader.readAsText(file);
  };

  // Sync / Save sheet rows to permanent ledger
  const handleSyncToLedger = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const savedCount = await onSaveExcelRowsToLedger(rows);
      setIsTemporaryView(false);
      setStatusMessage({
        type: 'success',
        text: `Successfully updated ${savedCount} entry/entries to live Expense Tracker!`,
      });
    } catch (err) {
      console.error('Error saving excel rows to ledger:', err);
      setStatusMessage({ type: 'error', text: 'Failed to update ledger. Please try again.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-1.5 sm:p-6 overflow-hidden animate-fadeIn">
      {/* Hidden File Picker for Opening External Excel / CSV */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv,.txt,.xlsx,.xls"
        className="hidden"
      />

      {/* Main Excel Spreadsheet Modal Dialog */}
      <div className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[94vh] sm:h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Top Header Bar */}
        <div className="bg-slate-900 text-white p-3.5 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-inner">
              <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <h2 className="font-bold text-sm sm:text-lg text-white tracking-tight truncate">
                  Excel Sheet View
                </h2>
                {isTemporaryView ? (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                    <Eye className="w-3 h-3 text-amber-400" />
                    <span>Temporary</span>
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Live Ledger</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[160px] xs:max-w-xs sm:max-w-md">
                File: <span className="text-emerald-300 font-mono">{openedFileName}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center space-x-1.5 active:scale-95"
              title="Open Excel / CSV File"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span className="text-xs">Open</span>
            </button>

            <button
              onClick={handleExportSheet}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl border border-indigo-500/40 shadow-sm transition flex items-center space-x-1.5 active:scale-95"
              title="Download Excel CSV Sheet"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs">Export</span>
            </button>

            <button
              onClick={handleSyncToLedger}
              disabled={isSaving}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="hidden xs:inline">Sync</span>
              <span>Save</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Sheet View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informational Banner & Stat Cards Bar */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200 shrink-0 space-y-2.5">
          {statusMessage && (
            <div
              className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl text-xs font-medium ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{statusMessage.text}</span>
              </div>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-500 hover:text-slate-800 text-xs font-bold"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-[11px] sm:text-xs">
                Edit grid cells directly or add rows. Click <strong>"Sync Save"</strong> to save to app.
              </span>
            </div>

            {/* Mobile Scroll Indicator Badge & Quick Metrics */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full font-mono text-xs shrink-0">
              <div className="flex items-center space-x-1 text-[11px] font-sans font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl shrink-0">
                <span>↔ Scroll left/right to view full sheet</span>
              </div>
              <div className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 shrink-0">
                <span className="text-slate-400 mr-1 font-sans">Rows:</span>
                <span className="text-slate-800 font-bold">{rows.length}</span>
              </div>
              <div className="bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 text-emerald-700 shrink-0">
                <span className="mr-1 font-sans">Income:</span>
                <span className="font-bold">₹{totalIncome.toLocaleString()}</span>
              </div>
              <div className="bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 text-rose-700 shrink-0">
                <span className="mr-1 font-sans">Expense:</span>
                <span className="font-bold">₹{totalExpense.toLocaleString()}</span>
              </div>
              <div className="bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 text-indigo-700 shrink-0">
                <span className="mr-1 font-sans">Net:</span>
                <span className="font-bold">₹{netBalance.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Excel Grid Table - Mobile Scroll Container */}
        <div
          className="flex-1 overflow-x-auto overflow-y-auto p-2 sm:p-4 bg-slate-100 custom-scrollbar touch-pan-x touch-pan-y"
          style={{ transform: 'translateZ(0)', WebkitOverflowScrolling: 'touch' }}
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden min-w-[940px]">
            <table className="w-full text-left border-collapse text-xs font-sans min-w-[940px]">
              <thead className="sticky top-0 z-10 shadow-xs">
                <tr className="bg-slate-900 text-slate-200 uppercase text-[11px] font-bold tracking-wider divide-x divide-slate-800">
                  <th className="py-3 px-3 text-center w-12 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">
                    #
                  </th>
                  <th className="py-3 px-3 min-w-[130px]">Date</th>
                  <th className="py-3 px-3 min-w-[200px]">Title / Description</th>
                  <th className="py-3 px-3 min-w-[140px]">Category</th>
                  <th className="py-3 px-3 min-w-[130px]">Type</th>
                  <th className="py-3 px-3 min-w-[120px]">Amount (₹)</th>
                  <th className="py-3 px-3 min-w-[200px]">Note</th>
                  <th className="py-3 px-3 text-center w-16 sticky right-0 z-20 bg-slate-900 border-l border-slate-800">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white font-mono">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-sans">
                      No rows in spreadsheet. Click <strong>"+ Add Row"</strong> below to create entries.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-indigo-50/50 transition divide-x divide-slate-100 group"
                    >
                      {/* Sticky Row Index Column */}
                      <td className="py-2 px-3 text-center font-bold text-slate-500 bg-slate-50 sticky left-0 z-10 select-none border-r border-slate-200">
                        {idx + 1}
                      </td>

                      {/* Date Input */}
                      <td className="p-1">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handleCellChange(idx, 'date', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 text-xs outline-none transition"
                        />
                      </td>

                      {/* Title Input */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.title}
                          placeholder="Transaction Title"
                          onChange={(e) => handleCellChange(idx, 'title', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-900 font-semibold text-xs outline-none transition"
                        />
                      </td>

                      {/* Category Selector */}
                      <td className="p-1">
                        <select
                          value={row.category}
                          onChange={(e) => handleCellChange(idx, 'category', e.target.value)}
                          className="w-full px-2 py-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 text-xs outline-none transition bg-transparent"
                        >
                          {(row.type === 'CREDIT' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                            (cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            )
                          )}
                        </select>
                      </td>

                      {/* Type Selector (CREDIT / DEBIT) */}
                      <td className="p-1">
                        <select
                          value={row.type}
                          onChange={(e) => handleCellChange(idx, 'type', e.target.value as TransactionType)}
                          className={`w-full px-2 py-1.5 rounded-lg font-bold text-xs outline-none border border-transparent hover:border-slate-300 focus:bg-white transition ${
                            row.type === 'CREDIT'
                              ? 'text-emerald-700 bg-emerald-50/50'
                              : 'text-rose-700 bg-rose-50/50'
                          }`}
                        >
                          <option value="DEBIT">DEBIT (Expense)</option>
                          <option value="CREDIT">CREDIT (Income)</option>
                        </select>
                      </td>

                      {/* Amount Input */}
                      <td className="p-1">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.amount}
                          onChange={(e) => handleCellChange(idx, 'amount', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-900 font-bold text-xs outline-none transition"
                        />
                      </td>

                      {/* Note Input */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.note || ''}
                          placeholder="Optional note"
                          onChange={(e) => handleCellChange(idx, 'note', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-600 text-xs outline-none transition"
                        />
                      </td>

                      {/* Delete Action */}
                      <td className="py-1 px-2 text-center sticky right-0 z-10 bg-white border-l border-slate-200">
                        <button
                          onClick={() => handleDeleteRow(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Bottom Toolbar */}
        <div className="bg-slate-900 text-white p-3 sm:p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <button
            onClick={handleAddRow}
            className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Row</span>
          </button>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onClose}
              className="px-3 py-2 sm:px-4 sm:py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Close
            </button>
            <button
              onClick={handleSyncToLedger}
              disabled={isSaving}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Sync & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
