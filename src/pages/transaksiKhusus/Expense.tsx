
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Account } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { ArrowDownLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Expense() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    kasAccount: '',
    targetAccount: ''
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      setAccounts(data || []);
      
      const kas = data?.find(a => a.name.toLowerCase().includes('kas'));
      const exp = data?.find(a => a.type === 'beban');
      
      if (kas && exp) {
        setForm(f => ({...f, kasAccount: kas.id, targetAccount: exp.id}));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const amount = Number(form.amount);

    try {
      const { data: journal, error: jError } = await supabase
        .from('journals')
        .insert([{
          user_id: user.id,
          date: form.date,
          description: form.description,
          source: 'Pengeluaran Kas'
        }])
        .select()
        .single();

      if (jError) throw jError;

      const items = [
        { journal_id: journal.id, account_id: form.targetAccount, debit: amount, credit: 0 },
        { journal_id: journal.id, account_id: form.kasAccount, debit: 0, credit: amount }
      ];

      const { error: iError } = await supabase.from('journal_items').insert(items);
      if (iError) throw iError;

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      alert('Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-2xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Pengeluaran Kas</h1>
          <p className="text-slate-500 text-sm">Catat uang keluar dari bisnis Anda</p>
        </header>

        {success ? (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-3xl text-center shadow-xl border border-rose-100">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Transaksi Berhasil!</h2>
            <p className="text-slate-500">Pengeluaran kas telah dicatat ke jurnal umum.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tanggal</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Jumlah (Rp)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-lg text-rose-600"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Bayar Menggunakan</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={form.kasAccount}
                onChange={e => setForm({...form, kasAccount: e.target.value})}
                required
              >
                <option value="">Pilih Akun Kas</option>
                {accounts.filter(a => a.type === 'aset').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Untuk Keperluan / Biaya</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={form.targetAccount}
                onChange={e => setForm({...form, targetAccount: e.target.value})}
                required
              >
                <option value="">Pilih Keperluan</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Keterangan</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none min-h-[100px]"
                placeholder="Contoh: Pembayaran listrik bulan ini"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-600 text-white font-bold py-4 rounded-2xl hover:bg-rose-700 shadow-lg shadow-rose-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><ArrowDownLeft size={20} /> Simpan Pengeluaran</>}
            </button>
          </form>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
