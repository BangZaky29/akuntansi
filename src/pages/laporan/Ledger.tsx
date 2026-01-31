
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Filter, BookOpen } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import type { JournalItem, Account } from '../../types';

export default function Ledger() {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      supabase.from('accounts').select('*').order('name'),
      supabase.from('journal_items').select('*, account:accounts(*), journal:journals(*)').order('journal(date)', { ascending: true })
    ]).then(([accRes, itemRes]) => {
      setAccounts(accRes.data || []);
      setItems(itemRes.data as any || []);
      setLoading(false);
    });
  }, []);

  const filteredItems = selectedAccount === 'all' 
    ? items 
    : items.filter(i => i.account_id === selectedAccount);

  let runningBalance = 0;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Buku Besar</h1>
            <p className="text-slate-500 text-sm">Rincian mutasi per akun perkiraan secara kronologis</p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200">
            <Filter size={18} className="text-slate-400 ml-2" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 min-w-[200px] cursor-pointer"
              value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}
            >
              <option value="all">Semua Akun</option>
              {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px]">Tanggal</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px]">Keterangan</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] text-right">Debit</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] text-right">Kredit</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase text-[10px] text-right">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length > 0 ? filteredItems.map((item, idx) => {
                    const debit = Number(item.debit) || 0;
                    const credit = Number(item.credit) || 0;
                    
                    const isDebitNormal = item.account?.type === 'aset' || item.account?.type === 'beban';
                    if (isDebitNormal) {
                      runningBalance += (debit - credit);
                    } else {
                      runningBalance += (credit - debit);
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                          {new Date((item as any).journal?.date).toLocaleDateString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">{(item as any).journal?.description}</p>
                          {selectedAccount === 'all' && <p className="text-[10px] text-[#6200EE] font-bold uppercase">{item.account?.name}</p>}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">{debit > 0 ? formatCurrency(debit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-medium text-rose-600">{credit > 0 ? formatCurrency(credit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(runningBalance)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                        <BookOpen size={40} className="mx-auto mb-2 opacity-20" />
                        Belum ada mutasi untuk akun yang dipilih.
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
