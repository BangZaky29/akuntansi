
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import StatCard from '../components/StatCard';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  TrendingUp,
  Plus,
  Loader2,
  CalendarDays,
  Activity,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Clock,
  ArrowRight,
  Banknote,
  FileWarning
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
// calculateBalanceSheet removed
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import type { DashboardStats, DashboardStatsRPCResponse, JournalWithItems, CashFlowForecast, OverdueItem } from '../types';
import {
  type MonthlyTrend,
  type ExpenseCategory,
  type FinancialRatios
} from '../utils/analytics';
import { useNotify } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { notify } = useNotify();
  const { currency, fmtCurrency, t, language } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats>({ kas: 0, piutang: 0, hutang: 0, modal: 0, laba: 0 });
  const [isUnbalanced, setIsUnbalanced] = useState(false);
  const [recentJournals, setRecentJournals] = useState<JournalWithItems[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowForecast[]>([]);
  const [overdueItems, setOverdueItems] = useState<OverdueItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [activeChart, setActiveChart] = useState<'balance' | 'trend'>('balance');

  useEffect(() => {
    if (user) {
      fetchData();
      setChartReady(true);
    }
  }, [user]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', {
        p_user_id: user?.id
      });

      if (statsError) throw statsError;

      // Type assertion and Mapping
      const rpcStats = statsData as unknown as DashboardStatsRPCResponse;

      const mappedStats: DashboardStats = {
        kas: Number(rpcStats.cash_balance) || 0,
        piutang: Number(rpcStats.receivable) || 0,
        hutang: Number(rpcStats.payable) || 0,
        laba: Number(rpcStats.profit) || 0,
        modal: Number(rpcStats.equity) || 0
      };

      // ... (Trends, Expenses, CashFlow, Overdue mapping remain same) ...
      const { data: trendsData } = await supabase.rpc('get_monthly_trends', { p_user_id: user?.id });
      const mappedTrends: MonthlyTrend[] = Array.isArray(trendsData) ? trendsData.map((t: any) => ({
        month: t.month || t.period,
        pendapatan: Number(t.income || t.pendapatan || 0),
        beban: Number(t.expense || t.beban || 0)
      })) : [];

      // ... (Expenses, CashFlow, Overdue mapping remain same) ...
      const { data: expensesData } = await supabase.rpc('get_expense_breakdown', { p_user_id: user?.id });
      const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];
      const mappedExpenses: ExpenseCategory[] = Array.isArray(expensesData) ? expensesData.map((e: any, idx: number) => ({
        name: e.category || e.name || 'Lainnya',
        value: Number(e.amount || e.value || 0),
        color: colors[idx % colors.length]
      })) : [];

      const { data: cashFlowData } = await supabase.rpc('get_cash_flow_forecast', { p_user_id: user?.id });
      const mappedCashFlow: CashFlowForecast[] = Array.isArray(cashFlowData) ? cashFlowData.map((c: any) => ({
        month: c.month,
        invoice_in: Number(c.cash_in || c.invoice_in || 0),
        invoice_out: Number(c.cash_out || c.invoice_out || 0)
      })) : [];

      const { data: overdueData } = await supabase.rpc('get_overdue_items', { p_user_id: user?.id });
      const mappedOverdue: OverdueItem[] = Array.isArray(overdueData) ? overdueData.map((o: any) => ({
        id: o.id,
        type: o.type,
        amount: Number(o.amount || 0),
        due_date: o.due_date,
        description: o.description,
        journal_id: o.journal_id
      })) : [];

      setStats(mappedStats);
      setTrends(mappedTrends);
      setExpenses(mappedExpenses);
      setCashFlow(mappedCashFlow);
      setOverdueItems(mappedOverdue);

      // Balance Check
      // Asset (Kas + Piutang) = Pasiva (Hutang + Modal + Laba)
      const estimatedAset = mappedStats.kas + mappedStats.piutang;
      const estimatedPasiva = mappedStats.hutang + mappedStats.modal + mappedStats.laba;
      const balanceDiff = Math.abs(estimatedAset - estimatedPasiva);

      // Allow small float error margin
      setIsUnbalanced(balanceDiff > 100);

      // Financial Ratios
      const currentRatio = mappedStats.hutang === 0 ? 100 : ((mappedStats.kas + mappedStats.piutang) / mappedStats.hutang);
      const debtEqRatio = mappedStats.modal === 0 ? 0 : (mappedStats.hutang / mappedStats.modal);

      let status = 'Sehat';
      let color = 'text-emerald-500';

      if (currentRatio < 1 || debtEqRatio > 2) {
        status = 'Kritis';
        color = 'text-rose-500';
      } else if (currentRatio < 1.5 || debtEqRatio > 1) {
        status = 'Waspada';
        color = 'text-amber-500';
      }

      const statusMap: Record<string, string> = {
        'Sehat': t.status_sehat,
        'Waspada': t.status_waspada,
        'Kritis': t.status_kritis
      };

      setRatios({
        liquidity: currentRatio,
        debtToEquity: debtEqRatio,
        netProfitMargin: 0,
        status: statusMap[status] || status,
        color
      });

      const { data: journalsData } = await supabase
        .from('journals')
        .select(`*, journal_items(*)`)
        .order('date', { ascending: false })
        .limit(5);

      setRecentJournals(journalsData as unknown as JournalWithItems[] || []);
    } catch (err: any) {
      notify('Gagal memuat data: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const chartData = [
    { name: t.dash_kas, value: stats.kas, color: '#6366f1' },
    { name: t.dash_piutang, value: stats.piutang, color: '#10b981' },
    { name: t.dash_hutang, value: stats.hutang, color: '#f43f5e' },
    { name: t.dash_laba, value: stats.laba, color: '#f59e0b' },
  ];

  const hasChartData = chartData.some(d => Math.abs(d.value) > 0);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 w-full flex flex-col min-h-screen md:pb-6 pb-24">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#6200EE] rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <Activity size={20} />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none mb-1">{t.dash_analytic} {currency}</h1>
              <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <CalendarDays size={10} /> {new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#6200EE] transition-all disabled:opacity-50"
            >
              <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => navigate('/journal-entry')} className="bg-[#6200EE] hover:bg-[#5000C7] text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100">
              <Plus size={18} />
              <span className="text-sm font-bold">{t.nav_journal_entry.split(' ')[0]}</span>
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-[#6200EE]" size={40} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.dash_calc_balance}</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
              <StatCard title={t.dash_kas} value={stats.kas} icon={Wallet} color="bg-indigo-600" />
              <StatCard title={t.dash_piutang} value={stats.piutang} icon={ArrowUpRight} color="bg-emerald-600" />
              <StatCard title={t.dash_hutang} value={stats.hutang} icon={ArrowDownLeft} color="bg-rose-600" />
              <StatCard title={t.dash_modal} value={stats.modal} icon={CreditCard} color="bg-slate-800" />
              <div className="col-span-2 lg:col-span-1">
                <StatCard title={t.dash_laba} value={stats.laba} icon={TrendingUp} color="bg-amber-600" />
              </div>
            </div>

            {isUnbalanced && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-rose-50 border border-rose-200 p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-widest mb-1">{t.dash_warning_balance}</h4>
                  <p className="text-[10px] text-rose-700 font-bold leading-tight">
                    Ditemukan ketidaksamaan antara Total Aset dan Pasiva. Periksa Jurnal Umum atau input Saldo Awal Anda kembali.
                  </p>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">{t.dash_performance}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.dash_realtime_viz}</p>
                  </div>
                  <div className="flex bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => setActiveChart('balance')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${activeChart === 'balance' ? 'bg-white shadow-sm text-[#6200EE]' : 'text-slate-400'}`}>{t.dash_composition}</button>
                    <button onClick={() => setActiveChart('trend')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${activeChart === 'trend' ? 'bg-white shadow-sm text-[#6200EE]' : 'text-slate-400'}`}>{t.dash_trend}</button>
                  </div>
                </div>

                <div className="w-full h-[320px] min-h-[320px] relative overflow-hidden">
                  {!chartReady ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="animate-spin text-blue-500" size={32} />
                    </div>
                  ) : activeChart === 'balance' ? (
                    hasChartData ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v) => v === 0 ? '0' : (v / 1000) + 'k'} />
                          <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}
                            formatter={(v: any) => fmtCurrency(v)}
                          />
                          <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4">
                        <Activity size={40} className="opacity-20" />
                        <p className="uppercase text-[10px] font-black">{t.dash_no_data}</p>
                      </div>
                    )
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v) => v === 0 ? '0' : (v / 1000) + 'k'} />
                        <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}
                          formatter={(value: number | string | undefined) => fmtCurrency(Number(value) || 0)}
                        />
                        <Area type="monotone" dataKey="pendapatan" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" name={t.nav_income || "Pendapatan"} />
                        <Area type="monotone" dataKey="beban" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" name={t.nav_expense || "Beban"} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              <div className="space-y-6">
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                  <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2"><ShieldCheck size={20} className="text-[#6200EE]" /> {t.dash_health}</h3>
                  {ratios ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{t.dash_status_global}</span>
                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-white shadow-sm ${ratios.color}`}>{ratios.status}</span>
                      </div>
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{t.dash_net_asset}</p>
                        <p className="text-lg font-black text-indigo-700">{fmtCurrency(stats.kas + stats.piutang)}</p>
                      </div>
                    </div>
                  ) : <div className="h-24 animate-pulse bg-slate-50 rounded-2xl"></div>}
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1">
                  <h3 className="font-black text-slate-800 text-base mb-5 flex items-center gap-2"><TrendingDown size={20} className="text-rose-500" /> {t.dash_ops_expense}</h3>
                  <div className="space-y-4">
                    {expenses.length > 0 ? expenses.map((exp, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase">
                          <span className="text-slate-500 truncate pr-2">{exp.name}</span>
                          <span className="text-slate-900">{fmtCurrency(exp.value)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (exp.value / (Math.abs(stats.laba) || 1)) * 100)}%` }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: exp.color }}
                          />
                        </div>
                      </div>
                    )) : <div className="py-8 text-center text-slate-300 text-[10px] font-black uppercase">{t.dash_no_data}</div>}
                  </div>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Cash Flow Forecast */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 text-lg tracking-tight mb-6 flex items-center gap-2">
                  <Banknote size={20} className="text-emerald-500" />
                  Estimasi Arus Kas (6 Bulan)
                </h3>
                <div className="h-[300px] min-h-[300px] w-full relative">
                  {!chartReady ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="animate-spin text-emerald-500" size={32} />
                    </div>
                  ) : cashFlow.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={(v) => (v / 1000) + 'k'} />
                        <Tooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                          formatter={(v: number | string | undefined) => fmtCurrency(Number(v) || 0)}
                        />
                        <Bar dataKey="invoice_in" name="Masuk" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar dataKey="invoice_out" name="Keluar" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
                      Belum ada estimasi
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Overdue Items */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 text-lg tracking-tight mb-6 flex items-center gap-2">
                  <FileWarning size={20} className="text-amber-500" />
                  Tagihan Jatuh Tempo
                </h3>
                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                  {overdueItems.length > 0 ? overdueItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${item.type === 'receivable' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {item.type === 'receivable' ? 'Piutang' : 'Hutang'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">Due: {new Date(item.due_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700 line-clamp-1">{item.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-800">{fmtCurrency(item.amount)}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="py-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
                      Tidak ada tagihan jatuh tempo
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Recent Transactions Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm mt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-slate-800 text-lg tracking-tight flex items-center gap-2">
                  <Clock size={20} className="text-[#6200EE]" />
                  {t.nav_journal_entry || "Riwayat Transaksi Terakhir"}
                </h3>
                <button onClick={() => navigate('/journal')} className="text-xs font-bold text-[#6200EE] flex items-center gap-1 hover:gap-2 transition-all">
                  Lihat Semua <ArrowRight size={14} />
                </button>
              </div>

              <div className="space-y-4">
                {recentJournals.length > 0 ? recentJournals.map((journal) => {
                  // Hitung total dari Debit saja (asumsi jurnal seimbang)
                  const totalAmount = journal.journal_items?.reduce((sum, item) => sum + (Number(item.debit) || 0), 0) || 0;

                  return (
                    <div key={journal.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl transition-colors gap-3 border border-slate-100">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-200 shrink-0">
                          <span className="font-black text-xs">{new Date(journal.date).getDate()}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{journal.description || "Tanpa Keterangan"}</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            {journal.source || "General"} • {new Date(journal.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right pl-14 md:pl-0">
                        <p className="font-black text-slate-700">{fmtCurrency(totalAmount)}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{journal.journal_items?.length || 0} items</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center">
                    <p className="text-slate-300 font-black text-xs uppercase tracking-widest">{t.dash_no_data}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div >
        )}
      </main >
      <MobileNav />
    </div >
  );
}