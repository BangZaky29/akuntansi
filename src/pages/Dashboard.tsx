
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
    AlertTriangle
  } from 'lucide-react';
  import { supabase } from '../lib/supabase';
  import { useSettings } from '../contexts/SettingsContext';
  import type { JournalItem, DashboardStats, JournalWithItems } from '../types';
  import { getDashboardStats, calculateBalanceSheet } from '../utils/accounting';
  import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
  } from 'recharts';
  import { 
    calculateMonthlyTrends, 
    getExpenseBreakdown, 
    calculateFinancialRatios,
    type MonthlyTrend,
    type ExpenseCategory,
    type FinancialRatios
  } from '../utils/analytics';
  import { useNotify } from '../contexts/NotificationContext';
  import { useNavigate } from 'react-router-dom';

  export default function Dashboard() {
    const { notify } = useNotify();
    const { currency, fmtCurrency, t, language } = useSettings();
    const navigate = useNavigate();
    
    const [stats, setStats] = useState<DashboardStats>({ kas: 0, piutang: 0, hutang: 0, modal: 0, laba: 0 });
    const [isUnbalanced, setIsUnbalanced] = useState(false);
    const [, setRecentJournals] = useState<JournalWithItems[]>([]);
    const [, setTrends] = useState<MonthlyTrend[]>([]);
    const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
    const [ratios, setRatios] = useState<FinancialRatios | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartReady, setChartReady] = useState(false);
    const [activeChart, setActiveChart] = useState<'balance' | 'trend'>('balance');

    useEffect(() => {
      fetchData();
      const timer = setTimeout(() => setChartReady(true), 1200);
      return () => clearTimeout(timer);
    }, []);

    const fetchData = async () => {
      setRefreshing(true);
      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('journal_items')
          .select(`
            *,
            account:accounts(*),
            journal:journals(*)
          `);

        if (itemsError) throw itemsError;

        const typedItems = (itemsData || []) as unknown as JournalItem[];
        
        const calculatedStats = getDashboardStats(typedItems);
        const { aset, kewajiban, modal } = calculateBalanceSheet(typedItems);
        
        // Peringatan jika Aset != Kewajiban + Modal + Laba
        // Dalam akuntansi double-entry, aset - (kewajiban + modal) harus 0
        const balanceDiff = Math.abs(aset - (kewajiban + modal));
        setIsUnbalanced(balanceDiff > 1);

        setStats(calculatedStats);
        setTrends(calculateMonthlyTrends(typedItems));
        setExpenses(getExpenseBreakdown(typedItems));
        
        const finRatios = calculateFinancialRatios(calculatedStats, typedItems);
        const statusMap: Record<string, string> = {
          'Sehat': t.status_sehat,
          'Waspada': t.status_waspada,
          'Kritis': t.status_kritis
        };
        
        finRatios.status = statusMap[finRatios.status] || finRatios.status;
        setRatios(finRatios);

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
                  
                  <div className="w-full h-[320px] min-h-[320px] relative">
                    {!chartReady ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="animate-spin text-blue-500" size={32} />
                      </div>
                    ) : activeChart === 'balance' ? (
                      hasChartData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 800}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(v) => v === 0 ? '0' : (v / 1000) + 'k'} />
                            <Tooltip 
                              cursor={{fill: '#f8fafc'}} 
                              contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)'}} 
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
                      <div className="h-full flex items-center justify-center text-slate-300 uppercase text-[10px] font-black">{t.dash_trend} feature soon</div>
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
            </div>
          )}
        </main>
        <MobileNav />
      </div>
    );
  }
