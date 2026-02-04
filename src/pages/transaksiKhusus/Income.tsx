
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import type { Account } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, CheckCircle2, Save, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Income() {
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
    description: '',
    kasAccount: '',
    sourceAccount: ''
  });

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase.from('accounts').select('*').order('name');
      if (error) throw error;
      setAccounts(data || []);

      const kas = data?.find(a => a.type === 'aset' && a.name.toLowerCase().includes('kas'));
      const inc = data?.find(a => a.type === 'pendapatan');

      if (kas && inc) {
        setForm(f => ({ ...f, kasAccount: kas.id, sourceAccount: inc.id }));
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
      // 1. Create Journal
      const { data: journal, error: jError } = await supabase
        .from('journals')
        .insert([{
          user_id: user.id,
          date: form.date,
          description: form.description,
          source: 'Income'
        }])
        .select()
        .single();

      if (jError) throw jError;

      // 2. Create Journal Items (Double Entry)
      const items = [
        { journal_id: journal.id, account_id: form.kasAccount, debit: amount, credit: 0 },
        { journal_id: journal.id, account_id: form.sourceAccount, debit: 0, credit: amount }
      ];

      const { error: iError } = await supabase.from('journal_items').insert(items);
      if (iError) throw iError;

      // 3. Create Cash Transaction Record (Sync with schema)
      const { error: cError } = await supabase.from('cash_transactions').insert([{
        user_id: user.id,
        type: 'in',
        amount: amount,
        journal_id: journal.id,
        date: form.date
      }]);

      if (cError) console.warn("Cash transaction sync warning:", cError.message);

      setSuccess(true);
      notify('Penerimaan kas berhasil dicatat', 'success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      notify('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Loader moved inside return branch

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-2xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sinkronisasi<br />Akun & Data...</p>
          </div>
        ) : (
          <>
            <header className="mb-8">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Penerimaan Kas</h1>
              <p className="text-slate-500 text-sm font-medium">Catat dana masuk dari pendapatan atau pelunasan piutang</p>
            </header>

            {success ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-12 rounded-[2.5rem] text-center shadow-xl border border-emerald-100">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Transaksi Berhasil!</h2>
                <p className="text-slate-500 font-medium">Kas telah diperbarui dan jurnal otomatis telah terbentuk.</p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
                <div className="bg-blue-50/50 p-5 rounded-3xl flex gap-4 border border-blue-100/30">
                  <Info className="text-[#6200EE] shrink-0" size={24} />
                  <p className="text-[11px] text-blue-900 font-medium leading-relaxed">
                    Setiap penerimaan kas akan menambah saldo <span className="font-bold text-[#6200EE]">Kas/Bank (Debit)</span> dan diakui sebagai <span className="font-bold text-[#6200EE]">Pendapatan (Kredit)</span>.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tanggal Terima</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-bold"
                      value={form.date}
                      onChange={e => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah Diterima (Rp)</label>
                    <input
                      type="number"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all font-black text-xl text-[#6200EE]"
                      placeholder="0"
                      value={form.amount}
                      onChange={e => setForm({ ...form, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Masuk Ke Akun</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] font-bold"
                      value={form.kasAccount}
                      onChange={e => setForm({ ...form, kasAccount: e.target.value })}
                      required
                    >
                      <option value="">Pilih Akun Kas/Bank</option>
                      {accounts.filter(a => a.type === 'aset').map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sumber (Pendapatan/Piutang)</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] font-bold"
                      value={form.sourceAccount}
                      onChange={e => setForm({ ...form, sourceAccount: e.target.value })}
                      required
                    >
                      <option value="">Pilih Sumber Dana</option>
                      {accounts.filter(a => a.type !== 'beban').map(a => <option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                    <textarea
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] min-h-[100px] font-bold"
                      placeholder="Contoh: Pembayaran Jasa Konsultasi Hukum"
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#6200EE] text-white font-black py-5 rounded-3xl hover:bg-[#5000C7] shadow-2xl shadow-purple-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Simpan Penerimaan</>}
                </button>
              </form>
            )}
          </>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
