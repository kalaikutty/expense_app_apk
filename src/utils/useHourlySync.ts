import { useEffect, useRef, useState } from 'react';
import { Transaction } from '../types';
import { parseBankSms } from './smsParser';
import {
  getProcessedHashes,
  saveProcessedHashes,
  computeFingerprint,
  isDuplicateTransaction,
} from './deduplication';
import { MessageReader } from '@solimanware/capacitor-sms-reader';
import { Capacitor } from '@capacitor/core';

const LAST_SYNC_KEY = 'expensetracker_last_hourly_sync_time';
const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
// First-ever run has no lastSyncTime yet - only look back this far so we don't re-parse
// a phone's entire SMS history on first launch.
const INITIAL_LOOKBACK_MS = 24 * 60 * 60 * 1000; // 24 hours

interface UseHourlySyncOptions {
  enabled: boolean;
  currentUser: any;
  existingTransactions: Transaction[];
  onAddTransactions: (
    items: {
      type: 'DEBIT' | 'CREDIT';
      amount: number;
      title: string;
      category: string;
      date: string;
      source: 'sms';
      note?: string;
    }[]
  ) => Promise<number>;
}

export function useHourlySync({
  enabled,
  currentUser,
  existingTransactions,
  onAddTransactions,
}: UseHourlySyncOptions) {
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => {
    try {
      const val = localStorage.getItem(LAST_SYNC_KEY);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  });

  const [lastSyncSummary, setLastSyncSummary] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const isSyncingRef = useRef<boolean>(false);

  /**
   * Main background sync function for bank SMS parsing.
   * Returns `{ status: 'already_running' }` if another parsing task is currently active.
   */
  const performSmsSync = async (): Promise<{ status: 'started' | 'already_running' | 'completed'; message?: string }> => {
    if (isSyncingRef.current) {
      return {
        status: 'already_running',
        message: 'Parsing is already running in the background. Please wait...',
      };
    }

    if (!currentUser || !enabled) {
      return { status: 'completed', message: 'Sync disabled or user not authenticated' };
    }

    isSyncingRef.current = true;
    setIsParsing(true);

    try {
      const processedHashes = getProcessedHashes();
      const newItemsToAdd: {
        type: 'DEBIT' | 'CREDIT';
        amount: number;
        title: string;
        category: string;
        date: string;
        source: 'sms';
        note?: string;
        fingerprint: string;
      }[] = [];

      let addedCount = 0;
      let summaryMsg = '';

      if (Capacitor.isNativePlatform()) {
        try {
          // The installed SMS plugin (@solimanware/capacitor-sms-reader) has no unread/read
          // filter - it only supports date-range/id filters. We emulate "only unread/new
          // messages" by requesting messages received after the last successful sync instead
          // of re-scanning the whole inbox every cycle. Fingerprint dedup below is the final
          // safety net in case a message falls right on the boundary.
          const minDate = lastSyncTime || Date.now() - INITIAL_LOOKBACK_MS;
          const response = await MessageReader.getMessages({ minDate, limit: 100 });
          const rawMessages = response?.messages || [];

          const readIdsToMark: string[] = [];

          rawMessages.forEach((msg) => {
            if (msg.body) {
              const parsed = parseBankSms(msg.body);
              if (parsed) {
                let dateStr = parsed.date;
                if (msg.date) {
                  const smsDate = new Date(msg.date);
                  if (!isNaN(smsDate.getTime())) {
                    dateStr = smsDate.toISOString().slice(0, 10);
                  }
                }

                const isDup = isDuplicateTransaction(
                  dateStr,
                  parsed.amount,
                  parsed.type,
                  parsed.referenceNo,
                  parsed.title,
                  existingTransactions,
                  processedHashes
                );

                if (!isDup) {
                  const fp = computeFingerprint(
                    dateStr,
                    parsed.amount,
                    parsed.type,
                    parsed.referenceNo,
                    parsed.title
                  );

                  newItemsToAdd.push({
                    type: parsed.type,
                    amount: parsed.amount,
                    title: parsed.title,
                    category: parsed.category,
                    date: dateStr.length === 10 ? `${dateStr}T12:00:00.000Z` : dateStr,
                    source: 'sms',
                    note: `Bank SMS (${parsed.bankName || 'Auto'}) ${
                      parsed.referenceNo ? `Ref: ${parsed.referenceNo}` : ''
                    }`.trim(),
                    fingerprint: fp,
                  });

                  const rawId = (msg as any).id || (msg as any)._id;
                  if (rawId) readIdsToMark.push(String(rawId));
                }
              }
            }
          });

          // Best-effort: mark successfully-parsed messages as read on-device so a future
          // read-only filter (if the plugin ever adds one) won't re-surface them. The
          // current plugin version has no markAsRead API, so this is a no-op guard today -
          // actual duplicate prevention relies on the fingerprint/minDate logic above.
          readIdsToMark.forEach((id) => {
            try {
              if (typeof (MessageReader as any).markAsRead === 'function') {
                (MessageReader as any).markAsRead({ id });
              }
            } catch {
              // ignore native markAsRead if unsupported
            }
          });
        } catch {
          // bridge error ignore
        }
      }

      if (newItemsToAdd.length > 0) {
        addedCount = await onAddTransactions(newItemsToAdd);
        const fpsToSave = newItemsToAdd.map((i) => i.fingerprint);
        saveProcessedHashes(fpsToSave);
        summaryMsg = `SMS background sync parsed & added ${addedCount} new transaction(s).`;
      } else {
        summaryMsg = `SMS background sync checked: No new SMS transactions found.`;
      }

      setLastSyncSummary(summaryMsg);
      const now = Date.now();
      setLastSyncTime(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toString());

      return { status: 'completed', message: summaryMsg };
    } catch (err: any) {
      return { status: 'completed', message: err.message || 'Error during SMS background parsing' };
    } finally {
      isSyncingRef.current = false;
      setIsParsing(false);
    }
  };

  useEffect(() => {
    if (!currentUser || !enabled) return;

    // Run background SMS sync if the 10-minute interval has elapsed
    const now = Date.now();
    if (!lastSyncTime || now - lastSyncTime >= SYNC_INTERVAL_MS) {
      performSmsSync();
    }

    const timer = setInterval(() => {
      performSmsSync();
    }, SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [currentUser, enabled, existingTransactions.length]);

  return {
    lastSyncTime,
    lastSyncSummary,
    isParsing,
    triggerManualHourlySync: performSmsSync,
  };
}

