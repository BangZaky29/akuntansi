
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  BookOpen, 
  PieChart, 
  LogOut, 
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  History,
  FileText,
  Briefcase,
  TrendingDown,
  ChevronRight,
  PlusSquare,
  Building2,
  Table,
  BarChart3,
  Waves,
  Loader2,
  X,
  User
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

const menuGroups = [
  {
    title: 'DATA',
    items: [
      { icon: Users, label: 'Kontak', path: '/contacts' },
      { icon: Table, label: 'Akun/Perkiraan', path: '/accounts' },
    ]
  },
  {
    title: 'TRANSAKSI',
    items: [
      { icon: History, label: 'Saldo Awal', path: '/initial-balance' },
      { icon: PlusSquare, label: 'Entri Jurnal', path: '/journal-entry' },
    ]
  },
  {
    title: 'TRANSAKSI KHUSUS',
    items: [
      { icon: Briefcase, label: 'Modal', path: '/capital' },
      { icon: ArrowUpRight, label: 'Penerimaan Kas', path: '/income' },
      { icon: ArrowDownLeft, label: 'Pengeluaran Kas', path: '/expense' },
      { icon: FileText, label: 'Piutang', path: '/receivables' },
      { icon: TrendingDown, label: 'Hutang', path: '/payables' },
    ]
  },
  {
    title: 'LAPORAN',
    items: [
      { icon: BookOpen, label: 'Jurnal', path: '/journal' },
      { icon: BookOpen, label: 'Buku Besar', path: '/ledger' },
      { icon: Table, label: 'Neraca Saldo', path: '/trial-balance' },
      { icon: PieChart, label: 'Laba/Rugi', path: '/reports?type=profit-loss' },
      { icon: LayoutDashboard, label: 'Neraca', path: '/reports?type=balance-sheet' },
      { icon: Waves, label: 'Arus Kas', path: '/cash-flow' },
      { icon: BarChart3, label: 'Perubahan Modal', path: '/equity-change' },
    ]
  }
];

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const { isSidebarOpen, setIsSidebarOpen } = useLayout();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      // Menggunakan maybeSingle untuk menghindari error jika profil tidak ada
      supabase.from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (data) setProfile(data);
          if (error) console.error("Error fetching profile:", error.message);
          setLoading(false);
        });
    }
  }, [user]);

  const SidebarContent = () => (
    <div className="flex flex-col w-72 bg-white border-r border-slate-200 h-full overflow-hidden">
      <div className="p-6 bg-[#6200EE] text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
              <Building2 size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-sm leading-tight truncate">
                {profile?.business_name || 'Bisnis Anda'}
              </h2>
              <p className="text-[10px] text-white/70 uppercase tracking-widest truncate">
                {profile?.city || 'Sistem Akuntansi'}
              </p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/80">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide pb-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => 
            `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
              isActive && location.pathname === '/dashboard'
              ? 'bg-[#6200EE]/10 text-[#6200EE] font-bold' 
              : 'text-slate-500 hover:bg-slate-50'
            }`
          }
        >
          <LayoutDashboard size={18} />
          <span className="text-sm">Dashboard Utama</span>
        </NavLink>

        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 px-4 mb-2 tracking-widest uppercase">{group.title}</p>
            {group.items.map((item) => {
              const isActive = location.pathname + location.search === item.path;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all group ${
                    isActive 
                    ? 'text-[#6200EE] font-black bg-[#6200EE]/5' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon size={16} className={isActive ? 'text-[#6200EE]' : 'text-slate-400'} />
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  <ChevronRight size={12} className={isActive ? 'opacity-100' : 'opacity-0'} />
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-1">
        <NavLink
          to="/profile"
          className={({ isActive }) => 
            `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group font-bold ${
              isActive 
              ? 'bg-[#6200EE]/10 text-[#6200EE]' 
              : 'text-slate-600 hover:bg-slate-50'
            }`
          }
        >
          <User size={18} className={location.pathname === '/profile' ? 'text-[#6200EE]' : 'text-slate-400'} />
          <span className="text-sm">Profil Pengguna</span>
        </NavLink>
        <button onClick={() => signOut()} className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all group font-bold">
          <LogOut size={18} />
          <span className="text-sm">Keluar Aplikasi</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex flex-col sticky top-0 h-screen z-40">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 z-[101] md:hidden shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
