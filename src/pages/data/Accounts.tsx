
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Account, AccountType, NormalBalance } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Plus, Loader2, Trash2, Database, AlertCircle } from 'lucide-react';
import { useNotify } from '../../contexts/NotificationContext';

const accountTypes: AccountType[] = ['aset', 'kewajiban', 'modal', 'pendapatan', 'beban'];

export default function Accounts() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', type: 'aset' as AccountType });

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('type', { ascending: true });
      
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('not find')) {
          setTableError(true);
          return;
        }
        throw error;
      }
      setAccounts(data || []);
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.name || tableError) return;
    
    setIsSubmitting(true);
    const normalBalance: NormalBalance = 
      (newAccount.type === 'aset' || newAccount.type === 'beban') ? 'debit' : 'kredit';

    try {
      const { error } = await supabase.from('accounts').insert([{
        name: newAccount.name,
        type: newAccount.type,
        normal_balance: normalBalance,
        user_id: user.id
      }]);
      if (error) throw error;
      setNewAccount({ name: '', type: 'aset' });
      await fetchAccounts();
      notify('Akun berhasil ditambahkan', 'success');
    } catch (err: any) {
      notify('Gagal menambah akun', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAccount = async (id: string) => {
    if (!confirm('Hapus akun ini?')) return;
    try {
      const { error } = await supabase.from('accounts').delete().eq('id', id);
      if (error) throw error;
      setAccounts(accounts.filter(a => a.id !== id));
      notify('Akun dihapus', 'info');
    } catch (err) {
      notify('Gagal menghapus. Cek transaksi terkait.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Daftar Akun (COA)</h1>
            <p className="text-slate-500 text-sm">Nuansa Legal Bogor - Struktur Pembukuan</p>
          </div>
          {accounts.length === 0 && !loading && !tableError && (
            <button 
              onClick={initDefaultAccounts}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#5000C7] transition-all"
            >
              <Database size={18} />
              Inisialisasi Akun Standar
            </button>
          )}
        </header>

        {tableError && (
          <div className="mb-8 p-6 bg-rose-50 border border-rose-200 rounded-3xl flex items-center gap-4">
            <AlertCircle className="text-rose-500" size={24} />
            <div>
              <h3 className="font-bold text-rose-900">Tabel "accounts" Tidak Ditemukan</h3>
              <p className="text-sm text-rose-700">Pastikan Anda telah membuat tabel di Supabase Dashboard.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Tambah Akun Baru</h3>
            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nama Akun</label>
                <input 
                  type="text" 
                  disabled={tableError}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6200EE]/20 outline-none disabled:opacity-50"
                  placeholder="Contoh: Kas Kecil"
                  value={newAccount.name}
                  onChange={e => setNewAccount({...newAccount, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Tipe Akun</label>
                <select 
                  disabled={tableError}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6200EE]/20 outline-none disabled:opacity-50"
                  value={newAccount.type}
                  onChange={e => setNewAccount({...newAccount, type: e.target.value as AccountType})}
                >
                  {accountTypes.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting || tableError}
                className="w-full bg-[#6200EE] text-white font-bold py-2.5 rounded-xl hover:bg-[#5000C7] flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-100 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Plus size={18} /> Tambah Akun</>}
              </button>
            </form>
          </section>

          <section className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
            ) : accounts.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-600">Nama Akun</th>
                      <th className="px-6 py-4 font-bold text-slate-600">Tipe</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {accounts.map(acc => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{acc.name}</td>
                        <td className="px-6 py-4 capitalize text-slate-500">{acc.type}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => deleteAccount(acc.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                <Database size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                <p className="text-slate-500">Belum ada akun terdaftar.</p>
              </div>
            )}
          </section>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
