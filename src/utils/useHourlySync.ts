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
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour

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
          const response = await MessageReader.getMessages({ limit: 100 });
          const rawMessages = response?.messages || [];

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
                }
              }
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

    // Run background SMS sync if 1 hour has elapsed
    const now = Date.now();
    if (!lastSyncTime || now - lastSyncTime >= ONE_HOUR_MS) {
      performSmsSync();
    }

    const timer = setInterval(() => {
      performSmsSync();
    }, ONE_HOUR_MS);

    return () => clearInterval(timer);
  }, [currentUser, enabled, existingTransactions.length]);

  return {
    lastSyncTime,
    lastSyncSummary,
    isParsing,
    triggerManualHourlySync: performSmsSync,
  };
}

