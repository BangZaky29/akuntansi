
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Save, Info, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
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

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all accounts
      const { data: accs } = await supabase.from('accounts').select('*').order('name');
      const allAccounts = accs || [];
      setAccounts(allAccounts);

      // 2. Fetch existing initial balance journal
      const { data: journal } = await supabase
        .from('journals')
        .select('id')
        .eq('user_id', user.id)
        .eq('source', 'Initial')
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

  const totalDebit = accounts
    .filter(a => a.type === 'aset' || a.type === 'beban')
    .reduce((s, a) => s + (Number(balances[a.id]) || 0), 0);
    
  const totalCredit = accounts
    .filter(a => a.type !== 'aset' && a.type !== 'beban')
    .reduce((s, a) => s + (Number(balances[a.id]) || 0), 0);

  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = diff < 0.01 && (totalDebit > 0 || totalCredit > 0);

  const handleSave = async () => {
    if (diff > 0.01) {
      return notify(`Saldo tidak seimbang! Selisih: ${formatCurrency(diff)}`, 'error');
    }
    
    setSaving(true);
    try {
      // If updating, we delete old items first to maintain clean data
      if (existingJournalId) {
        await supabase.from('journal_items').delete().eq('journal_id', existingJournalId);
        await supabase.from('journals').delete().eq('id', existingJournalId);
      }

      // Create New Journal
      const { data: journal, error: jErr } = await supabase.from('journals').insert([{
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        description: 'Saldo Awal Pembukuan (Updated)',
        source: 'Initial'
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
      notify('Saldo awal berhasil diperbarui', 'success');
    } catch (err) {
      notify('Gagal menyimpan saldo awal', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Saldo Awal</h1>
            <p className="text-slate-500 text-sm font-medium">Input posisi keuangan pembuka usaha Anda</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-[#6200EE] transition-all">
              <RefreshCcw size={18} />
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving || !isBalanced} 
              className="bg-[#6200EE] hover:bg-[#5000C7] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-purple-200 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} {existingJournalId ? 'Perbarui Saldo' : 'Simpan Saldo'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-blue-50 border border-blue-100 p-5 rounded-3xl flex gap-4">
            <Info className="text-blue-500 shrink-0" size={24} />
            <div className="text-xs text-blue-800 font-medium leading-relaxed">
              <p className="mb-2">Saldo awal adalah angka pembuka saat Anda mulai menggunakan sistem.</p>
              <p><strong>PENTING:</strong> Total akun Aset + Beban harus sama dengan total Modal + Hutang + Pendapatan agar seimbang.</p>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Nama Akun</th>
                  <th className="px-8 py-5 text-left font-black text-slate-400 uppercase text-[10px] tracking-widest">Tipe Kelompok</th>
                  <th className="px-8 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest w-64">Nilai Saldo (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {accounts.map(acc => {
                  const isDebit = acc.type === 'aset' || acc.type === 'beban';
                  return (
                    <tr key={acc.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-4 font-bold text-slate-700">{acc.name}</td>
                      <td className="px-8 py-4">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${isDebit ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-8 py-3">
                        <input 
                          type="number" 
                          className={`w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-right font-black outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-[#6200EE] transition-all ${balances[acc.id] > 0 ? 'text-[#6200EE]' : 'text-slate-300'}`}
                          placeholder="0" 
                          value={balances[acc.id] || ''} 
                          onChange={e => setBalances({...balances, [acc.id]: Number(e.target.value)})}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
