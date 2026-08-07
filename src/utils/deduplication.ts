import { Transaction } from '../types';

const PROCESSED_HASHES_KEY = 'expensetracker_processed_transaction_hashes';

/**
 * Get stored set of processed transaction fingerprints
 */
export function getProcessedHashes(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_HASHES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Persist new transaction fingerprints to localStorage
 */
export function saveProcessedHashes(hashes: string[]): void {
  try {
    const existing = getProcessedHashes();
    hashes.forEach((h) => existing.add(h));
    localStorage.setItem(PROCESSED_HASHES_KEY, JSON.stringify(Array.from(existing)));
  } catch {
    // ignore
  }
}

/**
 * Compute a normalized unique fingerprint string for a transaction
 */
export function computeFingerprint(
  dateStr: string, // YYYY-MM-DD or ISO
  amount: number,
  type: 'DEBIT' | 'CREDIT',
  refNo?: string,
  title?: string
): string {
  const normDate = dateStr.slice(0, 10);
  const normAmt = Math.round(amount * 100) / 100;
  const normRef = (refNo || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const normTitle = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);

  const raw = `${normDate}_${normAmt}_${type}_${normRef}_${normTitle}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `tx_fp_${Math.abs(hash)}`;
}

/**
 * Check if a parsed SMS or Email transaction is a duplicate of a previously
 * imported message or existing entry in the user's ledger.
 */
export function isDuplicateTransaction(
  dateStr: string,
  amount: number,
  type: 'DEBIT' | 'CREDIT',
  refNo: string | undefined,
  title: string | undefined,
  existingTransactions: Transaction[],
  processedHashesSet: Set<string>
): boolean {
  const fp = computeFingerprint(dateStr, amount, type, refNo, title);
  if (processedHashesSet.has(fp)) {
    return true;
  }

  // Check against existing ledger transactions
  const normDate = dateStr.slice(0, 10);
  const normAmt = Math.round(amount * 100) / 100;
  const normRef = refNo ? refNo.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  const existsInLedger = existingTransactions.some((tx) => {
    const txDate = tx.date.slice(0, 10);
    const txAmt = Math.round(tx.amount * 100) / 100;
    if (txDate === normDate && txAmt === normAmt && tx.type === type) {
      if (normRef && tx.note && tx.note.toLowerCase().includes(normRef)) {
        return true;
      }
      if (normRef && tx.title.toLowerCase().includes(normRef)) {
        return true;
      }
      const t1 = (title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const t2 = tx.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (t1 && t2 && (t1.includes(t2) || t2.includes(t1))) {
        return true;
      }
      if (t1 === t2) return true;
    }
    return false;
  });

  return existsInLedger;
}
