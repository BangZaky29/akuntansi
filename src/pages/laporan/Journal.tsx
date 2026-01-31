
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import type { JournalWithItems } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { BookOpen, ChevronDown, ChevronUp, Loader2, FileText, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';

export default function Journal() {
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      // Fetch journals with items and related accounts
      const { data: journalData, error: jError } = await supabase
        .from('journals')
        .select(`
          *,
          journal_items(
            *,
            account:accounts(*)
          )
        `)
        .order('date', { ascending: false });

      if (jError) throw jError;

      // Jika ada data jurnal yang kosong item-nya (Headless), kita coba cari di tabel transaksi khusus
      // Ini untuk menangani data lama yang mungkin belum memiliki journal_items
      const enrichedJournals = await Promise.all((journalData || []).map(async (j) => {
        if (j.journal_items && j.journal_items.length > 0) return j;

        // Coba cari di Receivables
        if (j.source === 'Receivable') {
          const { data: rec } = await supabase.from('receivables').select('amount').eq('journal_id', j.id).single();
          if (rec) j.fallbackAmount = rec.amount;
        }
        // Coba cari di Payables
        if (j.source === 'Payable') {
          const { data: pay } = await supabase.from('payables').select('amount').eq('journal_id', j.id).single();
          if (pay) j.fallbackAmount = pay.amount;
        }
        // Coba cari di Cash Transactions
        if (j.source === 'Penerimaan Kas' || j.source === 'Pengeluaran Kas') {
          const { data: cash } = await supabase.from('cash_transactions').select('amount').eq('journal_id', j.id).single();
          if (cash) j.fallbackAmount = cash.amount;
        }

        return j;
      }));

      setJournals(enrichedJournals);
    } catch (err) {
      console.error("Fetch Journals Error:", err);
    } finally {
      setLoading(false);
    }
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
          <button 
            onClick={fetchJournals}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#6200EE] hover:border-[#6200EE]/30 transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin text-[#6200EE]' : ''} />
          </button>
        </header>

        <div className="space-y-3">
          {loading && journals.length === 0 ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
          ) : journals.length > 0 ? (
            journals.map((journal) => {
              const totalAmount = journal.journal_items?.reduce((sum: number, item: any) => sum + (Number(item.debit) || 0), 0) || journal.fallbackAmount || 0;
              const hasItems = journal.journal_items && journal.journal_items.length > 0;

              return (
                <motion.div 
                  key={journal.id}
                  layout
                  className={`bg-white rounded-3xl border transition-all ${
                    expanded === journal.id ? 'border-[#6200EE]/30 shadow-xl shadow-purple-50 ring-1 ring-[#6200EE]/10' : 'border-slate-200 shadow-sm hover:border-slate-300'
                  } overflow-hidden`}
                >
                  <div 
                    className="p-4 md:p-5 flex items-center justify-between cursor-pointer group"
                    onClick={() => setExpanded(expanded === journal.id ? null : journal.id)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                        expanded === journal.id ? 'bg-[#6200EE] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-[#6200EE]/5 group-hover:text-[#6200EE]'
                      }`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 truncate leading-tight">{journal.description || 'Tanpa Keterangan'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {new Date(journal.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </p>
                           <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                           <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full uppercase tracking-tighter">
                            {journal.source || 'Manual'}
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 ml-4">
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">Total Nilai</p>
                        <p className={`font-black text-sm md:text-base ${totalAmount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                          {formatCurrency(totalAmount)}
                        </p>
                      </div>
                      <div className={`transition-transform duration-300 ${expanded === journal.id ? 'rotate-180 text-[#6200EE]' : 'text-slate-300'}`}>
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expanded === journal.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }} 
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/30"
                      >
                        {hasItems ? (
                          <div className="p-4 md:p-6 overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] border-b border-slate-100">
                                  <th className="text-left pb-3 px-2">Akun Perkiraan</th>
                                  <th className="text-right pb-3 px-2">Debit</th>
                                  <th className="text-right pb-3 px-2">Kredit</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {journal.journal_items.map((item: any) => (
                                  <tr key={item.id} className="hover:bg-white/80 transition-colors">
                                    <td className={`py-4 px-2 ${Number(item.credit) > 0 ? 'pl-8 md:pl-12' : ''}`}>
                                      <div className="flex items-center gap-2">
                                        {Number(item.credit) > 0 && <ArrowRight size={12} className="text-slate-300" />}
                                        <div>
                                          <p className="font-bold text-slate-800">{item.account?.name || 'Akun Terhapus'}</p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{item.account?.type}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-right py-4 px-2 font-black text-emerald-600">
                                      {Number(item.debit) > 0 ? formatCurrency(Number(item.debit)) : '-'}
                                    </td>
                                    <td className="text-right py-4 px-2 font-black text-rose-600">
                                      {Number(item.credit) > 0 ? formatCurrency(Number(item.credit)) : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="py-10 px-6 text-center">
                             <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
                                <AlertCircle size={24} />
                             </div>
                             <h5 className="font-bold text-slate-800 text-sm mb-1">Item Jurnal Kosong</h5>
                             <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                               Data ini mungkin dicatat menggunakan sistem lama atau item-nya belum ter-sinkron. 
                               {journal.fallbackAmount ? ` (Nilai Terdeteksi: ${formatCurrency(journal.fallbackAmount)})` : ''}
                             </p>
                          </div>
                        )}
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
              <p className="text-slate-500 max-w-xs mx-auto text-sm mt-2 font-medium">Data jurnal akan muncul secara otomatis setelah Anda mencatat transaksi atau entri jurnal baru.</p>
            </div>
          )}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
