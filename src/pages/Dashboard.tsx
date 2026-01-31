
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
  ArrowRight,
  BookOpen,
  FileDown,
  Loader2,
  CalendarDays,
  Activity,
  ShieldCheck,
  TrendingDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { JournalItem, DashboardStats, JournalWithItems } from '../types';
import { getDashboardStats, formatCurrency } from '../utils/accounting';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area, PieChart, Pie
} from 'recharts';
import { exportChartToPDF } from '../utils/handlerPDF';
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
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<DashboardStats>({ kas: 0, piutang: 0, hutang: 0, modal: 0, laba: 0 });
  const [recentJournals, setRecentJournals] = useState<JournalWithItems[]>([]);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);
  const [expenses, setExpenses] = useState<ExpenseCategory[]>([]);
  const [ratios, setRatios] = useState<FinancialRatios | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [activeChart, setActiveChart] = useState<'balance' | 'trend'>('balance');

  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setChartReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('journal_items')
        .select(`*, account:accounts(*), journal:journals(*)`);

      if (itemsError) throw itemsError;

      const typedItems = itemsData as unknown as JournalItem[];
      
      if (typedItems) {
        const calculatedStats = getDashboardStats(typedItems);
        setStats(calculatedStats);
        setTrends(calculateMonthlyTrends(typedItems));
        setExpenses(getExpenseBreakdown(typedItems));
        setRatios(calculateFinancialRatios(calculatedStats, typedItems));
      }

      const { data: journalsData } = await supabase
        .from('journals')
        .select(`*, journal_items(*)`)
        .order('date', { ascending: false })
        .limit(5);

      setRecentJournals(journalsData as unknown as JournalWithItems[] || []);
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
      notify('Gagal memuat analitik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const chartData = [
    { name: 'Kas', value: stats.kas, color: '#6366f1' },
    { name: 'Piutang', value: stats.piutang, color: '#10b981' },
    { name: 'Hutang', value: stats.hutang, color: '#f43f5e' },
    { name: 'Laba', value: stats.laba, color: '#f59e0b' },
  ];

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
               <h1 className="text-lg md:text-xl font-black text-slate-800 tracking-tight leading-none mb-1">Analitik Keuangan</h1>
               <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                 <CalendarDays size={10} /> {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
               </p>
             </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => exportChartToPDF(stats, 'Analisis Performa Bisnis')}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <FileDown size={16} /> PDF
            </button>
            <button onClick={() => navigate('/journal-entry')} className="bg-[#6200EE] hover:bg-[#5000C7] text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-100">
              <Plus size={18} />
              <span className="text-sm font-bold">Jurnal</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-5">
            <StatCard title="Kas & Bank" value={stats.kas} icon={Wallet} color="bg-indigo-600" />
            <StatCard title="Piutang" value={stats.piutang} icon={ArrowUpRight} color="bg-emerald-600" />
            <StatCard title="Hutang" value={stats.hutang} icon={ArrowDownLeft} color="bg-rose-600" />
            <StatCard title="Modal" value={stats.modal} icon={CreditCard} color="bg-slate-800" />
            <div className="col-span-2 lg:col-span-1">
              <StatCard title="Laba/Rugi" value={stats.laba} icon={TrendingUp} color="bg-amber-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Analytics */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[40px] border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">Performa Akun Utama</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Visualisasi saldo real-time</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  <button 
                    onClick={() => setActiveChart('balance')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${activeChart === 'balance' ? 'bg-white shadow-sm text-[#6200EE]' : 'text-slate-400'}`}
                  >KOMPOSISI</button>
                  <button 
                    onClick={() => setActiveChart('trend')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest transition-all ${activeChart === 'trend' ? 'bg-white shadow-sm text-[#6200EE]' : 'text-slate-400'}`}
                  >TREN 6BLN</button>
                </div>
              </div>
              
              <div className="h-[320px] w-full">
                {(!chartReady || loading) ? (
                  <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {activeChart === 'balance' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 800}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(v) => v === 0 ? '0' : (v / 1000000) + 'M'} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} formatter={(v: any) => formatCurrency(v)} />
                        <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (
                      <AreaChart data={trends} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <defs>
                          <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 800}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 9}} tickFormatter={(v) => v === 0 ? '0' : (v / 1000000) + 'M'} />
                        <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="pendapatan" stroke="#6366f1" fillOpacity={1} fill="url(#colorInc)" strokeWidth={3} />
                        <Area type="monotone" dataKey="beban" stroke="#f43f5e" fillOpacity={1} fill="url(#colorExp)" strokeWidth={3} />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>

            {/* Side Analytics */}
            <div className="space-y-6">
              {/* Financial Health */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-[#6200EE]" /> Kesehatan Bisnis
                </h3>
                {ratios ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Status Umum</span>
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-white shadow-sm ${ratios.color}`}>
                        {ratios.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/30">
                        <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Likuiditas</p>
                        <p className="text-lg font-black text-indigo-700">{ratios.liquidity.toFixed(2)}x</p>
                      </div>
                      <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/30">
                        <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">Profit Margin</p>
                        <p className="text-lg font-black text-amber-700">{ratios.netProfitMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ) : <div className="h-24 animate-pulse bg-slate-50 rounded-2xl"></div>}
              </motion.div>

              {/* Expense Breakdown */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex-1">
                <h3 className="font-black text-slate-800 text-base mb-5 flex items-center gap-2">
                  <TrendingDown size={20} className="text-rose-500" /> Pengeluaran Terbesar
                </h3>
                <div className="space-y-4">
                  {expenses.length > 0 ? expenses.map((exp, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase">
                        <span className="text-slate-500 truncate pr-2">{exp.name}</span>
                        <span className="text-slate-900">{formatCurrency(exp.value)}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${Math.min(100, (exp.value / (stats.kas + stats.piutang || 1)) * 100)}%` }} 
                          className="h-full rounded-full" 
                          style={{ backgroundColor: exp.color }} 
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="py-8 text-center text-slate-300">
                      <p className="text-[10px] font-black uppercase tracking-widest">Belum ada biaya</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
