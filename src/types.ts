
export type AccountType = 'aset' | 'kewajiban' | 'modal' | 'pendapatan' | 'beban';
export type NormalBalance = 'debit' | 'kredit';

export interface UserProfile {
  id: string;
  business_name: string;
  city?: string;
  fiscal_year: number;
  currency: string;
  created_at: string;
}

export interface UserSettings {
  user_id: string;
  notif_due_date: boolean;
  notif_email: boolean;
  language: string;
  timezone: string;
  two_factor_enabled: boolean;
  updated_at: string;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  created_at: string;
}

export interface Contact {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  type: 'pelanggan' | 'vendor' | 'lainnya';
  created_at: string;
}

export interface Journal {
  id: string;
  user_id: string;
  date: string;
  description: string;
  source?: string;
  created_at: string;
}

export interface JournalItem {
  id: string;
  journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
  account?: Account;
}

export interface JournalWithItems extends Journal {
  journal_items: JournalItem[];
}

export interface Receivable {
  id: string;
  user_id: string;
  amount: number;
  status: 'unpaid' | 'paid';
  journal_id: string;
  due_date?: string;
  created_at: string;
  journal?: Journal;
}

export interface Payable {
  id: string;
  user_id: string;
  amount: number;
  status: 'unpaid' | 'paid';
  journal_id: string;
  due_date?: string;
  created_at: string;
  journal?: Journal;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  type: 'in' | 'out';
  amount: number;
  journal_id: string;
  date: string;
  created_at: string;
}

export interface DashboardStats {
  kas: number;
  piutang: number;
  hutang: number;
  modal: number;
  laba: number;
}

export interface DashboardStatsRPCResponse {
  income: number;
  expense: number;
  profit: number;
  cash_in: number;
  cash_out: number;
  cash_balance: number;
  receivable: number;
  payable: number;
  equity: number;
}

export interface CashFlowForecast {
  month: string;
  invoice_in: number;
  invoice_out: number;
}

export interface OverdueItem {
  id: string;
  type: 'receivable' | 'payable';
  amount: number;
  due_date: string;
  description: string;
  journal_id?: string;
}

export const VERSION = '1.2.0';
