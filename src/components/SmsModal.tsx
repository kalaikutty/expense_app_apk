import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Smartphone,
  RefreshCw,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react';
import { MessageReader } from '@solimanware/capacitor-sms-reader';
import {
  ParsedSmsEntry,
  parseBankSms,
  CATEGORIES,
} from '../utils/smsParser';

const PROCESSED_SMS_KEY = 'expensetracker_processed_sms_hashes';

const getProcessedSmsHashes = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PROCESSED_SMS_KEY);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {
    // ignore
  }
  return new Set();
};

const saveProcessedSmsHashes = (newHashes: string[]) => {
  try {
    const existing = getProcessedSmsHashes();
    newHashes.forEach((h) => existing.add(h));
    localStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(Array.from(existing)));
  } catch {
    // ignore
  }
};

const getSmsHash = (body: string, refNo?: string, dateStr?: string, amount?: number) => {
  const str = `${body.trim()}_${refNo || ''}_${dateStr || ''}_${amount || ''}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `sms_hash_${hash}`;
};

interface SmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransactions: (
    items: {
      type: 'DEBIT' | 'CREDIT';
      amount: number;
      title: string;
      category: string;
      date: string;
      source: 'IMPORT';
      note?: string;
    }[]
  ) => Promise<number>;
}

export const SmsModal: React.FC<SmsModalProps> = ({
  isOpen,
  onClose,
  onAddTransactions,
}) => {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [parsedEntries, setParsedEntries] = useState<ParsedSmsEntry[]>([]);
  const [expandedSmsId, setExpandedSmsId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      checkSmsPermissions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const checkSmsPermissions = async () => {
    try {
      const response = await MessageReader.getMessages({ limit: 1 });
      if (response && Array.isArray(response.messages)) {
        setPermissionState('granted');
      }
    } catch {
      setPermissionState('prompt');
    }
  };

  const handleScanDeviceSms = async () => {
    setIsScanning(true);
    setStatusMessage({ type: 'info', text: 'Scanning Android device SMS inbox...' });

    try {
      const response = await MessageReader.getMessages({ limit: 200 });
      const rawMessages = response?.messages || [];

      setPermissionState('granted');

      if (rawMessages.length === 0) {
        setIsScanning(false);
        setStatusMessage({
          type: 'info',
          text: 'Scanned inbox, but no SMS messages were found.',
        });
        return;
      }

      const processedHashes = getProcessedSmsHashes();
      const results: ParsedSmsEntry[] = [];
      let skippedCount = 0;

      rawMessages.forEach((msg) => {
        if (msg.body) {
          const parsed = parseBankSms(msg.body);
          if (parsed) {
            if (msg.date) {
              const smsDate = new Date(msg.date);
              if (!isNaN(smsDate.getTime())) {
                parsed.date = smsDate.toISOString().split('T')[0];
              }
            }
            const hash = getSmsHash(msg.body, parsed.referenceNo, parsed.date, parsed.amount);
            parsed.smsHash = hash;
            parsed.rawSmsId = (msg as any)._id || (msg as any).id;

            if (processedHashes.has(hash)) {
              skippedCount++;
              return; // Already parsed and imported into ledger
            }

            results.push(parsed);
          }
        }
      });

      setParsedEntries(results);
      setIsScanning(false);

      if (results.length > 0) {
        setStatusMessage({
          type: 'success',
          text: `Extracted ${results.length} new bank transaction SMS message(s)${skippedCount > 0 ? ` (${skippedCount} previously imported skipped)` : ''}!`,
        });
      } else if (skippedCount > 0) {
        setStatusMessage({
          type: 'info',
          text: `All ${skippedCount} matched bank SMS transactions have already been imported into your ledger.`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: `Scanned ${rawMessages.length} SMS messages, but no debit/credit bank transactions were matched.`,
        });
      }
    } catch (err: any) {
      setIsScanning(false);
      const errText = err?.message || 'Native SMS bridge error';
      if (errText.toLowerCase().includes('permission') || errText.toLowerCase().includes('denied')) {
        setPermissionState('denied');
        setStatusMessage({
          type: 'error',
          text: 'SMS permission denied. Please enable SMS permission in phone Settings > Apps > Expense Tracker > Permissions > SMS.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Device SMS scan error: ${errText}. Ensure app is running on Android device with SMS permission granted.`,
        });
      }
    }
  };

  const handleToggleSelect = (id: string) => {
    setParsedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleSelectAll = () => {
    const allSelected = parsedEntries.every((e) => e.selected);
    setParsedEntries((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleRemoveEntry = (id: string) => {
    setParsedEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllParsed = () => {
    setParsedEntries([]);
    setExpandedSmsId(null);
    setStatusMessage({ type: 'info', text: 'Cleared all parsed SMS entries from preview.' });
  };

  const handleUpdateEntryField = (id: string, field: keyof ParsedSmsEntry, value: any) => {
    setParsedEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectedCount = parsedEntries.filter((e) => e.selected).length;

  const handleAddSelectedToApp = async () => {
    const selected = parsedEntries.filter((e) => e.selected);
    if (selected.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select at least one parsed entry to add.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage({
      type: 'info',
      text: `Adding ${selected.length} transaction(s) to your ledger based on transaction dates...`,
    });

    try {
      const formattedItems = selected.map((item) => ({
        type: item.type,
        amount: item.amount,
        title: item.title,
        category: item.category,
        date: item.date.length === 10 ? `${item.date}T12:00:00.000Z` : item.date,
        source: 'IMPORT' as const,
        note: `Bank SMS (${item.bankName || 'Auto-parsed'}) ${item.referenceNo ? `Ref: ${item.referenceNo}` : ''}`.trim(),
      }));

      const addedCount = await onAddTransactions(formattedItems);

      // Save hashes to mark as processed and attempt native markAsRead
      const hashesToSave: string[] = [];
      selected.forEach((item) => {
        if (item.smsHash) {
          hashesToSave.push(item.smsHash);
        }
        if (item.rawSmsId) {
          try {
            if (typeof (MessageReader as any).markAsRead === 'function') {
              (MessageReader as any).markAsRead({ id: item.rawSmsId });
            }
          } catch {
            // ignore native markAsRead if unsupported
          }
        }
      });

      if (hashesToSave.length > 0) {
        saveProcessedSmsHashes(hashesToSave);
      }

      // Remove added items from state list
      const addedIds = new Set(selected.map((s) => s.id));
      setParsedEntries((prev) => prev.filter((item) => !addedIds.has(item.id)));

      setStatusMessage({
        type: 'success',
        text: `✓ Added ${addedCount} entry/entries to ledger & marked message(s) as processed!`,
      });

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMessage({
        type: 'error',
        text: `Failed to add entries: ${err?.message || 'Unknown error'}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <MessageSquare className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight">Bank SMS Sync</h2>
              <p className="text-xs text-indigo-100 font-medium">
                Detect & import bank transactions automatically from device SMS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Permission & Scanning Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span>Android System SMS Permission</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Permission status:{' '}
                <strong
                  className={
                    permissionState === 'granted'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {permissionState === 'granted' ? '✓ Granted' : 'Permission Required'}
                </strong>
              </p>
            </div>

            <button
              onClick={handleScanDeviceSms}
              disabled={isScanning}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>
                {isScanning
                  ? 'Scanning Inbox...'
                  : permissionState === 'granted'
                  ? 'Rescan Device SMS'
                  : 'Grant Permission & Scan SMS'}
              </span>
            </button>
          </div>

          {/* PARSED ENTRIES SECTION */}
          {parsedEntries.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleToggleSelectAll}
                    className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer"
                  >
                    {parsedEntries.every((e) => e.selected) ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      Select All ({selectedCount} of {parsedEntries.length} selected)
                    </span>
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-medium">
                    Verify & edit before adding
                  </span>
                  <button
                    onClick={handleClearAllParsed}
                    className="flex items-center space-x-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>

              {/* List of Formatted Entry Cards */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {parsedEntries.map((item) => {
                  const isExpanded = expandedSmsId === item.id;
                  const isCredit = item.type === 'CREDIT';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition ${
                        item.selected
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800/80 shadow-xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleSelect(item.id)}
                          className="mt-0.5 text-indigo-600 cursor-pointer shrink-0"
                        >
                          {item.selected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Details Grid */}
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Merchant / Title Input */}
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateEntryField(item.id, 'title', e.target.value)}
                              className="font-bold text-xs text-slate-900 dark:text-slate-100 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 rounded"
                            />

                            {/* Amount Badge */}
                            <div className="flex items-center space-x-2">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                                  isCredit
                                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/50'
                                    : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300/50'
                                }`}
                              >
                                {isCredit ? (
                                  <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3 text-rose-600" />
                                )}
                                <span>
                                  {isCredit ? '+' : '-'} ₹{item.amount.toLocaleString('en-IN')}
                                </span>
                              </span>
                              <button
                                onClick={() => handleRemoveEntry(item.id)}
                                className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove this entry from preview"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>                              
                            </div>
                          </div>

                          {/* Date and Category selectors */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                            {/* Date Field */}
                            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <input
                                type="date"
                                value={item.date}
                                onChange={(e) => handleUpdateEntryField(item.id, 'date', e.target.value)}
                                className="bg-transparent border-none text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                              />
                            </div>

                            {/* Type Toggle */}
                            <select
                              value={item.type}
                              onChange={(e) =>
                                handleUpdateEntryField(item.id, 'type', e.target.value as 'DEBIT' | 'CREDIT')
                              }
                              className="bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 rounded-lg border-none focus:outline-none cursor-pointer"
                            >
                              <option value="DEBIT">DEBIT (Expense)</option>
                              <option value="CREDIT">CREDIT (Income)</option>
                            </select>

                            {/* Category Selector */}
                            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                              <Tag className="w-3 h-3 text-slate-400" />
                              <select
                                value={item.category}
                                onChange={(e) => handleUpdateEntryField(item.id, 'category', e.target.value)}
                                className="bg-transparent border-none text-[11px] font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                              >
                                {CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Collapsible Original Text */}
                          <div>
                            <button
                              onClick={() => setExpandedSmsId(isExpanded ? null : item.id)}
                              className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center space-x-1 hover:underline cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Raw SMS Text' : 'View Raw SMS Text'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isExpanded && (
                              <p className="mt-1.5 p-2 bg-slate-100 dark:bg-slate-900 rounded-lg text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                "{item.originalText}"
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6">
              <MessageSquare className="w-10 h-10 text-indigo-400 mx-auto" />
              <div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                  No Bank SMS Messages Scanned Yet
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Tap "Grant Permission & Scan SMS" or "Rescan Device SMS" above to automatically scan your device's inbox for bank debit and credit SMS.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-slate-500">
            {selectedCount} item(s) ready to import
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSelectedToApp}
              disabled={selectedCount === 0 || isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              <span>Add Selected Entries ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
