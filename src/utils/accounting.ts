
import type { JournalItem, DashboardStats, AccountType } from '../types';

export function calculateAccountBalance(items: JournalItem[]) {
  return items.reduce((total, item) => {
    // Menghitung selisih bersih debit - kredit
    return total + (Number(item.debit) || 0) - (Number(item.credit) || 0);
  }, 0);
}

export function calculateProfitLoss(items: JournalItem[]) {
  let income = 0;
  let expense = 0;

  items.forEach(item => {
    if (item.account?.type === 'pendapatan') {
      // Pendapatan bertambah di Kredit (Normal)
      income += (Number(item.credit) || 0) - (Number(item.debit) || 0);
    }
    if (item.account?.type === 'beban') {
      // Beban bertambah di Debit (Normal)
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
        // Kewajiban bertambah di Kredit
        kewajiban += (credit - debit);
        break;
      case 'modal':
        // Modal bertambah di Kredit
        modal += (credit - debit);
        break;
    }
  });

  return { aset, kewajiban, modal };
}

// Add getTrialBalance function to calculate debit and credit columns for Trial Balance report
export function getTrialBalance(items: JournalItem[]) {
  const accountMap: Record<string, { name: string; balance: number }> = {};

  items.forEach(item => {
    if (!item.account) return;
    const id = item.account_id;
    if (!accountMap[id]) {
      accountMap[id] = { name: item.account.name, balance: 0 };
    }
    accountMap[id].balance += (Number(item.debit) || 0) - (Number(item.credit) || 0);
  });

  return Object.values(accountMap).map(acc => ({
    name: acc.name,
    debit: acc.balance > 0 ? acc.balance : 0,
    credit: acc.balance < 0 ? Math.abs(acc.balance) : 0
  })).filter(row => row.debit !== 0 || row.credit !== 0);
}

export function getDashboardStats(items: JournalItem[]): DashboardStats {
  const profitLoss = calculateProfitLoss(items);
  const { aset, kewajiban, modal } = calculateBalanceSheet(items);
  
  // Keywords untuk Kas & Bank
  const kasKeywords = ['kas', 'bank', 'dana', 'e-wallet', 'dompet', 'cash', 'ovo', 'gopay'];
  const kasItems = items.filter(i => 
    i.account?.type === 'aset' && 
    (kasKeywords.some(key => i.account?.name.toLowerCase().includes(key)) || (i as any).journal?.source === 'Income')
  );
  
  // Keywords untuk Piutang
  const piutangKeywords = ['piutang', 'tagihan', 'receivable', 'invoice', 'wbsite']; // Tambah 'wbsite' karena muncul di gambar user
  const piutangItems = items.filter(i => 
    i.account?.type === 'aset' && 
    (
      piutangKeywords.some(key => i.account?.name.toLowerCase().includes(key)) || 
      (i as any).journal?.source === 'Receivable' ||
      // Fallback: Jika ini aset tapi bukan kas, anggap piutang/aset lain
      !kasKeywords.some(key => i.account?.name.toLowerCase().includes(key))
    )
  );
  
  // Keywords untuk Hutang
  const hutangKeywords = ['hutang', 'payable', 'kewajiban', 'pinjaman'];
  const hutangItems = items.filter(i => 
    i.account?.type === 'kewajiban' || 
    (hutangKeywords.some(key => i.account?.name.toLowerCase().includes(key)) || (i as any).journal?.source === 'Payable')
  );

  let finalKas = calculateAccountBalance(kasItems);
  let finalPiutang = calculateAccountBalance(piutangItems);
  
  // Jika Piutang terhitung 0 padahal ada Aset yang bukan Kas, ambil selisihnya
  if (finalPiutang === 0 && aset > finalKas) {
    finalPiutang = aset - finalKas;
  }

  // Hutang dihitung dari sisi kewajiban
  let finalHutang = items
    .filter(i => i.account?.type === 'kewajiban')
    .reduce((s, i) => s + (Number(i.credit) || 0) - (Number(i.debit) || 0), 0);
  
  finalHutang = Math.abs(finalHutang);

  return {
    kas: finalKas,
    piutang: finalPiutang,
    hutang: finalHutang,
    modal: modal,
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
