
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { JournalItem } from '../../types';
import { calculateProfitLoss, calculateBalanceSheet, formatCurrency } from '../../utils/accounting';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Printer } from 'lucide-react';
import { generatePDF } from '../../utils/pdfGenerator';
import { useNotify } from '../../contexts/NotificationContext';

export default function Reports() {
  const { notify } = useNotify();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = (searchParams.get('type') as 'profit-loss' | 'balance-sheet') || 'profit-loss';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('journal_items')
        .select('*, account:accounts(*)');
      if (error) throw error;
      setItems(data as unknown as JournalItem[]);
    } finally {
      setLoading(false);
    }
  };

  const profitLoss = calculateProfitLoss(items);
  const balanceSheet = calculateBalanceSheet(items);

  const incomeItems = items.filter(i => i.account?.type === 'pendapatan');
  const expenseItems = items.filter(i => i.account?.type === 'beban');
  const asetItems = items.filter(i => i.account?.type === 'aset');
  const kewajibanItems = items.filter(i => i.account?.type === 'kewajiban');
  const modalItems = items.filter(i => i.account?.type === 'modal');

  const groupItemsByAccount = (list: JournalItem[]) => {
    const map = new Map();
    list.forEach(item => {
      const name = item.account?.name || 'Unknown';
      const current = map.get(name) || 0;
      const balance = (Number(item.debit) || 0) - (Number(item.credit) || 0);
      map.set(name, current + balance);
    });
    return Array.from(map.entries());
  };

  const handleExportPDF = () => {
    const title = activeTab === 'profit-loss' ? 'Laporan Laba Rugi' : 'Laporan Neraca';
    const period = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    let columns = activeTab === 'profit-loss' ? ['Kategori Akun', 'Saldo (IDR)'] : ['Akun', 'Tipe', 'Saldo (IDR)'];
    let rows: any[][] = [];
    let footer: any[] = [];

    if (activeTab === 'profit-loss') {
      rows = [
        ['PENDAPATAN', ''],
        ...groupItemsByAccount(incomeItems).map(([name, val]) => [name, formatCurrency(Math.abs(val))]),
        ['BEBAN', ''],
        ...groupItemsByAccount(expenseItems).map(([name, val]) => [name, formatCurrency(val)]),
        ['TOTAL ' + (profitLoss >= 0 ? 'LABA' : 'RUGI'), formatCurrency(Math.abs(profitLoss))]
      ];
      footer = [
        { label: profitLoss >= 0 ? 'Total Laba Bersih' : 'Total Rugi Bersih', value: formatCurrency(Math.abs(profitLoss)) }
      ];
    } else {
      rows = [
        ['ASET (AKTIVA)', '', ''],
        ...groupItemsByAccount(asetItems).map(([name, val]) => [name, 'Aset', formatCurrency(val)]),
        ['KEWAJIBAN (PASSIVA)', '', ''],
        ...groupItemsByAccount(kewajibanItems).map(([name, val]) => [name, 'Kewajiban', formatCurrency(Math.abs(val))]),
        ['MODAL (PASSIVA)', '', ''],
        ...groupItemsByAccount(modalItems).map(([name, val]) => [name, 'Modal', formatCurrency(Math.abs(val))]),
        ['LABA PERIODE BERJALAN', 'Ekuitas', formatCurrency(profitLoss)]
      ];
      footer = [
        { label: 'Total Aset', value: formatCurrency(balanceSheet.aset) },
        { label: 'Total Pasiva', value: formatCurrency(balanceSheet.kewajiban + balanceSheet.modal + profitLoss) }
      ];
    }

    generatePDF({
      title,
      period,
      fileName: title.toLowerCase().replace(/\s+/g, '_'),
      columns,
      data: rows,
      footer
    });

    notify('Laporan berhasil diunduh', 'success');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeTab === 'profit-loss' ? 'Laporan Laba Rugi' : 'Laporan Neraca'}
            </h1>
            <p className="text-slate-500 text-sm font-medium">
              {activeTab === 'profit-loss' ? 'Ringkasan pendapatan dan beban operasional' : 'Posisi keuangan: Aset, Kewajiban, dan Ekuitas'}
            </p>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
          >
            <Printer size={18} /> Cetak Laporan
          </button>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[2.5rem] border border-slate-200 p-8 md:p-12 shadow-sm">
            {activeTab === 'profit-loss' ? (
              <div className="space-y-10">
                <section>
                  <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] border-b border-emerald-50 pb-3 mb-6">Pendapatan Operasional</h3>
                  <div className="space-y-4">
                    {groupItemsByAccount(incomeItems).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                        <span className="font-bold text-slate-700">{name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(Math.abs(val))}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] border-b border-rose-50 pb-3 mb-6">Beban Operasional</h3>
                  <div className="space-y-4">
                    {groupItemsByAccount(expenseItems).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                        <span className="font-bold text-slate-700">{name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                </section>
                <div className={`p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 ${profitLoss >= 0 ? 'bg-emerald-50/50 text-emerald-900 border border-emerald-100' : 'bg-rose-50/50 text-rose-900 border border-rose-100'}`}>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">{profitLoss >= 0 ? 'Total Laba Bersih' : 'Total Rugi Bersih'}</p>
                    <span className="font-black text-3xl tracking-tight leading-none">{formatCurrency(Math.abs(profitLoss))}</span>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${profitLoss >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {profitLoss >= 0 ? 'Surplus Finansial' : 'Defisit Finansial'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <section>
                  <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] border-b border-blue-50 pb-3 mb-6">Aset (Aktiva)</h3>
                  <div className="space-y-4">
                    {groupItemsByAccount(asetItems).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                        <span className="font-bold text-slate-700">{name}</span>
                        <span className="font-black text-slate-900">{formatCurrency(val)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 p-6 bg-slate-900 rounded-[1.5rem] flex justify-between items-center text-white">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Aset</span>
                    <span className="text-xl font-black">{formatCurrency(balanceSheet.aset)}</span>
                  </div>
                </section>
                <section className="space-y-12">
                  <div>
                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] border-b border-rose-50 pb-3 mb-6">Kewajiban & Modal (Pasiva)</h3>
                    <div className="space-y-2 mb-8">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Kewajiban</p>
                      {groupItemsByAccount(kewajibanItems).map(([name, val]) => (
                        <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                          <span className="font-bold text-slate-700">{name}</span>
                          <span className="font-black text-slate-900">{formatCurrency(Math.abs(val))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modal & Ekuitas</p>
                      {groupItemsByAccount(modalItems).map(([name, val]) => (
                        <div key={name} className="flex justify-between items-center py-2 border-b border-slate-50 text-sm">
                          <span className="font-bold text-slate-700">{name}</span>
                          <span className="font-black text-slate-900">{formatCurrency(Math.abs(val))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center py-3 px-1 italic bg-amber-50/50 rounded-xl border border-amber-100/50 mt-4">
                        <span className="text-xs font-bold text-amber-800">Laba Periode Berjalan</span>
                        <span className="font-black text-amber-900">{formatCurrency(profitLoss)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-[#6200EE] rounded-[1.5rem] flex justify-between items-center text-white shadow-xl shadow-purple-100">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Pasiva</span>
                    <span className="text-xl font-black">{formatCurrency(balanceSheet.kewajiban + balanceSheet.modal + profitLoss)}</span>
                  </div>
                </section>
              </div>
            )}
          </motion.div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
