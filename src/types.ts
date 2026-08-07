export type TransactionType = 'DEBIT' | 'CREDIT';

export type TransactionSource =
  | 'manual'
  | 'sms'
  | 'email'
  | 'excel'
  | 'MANUAL'
  | 'EXCEL'
  | 'IMPORT'
  | 'SMS'
  | 'EMAIL';

export type PeriodType = 'Day' | 'Month' | 'Year';

// 'pending' = awaiting review in expense_tracker's Import SMS screen.
// 'imported' = reviewed & kept (copied into expense_tracker's own ledger).
// 'discarded' = reviewed & rejected by the user in expense_tracker.
// Both 'imported' and 'discarded' rows are kept (never deleted) so expense_app_apk's
// SMS parser never re-detects & re-adds the same message as a new transaction.
export type TransactionStatus = 'pending' | 'confirmed' | 'imported' | 'discarded';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  note?: string | null;
  date: string; // ISO string
  source: TransactionSource;
  status?: TransactionStatus;
  userId?: string;
  createdAt: string;
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  note?: string;
  date: string;
  source: TransactionSource;
  status?: TransactionStatus;
  userId?: string;
}
