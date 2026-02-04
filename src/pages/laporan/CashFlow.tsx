
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Loader2, Waves, ArrowUpCircle, ArrowDownCircle, Info, Printer } from 'lucide-react';
import { formatCurrency } from '../../utils/accounting';
import CopyToClipboardButton from '../../components/CopyToClipboardButton';
import { useReportPrint } from '../../hooks/useReportPrint';
import ReportSignatureModal from '../../components/ReportSignatureModal';

export default function CashFlow() {
  const { user } = useAuth(); // Add useAuth to get user_id
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isModalOpen, setIsModalOpen, handlePrintRequest, confirmPrint, skipSignature } = useReportPrint();

  useEffect(() => {
    if (user?.id) fetchCashFlow();
  }, [user?.id]);

  const fetchCashFlow = async () => {
    try {
      const { data, error } = await supabase.rpc('get_cash_flow_statement', {
        p_user_id: user?.id
      });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error fetching cash flow:', err);
    } finally {
      setLoading(false);
    }
  };

  const cashIn = items.reduce((s, i) => s + (Number(i.debit) || 0), 0);
  const cashOut = items.reduce((s, i) => s + (Number(i.credit) || 0), 0);
  const netCash = cashIn - cashOut;

  const handlePrint = () => {
    const tableData = items.map(item => [
      new Date(item.date).toLocaleDateString('id-ID'),
      item.description,
      item.category,
      item.debit > 0 ? formatCurrency(item.debit) : '-',
      item.credit > 0 ? formatCurrency(item.credit) : '-'
    ]);

    handlePrintRequest({
      title: 'Laporan Arus Kas',
      period: new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
      fileName: 'laporan_arus_kas',
      columns: ['Tanggal', 'Deskripsi', 'Kategori', 'Masuk', 'Keluar'],
      data: tableData,
      footer: [
        { label: 'Total Kas Masuk', value: formatCurrency(cashIn) },
        { label: 'Total Kas Keluar', value: formatCurrency(cashOut) },
        { label: 'Saldo Kas Bersih', value: formatCurrency(netCash) }
      ]
    });
  };

  const cashItems = items; // Alias for compatibility with render

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Laporan Arus Kas</h1>
            <p className="text-slate-500 text-sm">Pemantauan mutasi masuk dan keluar pada akun Kas/Bank secara real-time</p>
          </div>
          <button
            onClick={handlePrint}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-[#6200EE] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#5000C7] transition-all disabled:opacity-50 shadow-lg shadow-purple-100"
          >
            <Printer size={18} />
            Cetak Laporan
          </button>
          <CopyToClipboardButton
            label="Copy"
            title="Laporan Arus Kas"
            headers={['Tanggal', 'Deskripsi', 'Kategori', 'Masuk', 'Keluar']}
            data={items.map(item => [
              new Date(item.date).toLocaleDateString('id-ID'),
              item.description,
              item.category,
              item.debit > 0 ? formatCurrency(item.debit) : '-',
              item.credit > 0 ? formatCurrency(item.credit) : '-'
            ])}
          />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><ArrowUpCircle /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Kas Masuk</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(cashIn)}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl"><ArrowDownCircle /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Kas Keluar</p>
              <p className="text-xl font-bold text-rose-600">{formatCurrency(cashOut)}</p>
            </div>
          </div>
          <div className="bg-[#6200EE] p-6 rounded-3xl text-white shadow-xl shadow-purple-100 flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl"><Waves /></div>
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase">Saldo Kas Bersih</p>
              <p className="text-xl font-bold">{formatCurrency(netCash)}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b flex items-center gap-2">
              <Info size={16} className="text-slate-400" />
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rincian Aliran Dana</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-slate-500 uppercase text-[10px]">Tanggal</th>
                    <th className="px-6 py-4 text-left text-slate-500 uppercase text-[10px]">Aktivitas / Deskripsi</th>
                    <th className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Kas Masuk</th>
                    <th className="px-6 py-4 text-right text-slate-500 uppercase text-[10px]">Kas Keluar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cashItems.length > 0 ? cashItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{new Date(item.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700">
                        {item.description}
                        <span className="block text-[10px] text-slate-400 font-normal">{item.category} • {item.ref_number || '-'}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-emerald-600 font-bold">{item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
                      <td className="px-6 py-4 text-right text-rose-600 font-bold">{item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tidak ada mutasi kas ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
      <ReportSignatureModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={confirmPrint}
        onSkip={skipSignature}
      />
    </div>
  );
}
