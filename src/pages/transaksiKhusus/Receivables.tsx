
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { FileText, Loader2, CheckCircle, Clock, Search, Plus, Trash2, Edit3, Save, AlertCircle } from 'lucide-react';
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
    id: '', journal_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'unpaid' as 'unpaid' | 'paid'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, accRes] = await Promise.all([
        supabase.from('receivables').select('*, journal:journals(*)').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*')
      ]);

      if (recRes.error) throw recRes.error;
      setReceivables(recRes.data as unknown as Receivable[]);
      setAccounts(accRes.data || []);
    } catch (err: any) {
      notify('Gagal memuat data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return notify('Jumlah harus lebih dari 0', 'error');

    setSubmitting(true);
    try {
      const amount = Number(formData.amount);
      const recAcc = accounts.find(a => a.name.toLowerCase().includes('piutang'));
      const incAcc = accounts.find(a => a.type === 'pendapatan');

      if (!recAcc || !incAcc) throw new Error('Akun Piutang atau Pendapatan tidak ditemukan. Silakan buat di menu Akun.');

      if (isEditing) {
        // Update Journal
        await supabase.from('journals').update({ description: formData.description, date: formData.date }).eq('id', formData.journal_id);
        // Update Receivable
        await supabase.from('receivables').update({ amount, status: formData.status }).eq('id', formData.id);
        // Sinkronisasi Journal Items
        await supabase.from('journal_items').delete().eq('journal_id', formData.journal_id);
        await supabase.from('journal_items').insert([
          { journal_id: formData.journal_id, account_id: recAcc.id, debit: amount, credit: 0 },
          { journal_id: formData.journal_id, account_id: incAcc.id, debit: 0, credit: amount }
        ]);
        notify('Data diperbarui', 'success');
      } else {
        // Create New Journal
        const { data: journal, error: jErr } = await supabase.from('journals').insert([{
          user_id: user.id, date: formData.date, description: formData.description, source: 'Receivable'
        }]).select().single();

        if (jErr) throw jErr;

        // Create Receivable
        await supabase.from('receivables').insert([{
          user_id: user.id, amount, status: formData.status, journal_id: journal.id
        }]);

        // Create Journal Items (Double Entry)
        await supabase.from('journal_items').insert([
          { journal_id: journal.id, account_id: recAcc.id, debit: amount, credit: 0 },
          { journal_id: journal.id, account_id: incAcc.id, debit: 0, credit: amount }
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
              onClick={() => { setFormData({ id: '', journal_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'unpaid' }); setIsEditing(false); setShowModal(true); }}
              className="bg-[#6200EE] text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-purple-200"
            >
              <Plus size={18} /> Tambah
            </button>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receivables.filter(r => r.journal?.description?.toLowerCase().includes(searchTerm.toLowerCase())).map((r) => (
              <motion.div layout key={r.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm relative group">
                <div className="flex justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {r.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setFormData({ id: r.id, journal_id: r.journal_id, amount: r.amount.toString(), description: r.journal?.description || '', date: r.journal?.date || '', status: r.status }); setIsEditing(true); setShowModal(true); }} className="p-2 text-slate-400 hover:text-[#6200EE] hover:bg-[#6200EE]/5 rounded-lg"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(r)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 mb-0.5 truncate leading-tight">{r.journal?.description || 'Piutang'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">
                  {new Date(r.journal?.date || '').toLocaleDateString('id-ID')}
                </p>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900">{formatCurrency(r.amount)}</span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${r.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
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
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
                <h2 className="text-xl font-black mb-6 text-slate-800 tracking-tight">{isEditing ? 'Ubah Piutang' : 'Catat Piutang Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Keterangan Transaksi</label>
                    <input type="text" placeholder="Misal: Jual Jasa Web Pro" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-[#6200EE]/20 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tanggal</label>
                      <input type="date" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Status</label>
                      <select className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                        <option value="unpaid">Belum Lunas</option>
                        <option value="paid">Sudah Lunas</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Jumlah Tagihan (Rp)</label>
                    <input type="number" placeholder="0" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-black text-xl text-[#6200EE]" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>
                  <button type="submit" disabled={submitting} className="w-full bg-[#6200EE] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-purple-100 mt-4 transition-all active:scale-95 disabled:opacity-50">
                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : (isEditing ? 'Update Piutang' : 'Simpan Transaksi')}
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
