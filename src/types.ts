export type TransactionType = 'DEBIT' | 'CREDIT';

export type TransactionSource = 'MANUAL' | 'EXCEL' | 'IMPORT';

export type PeriodType = 'Day' | 'Month' | 'Year';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  title: string;
  category: string;
  note?: string | null;
  date: string; // ISO string
  source: TransactionSource;
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
  userId?: string;
}
