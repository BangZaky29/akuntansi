
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Briefcase, Loader2, Save, CheckCircle2, Info, AlertTriangle, PlusCircle } from 'lucide-react';
import type { Account } from '../../types';
import { useNavigate, Link } from 'react-router-dom';

export default function Capital() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: 'Setoran Modal Pemilik',
    kasAccount: '',
    equityAccount: ''
  });

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('accounts').select('*').order('name');
      if (error) throw error;
      
      const allAccounts = data || [];
      setAccounts(allAccounts);
      
      // Auto-select first available matches
      const kas = allAccounts.find(a => a.type === 'aset' && (a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank')));
      const equity = allAccounts.find(a => a.type === 'modal');
      
      setForm(f => ({
        ...f, 
        kasAccount: kas?.id || '', 
        equityAccount: equity?.id || ''
      }));
    } catch (err: any) {
      notify('Gagal memuat akun', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kasAccount || !form.equityAccount) {
      return notify('Akun Kas dan Modal wajib dipilih', 'error');
    }

    setSubmitting(true);
    const amount = Number(form.amount);

    try {
      const { data: journal, error: jError } = await supabase
        .from('journals')
        .insert([{
          user_id: user.id,
          date: form.date,
          description: form.description,
          source: 'Modal'
        }])
        .select()
        .single();

      if (jError) throw jError;

      const items = [
        { journal_id: journal.id, account_id: form.kasAccount, debit: amount, credit: 0 },
        { journal_id: journal.id, account_id: form.equityAccount, debit: 0, credit: amount }
      ];

      const { error: iError } = await supabase.from('journal_items').insert(items);
      if (iError) throw iError;

      setSuccess(true);
      notify('Transaksi modal berhasil disimpan', 'success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      notify('Gagal menyimpan transaksi: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const kasAccounts = accounts.filter(a => a.type === 'aset');
  const equityAccounts = accounts.filter(a => a.type === 'modal');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-2xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transaksi Modal</h1>
          <p className="text-slate-500 text-sm font-medium">Pencatatan investasi atau penarikan modal pemilik</p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Memuat Akun...</p>
          </div>
        ) : success ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[2.5rem] text-center shadow-2xl shadow-purple-100 border border-purple-50">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <CheckCircle2 size={56} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">Transaksi Berhasil!</h2>
            <p className="text-slate-500 font-medium">Data setoran modal telah masuk ke jurnal umum dan laporan neraca.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
            <div className="bg-indigo-50/50 p-5 rounded-3xl flex gap-4 border border-indigo-100/50">
              <Info className="text-[#6200EE] shrink-0" size={24} />
              <p className="text-[11px] text-indigo-900 font-medium leading-relaxed">
                Pencatatan ini akan menambah saldo <span className="font-bold">Kas/Bank (Debit)</span> dan menambah saldo <span className="font-bold">Modal (Kredit)</span>. Pastikan Anda sudah memiliki akun dengan tipe "Modal".
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Transaksi</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-bold"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nilai Investasi (RP)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-black text-xl text-[#6200EE]"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Diterima Di (Akun Kas/Bank)</label>
              {kasAccounts.length > 0 ? (
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] font-bold"
                  value={form.kasAccount}
                  onChange={e => setForm({...form, kasAccount: e.target.value})}
                  required
                >
                  <option value="">Pilih Akun Kas</option>
                  {kasAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700">Akun Kas belum tersedia</span>
                  <Link to="/accounts" className="text-[10px] bg-amber-600 text-white px-3 py-1.5 rounded-lg font-black uppercase">Buat Akun</Link>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Akun Modal Pemilik</label>
              {equityAccounts.length > 0 ? (
                <select 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] font-bold"
                  value={form.equityAccount}
                  onChange={e => setForm({...form, equityAccount: e.target.value})}
                  required
                >
                  <option value="">Pilih Akun Modal</option>
                  {equityAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              ) : (
                <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
                  <div className="flex items-center gap-3 text-rose-600">
                    <AlertTriangle size={20} />
                    <span className="text-xs font-black uppercase tracking-tight">Akun Tipe "Modal" Tidak Ditemukan</span>
                  </div>
                  <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                    Anda harus membuat akun dengan <span className="font-black">Tipe Akun: MODAL</span> terlebih dahulu di menu Akun/Perkiraan agar muncul di pilihan ini.
                  </p>
                  <Link 
                    to="/accounts" 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all"
                  >
                    <PlusCircle size={14} /> Buat Akun Modal Sekarang
                  </Link>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] min-h-[120px] font-bold"
                placeholder="Contoh: Setoran modal awal operasional"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={submitting || equityAccounts.length === 0}
              className="w-full bg-[#6200EE] text-white font-black py-5 rounded-2xl hover:bg-[#5000C7] shadow-2xl shadow-purple-200 flex items-center justify-center gap-3 transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-sm active:scale-95"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Simpan Setoran Modal</>}
            </button>
          </form>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
