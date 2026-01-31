
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Waves, ArrowUpCircle, ArrowDownCircle, Info } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import type { JournalItem } from '../../types';

export default function CashFlow() {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('journal_items').select('*, account:accounts(*), journal:journals(*)').then(({ data }) => {
      setItems(data as any || []);
      setLoading(false);
    });
  }, []);

  const cashItems = items.filter(i => i.account?.name.toLowerCase().includes('kas') || i.account?.name.toLowerCase().includes('bank'));
  const cashIn = cashItems.reduce((s, i) => s + (Number(i.debit) || 0), 0);
  const cashOut = cashItems.reduce((s, i) => s + (Number(i.credit) || 0), 0);
  const netCash = cashIn - cashOut;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Laporan Arus Kas</h1>
          <p className="text-slate-500 text-sm">Pemantauan mutasi masuk dan keluar pada akun Kas/Bank secara real-time</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ArrowUpCircle /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Kas Masuk</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashIn)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ArrowDownCircle /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Kas Keluar</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(cashOut)}</p>
            </div>
          </div>
          <div className="bg-[#6200EE] p-6 rounded-3xl text-white shadow-xl shadow-purple-100 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl"><Waves /></div>
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase">Saldo Kas Bersih</p>
              <p className="text-xl font-bold">{formatCurrency(netCash)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
              <Info size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Aliran Dana</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-500 uppercase text-[10px]">Tanggal</th>
                    <th className="px-6 py-4 text-left text-slate-500 uppercase text-[10px]">Aktivitas / Deskripsi</th>
                    <th className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Kas Masuk</th>
                    <th className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Kas Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashItems.length > 0 ? cashItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{new Date((item as any).journal?.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">{(item as any).journal?.description}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-bold">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada mutasi kas ditemukan.</td>
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
