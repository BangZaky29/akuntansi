
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSettings } from '../../contexts/SettingsContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, BookOpen, Printer } from 'lucide-react';
import type { JournalItem, Account } from '../../types';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import CustomSelect from '../../components/CustomSelect';
import { useAuth } from '../../contexts/AuthContext';
import { useReportPrint } from '../../hooks/useReportPrint';
import ReportSignatureModal from '../../components/ReportSignatureModal';

export default function Ledger() {
  const { user } = useAuth();
  const { fmtCurrency, fmtDate, currency } = useSettings();
  const [items, setItems] = useState<JournalItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const { isModalOpen, setIsModalOpen, handlePrintRequest, confirmPrint, skipSignature } = useReportPrint();

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [accRes, itemRes] = await Promise.all([
        supabase.from('accounts').select('*').order('name'),
        supabase.from('journal_items').select('*, account:accounts(*), journal:journals(*)').order('journal(date)', { ascending: true })
      ]);
      setAccounts(accRes.data || []);
      setItems(itemRes.data as any || []);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedAccount === 'all'
    ? items
    : items.filter(i => i.account_id === selectedAccount);

  let runningBalance = 0;

  const handlePrint = () => {
    let printBalance = 0;
    const tableData = filteredItems.map((item: JournalItem) => {
      const debit = Number(item.debit) || 0;
      const credit = Number(item.credit) || 0;
      const isDebitNormal = item.account?.type === 'aset' || item.account?.type === 'beban';

      if (isDebitNormal) {
        printBalance += (debit - credit);
      } else {
        printBalance += (credit - debit);
      }

      return [
        fmtDate((item as any).journal?.date),
        (item as any).journal?.description || 'Mutasi Jurnal',
        item.account?.name || '-',
        debit > 0 ? fmtCurrency(debit) : '-',
        credit > 0 ? fmtCurrency(credit) : '-',
        fmtCurrency(printBalance)
      ];
    });

    const accountName = selectedAccount === 'all'
      ? 'Semua Akun'
      : accounts.find(a => a.id === selectedAccount)?.name || 'Buku Besar';

    handlePrintRequest({
      title: `Buku Besar - ${accountName}`,
      period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      fileName: `buku_besar_${accountName.toLowerCase().replace(/\s+/g, '_')}`,
      columns: ['Tanggal', 'Deskripsi', 'Akun', 'Debit', 'Kredit', 'Saldo'],
      data: tableData,
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buku Besar</h1>
            <p className="text-slate-500 text-sm font-medium">Rincian mutasi kronologis per akun ({currency})</p>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={filteredItems.length === 0}
              className="flex items-center justify-center gap-2 bg-[#6200EE] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100 h-[42px]"
            >
              <Printer size={18} />
              Cetak
            </button>
            <CopyToClipboardButton
              label="Copy"
              title={`Buku Besar - ${selectedAccount === 'all' ? 'Semua Akun' : accounts.find(a => a.id === selectedAccount)?.name}`}
              headers={['Tanggal', 'Deskripsi', 'Akun', 'Debit', 'Kredit', 'Saldo']}
              data={(() => {
                let rb = 0;
                return filteredItems.map((item: any) => {
                  const d = Number(item.debit) || 0;
                  const c = Number(item.credit) || 0;
                  const isDebitNormal = item.account?.type === 'aset' || item.account?.type === 'beban';

                  if (isDebitNormal) {
                    rb += (d - c);
                  } else {
                    rb += (c - d);
                  }

                  return [
                    fmtDate(item.journal?.date),
                    item.journal?.description || 'Mutasi',
                    item.account?.name || '-',
                    d > 0 ? fmtCurrency(d) : '-',
                    c > 0 ? fmtCurrency(c) : '-',
                    fmtCurrency(rb)
                  ];
                });
              })()}
            />
            <CustomSelect
              options={[
                { id: 'all', name: 'SEMUA AKUN' },
                ...accounts.map(acc => ({ id: acc.id, name: acc.name.toUpperCase() }))
              ]}
              value={selectedAccount}
              onChange={setSelectedAccount}
              placeholder="PILIH AKUN (WAJIB)"
              className="min-w-[280px]"
            />
          </div>
        </header>

        {selectedAccount === '' ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border border-slate-200 border-dashed">
            <BookOpen size={64} className="text-slate-200 mb-6" />
            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest text-center">Buku Besar Per Akun</h3>
            <p className="text-slate-400 text-sm font-medium mt-2">Silakan pilih akun untuk melihat rincian mutasi</p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-200">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Memuat Transaksi...</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">Tanggal</th>
                    <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-left">Keterangan</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Debit</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest">Kredit</th>
                    <th className="px-6 py-5 text-right font-black text-slate-400 uppercase text-[10px] tracking-widest bg-slate-50/80">Saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredItems.length > 0 ? filteredItems.map((item: JournalItem, idx) => {
                    const debit = Number(item.debit) || 0;
                    const credit = Number(item.credit) || 0;
                    // FIX: Strict Normal Balance Logic
                    // Aset/Beban: Tambah di Debit, Kurang di Kredit
                    // Kewajiban/Modal/Pendapatan: Tambah di Kredit, Kurang di Debit
                    const isDebitNormal = item.account?.type === 'aset' || item.account?.type === 'beban';

                    if (isDebitNormal) {
                      runningBalance += (debit - credit);
                    } else {
                      runningBalance += (credit - debit);
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap font-bold text-xs">{fmtDate((item as any).journal?.date)}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 leading-tight">{(item as any).journal?.description || 'Mutasi Jurnal'}</p>
                          {selectedAccount === 'all' && (
                            <p className="text-[9px] text-[#6200EE] font-black uppercase mt-1 tracking-tighter bg-purple-50 inline-block px-1.5 py-0.5 rounded-md">
                              {item.account?.name}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{debit > 0 ? fmtCurrency(debit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-black text-rose-600">{credit > 0 ? fmtCurrency(credit) : '-'}</td>
                        <td className="px-6 py-4 text-right font-black text-slate-900 bg-slate-50/30">{fmtCurrency(runningBalance)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <BookOpen size={48} className="mb-4" />
                          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Belum ada mutasi akun ini.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
        }
      </main >
      <MobileNav />
      <ReportSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmPrint}
        onSkip={skipSignature}
      />
    </div >
  );
}
