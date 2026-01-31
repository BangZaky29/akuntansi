
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Briefcase, Loader2, Save, CheckCircle2, Info } from 'lucide-react';
import type { Account } from '../../types';
import { useNavigate } from 'react-router-dom';

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
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*');
      if (error) throw error;
      setAccounts(data || []);
      
      const kas = data?.find(a => a.name.toLowerCase().includes('kas') || a.name.toLowerCase().includes('bank'));
      const equity = data?.find(a => a.type === 'modal');
      
      if (kas && equity) {
        setForm(f => ({...f, kasAccount: kas.id, equityAccount: equity.id}));
      }
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
      // 1. Create Journal Entry
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

      // 2. Create Journal Items (Debit: Kas, Credit: Modal)
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

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-2xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Transaksi Modal</h1>
          <p className="text-slate-500 text-sm">Pencatatan investasi atau penarikan modal pemilik</p>
        </header>

        {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" /></div> : 
        success ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-3xl text-center shadow-xl border border-blue-100">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Transaksi Berhasil!</h2>
            <p className="text-slate-500">Modal telah dicatat dan masuk ke jurnal umum.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div className="bg-blue-50 p-4 rounded-2xl flex gap-3 border border-blue-100 mb-2">
              <Info className="text-blue-500 shrink-0" size={20} />
              <p className="text-xs text-blue-800 leading-relaxed">
                Transaksi ini akan menambah saldo <strong>Kas/Bank</strong> (Debit) dan saldo <strong>Modal</strong> (Kredit) secara otomatis.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tanggal Transaksi</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nilai Investasi (Rp)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-lg"
                  placeholder="0"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Diterima Di (Akun Kas/Bank)</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Akun Modal Pemilik</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                value={form.equityAccount}
                onChange={e => setForm({...form, equityAccount: e.target.value})}
                required
              >
                <option value="">Pilih Akun Modal</option>
                {accounts.filter(a => a.type === 'modal').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Keterangan</label>
              <textarea 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none min-h-[100px]"
                placeholder="Contoh: Setoran modal awal operasional"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                required
              />
            </div>

            <button 
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
