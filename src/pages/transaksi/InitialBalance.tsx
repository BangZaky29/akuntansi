
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Save, Info, AlertTriangle, CheckCircle2, RefreshCcw, ShieldCheck } from 'lucide-react';
import type { Account, JournalItem } from '../../types';
import { formatCurrency } from '../../utils/accounting';

export default function InitialBalance() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingJournalId, setExistingJournalId] = useState<string | null>(null);

  // New State for Unlock Feature
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);

  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: accs } = await supabase
        .from('accounts')
        .select('*')
        .in('type', ['aset', 'kewajiban', 'modal'])
        .order('name');

      setAccounts(accs || []);

      const { data: journal } = await supabase
        .from('journals')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'opening_balance')
        .maybeSingle();

      if (journal) {
        setExistingJournalId(journal.id);
        const { data: items } = await supabase
          .from('journal_items')
          .select('*')
          .eq('journal_id', journal.id);

        if (items) {
          const initialMap: Record<string, number> = {};
          items.forEach((item: JournalItem) => {
            initialMap[item.account_id] = Number(item.debit) || Number(item.credit) || 0;
          });
          setBalances(initialMap);
        }
      }
    } catch (err) {
      notify('Gagal memuat data saldo awal', 'error');
    } finally {
      setLoading(false);
    }
  };

  // State for Magic Link Flow
  const [linkSent, setLinkSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [authError, setAuthError] = useState('');

  // Listen for auth state changes (when user clicks magic link)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && linkSent) {
        // User clicked magic link - unlock edit mode
        setIsUnlocked(true);
        setIsUnlockModalOpen(false);
        notify('Verifikasi berhasil. Mode edit aktif.', 'success');
        setLinkSent(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [linkSent, notify]);

  const [searchParams] = useSearchParams();

  // Check if user is redirected from verification success (unlock balance)
  useEffect(() => {
    const shouldUnlock = searchParams.get('unlock') === 'true';
    console.log('InitialBalance: checking unlock param:', { shouldUnlock, user: !!user });

    if (shouldUnlock && user) {
      console.log('InitialBalance: auto-unlocking edit mode');
      setIsUnlocked(true);
      notify('Verifikasi berhasil. Mode edit aktif.', 'success');

      // Clean URL params using react-router instead of native API to avoid breaking state
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('unlock');
      window.history.replaceState({}, '', `${window.location.pathname}${newParams.toString() ? '?' + newParams.toString() : ''}`);
    }
  }, [user, searchParams, notify]);

  const handleUnlockRequest = () => {
    setIsUnlockModalOpen(true);
    setLinkSent(false);
    setAuthError('');
  };

  const handleSendReauth = async () => {
    setSending(true);

    const { sendMagicLink, getMagicLinkMessage } = await import('../../utils/magicLink');

    // Use custom redirect to auth callback with unlock param
    const result = await sendMagicLink({
      email: user.email,
      type: 'unlockBalance',
      redirectPath: '/auth/callback?unlock=true', // Will trigger auth callback flow
      onError: (error: string) => setAuthError(error)
    });

    setSending(false);

    if (result.success) {
      setLinkSent(true);
      notify(getMagicLinkMessage('unlockBalance', user.email) + '. Cek inbox atau spam folder.', 'success');
    }
  };

  const totalDebit = accounts
    .filter(a => a.type === 'aset')
    .reduce((s, a) => s + (Number(balances[a.id]) || 0), 0);

  const totalCredit = accounts
    .filter(a => a.type === 'kewajiban' || a.type === 'modal')
    .reduce((s, a) => s + (Number(balances[a.id]) || 0), 0);

  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01 && (totalDebit > 0 || totalCredit > 0);

  const handleSave = async () => {
    if (diff > 0.01) {
      return notify(`Saldo tidak seimbang! Selisih: ${formatCurrency(diff)}`, 'error');
    }

    setSaving(true);
    try {
      if (existingJournalId) {
        await supabase.from('journal_items').delete().eq('journal_id', existingJournalId);
        await supabase.from('journals').delete().eq('id', existingJournalId);
      }

      const { data: journal, error: jErr } = await supabase.from('journals').insert([{
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        description: 'Saldo Awal Pembukuan',
        source: 'opening_balance'
      }]).select().single();

      if (jErr) throw jErr;

      const items = Object.entries(balances).map(([accId, val]) => {
        const acc = accounts.find(a => a.id === accId);
        const isDebit = acc?.type === 'aset' || acc?.type === 'beban';
        return {
          journal_id: journal.id,
          account_id: accId,
          debit: isDebit ? val : 0,
          credit: !isDebit ? val : 0
        };
      }).filter(i => (Number(i.debit) || 0) > 0 || (Number(i.credit) || 0) > 0);

      const { error: iErr } = await supabase.from('journal_items').insert(items);
      if (iErr) throw iErr;

      setExistingJournalId(journal.id);
      setIsUnlocked(false); // Relock after save
      notify('Saldo awal berhasil diperbarui', 'success');
    } catch (err) {
      notify('Gagal menyimpan saldo awal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isInputDisabled = !!existingJournalId && !isUnlocked;

  // No full-screen loader here anymore, handled inline below

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar />

      {/* Unlock Verification Modal */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-3">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-slate-800">Keamanan Akun</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Untuk mengedit saldo awal yang terkunci, kami perlu memverifikasi identitas Anda.
              </p>
            </div>

            {!linkSent ? (
              <div className="text-center space-y-4">
                <p className="text-sm font-bold text-slate-700">
                  Kirim link verifikasi ke: <br />
                  <span className="text-indigo-600">{user?.email}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Email berisi <b>link verifikasi keamanan</b> untuk konfirmasi identitas Anda
                </p>
                {authError && <p className="text-xs text-rose-500 font-bold bg-rose-50 p-2 rounded-lg">{authError}</p>}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => setIsUnlockModalOpen(false)}
                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSendReauth}
                    disabled={sending}
                    className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex justify-center gap-2"
                  >
                    {sending && <Loader2 className="animate-spin" size={16} />}
                    Kirim Link
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
                  <ShieldCheck className="text-indigo-600" size={32} />
                </div>

                <p className="text-sm font-bold text-slate-700">
                  Link verifikasi telah dikirim
                </p>
                <p className="text-xs text-slate-500">
                  Buka email <b>{user?.email}</b> dan klik link untuk melanjutkan
                </p>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-left">
                  <p className="text-xs text-blue-800 font-medium mb-2">
                    <b>Langkah selanjutnya:</b>
                  </p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Cek inbox email Anda</li>
                    <li>Klik link "Magic Link" atau tombol di email</li>
                    <li>Kembali ke halaman ini</li>
                    <li>Mode edit akan aktif otomatis</li>
                  </ol>
                </div>

                <p className="text-xs text-amber-600 font-bold bg-amber-50 px-3 py-2 rounded-lg">
                  ⏱️ Link berlaku selama 60 menit
                </p>

                <button
                  onClick={() => { setLinkSent(false); setAuthError(''); }}
                  className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors text-xs"
                >
                  Kirim Ulang Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100 mb-8">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Sinkronisasi Data...</p>
          </div>
        ) : (
          <>
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saldo Awal</h1>
                <p className="text-slate-500 text-sm font-medium">Input posisi keuangan pembuka usaha Anda</p>
              </div>
              <div className="flex gap-3">
                <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#6200EE] transition-all">
                  <RefreshCcw size={18} />
                </button>

                {existingJournalId && !isUnlocked ? (
                  <button
                    onClick={handleUnlockRequest}
                    className="px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 bg-amber-100 text-amber-600 hover:bg-amber-200 transition-all"
                  >
                    <ShieldCheck size={16} />
                    Edit Saldo
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saving || !isBalanced || (!!existingJournalId && !isUnlocked)}
                    className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all disabled:opacity-50 disabled:grayscale ${'bg-[#6200EE] hover:bg-[#5000C7] text-white shadow-purple-200 active:scale-95'
                      }`}
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {existingJournalId ? 'Update Saldo' : 'Simpan Saldo'}
                  </button>
                )}
              </div>
            </header>

            {existingJournalId && !isUnlocked && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Saldo Awal Terkunci</h3>
                  <p className="text-xs text-amber-700">Sesuai kaidah akuntansi, saldo awal yang sudah diposting tidak dapat diedit. Gunakan tombol Edit untuk membuka kunci.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-blue-50 border border-blue-100 p-5 rounded-3xl flex gap-4">
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <Info className="text-blue-500 shrink-0" size={24} />
                  <div className="text-xs text-blue-800 font-medium leading-relaxed">
                    <p className="mb-2">Saldo awal adalah angka pembuka saat Anda mulai menggunakan sistem.</p>
                    <p><strong>PENTING:</strong> Total akun Aset + Beban harus sama dengan total Modal + Hutang + Pendapatan agar seimbang.</p>
                  </div>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border flex flex-col justify-center ${isBalanced ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status Balance</span>
                  {isBalanced ? <CheckCircle2 className="text-emerald-500" size={16} /> : <AlertTriangle className="text-rose-500" size={16} />}
                </div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500">Total Debit:</span>
                  <span className="text-slate-800">{formatCurrency(totalDebit)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold mb-3">
                  <span className="text-slate-500">Total Kredit:</span>
                  <span className="text-slate-800">{formatCurrency(totalCredit)}</span>
                </div>
                <div className={`text-center py-2 rounded-xl text-[10px] font-black uppercase ${isBalanced ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                  {isBalanced ? 'SUDAH SEIMBANG' : `SELISIH: ${formatCurrency(diff)}`}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 md:px-8 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Nama Akun</th>
                      <th className="px-5 md:px-8 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest w-32">Tipe</th>
                      <th className="px-5 md:px-8 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest w-48 md:w-64">Nilai Saldo (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {accounts.map(acc => {
                      const isDebit = acc.type === 'aset' || acc.type === 'beban';
                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-5 md:px-8 py-4 font-bold text-slate-700">{acc.name}</td>
                          <td className="px-5 md:px-8 py-4">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${isDebit ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                              {acc.type}
                            </span>
                          </td>
                          <td className="px-5 md:px-8 py-3">
                            <input
                              type="number"
                              disabled={isInputDisabled}
                              className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-right font-black outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-[#6200EE] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${balances[acc.id] > 0 ? 'text-[#6200EE]' : 'text-slate-300'}`}
                              placeholder="0"
                              value={balances[acc.id] || ''}
                              onChange={e => setBalances({ ...balances, [acc.id]: Number(e.target.value) })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
      <MobileNav />
    </div >
  );
}
