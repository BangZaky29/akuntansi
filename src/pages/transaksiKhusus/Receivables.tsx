
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, CheckCircle, Clock, Search, Plus, Trash2, Edit3, ChevronDown} from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import type { Receivable, Account } from '../../types';
import { useNotify } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Receivables() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', 
    journal_id: '', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0], 
    status: 'unpaid' as 'unpaid' | 'paid',
    receivableAccountId: '',
    incomeAccountId: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, accRes] = await Promise.all([
        supabase.from('receivables').select('*, journal:journals(*)').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*').order('name')
      ]);

      if (recRes.error) throw recRes.error;
      setReceivables(recRes.data as unknown as Receivable[]);
      
      const allAccs = accRes.data || [];
      setAccounts(allAccs);

      // Default selection logic
      const defRec = allAccs.find(a => a.type === 'aset' && a.name.toLowerCase().includes('piutang'))?.id || '';
      const defInc = allAccs.find(a => a.type === 'pendapatan')?.id || '';
      
      setFormData(prev => ({
        ...prev,
        receivableAccountId: defRec,
        incomeAccountId: defInc
      }));

    } catch (err: any) {
      notify('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return notify('Jumlah harus lebih dari 0', 'error');
    if (!formData.receivableAccountId || !formData.incomeAccountId) return notify('Pilih akun piutang dan pendapatan', 'error');

    setSubmitting(true);
    try {
      const amount = Number(formData.amount);

      if (isEditing) {
        await supabase.from('journals').update({ description: formData.description, date: formData.date }).eq('id', formData.journal_id);
        await supabase.from('receivables').update({ amount, status: formData.status }).eq('id', formData.id);
        await supabase.from('journal_items').delete().eq('journal_id', formData.journal_id);
        await supabase.from('journal_items').insert([
          { journal_id: formData.journal_id, account_id: formData.receivableAccountId, debit: amount, credit: 0 },
          { journal_id: formData.journal_id, account_id: formData.incomeAccountId, debit: 0, credit: amount }
        ]);
        notify('Data diperbarui', 'success');
      } else {
        const { data: journal, error: jErr } = await supabase.from('journals').insert([{
          user_id: user.id, date: formData.date, description: formData.description, source: 'Receivable'
        }]).select().single();

        if (jErr) throw jErr;

        await supabase.from('receivables').insert([{
          user_id: user.id, amount, status: formData.status, journal_id: journal.id
        }]);

        await supabase.from('journal_items').insert([
          { journal_id: journal.id, account_id: formData.receivableAccountId, debit: amount, credit: 0 },
          { journal_id: journal.id, account_id: formData.incomeAccountId, debit: 0, credit: amount }
        ]);
        notify('Piutang berhasil dicatat', 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r: Receivable) => {
    if (!confirm('Hapus piutang dan jurnal terkait?')) return;
    try {
      if (r.journal_id) {
        await supabase.from('journal_items').delete().eq('journal_id', r.journal_id);
        await supabase.from('receivables').delete().eq('id', r.id);
        await supabase.from('journals').delete().eq('id', r.journal_id);
      } else {
        await supabase.from('receivables').delete().eq('id', r.id);
      }
      notify('Data terhapus', 'info');
      fetchData();
    } catch (err) { notify('Gagal hapus', 'error'); }
  };

  const assetAccounts = accounts.filter(a => a.type === 'aset');
  const incomeAccounts = accounts.filter(a => a.type === 'pendapatan');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Piutang</h1>
            <p className="text-slate-500 text-sm font-medium">Tagihan penjualan jasa/barang</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Cari deskripsi..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold shadow-sm"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#6200EE] text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-200 active:scale-95 transition-all"
            >
              <Plus size={18} /> Tambah
            </button>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receivables.filter(r => r.journal?.description?.toLowerCase().includes(searchTerm.toLowerCase())).map((r) => (
              <motion.div layout key={r.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-md transition-shadow">
                <div className="flex justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${r.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {r.status === 'paid' ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { 
                      setFormData({ 
                        id: r.id, 
                        journal_id: r.journal_id, 
                        amount: r.amount.toString(), 
                        description: r.journal?.description || '', 
                        date: r.journal?.date || '', 
                        status: r.status,
                        receivableAccountId: formData.receivableAccountId, // Fallback to current selection
                        incomeAccountId: formData.incomeAccountId
                      }); 
                      setIsEditing(true); 
                      setShowModal(true); 
                    }} className="p-2 text-slate-400 hover:text-[#6200EE] hover:bg-purple-50 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(r)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 mb-1 truncate leading-tight">{r.journal?.description || 'Piutang'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                  {new Date(r.journal?.date || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(r.amount)}</span>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status === 'paid' ? 'LUNAS' : 'MENUNGGU'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-10">
                <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">{isEditing ? 'Ubah Piutang' : 'Catat Piutang Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Keterangan Transaksi</label>
                    <input type="text" placeholder="Misal: Jasa Pembuatan Website" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-[#6200EE]/20 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tanggal</label>
                      <input type="date" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Status</label>
                      <div className="relative">
                        <select className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                          <option value="unpaid">Belum Lunas</option>
                          <option value="paid">Sudah Lunas</option>
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-slate-50">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Akun Piutang <span className="text-[8px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded italic">Debit</span></label>
                      <div className="relative">
                        <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer" value={formData.receivableAccountId} onChange={e => setFormData({...formData, receivableAccountId: e.target.value})}>
                          <option value="">Pilih Akun Piutang (Aset)</option>
                          {assetAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Akun Pendapatan <span className="text-[8px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded italic">Kredit</span></label>
                      <div className="relative">
                        <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer" value={formData.incomeAccountId} onChange={e => setFormData({...formData, incomeAccountId: e.target.value})}>
                          <option value="">Pilih Akun Pendapatan</option>
                          {incomeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Jumlah Tagihan (Rp)</label>
                    <input type="number" placeholder="0" required className="w-full bg-slate-50 p-5 rounded-3xl outline-none border border-slate-100 font-black text-2xl text-[#6200EE]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-[#6200EE] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-purple-100 mt-4 transition-all active:scale-95 disabled:opacity-50">
                    {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isEditing ? 'PERBARUI DATA' : 'SIMPAN TRANSAKSI')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <MobileNav />
    </div>
  );
}
