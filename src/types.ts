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

// 'pending' = awaiting review (e.g. SMS-parsed in expense_app_apk, not yet reviewed in expense_tracker)
export type TransactionStatus = 'pending' | 'confirmed';

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
