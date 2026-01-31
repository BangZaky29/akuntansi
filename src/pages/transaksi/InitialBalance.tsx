
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Save, Info } from 'lucide-react';
import type { Account } from '../../types';

export default function InitialBalance() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('accounts').select('*').order('name').then(({ data }) => {
      setAccounts(data || []);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    const totalDebit = accounts.filter(a => a.type === 'aset' || a.type === 'beban').reduce((s, a) => s + (balances[a.id] || 0), 0);
    const totalCredit = accounts.filter(a => a.type !== 'aset' && a.type !== 'beban').reduce((s, a) => s + (balances[a.id] || 0), 0);
    
    if (totalDebit !== totalCredit) {
      return notify('Saldo Awal harus seimbang (Debit = Kredit)!', 'error');
    }

    setSaving(true);
    try {
      const { data: journal, error: jErr } = await supabase.from('journals').insert([{
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        description: 'Saldo Awal Pembukuan',
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
      }).filter(i => i.debit > 0 || i.credit > 0);

      const { error: iErr } = await supabase.from('journal_items').insert(items);
      if (iErr) throw iErr;

      notify('Saldo awal berhasil disimpan', 'success');
    } catch (err) {
      notify('Gagal menyimpan saldo awal', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-4xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Saldo Awal</h1>
            <p className="text-slate-500 text-sm">Input posisi keuangan awal usaha Anda</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="bg-[#6200EE] text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Simpan Saldo
          </button>
        </header>

        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 mb-6">
          <Info className="text-blue-500 shrink-0" size={20} />
          <p className="text-xs text-blue-800 leading-relaxed">
            Saldo awal adalah angka pembuka saat Anda pertama kali menggunakan sistem ini.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-slate-500 uppercase text-[10px]">Nama Akun</th>
                <th className="px-6 py-4 text-right text-slate-500 uppercase text-[10px] w-48">Nilai Saldo (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td className="px-6 py-4 font-semibold text-slate-700">{acc.name}</td>
                  <td className="px-6 py-3">
                    <input 
                      type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-right font-bold outline-none"
                      placeholder="0" value={balances[acc.id] || ''} onChange={e => setBalances({...balances, [acc.id]: Number(e.target.value)})}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
