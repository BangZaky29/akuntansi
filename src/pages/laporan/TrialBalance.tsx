
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, FileDown } from 'lucide-react';
import { formatCurrency, getTrialBalance } from '../../utils/accounting';
import type { JournalItem } from '../../types';
import { generateA4Report, downloadPDF } from '../../utils/handlerPDF';
import { useNotify } from '../../contexts/NotificationContext';

export default function TrialBalance() {
  const { notify } = useNotify();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('journal_items').select('*, account:accounts(*)').then(({ data }) => {
      setItems(data as any || []);
      setLoading(false);
    });
  }, []);

  const data = getTrialBalance(items);
  const totalDebit = data.reduce((s, r) => s + r.debit, 0);
  const totalCredit = data.reduce((s, r) => s + r.credit, 0);

  const handleExport = () => {
    notify('Mencetak Neraca Saldo...', 'loading');
    const doc = generateA4Report({
      title: 'Neraca Saldo',
      subtitle: `Per Tanggal: ${new Date().toLocaleDateString()}`,
      filename: 'Neraca_Saldo',
      columns: ['Nama Akun', 'Debit', 'Kredit'],
      rows: [
        ...data.map(r => [r.name, formatCurrency(r.debit), formatCurrency(r.credit)]),
        ['TOTAL', formatCurrency(totalDebit), formatCurrency(totalCredit)]
      ]
    });
    downloadPDF(doc, 'Neraca_Saldo');
    notify('Berhasil diunduh', 'success');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Neraca Saldo</h1>
            <p className="text-slate-500 text-sm">Daftar saldo seluruh akun per periode berjalan</p>
          </div>
          <button onClick={handleExport} className="bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
            <FileDown size={18} /> Ekspor PDF
          </button>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div> : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase text-[10px]">Nama Akun</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px]">Debit</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-500 uppercase text-[10px]">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-semibold text-slate-700">{row.name}</td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 font-bold">
                <tr>
                  <td className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Total Akhir</td>
                  <td className="px-6 py-4 text-right text-emerald-700">{formatCurrency(totalDebit)}</td>
                  <td className="px-6 py-4 text-right text-rose-700">{formatCurrency(totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
