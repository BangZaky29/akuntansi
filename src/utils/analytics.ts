
import type { JournalItem, DashboardStats } from '../types';
import { formatCurrency } from './accounting';

export interface MonthlyTrend {
  month: string;
  pendapatan: number;
  beban: number;
}

export interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

export interface FinancialRatios {
  liquidity: number; // Current Ratio
  debtToEquity: number;
  netProfitMargin: number;
  // Use string to allow for translated status values
  status: string;
  color: string;
}

export const calculateMonthlyTrends = (items: JournalItem[]): MonthlyTrend[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const trends: Record<string, MonthlyTrend> = {};

  // Inisialisasi 6 bulan terakhir
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mName = months[d.getMonth()];
    trends[mName] = { month: mName, pendapatan: 0, beban: 0 };
  }

  items.forEach(item => {
    const dateStr = (item as any).journal?.date;
    if (!dateStr) return;
    const date = new Date(dateStr);
    const mName = months[date.getMonth()];
    
    if (trends[mName]) {
      if (item.account?.type === 'pendapatan') {
        trends[mName].pendapatan += (Number(item.credit) || 0) - (Number(item.debit) || 0);
      } else if (item.account?.type === 'beban') {
        trends[mName].beban += (Number(item.debit) || 0) - (Number(item.credit) || 0);
      }
    }
  });

  return Object.values(trends);
};

export const getExpenseBreakdown = (items: JournalItem[]): ExpenseCategory[] => {
  const categories: Record<string, number> = {};
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

  items.filter(i => i.account?.type === 'beban').forEach(item => {
    const name = item.account?.name || 'Lainnya';
    categories[name] = (categories[name] || 0) + (Number(item.debit) || 0) - (Number(item.credit) || 0);
  });

  return Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
};

export const calculateFinancialRatios = (stats: DashboardStats, items: JournalItem[]): FinancialRatios => {
  const totalIncome = items
    .filter(i => i.account?.type === 'pendapatan')
    .reduce((s, i) => s + (Number(i.credit) - Number(i.debit)), 0);

  const liquidity = stats.hutang === 0 ? 100 : (stats.kas + stats.piutang) / stats.hutang;
  const debtToEquity = stats.modal === 0 ? 0 : stats.hutang / stats.modal;
  const netProfitMargin = totalIncome === 0 ? 0 : (stats.laba / totalIncome) * 100;

  let status = 'Sehat';
  let color = 'text-emerald-500';

  if (liquidity < 1 || debtToEquity > 2) {
    status = 'Kritis';
    color = 'text-rose-500';
  } else if (liquidity < 1.5 || debtToEquity > 1) {
    status = 'Waspada';
    color = 'text-amber-500';
  }

  return { liquidity, debtToEquity, netProfitMargin, status, color };
};
