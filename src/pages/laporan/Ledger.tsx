
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Filter, ChevronDown, BookOpen } from 'lucide-react';
import type { JournalItem, Account } from '../../types';

export default function Ledger() {
  const { fmtCurrency, fmtDate, currency } = useSettings();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, itemRes] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('journal_items').select('*, account:accounts(*), journal:journals(*)').order('journal(date)', { ascending: true })
      ]);
      setAccounts(accRes.data || []);
      setItems(itemRes.data as any || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedAccount === 'all' 
    ? items 
    : items.filter(i => i.account_id === selectedAccount);

  let runningBalance = 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buku Besar</h1>
            <p className="text-slate-500 text-sm font-medium">Rincian mutasi kronologis per akun ({currency})</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-1.5 pl-4 rounded-2xl border border-slate-200 shadow-sm min-w-[280px]">
            <Filter size={16} className="text-slate-400" />
            <div className="flex-1 relative">
              <select 
                className="w-full bg-transparent border-none outline-none text-xs font-black text-slate-700 appearance-none cursor-pointer pr-8 uppercase tracking-widest" 
                value={selectedAccount} 
                onChange={e => setSelectedAccount(e.target.value)}
              >
                <option value="all">Semua Akun</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Transaksi...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">Tanggal</th>
                    <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">Keterangan</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Debit</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Kredit</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest bg-slate-50/80">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.length > 0 ? filteredItems.map((item, idx) => {
                    const debit = Number(item.debit) || 0;
                    const credit = Number(item.credit) || 0;
                    const isDebitNormal = item.account?.type === 'aset' || item.account?.type === 'beban';
                    runningBalance += isDebitNormal ? (debit - credit) : (credit - debit);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-bold text-xs">{fmtDate((item as any).journal?.date)}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 leading-tight">{(item as any).journal?.description || 'Mutasi Jurnal'}</p>
                          {selectedAccount === 'all' && (
                            <p className="text-[9px] text-[#6200EE] font-black uppercase mt-1 tracking-tighter bg-purple-50 inline-block px-1.5 py-0.5 rounded-md">
                              {item.account?.name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{debit > 0 ? fmtCurrency(debit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">{credit > 0 ? fmtCurrency(credit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30">{fmtCurrency(runningBalance)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <BookOpen size={48} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Belum ada mutasi akun ini.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
