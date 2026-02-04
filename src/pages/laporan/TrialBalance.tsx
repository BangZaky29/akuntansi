
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import { generatePDF } from '../../utils/pdfGenerator';
import { useNotify } from '../../contexts/NotificationContext';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';

export default function TrialBalance() {
  const { notify } = useNotify();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // FIX: Read directly from View not raw items
    const { data } = await supabase
      .from('account_balances')
      .select('*')
      .order('account_name');

    if (data) {
      setItems(data.map((r: any) => ({
        // Mapping view columns to UI format
        name: r.account_name,
        debit: r.saldo_debit || 0,
        credit: r.saldo_kredit || 0
      })));
    }
    setLoading(false);
  };

  // Logic moved to View (Database)
  const data = items as any[];
  const totalDebit = data.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = data.reduce((s, r) => s + (r.credit || 0), 0);

  const handleExport = () => {
    const tableData = data.map(r => [
      r.name,
      r.debit > 0 ? formatCurrency(r.debit) : '-',
      r.credit > 0 ? formatCurrency(r.credit) : '-'
    ]);

    generatePDF({
      title: 'Neraca Saldo',
      period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      fileName: 'neraca_saldo',
      columns: ['Nama Akun', 'Debit', 'Kredit'],
      data: tableData,
      footer: [
        { label: 'Total Debit', value: formatCurrency(totalDebit) },
        { label: 'Total Kredit', value: formatCurrency(totalCredit) }
      ]
    });

    notify('Laporan berhasil diunduh', 'success');
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
            className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
          >
            <Printer size={18} /> Cetak Laporan
          </button>
          <CopyToClipboardButton
            label="Copy"
            title="Neraca Saldo"
            headers={['Nama Akun', 'Debit', 'Kredit']}
            data={data.map(r => [
              r.name,
              r.debit > 0 ? formatCurrency(r.debit) : '-',
              r.credit > 0 ? formatCurrency(r.credit) : '-'
            ])}
          />
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
