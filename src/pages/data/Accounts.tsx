
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Account, AccountType, NormalBalance } from '../../types';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Trash2, Database } from 'lucide-react';
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

  const [showZero, setShowZero] = useState(false);

  useEffect(() => {
    if (user) fetchAccounts();
  }, [user]);

  const fetchAccounts = async () => {
    setLoading(true);
    setTableError(false);
    try {
      // Use existing account_balances view to get dynamic balance data
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
      // Map view data to Account type structure expected by UI, plus balance
      const formatted = (data || []).map((vc: any) => ({
        id: vc.account_id,
        name: vc.account_name,
        type: vc.type,
        normal_balance: vc.normal_balance,
        balance: vc.balance,
        user_id: vc.user_id,
        created_at: new Date().toISOString() // Mock to satisfy type
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

  const displayedAccounts = showZero ? accounts : accounts.filter((a: any) => Math.abs(a.balance || 0) > 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Daftar Akun (COA)</h1>
            <p className="text-slate-500 text-sm">Nuansa Legal Bogor - Struktur Pembukuan</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">
              <input
                type="checkbox"
                checked={showZero}
                onChange={e => setShowZero(e.target.checked)}
                className="w-4 h-4 text-[#6200EE] rounded focus:ring-purple-500 border-gray-300"
              />
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Tampilkan Saldo 0</span>
            </label>

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
          </div>
        </header>

        {/* ... (Error Block) ... */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Tambah Akun Baru</h3>
            {/* ... (Form) ... */}
          </section>

          <section className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
            ) : displayedAccounts.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 font-bold text-slate-600">Nama Akun</th>
                      <th className="px-6 py-4 font-bold text-slate-600">Tipe / Normal</th>
                      <th className="px-6 py-4 text-right font-bold text-slate-600">Saldo</th>
                      <th className="px-6 py-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedAccounts.map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-800">{acc.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="capitalize text-slate-700 font-bold">{acc.type}</span>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Normal: {acc.normal_balance}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-600">
                          {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(acc.balance || 0)}
                        </td>
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
