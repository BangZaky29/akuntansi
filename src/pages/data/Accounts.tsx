
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Account, AccountType, NormalBalance } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Trash2, Database, Plus, X, AlertCircle } from 'lucide-react';
import { useNotify } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Accounts() {
  const { user } = useAuth();
  const { notify, confirm } = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [showZero, setShowZero] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'aset' as AccountType,
    normal_balance: 'debit' as NormalBalance
  });

  useEffect(() => {
    if (user?.id) fetchAccounts();
  }, [user?.id]);

  // Auto-set normal balance based on type
  useEffect(() => {
    const debitTypes: AccountType[] = ['aset', 'beban'];
    setFormData(prev => ({
      ...prev,
      normal_balance: debitTypes.includes(prev.type) ? 'debit' : 'kredit'
    }));
  }, [formData.type]);

  const fetchAccounts = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('account_balances')
        .select('*')
        .order('account_name', { ascending: true });

      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find')) {
          setTableError(true);
          return;
        }
        throw error;
      }

      const formatted = (data || []).map((vc: any) => ({
        id: vc.account_id,
        name: vc.account_name,
        type: vc.type,
        normal_balance: vc.normal_balance,
        balance: vc.balance,
        user_id: vc.user_id,
        created_at: new Date().toISOString()
      })) as Account[];

      setAccounts(formatted);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const initDefaultAccounts = async () => {
    if (tableError) {
      notify('Tabel "accounts" belum dibuat di Supabase.', 'error');
      return;
    }
    notify('Memproses inisialisasi...', 'loading');
    setIsSubmitting(true);
    const defaults = [
      { name: 'Kas Utama', type: 'aset', normal_balance: 'debit', user_id: user.id },
      { name: 'Piutang Usaha', type: 'aset', normal_balance: 'debit', user_id: user.id },
      { name: 'Hutang Usaha', type: 'kewajiban', normal_balance: 'kredit', user_id: user.id },
      { name: 'Modal Pemilik', type: 'modal', normal_balance: 'kredit', user_id: user.id },
      { name: 'Pendapatan Jasa', type: 'pendapatan', normal_balance: 'kredit', user_id: user.id },
      { name: 'Beban Operasional', type: 'beban', normal_balance: 'debit', user_id: user.id },
    ];

    try {
      const { error } = await supabase.from('accounts').insert(defaults);
      if (error) throw error;
      await fetchAccounts();
      notify('Akun standar berhasil dibuat', 'success');
    } catch (err: any) {
      notify('Gagal inisialisasi: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return notify('Nama akun wajib diisi', 'error');

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('accounts').insert([{
        name: formData.name,
        type: formData.type,
        normal_balance: formData.normal_balance,
        user_id: user.id
      }]);

      if (error) throw error;

      notify('Akun baru berhasil ditambahkan', 'success');
      setShowModal(false);
      setFormData({ name: '', type: 'aset', normal_balance: 'debit' });
      fetchAccounts();
    } catch (err: any) {
      notify('Gagal menambah akun: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async (id: string) => {
    const confirmed = await confirm('Hapus akun ini? Akun hanya bisa dihapus jika tidak memiliki riwayat transaksi.', {
      type: 'danger',
      title: 'Hapus Akun'
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      setAccounts(accounts.filter(a => a.id !== id));
      notify('Akun berhasil dihapus', 'info');
    } catch (err) {
      notify('Gagal menghapus. Kemungkinan ada transaksi terkait akun ini.', 'error');
    }
  };

  const displayedAccounts = showZero ? accounts : accounts.filter((a: any) => Math.abs(a.balance || 0) > 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Akun (COA)</h1>
            <p className="text-slate-500 text-sm font-medium">Struktur akun akuntansi dan saldo saat ini</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowModal(true)}
              className="flex-1 md:flex-none bg-[#6200EE] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-purple-100 transition-all hover:bg-[#5000C7]"
            >
              <Plus size={18} />
              Tambah Akun
            </button>
            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
              <input
                type="checkbox"
                checked={showZero}
                onChange={e => setShowZero(e.target.checked)}
                className="w-4 h-4 text-[#6200EE] rounded focus:ring-purple-500 border-gray-300 pointer-events-none md:pointer-events-auto"
              />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tampilkan Saldo 0</span>
            </label>
          </div>
        </header>

        {accounts.length === 0 && !loading && !tableError && (
          <div className="mb-6">
            <button
              onClick={initDefaultAccounts}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-dashed border-slate-200 text-slate-400 p-8 rounded-[2.5rem] font-black text-xs uppercase tracking-widest hover:border-[#6200EE] hover:text-[#6200EE] transition-all"
            >
              <Database size={24} />
              Gunakan Akun Standar (Inisialisasi)
            </button>
          </div>
        )}

        <div className="space-y-4">
          {loading && accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100">
              <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Akun...</p>
            </div>
          ) : displayedAccounts.length > 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Nama Akun</th>
                      <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipe / Normal</th>
                      <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Saldo</th>
                      <th className="px-6 py-5 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedAccounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-5">
                          <p className="font-black text-slate-800 text-sm">{acc.name}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-widest w-fit mb-1">{acc.type}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter ml-0.5">Normal: {acc.normal_balance}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <p className={`font-black text-sm ${acc.balance < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(acc.balance || 0)}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button onClick={() => deleteAccount(acc.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors bg-slate-50/50 rounded-xl">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-300 text-center">
              <Database size={64} className="mx-auto text-slate-200 mb-6 opacity-40" />
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Akun Tidak Ditemukan</h3>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 text-[#6200EE] font-black text-xs uppercase tracking-widest hover:underline"
              >
                + Tambah Akun Baru
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-10 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">Akun Baru</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} className="text-slate-400" /></button>
                </div>

                <form onSubmit={handleCreateAccount} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nama Akun</label>
                    <input
                      type="text"
                      placeholder="Misal: Kas Kecil, Piutang Karyawan..."
                      required
                      className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold focus:border-[#6200EE]/20 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tipe Akun</label>
                      <select
                        required
                        className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer pr-10"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value as AccountType })}
                      >
                        <option value="aset">ASET</option>
                        <option value="kewajiban">KEWAJIBAN</option>
                        <option value="modal">MODAL</option>
                        <option value="pendapatan">PENDAPATAN</option>
                        <option value="beban">BEBAN</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Normal Saldo</label>
                      <select
                        required
                        className="w-full bg-slate-50 p-4 rounded-2xl outline-none border border-slate-100 font-bold appearance-none cursor-pointer pr-10"
                        value={formData.normal_balance}
                        onChange={e => setFormData({ ...formData, normal_balance: e.target.value as NormalBalance })}
                      >
                        <option value="debit">DEBIT</option>
                        <option value="kredit">KREDIT</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-3xl flex items-start gap-4 border border-slate-100">
                    <div className="p-2 bg-white rounded-xl text-[#6200EE] border border-purple-50 shrink-0"><AlertCircle size={20} /></div>
                    <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                      Normal saldo secara otomatis disesuaikan berdasarkan tipe akun. Pastikan kebenaran data sebelum menyimpan.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#6200EE] text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-purple-100 mt-4 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'SIMPAN AKUN BARU'}
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
