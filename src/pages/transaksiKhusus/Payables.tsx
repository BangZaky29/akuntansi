
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, CheckCircle, Clock, Search, Plus, Trash2, Edit3, Save, ChevronDown, AlertCircle } from 'lucide-react';
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
    id: '', 
    journal_id: '', 
    amount: '', 
    description: '', 
    date: new Date().toISOString().split('T')[0], 
    status: 'unpaid' as 'unpaid' | 'paid',
    payableAccountId: '', // Akun Kewajiban (Hutang)
    targetAccountId: ''   // Akun Beban/Aset yang dibeli
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, accRes] = await Promise.all([
        supabase.from('payables').select('*, journal:journals(*)').order('created_at', { ascending: false }),
        supabase.from('accounts').select('*').order('name')
      ]);

      if (payRes.error) throw payRes.error;
      setPayables(payRes.data as unknown as Payable[]);
      
      const allAccs = accRes.data || [];
      setAccounts(allAccs);

      // Default selection: Cari akun kewajiban dan beban secara pintar untuk saran awal
      const defPay = allAccs.find(a => a.type === 'kewajiban' && a.name.toLowerCase().includes('hutang'))?.id || '';
      const defTarget = allAccs.find(a => a.type === 'beban')?.id || '';
      
      setFormData(prev => ({
        ...prev,
        payableAccountId: defPay,
        targetAccountId: defTarget
      }));

    } catch (err: any) {
      notify('Gagal memuat data hutang', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || Number(formData.amount) <= 0) return notify('Jumlah harus lebih dari 0', 'error');
    if (!formData.payableAccountId || !formData.targetAccountId) return notify('Pilih akun hutang dan tujuan biaya', 'error');

    setSubmitting(true);
    try {
      const amount = Number(formData.amount);

      if (isEditing) {
        // Update Jurnal & Jurnal Items
        await supabase.from('journals').update({ description: formData.description, date: formData.date }).eq('id', formData.journal_id);
        await supabase.from('payables').update({ amount, status: formData.status }).eq('id', formData.id);
        await supabase.from('journal_items').delete().eq('journal_id', formData.journal_id);
        
        // Aturan Akuntansi: Beban bertambah di Debit, Hutang bertambah di Kredit
        await supabase.from('journal_items').insert([
          { journal_id: formData.journal_id, account_id: formData.targetAccountId, debit: amount, credit: 0 },
          { journal_id: formData.journal_id, account_id: formData.payableAccountId, debit: 0, credit: amount }
        ]);
        notify('Data hutang diperbarui', 'success');
      } else {
        // Buat Jurnal Baru
        const { data: journal, error: jErr } = await supabase.from('journals').insert([{
          user_id: user.id, date: formData.date, description: formData.description, source: 'Payable'
        }]).select().single();

        if (jErr) throw jErr;

        // Catat ke tabel payables
        await supabase.from('payables').insert([{
          user_id: user.id, amount, status: formData.status, journal_id: journal.id
        }]);

        // Catat ke Jurnal Items (Double Entry)
        await supabase.from('journal_items').insert([
          { journal_id: journal.id, account_id: formData.targetAccountId, debit: amount, credit: 0 },
          { journal_id: journal.id, account_id: formData.payableAccountId, debit: 0, credit: amount }
        ]);
        notify('Hutang berhasil dicatat', 'success');
      }

      setShowModal(false);
      fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: Payable) => {
    if (!confirm('Hapus hutang dan jurnal terkait?')) return;
    try {
      if (p.journal_id) {
        await supabase.from('journal_items').delete().eq('journal_id', p.journal_id);
        await supabase.from('payables').delete().eq('id', p.id);
        await supabase.from('journals').delete().eq('id', p.journal_id);
      } else {
        await supabase.from('payables').delete().eq('id', p.id);
      }
      notify('Data terhapus', 'info');
      fetchData();
    } catch (err) { notify('Gagal menghapus data', 'error'); }
  };

  const liabilityAccounts = accounts.filter(a => a.type === 'kewajiban');
  const targetAccounts = accounts.filter(a => a.type === 'beban' || a.type === 'aset');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Hutang</h1>
            <p className="text-slate-500 text-sm font-medium">Kewajiban pembayaran operasional atau aset</p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" placeholder="Cari hutang..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold shadow-sm"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => {
                setIsEditing(false);
                setShowModal(true);
              }}
              className="bg-rose-600 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-100 active:scale-95 transition-all"
            >
              <Plus size={18} /> Tambah
            </button>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-rose-600" size={32} /></div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payables.filter(p => p.journal?.description?.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
              <motion.div layout key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm relative group hover:shadow-md transition-shadow">
                <div className="flex justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {p.status === 'paid' ? <CheckCircle size={24} /> : <Clock size={24} />}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { 
                      setFormData({ 
                        id: p.id, 
                        journal_id: p.journal_id, 
                        amount: p.amount.toString(), 
                        description: p.journal?.description || '', 
                        date: p.journal?.date || '', 
                        status: p.status,
                        payableAccountId: formData.payableAccountId,
                        targetAccountId: formData.targetAccountId
                      }); 
                      setIsEditing(true); 
                      setShowModal(true); 
                    }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
                <h3 className="font-black text-slate-800 mb-1 truncate leading-tight">{p.journal?.description || 'Hutang'}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                  {new Date(p.journal?.date || '').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-xl font-black text-slate-900 tracking-tighter">{formatCurrency(p.amount)}</span>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {p.status === 'paid' ? 'LUNAS' : 'MENUNGGU'}
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
                <h2 className="text-2xl font-black mb-8 text-slate-800 tracking-tight">{isEditing ? 'Ubah Hutang' : 'Catat Hutang Baru'}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Keterangan Transaksi</label>
                    <input type="text" placeholder="Misal: Pembelian Laptop Kantor" required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-rose-600/20 transition-all" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
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
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Akun Hutang <span className="text-[8px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded italic">Kredit</span></label>
                      <div className="relative">
                        <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer" value={formData.payableAccountId} onChange={e => setFormData({...formData, payableAccountId: e.target.value})}>
                          <option value="">Pilih Akun Hutang (Kewajiban)</option>
                          {liabilityAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest flex items-center gap-2">Tujuan Biaya / Aset <span className="text-[8px] bg-emerald-50 text-emerald-500 px-1.5 py-0.5 rounded italic">Debit</span></label>
                      <div className="relative">
                        <select required className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer" value={formData.targetAccountId} onChange={e => setFormData({...formData, targetAccountId: e.target.value})}>
                          <option value="">Pilih Akun Beban atau Aset</option>
                          {targetAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                        </select>
                        <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nominal Hutang (Rp)</label>
                    <input type="number" placeholder="0" required className="w-full bg-slate-50 p-5 rounded-3xl outline-none border border-slate-100 font-black text-2xl text-rose-600" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </div>

                  <button type="submit" disabled={submitting} className="w-full bg-rose-600 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-rose-100 mt-4 transition-all active:scale-95 disabled:opacity-50">
                    {submitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isEditing ? 'PERBARUI HUTANG' : 'SIMPAN HUTANG')}
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
