
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { JournalItem } from '../../types';
import { calculateProfitLoss, calculateBalanceSheet, formatCurrency } from '../../utils/accounting';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, FileDown } from 'lucide-react';
import { generateA4Report, downloadPDF } from '../../utils/handlerPDF';
import { useNotify } from '../../contexts/NotificationContext';

export default function Reports() {
  const { notify } = useNotify();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const activeTab = (searchParams.get('type') as 'profit-loss' | 'balance-sheet') || 'profit-loss';

  useEffect(() => {
    fetchData();
  }, [activeTab]); // Refetch if tab changes

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
    notify('Sedang menyiapkan PDF...', 'loading');
    const title = activeTab === 'profit-loss' ? 'Laporan Laba Rugi' : 'Laporan Neraca';
    const subtitle = `Periode: ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
    
    let columns = activeTab === 'profit-loss' ? ['Kategori Akun', 'Saldo (IDR)'] : ['Akun', 'Tipe', 'Saldo (IDR)'];
    let rows: any[][] = [];

    if (activeTab === 'profit-loss') {
      rows = [
        ['PENDAPATAN', ''],
        ...groupItemsByAccount(incomeItems).map(([name, val]) => [name, formatCurrency(Math.abs(val))]),
        ['BEBAN', ''],
        ...groupItemsByAccount(expenseItems).map(([name, val]) => [name, formatCurrency(val)]),
        ['TOTAL ' + (profitLoss >= 0 ? 'LABA' : 'RUGI'), formatCurrency(Math.abs(profitLoss))]
      ];
    } else {
      rows = [
        ['ASET', '', ''],
        ...groupItemsByAccount(asetItems).map(([name, val]) => [name, 'Aset', formatCurrency(val)]),
        ['KEWAJIBAN', '', ''],
        ...groupItemsByAccount(kewajibanItems).map(([name, val]) => [name, 'Kewajiban', formatCurrency(Math.abs(val))]),
        ['MODAL', '', ''],
        ...groupItemsByAccount(modalItems).map(([name, val]) => [name, 'Modal', formatCurrency(Math.abs(val))]),
        ['LABA BERJALAN', 'Ekuitas', formatCurrency(profitLoss)]
      ];
    }

    try {
      const doc = generateA4Report({ title, subtitle, filename: title, columns, rows });
      downloadPDF(doc, title);
      notify('Laporan berhasil diunduh', 'success');
    } catch (err) {
      notify('Gagal cetak PDF', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {activeTab === 'profit-loss' ? 'Laporan Laba Rugi' : 'Laporan Neraca'}
            </h1>
            <p className="text-slate-500 text-sm">
              {activeTab === 'profit-loss' ? 'Ringkasan pendapatan dan beban operasional' : 'Posisi keuangan: Aset, Kewajiban, dan Ekuitas'}
            </p>
          </div>
          <button onClick={handleExportPDF} className="bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
            <FileDown size={18} /> Cetak PDF
          </button>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            {activeTab === 'profit-loss' ? (
              <div className="space-y-8">
                <section>
                  <h3 className="font-bold text-emerald-600 border-b pb-2 mb-4">Pendapatan</h3>
                  {groupItemsByAccount(incomeItems).map(([name, val]) => (
                    <div key={name} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                      <span>{name}</span>
                      <span className="font-bold">{formatCurrency(Math.abs(val))}</span>
                    </div>
                  ))}
                </section>
                <section>
                  <h3 className="font-bold text-rose-600 border-b pb-2 mb-4">Beban</h3>
                  {groupItemsByAccount(expenseItems).map(([name, val]) => (
                    <div key={name} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                      <span>{name}</span>
                      <span className="font-bold">{formatCurrency(val)}</span>
                    </div>
                  ))}
                </section>
                <div className={`p-6 rounded-2xl flex justify-between items-center ${profitLoss >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                  <span className="font-bold text-lg">{profitLoss >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</span>
                  <span className="font-bold text-2xl">{formatCurrency(Math.abs(profitLoss))}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <section>
                  <h3 className="font-bold text-blue-600 border-b pb-2 mb-4">Aset (Aktiva)</h3>
                  {groupItemsByAccount(asetItems).map(([name, val]) => (
                    <div key={name} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                      <span>{name}</span>
                      <span className="font-bold">{formatCurrency(val)}</span>
                    </div>
                  ))}
                  <div className="mt-4 p-4 bg-slate-50 rounded-xl flex justify-between font-bold">
                    <span>Total Aset</span>
                    <span>{formatCurrency(balanceSheet.aset)}</span>
                  </div>
                </section>
                <section className="space-y-8">
                  <div>
                    <h3 className="font-bold text-rose-600 border-b pb-2 mb-4">Kewajiban & Modal (Pasiva)</h3>
                    <div className="space-y-1 mb-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Kewajiban</p>
                      {groupItemsByAccount(kewajibanItems).map(([name, val]) => (
                        <div key={name} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                          <span>{name}</span>
                          <span className="font-bold">{formatCurrency(Math.abs(val))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Modal</p>
                      {groupItemsByAccount(modalItems).map(([name, val]) => (
                        <div key={name} className="flex justify-between py-2 border-b border-slate-50 text-sm">
                          <span>{name}</span>
                          <span className="font-bold">{formatCurrency(Math.abs(val))}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2 italic text-slate-500 text-sm">
                        <span>Laba Berjalan</span>
                        <span>{formatCurrency(profitLoss)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl flex justify-between font-bold">
                    <span>Total Pasiva</span>
                    <span>{formatCurrency(balanceSheet.kewajiban + balanceSheet.modal + profitLoss)}</span>
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
