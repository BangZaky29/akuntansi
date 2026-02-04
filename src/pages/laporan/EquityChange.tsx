
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, BarChart3, TrendingUp, UserCheck, ShieldCheck, Printer } from 'lucide-react';
import { formatCurrency, calculateProfitLoss } from '../../utils/accounting';
import type { JournalItem } from '../../types';
import { generatePDF } from '../../utils/pdfGenerator';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';

export default function EquityChange() {
  const [items, setItems] = useState<JournalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('journal_items').select('*, account:accounts(*)').then(({ data }) => {
      setItems(data as any || []);
      setLoading(false);
    });
  }, []);

  const profitLoss = calculateProfitLoss(items);
  const initialEquity = items
    .filter(i => i.account?.type === 'modal')
    .reduce((s, i) => s + (Number(i.credit) || 0) - (Number(i.debit) || 0), 0);

  const finalEquity = initialEquity + profitLoss;

  const handlePrint = () => {
    generatePDF({
      title: 'Laporan Perubahan Modal',
      period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      fileName: 'laporan_perubahan_modal',
      columns: ['Komponen Ekuitas', 'Saldo'],
      data: [
        ['Modal Awal / Setoran', formatCurrency(initialEquity)],
        [profitLoss >= 0 ? 'Laba Bersih' : 'Rugi Bersih', profitLoss < 0 ? `(${formatCurrency(Math.abs(profitLoss))})` : formatCurrency(profitLoss)],
        ['Modal Akhir', formatCurrency(finalEquity)]
      ]
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-4xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Laporan Perubahan Modal</h1>
            <p className="text-slate-500 text-sm">Rekonsiliasi pergerakan ekuitas pemilik periode berjalan</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={loading}
            className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
          >
            <Printer size={18} />
            Cetak Laporan
          </button>
          <CopyToClipboardButton
            label="Copy"
            title="Laporan Perubahan Modal"
            headers={['Komponen Ekuitas', 'Saldo']}
            data={[
              ['Modal Awal / Setoran', formatCurrency(initialEquity)],
              [profitLoss >= 0 ? 'Laba Bersih' : 'Rugi Bersih', profitLoss < 0 ? `(${formatCurrency(Math.abs(profitLoss))})` : formatCurrency(profitLoss)],
              ['Modal Akhir', formatCurrency(finalEquity)]
            ]}
          />
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 md:p-12">
            <div className="text-center mb-12">
              <div className="w-20 h-20 bg-[#6200EE]/5 rounded-full flex items-center justify-center text-[#6200EE] mx-auto mb-6 shadow-inner">
                <BarChart3 size={36} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Perubahan Ekuitas Pemilik</h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Data Terverifikasi Sistem</p>
              </div>
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <div className="flex justify-between items-center py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-50 rounded-lg"><UserCheck className="text-slate-500" size={18} /></div>
                  <span className="text-slate-700 font-bold">Modal Awal / Setoran</span>
                </div>
                <span className="font-bold text-slate-800 text-lg">{formatCurrency(initialEquity)}</span>
              </div>

              <div className="flex justify-between items-center py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${profitLoss >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <TrendingUp className={profitLoss >= 0 ? 'text-emerald-500' : 'text-rose-500'} size={18} />
                  </div>
                  <span className="text-slate-700 font-bold">{profitLoss >= 0 ? 'Laba Bersih' : 'Rugi Bersih'}</span>
                </div>
                <span className={`font-bold text-lg ${profitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {profitLoss < 0 ? `(${formatCurrency(Math.abs(profitLoss))})` : formatCurrency(profitLoss)}
                </span>
              </div>

              <div className="pt-10">
                <div className="relative p-8 bg-slate-900 rounded-3xl text-white shadow-2xl overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                    <BarChart3 size={120} />
                  </div>
                  <div className="relative z-10">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Saldo Modal Akhir</p>
                    <div className="flex items-baseline gap-1">
                      <p className="text-4xl font-black tracking-tight">{formatCurrency(finalEquity)}</p>
                    </div>
                    <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#6200EE] rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                Laporan ini menyajikan ringkasan kekayaan bersih pemilik.<br />
                Dihitung dari (Modal Awal + Investasi Tambahan + Laba Bersih - Prive).
              </p>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
