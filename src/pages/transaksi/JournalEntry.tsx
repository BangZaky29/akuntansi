
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Trash2, Loader2, Save, AlertCircle } from 'lucide-react';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/accounting';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../../components/CustomSelect';
import { motion, AnimatePresence } from 'framer-motion';

export default function JournalEntry() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [header, setHeader] = useState({ date: new Date().toISOString().split('T')[0], description: '' });
  const [rows, setRows] = useState([{ account_id: '', debit: 0, credit: 0 }]);

  useEffect(() => {
    supabase.from('accounts').select('*').then(({ data }) => {
      setAccounts(data || []);
      setLoading(false);
    });
  }, []);

  const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addRow = () => setRows([...rows, { account_id: '', debit: 0, credit: 0 }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: string, val: any) => {
    const newRows = [...rows];
    (newRows[idx] as any)[field] = val;
    // Enforce: Satu baris HANYA boleh debit ATAU kredit
    if (field === 'debit' && Number(val) > 0) newRows[idx].credit = 0;
    if (field === 'credit' && Number(val) > 0) newRows[idx].debit = 0;
    setRows(newRows);
  };

  const handleSave = async () => {
    if (!isBalanced) return notify('Jurnal tidak seimbang!', 'error');
    if (!header.description) return notify('Keterangan wajib diisi', 'error');

    setSubmitting(true);
    try {
      const items = rows.filter(r => r.account_id).map(r => ({
        account_id: r.account_id,
        debit: Number(r.debit),
        credit: Number(r.credit)
      }));

      const { error } = await supabase.rpc('create_journal_entry', {
        p_user_id: user.id,
        p_date: header.date,
        p_description: header.description,
        p_source: 'Manual',
        p_items: items
      });

      if (error) throw error;

      notify('Jurnal berhasil disimpan', 'success');
      navigate('/journal');
    } catch (err: any) {
      console.error(err);
      notify('Gagal menyimpan jurnal: ' + (err.message || 'Error RPC'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sinkronisasi<br />Data Jurnal...</p>
          </div>
        ) : (
          <>
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Entri Jurnal Umum</h1>
                <p className="text-slate-500 text-sm font-medium">Pencatatan transaksi manual Double-Entry</p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`hidden md:flex flex-col items-end px-4 py-1.5 rounded-2xl border ${isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Total Balance</p>
                  <p className={`text-sm font-black ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(totalDebit)}</p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={!isBalanced || submitting}
                  className="flex-1 md:flex-none bg-[#6200EE] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 hover:bg-[#5000C7] transition-all shadow-xl shadow-purple-100"
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Simpan Jurnal
                </button>
              </div>
            </header>

            <div className="space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-6 md:p-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-bold"
                      value={header.date} onChange={e => setHeader({ ...header, date: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi / Keterangan</label>
                    <input
                      type="text"
                      placeholder="Masukkan alasan atau keterangan transaksi..."
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-bold"
                      value={header.description} onChange={e => setHeader({ ...header, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Item Jurnal ({rows.length})</h3>
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                    <div className="flex flex-col items-end">
                      <span className="text-slate-300">Total Debit</span>
                      <span className="text-emerald-600">{formatCurrency(totalDebit)}</span>
                    </div>
                    <div className="flex flex-col items-end border-l border-slate-200 pl-4">
                      <span className="text-slate-300">Total Kredit</span>
                      <span className="text-rose-600">{formatCurrency(totalCredit)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {rows.map((row, idx) => {
                      const selectedAcc = accounts.find(a => a.id === row.account_id);
                      const isDebitNormal = selectedAcc ? (selectedAcc.type === 'aset' || selectedAcc.type === 'beban') : true;
                      const isDoubleFilled = Number(row.debit) > 0 && Number(row.credit) > 0;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          layout
                          className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 md:p-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                            <div className="md:col-span-6 space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Akun Akuntansi</label>
                              <CustomSelect
                                options={accounts.map(acc => ({ id: acc.id, name: `${acc.name} (${acc.type.toUpperCase()})` }))}
                                value={row.account_id}
                                onChange={(val) => updateRow(idx, 'account_id', val)}
                                placeholder="CARI AKUN..."
                              />
                            </div>

                            <div className="md:col-span-5 grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-emerald-600">Debit (Rp)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full bg-emerald-50/30 border border-emerald-100 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-emerald-600"
                                  value={row.debit || ''}
                                  onChange={e => updateRow(idx, 'debit', e.target.value)}
                                />
                                {row.account_id && (
                                  <p className="text-[8px] font-black uppercase text-emerald-500/60 ml-1 tracking-tighter">
                                    {isDebitNormal ? 'Bertambah (+)' : 'Berkurang (-)'}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-rose-600">Kredit (Rp)</label>
                                <input
                                  type="number"
                                  placeholder="0"
                                  className="w-full bg-rose-50/30 border border-rose-100 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all font-black text-rose-600"
                                  value={row.credit || ''}
                                  onChange={e => updateRow(idx, 'credit', e.target.value)}
                                />
                                {row.account_id && (
                                  <p className="text-[8px] font-black uppercase text-rose-500/60 ml-1 tracking-tighter">
                                    {!isDebitNormal ? 'Bertambah (+)' : 'Berkurang (-)'}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="md:col-span-1 md:pt-6 flex justify-end">
                              <button
                                onClick={() => removeRow(idx)}
                                className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {isDoubleFilled && (
                            <div className="mt-4 bg-rose-50 text-rose-600 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle size={14} />
                              Pilih salah satu (Debit/Kredit)
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4">
                  <button
                    onClick={addRow}
                    className="w-full md:w-auto px-8 py-4 bg-white border-2 border-dashed border-slate-200 text-slate-400 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] hover:border-[#6200EE] hover:text-[#6200EE] transition-all flex items-center justify-center gap-2"
                  >
                    + Tambah Baris Transaksi
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {!isBalanced && totalDebit > 0 && (
                      <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse shadow-xl shadow-rose-100">
                        <AlertCircle size={18} />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-70 text-rose-100">Belum Seimbang</span>
                          <span className="text-xs font-black">Selisih {formatCurrency(Math.abs(totalDebit - totalCredit))}</span>
                        </div>
                      </div>
                    )}

                    {isBalanced && (
                      <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-emerald-100">
                        <Save size={18} />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-70 text-emerald-100">Balance OK</span>
                          <span className="text-xs font-black">{formatCurrency(totalDebit)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
      <MobileNav />
    </div >
  );
}
