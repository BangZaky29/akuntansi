
import type { JournalItem, DashboardStats} from '../types';

export function calculateAccountBalance(items: JournalItem[]) {
  return items.reduce((total, item) => {
    return total + (Number(item.debit) || 0) - (Number(item.credit) || 0);
  }, 0);
}

export function calculateProfitLoss(items: JournalItem[]) {
  let income = 0;
  let expense = 0;

  items.forEach(item => {
    if (item.account?.type === 'pendapatan') {
      income += (Number(item.credit) || 0) - (Number(item.debit) || 0);
    }
    if (item.account?.type === 'beban') {
      expense += (Number(item.debit) || 0) - (Number(item.credit) || 0);
    }
  });

  return income - expense;
}

export function calculateBalanceSheet(items: JournalItem[]) {
  let aset = 0;
  let kewajiban = 0;
  let modal = 0;

  items.forEach(item => {
    const debit = Number(item.debit) || 0;
    const credit = Number(item.credit) || 0;
    
    switch (item.account?.type) {
      case 'aset':
        aset += (debit - credit);
        break;
      case 'kewajiban':
        kewajiban += (credit - debit);
        break;
      case 'modal':
        modal += (credit - debit);
        break;
    }
  });

  return { aset, kewajiban, modal };
}

export function getTrialBalance(items: JournalItem[]) {
  const accountMap: Record<string, { name: string; balance: number; type: string }> = {};

  items.forEach(item => {
    if (!item.account) return;
    const id = item.account_id;
    if (!accountMap[id]) {
      accountMap[id] = { name: item.account.name, balance: 0, type: item.account.type };
    }
    const isDebitNormal = item.account.type === 'aset' || item.account.type === 'beban';
    accountMap[id].balance += isDebitNormal 
      ? (Number(item.debit) - Number(item.credit))
      : (Number(item.credit) - Number(item.debit));
  });

  return Object.values(accountMap).map(acc => ({
    name: acc.name,
    debit: acc.balance > 0 ? acc.balance : 0,
    credit: acc.balance < 0 ? Math.abs(acc.balance) : 0
  })).filter(row => row.debit !== 0 || row.credit !== 0);
}

export function getDashboardStats(items: JournalItem[]): DashboardStats {
  const profitLoss = calculateProfitLoss(items);
  const { kewajiban, modal } = calculateBalanceSheet(items);
  
  // Keyword Kas/Bank yang lebih luas
  const kasKeywords = ['kas', 'bank', 'cash', 'dana', 'e-wallet', 'ovo', 'gopay', 'mandiri', 'bca', 'bni', 'kantor'];
  const kasItems = items.filter(i => 
    i.account?.type === 'aset' && 
    kasKeywords.some(key => i.account?.name.toLowerCase().includes(key))
  );
  
  // Keyword Piutang yang lebih luas
  const piutangKeywords = ['piutang', 'receivable', 'tagihan', 'invoice'];
  const piutangItems = items.filter(i => 
    i.account?.type === 'aset' && 
    piutangKeywords.some(key => i.account?.name.toLowerCase().includes(key))
  );

  return {
    kas: calculateAccountBalance(kasItems),
    piutang: calculateAccountBalance(piutangItems),
    hutang: Math.abs(kewajiban),
    modal: Math.abs(modal),
    laba: profitLoss
  };
}

export function formatCurrency(value: number, currencyCode: string = 'IDR'): string {
  const amount = value || 0;
  const locale = currencyCode === 'IDR' ? 'id-ID' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'IDR' ? 0 : 2
  }).format(amount);
}

export function formatDate(dateStr: string, language: string = 'id', timezone: string = 'Asia/Jakarta'): string {
  if (!dateStr) return '-';
  const locale = language === 'id' ? 'id-ID' : 'en-US';
  
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeZone: timezone
    }).format(new Date(dateStr));
  } catch (e) {
    return new Date(dateStr).toLocaleDateString(locale);
  }
}
