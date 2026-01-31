
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Plus, Trash2, Loader2, Save, AlertCircle } from 'lucide-react';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/accounting';
import { useNavigate } from 'react-router-dom';

export default function JournalEntry() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [header, setHeader] = useState({ date: new Date().toISOString().split('T')[0], description: '' });
  const [rows, setRows] = useState([{ account_id: '', debit: 0, credit: 0 }]);

  useEffect(() => {
    supabase.from('accounts').select('*').then(({ data }) => {
      setAccounts(data || []);
      setLoading(false);
    });
  }, []);

  const totalDebit = rows.reduce((s, r) => s + (Number(r.debit) || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + (Number(r.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const addRow = () => setRows([...rows, { account_id: '', debit: 0, credit: 0 }]);
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  const updateRow = (idx: number, field: string, val: any) => {
    const newRows = [...rows];
    (newRows[idx] as any)[field] = val;
    if (field === 'debit' && Number(val) > 0) newRows[idx].credit = 0;
    if (field === 'credit' && Number(val) > 0) newRows[idx].debit = 0;
    setRows(newRows);
  };

  const handleSave = async () => {
    if (!isBalanced) return notify('Jurnal tidak seimbang!', 'error');
    if (!header.description) return notify('Keterangan wajib diisi', 'error');
    
    setSubmitting(true);
    try {
      const { data: journal, error: jErr } = await supabase.from('journals').insert([{
        user_id: user.id,
        date: header.date,
        description: header.description,
        source: 'Manual'
      }]).select().single();
      
      if (jErr) throw jErr;

      const items = rows.filter(r => r.account_id).map(r => ({
        journal_id: journal.id,
        account_id: r.account_id,
        debit: r.debit,
        credit: r.credit
      }));

      const { error: iErr } = await supabase.from('journal_items').insert(items);
      if (iErr) throw iErr;

      notify('Jurnal berhasil disimpan', 'success');
      navigate('/journal');
    } catch (err) {
      notify('Gagal menyimpan jurnal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Entri Jurnal Umum</h1>
            <p className="text-slate-500 text-sm">Pencatatan transaksi manual Double-Entry</p>
          </div>
          <button 
            onClick={handleSave} 
            disabled={!isBalanced || submitting}
            className="bg-[#6200EE] text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 hover:bg-[#5000C7] transition-all"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            Simpan Jurnal
          </button>
        </header>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-slate-50 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal</label>
              <input 
                type="date" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none"
                value={header.date} onChange={e => setHeader({...header, date: e.target.value})}
              />
            </div>
            <div className="flex-[3] min-w-[300px]">
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Deskripsi</label>
              <input 
                type="text" placeholder="Keterangan transaksi"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none"
                value={header.description} onChange={e => setHeader({...header, description: e.target.value})}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-slate-500 font-bold uppercase text-[10px]">Akun</th>
                  <th className="px-4 py-3 text-right text-slate-500 font-bold uppercase text-[10px] w-40">Debit</th>
                  <th className="px-4 py-3 text-right text-slate-500 font-bold uppercase text-[10px] w-40">Kredit</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <select 
                        className="w-full bg-transparent border-none outline-none p-2 font-semibold text-slate-700"
                        value={row.account_id} onChange={e => updateRow(idx, 'account_id', e.target.value)}
                      >
                        <option value="">Pilih Akun...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" className="w-full bg-transparent border-none text-right outline-none p-2 font-bold text-emerald-600"
                        placeholder="0" value={row.debit || ''} onChange={e => updateRow(idx, 'debit', e.target.value)}
                      />
                    </td>
                    <td className="p-2">
                      <input 
                        type="number" className="w-full bg-transparent border-none text-right outline-none p-2 font-bold text-rose-600"
                        placeholder="0" value={row.credit || ''} onChange={e => updateRow(idx, 'credit', e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button onClick={() => removeRow(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 flex justify-between items-center">
            <button onClick={addRow} className="text-[#6200EE] font-bold text-sm hover:underline">+ Tambah Baris</button>
            {!isBalanced && totalDebit > 0 && (
              <div className="text-rose-500 text-xs font-bold flex items-center gap-1">
                <AlertCircle size={14} /> Selisih: {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </div>
            )}
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
