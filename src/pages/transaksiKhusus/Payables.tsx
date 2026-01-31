
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { TrendingDown, Loader2, CheckCircle, Clock, Search, Plus, Trash2, Edit3, Save } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import type { Payable, Account } from '../../types';
import { useNotify } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Payables() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [payables, setPayables] = useState<Payable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '', journal_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'unpaid' as 'unpaid' | 'paid'
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, accRes] = await Promise.all([
        supabase.from('payables').select('*, journal:journals(*)').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*')
      ]);
      setPayables(payRes.data as unknown as Payable[] || []);
      setAccounts(accRes.data || []);
    } catch (err: any) { notify('Gagal memuat data', 'error'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(formData.amount) <= 0) return notify('Jumlah tidak valid', 'error');

    setSubmitting(true);
    try {
      const amount = Number(formData.amount);
      const payAcc = accounts.find(a => a.type === 'kewajiban');
      const expAcc = accounts.find(a => a.type === 'beban');

      if (!payAcc || !expAcc) throw new Error('Akun Hutang atau Beban tidak ditemukan. Silakan buat di menu Akun.');

      if (isEditing) {
        await supabase.from('journals').update({ description: formData.description, date: formData.date }).eq('id', formData.journal_id);
        await supabase.from('payables').update({ amount, status: formData.status }).eq('id', formData.id);
        await supabase.from('journal_items').delete().eq('journal_id', formData.journal_id);
        await supabase.from('journal_items').insert([
          { journal_id: formData.journal_id, account_id: expAcc.id, debit: amount, credit: 0 },
          { journal_id: formData.journal_id, account_id: payAcc.id, debit: 0, credit: amount }
        ]);
        notify('Berhasil diperbarui', 'success');
      } else {
        const { data: journal, error: jErr } = await supabase.from('journals').insert([{
          user_id: user.id, date: formData.date, description: formData.description, source: 'Payable'
        }]).select().single();

        if (jErr) throw jErr;

        await supabase.from('payables').insert([{ user_id: user.id, amount, status: formData.status, journal_id: journal.id }]);
        await supabase.from('journal_items').insert([
          { journal_id: journal.id, account_id: expAcc.id, debit: amount, credit: 0 },
          { journal_id: journal.id, account_id: payAcc.id, debit: 0, credit: amount }
        ]);
        notify('Hutang baru dicatat', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (err: any) { notify(err.message, 'error'); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (p: Payable) => {
    if (!confirm('Hapus hutang?')) return;
    try {
      if (p.journal_id) {
        await supabase.from('journal_items').delete().eq('journal_id', p.journal_id);
        await supabase.from('payables').delete().eq('id', p.id);
        await supabase.from('journals').delete().eq('id', p.journal_id);
      } else {
        await supabase.from('payables').delete().eq('id', p.id);
      }
      notify('Terhapus', 'info');
      fetchData();
    } catch (err) { notify('Gagal hapus', 'error'); }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Daftar Hutang</h1>
            <p className="text-slate-500 text-sm font-medium">Kewajiban pembayaran operasional</p>
          </div>
          <button onClick={() => { setFormData({ id: '', journal_id: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], status: 'unpaid' }); setIsEditing(false); setShowModal(true); }} className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-100 transition-all active:scale-95"><Plus size={18} /> Tambah</button>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600" /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payables.filter(p => p.journal?.description?.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
              <motion.div layout key={p.id} className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm group">
                <div className="flex justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}><Clock size={20} /></div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => { setFormData({ id: p.id, journal_id: p.journal_id, amount: p.amount.toString(), description: p.journal?.description || '', date: p.journal?.date || '', status: p.status }); setIsEditing(true); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 size={16} /></button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 truncate leading-tight">{p.journal?.description || 'Hutang'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">{new Date(p.journal?.date || '').toLocaleDateString('id-ID')}</p>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-lg font-black text-slate-900">{formatCurrency(p.amount)}</span>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{p.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <AnimatePresence>{showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8">
              <h2 className="text-xl font-black mb-6 text-slate-800">{isEditing ? 'Ubah Hutang' : 'Catat Hutang'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Deskripsi Hutang</label>
                  <input type="text" placeholder="Misal: Bayar Sewa Kantor" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tanggal</label>
                    <input type="date" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Status</label>
                    <select className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="unpaid">Menunggu</option>
                      <option value="paid">Lunas</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Nominal (Rp)</label>
                  <input type="number" placeholder="0" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-black text-xl text-rose-600" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <button type="submit" disabled={submitting} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-rose-100 mt-4 transition-all active:scale-95">{submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Simpan Hutang'}</button>
              </form>
            </motion.div>
          </div>
        )}</AnimatePresence>
      </main>
      <MobileNav />
    </div>
  );
}
