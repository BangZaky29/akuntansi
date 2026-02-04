
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { BookOpen, ChevronDown, Loader2, FileText, RefreshCw, Printer } from 'lucide-react';
import { generatePDF } from '../../utils/pdfGenerator';
import { useNotify } from '../../contexts/NotificationContext';

export default function Journal() {
  const { notify } = useNotify();
  const { fmtCurrency, fmtDate } = useSettings();
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const { data: journalData, error: jError } = await supabase
        .from('journals')
        .select(`*, journal_items(*, account:accounts(*))`)
        .order('date', { ascending: false });

      if (jError) throw jError;
      setJournals(journalData || []);
    } catch (err) {
      console.error("Fetch Journals Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Ratakan data jurnal: satu baris per item jurnal, tapi simpan deskripsi utama hanya di baris pertama entri
    const tableData: any[][] = [];

    journals.forEach(journal => {
      journal.journal_items?.forEach((item: any, idx: number) => {
        tableData.push([
          idx === 0 ? fmtDate(journal.date) : '',
          idx === 0 ? journal.description : '',
          item.account?.name || 'Unknown',
          Number(item.debit) > 0 ? fmtCurrency(Number(item.debit)) : '-',
          Number(item.credit) > 0 ? fmtCurrency(Number(item.credit)) : '-'
        ]);
      });
      // Tambahkan baris kosong atau pemisah antar jurnal jika perlu (opsional)
      // tableData.push(['', '', '', '', '']); 
    });

    generatePDF({
      title: 'Jurnal Umum',
      period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      fileName: 'jurnal_umum',
      columns: ['Tanggal', 'Deskripsi/Keterangan', 'Akun', 'Debit', 'Kredit'],
      data: tableData,
    });

    notify('Laporan berhasil diunduh', 'success');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Jurnal Umum</h1>
            <p className="text-slate-500 text-sm font-medium">Rekam jejak seluruh transaksi keuangan bisnis</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={journals.length === 0}
              className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
            >
              <Printer size={18} />
              Cetak
            </button>
            <button onClick={fetchJournals} className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#6200EE] transition-all">
              <RefreshCw size={20} className={loading ? 'animate-spin text-[#6200EE]' : ''} />
            </button>
          </div>
        </header>

        <div className="space-y-3">
          {loading && journals.length === 0 ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
          ) : journals.length > 0 ? (
            journals.map((journal) => {
              const totalAmount = journal.journal_items?.reduce((sum: number, item: any) => sum + (Number(item.debit) || 0), 0) || 0;
              return (
                <motion.div layout key={journal.id} className={`bg-white rounded-3xl border transition-all ${expanded === journal.id ? 'border-[#6200EE]/30 shadow-xl shadow-purple-50 ring-1 ring-[#6200EE]/10' : 'border-slate-200 shadow-sm'}`}>
                  <div className="p-4 md:p-5 flex items-center justify-between cursor-pointer group" onClick={() => setExpanded(expanded === journal.id ? null : journal.id)}>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${expanded === journal.id ? 'bg-[#6200EE] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-purple-50 group-hover:text-[#6200EE]'}`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 truncate leading-tight">{journal.description || 'Tanpa Keterangan'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{fmtDate(journal.date)}</p>
                          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-tighter">{journal.source || 'Manual'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Total</p>
                        <p className="font-black text-sm md:text-base text-slate-900">{fmtCurrency(totalAmount)}</p>
                      </div>
                      <ChevronDown size={20} className={`transition-transform ${expanded === journal.id ? 'rotate-180 text-[#6200EE]' : 'text-slate-300'}`} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded === journal.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 bg-slate-50/30 p-4 md:p-6 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                              <th className="text-left pb-3 px-2">Akun</th>
                              <th className="text-right pb-3 px-2">Debit</th>
                              <th className="text-right pb-3 px-2">Kredit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {journal.journal_items?.map((item: any) => (
                              <tr key={item.id}>
                                <td className={`py-4 px-2 ${Number(item.credit) > 0 ? 'pl-8 md:pl-12' : ''}`}>
                                  <p className="font-bold text-slate-800">{item.account?.name || 'Unknown'}</p>
                                </td>
                                <td className="text-right py-4 px-2 font-black text-emerald-600">{Number(item.debit) > 0 ? fmtCurrency(Number(item.debit)) : '-'}</td>
                                <td className="text-right py-4 px-2 font-black text-rose-600">{Number(item.credit) > 0 ? fmtCurrency(Number(item.credit)) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white p-20 rounded-[40px] border border-dashed border-slate-300 text-center">
              <BookOpen size={64} className="mx-auto text-slate-200 mb-6 opacity-40" />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Belum Ada Transaksi</h3>
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
