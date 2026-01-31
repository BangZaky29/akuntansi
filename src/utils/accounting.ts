
import type { JournalItem, DashboardStats, AccountType } from '../types';

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
    const val = (Number(item.debit) || 0) - (Number(item.credit) || 0);
    switch (item.account?.type) {
      case 'aset':
        aset += val;
        break;
      case 'kewajiban':
        kewajiban += val * -1;
        break;
      case 'modal':
        modal += val * -1;
        break;
    }
  });

  return { aset, kewajiban, modal };
}

export function getDashboardStats(items: JournalItem[]): DashboardStats {
  const profitLoss = calculateProfitLoss(items);
  const { aset, kewajiban, modal } = calculateBalanceSheet(items);
  
  // Deteksi Kas: Akun aset dengan kata 'kas' atau 'bank'
  const kasItems = items.filter(i => 
    i.account?.type === 'aset' && 
    (i.account?.name.toLowerCase().includes('kas') || i.account?.name.toLowerCase().includes('bank'))
  );
  
  // Deteksi Piutang: Akun aset dengan kata 'piutang'
  const piutangItems = items.filter(i => 
    i.account?.type === 'aset' && i.account?.name.toLowerCase().includes('piutang')
  );
  
  // Deteksi Hutang: Semua akun kewajiban
  const hutangItems = items.filter(i => i.account?.type === 'kewajiban');

  return {
    kas: calculateAccountBalance(kasItems),
    piutang: calculateAccountBalance(piutangItems),
    hutang: calculateAccountBalance(hutangItems) * -1, // Hutang ditampilkan positif
    modal: Math.abs(modal),
    laba: profitLoss
  };
}

export function formatCurrency(value: number): string {
  const amount = value || 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
}

export function getTrialBalance(items: JournalItem[]) {
  const map = new Map<string, { name: string, debit: number, credit: number, type: AccountType }>();
  
  items.forEach(item => {
    if (!item.account) return;
    const existing = map.get(item.account_id) || { name: item.account.name, debit: 0, credit: 0, type: item.account.type };
    existing.debit += Number(item.debit) || 0;
    existing.credit += Number(item.credit) || 0;
    map.set(item.account_id, existing);
  });

  return Array.from(map.values()).map(acc => {
    const net = acc.debit - acc.credit;
    const isDebitNormal = (acc.type === 'aset' || acc.type === 'beban');
    return {
      name: acc.name,
      debit: isDebitNormal ? (net > 0 ? net : 0) : (net > 0 ? net : 0),
      credit: !isDebitNormal ? (net < 0 ? Math.abs(net) : 0) : (net < 0 ? Math.abs(net) : 0)
    };
  });
}
