
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, FileDown } from 'lucide-react';
import { formatCurrency, getTrialBalance } from '../../utils/accounting';
import type { JournalItem } from '../../types';
import { generateA4Report, downloadPDF } from '../../utils/handlerPDF';
import { useNotify } from '../../contexts/NotificationContext';

export default function TrialBalance() {
  const { notify, removeNotify } = useNotify();
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
    const loadingId = notify('Mencetak Neraca Saldo...', 'loading');
    
    // Gunakan setTimeout agar transisi loading terlihat halus dan memberi waktu browser memproses PDF
    setTimeout(() => {
      try {
        const doc = generateA4Report({
          title: 'Neraca Saldo',
          subtitle: `Per Tanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
          filename: 'Neraca_Saldo',
          columns: ['Nama Akun', 'Debit', 'Kredit'],
          rows: [
            ...data.map(r => [r.name, formatCurrency(r.debit), formatCurrency(r.credit)]),
            ['TOTAL AKHIR', formatCurrency(totalDebit), formatCurrency(totalCredit)]
          ]
        });
        
        downloadPDF(doc, 'Neraca_Saldo');
        
        // Hapus notifikasi loading dan tampilkan sukses
        removeNotify(loadingId);
        notify('Neraca Saldo berhasil diunduh', 'success');
      } catch (err) {
        removeNotify(loadingId);
        notify('Gagal mencetak Neraca Saldo', 'error');
        console.error(err);
      }
    }, 600);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Neraca Saldo</h1>
            <p className="text-slate-500 text-sm font-medium">Daftar saldo seluruh akun per periode berjalan</p>
          </div>
          <button 
            onClick={handleExport} 
            className="bg-[#6200EE] hover:bg-[#5000C7] text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-purple-200 active:scale-95"
          >
            <FileDown size={18} /> Ekspor PDF
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#6200EE]" size={32} />
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-6 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Nama Akun</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Debit</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.length > 0 ? data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700">{row.name}</td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-black">{row.debit > 0 ? formatCurrency(row.debit) : '-'}</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-black">{row.credit > 0 ? formatCurrency(row.credit) : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                        Belum ada data transaksi untuk ditampilkan.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td className="px-6 py-5 text-right uppercase text-[10px] tracking-widest opacity-60">Total Saldo</td>
                    <td className="px-6 py-5 text-right text-lg">{formatCurrency(totalDebit)}</td>
                    <td className="px-6 py-5 text-right text-lg">{formatCurrency(totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
