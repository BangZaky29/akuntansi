
import { useEffect, useState, useMemo } from 'react';
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
  X,
  User,
  AlertTriangle,
  Menu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLayout } from '../contexts/LayoutContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types';

export default function Sidebar() {
  const { signOut, user } = useAuth();
  const { t } = useSettings();
  const { isSidebarOpen, setIsSidebarOpen, isCollapsed, toggleCollapse } = useLayout();
  const location = useLocation();
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const cached = localStorage.getItem('user_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (user?.id) {
      supabase.from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setProfile(data);
            localStorage.setItem('user_profile', JSON.stringify(data));
          }
        });
    }
  }, [user]);

  const menuGroups = useMemo(() => [
    {
      title: t.nav_data,
      items: [
        { icon: Users, label: t.nav_contacts, path: '/contacts' },
        { icon: Table, label: t.nav_accounts, path: '/accounts' },
      ]
    },
    {
      title: t.nav_transaksi,
      items: [
        { icon: History, label: t.nav_initial_balance, path: '/initial-balance' },
        { icon: PlusSquare, label: t.nav_journal_entry, path: '/journal-entry' },
      ]
    },
    {
      title: t.nav_transaksi_khusus,
      items: [
        { icon: Briefcase, label: t.nav_capital, path: '/capital' },
        { icon: ArrowUpRight, label: t.nav_income, path: '/income' },
        { icon: ArrowDownLeft, label: t.nav_expense, path: '/expense' },
        { icon: FileText, label: t.nav_receivables, path: '/receivables' },
        { icon: TrendingDown, label: t.nav_payables, path: '/payables' },
      ]
    },
    {
      title: t.nav_laporan,
      items: [
        { icon: BookOpen, label: t.nav_journal, path: '/journal' },
        { icon: BookOpen, label: t.nav_ledger, path: '/ledger' },
        { icon: Table, label: t.nav_trial_balance, path: '/trial-balance' },
        { icon: PieChart, label: t.nav_profit_loss, path: '/reports?type=profit-loss' },
        { icon: LayoutDashboard, label: t.nav_balance_sheet, path: '/reports?type=balance-sheet' },
        { icon: Waves, label: t.nav_cash_flow, path: '/cash-flow' },
        { icon: BarChart3, label: t.nav_equity_change, path: '/equity-change' },
      ]
    }
  ], [t]);

  const SidebarContent = () => (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 288 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="flex flex-col bg-white border-r border-slate-200 h-full overflow-hidden select-none"
    >
      <div className={`p-4 bg-[#6200EE] text-white overflow-hidden transition-all duration-300 ${isCollapsed ? 'flex flex-col items-center gap-4' : ''}`}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-md shrink-0 border border-white/10 shadow-sm ${isCollapsed ? 'mx-auto' : ''}`}>
              <Building2 size={20} />
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  key="profile-info"
                  initial={false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="min-w-0 flex-1"
                >
                  <h2 className="font-bold text-sm leading-tight truncate">
                    {profile?.business_name || (
                      <div className="h-4 w-32 bg-white/20 rounded animate-pulse" />
                    )}
                  </h2>
                  <p className="text-[10px] text-white/70 uppercase tracking-widest truncate font-medium">
                    {profile?.city || (
                      <div className="h-3 w-20 bg-white/10 rounded animate-pulse mt-1" />
                    )}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              className="hidden md:flex text-white/60 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
              title="Collapse Sidebar"
            >
              <Menu size={20} />
            </button>
          )}

          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/80 p-1">
            <X size={20} />
          </button>
        </div>

        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            className="hidden md:flex text-white/60 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
            title="Expand Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide pb-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isCollapsed ? 'justify-center px-0' : 'mx-0'} ${isActive && location.pathname === '/dashboard'
              ? 'bg-[#6200EE]/10 text-[#6200EE] font-bold shadow-sm shadow-[#6200EE]/5'
              : 'text-slate-500 hover:bg-slate-50'
            }`
          }
        >
          <div className={`flex items-center justify-center ${isCollapsed ? 'w-10' : ''}`}>
            <LayoutDashboard size={isCollapsed ? 22 : 18} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm whitespace-nowrap"
              >
                {t.nav_dashboard}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>

        {menuGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!isCollapsed && (
              <motion.p
                initial={false}
                animate={{ opacity: 1 }}
                className="text-[10px] font-black text-slate-400 px-4 mb-2 tracking-widest uppercase"
              >
                {group.title}
              </motion.p>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname + location.search === item.path;
              return (
                <NavLink
                  key={item.label}
                  to={item.path}
                  title={isCollapsed ? item.label : ''}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group ${isCollapsed ? 'justify-center px-0' : ''} ${isActive
                    ? 'text-[#6200EE] font-black bg-[#6200EE]/5'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-bold'
                    }`}
                >
                  <div className={`flex items-center ${isCollapsed ? 'gap-0 w-10 justify-center' : 'gap-3'}`}>
                    <item.icon size={isCollapsed ? 21 : 18} className={isActive ? 'text-[#6200EE]' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={false}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="text-[13px] whitespace-nowrap"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {!isCollapsed && <ChevronRight size={12} className={isActive ? 'opacity-100' : 'opacity-0'} />}
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className={`p-4 border-t border-slate-100 bg-slate-50/50 space-y-1 ${isCollapsed ? 'px-0 flex flex-col items-center' : ''}`}>
        <NavLink
          to="/profile"
          title={isCollapsed ? t.nav_profile : ''}
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group font-bold ${isCollapsed ? 'justify-center px-0' : ''} ${isActive
              ? 'bg-[#6200EE]/10 text-[#6200EE]'
              : 'text-slate-600 hover:bg-slate-50'
            }`
          }
        >
          <div className={`flex items-center justify-center ${isCollapsed ? 'w-10' : ''}`}>
            <User size={isCollapsed ? 22 : 18} className={location.pathname === '/profile' ? 'text-[#6200EE]' : 'text-slate-400'} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm border-none whitespace-nowrap"
              >
                {t.nav_profile}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title={isCollapsed ? t.nav_logout : ''}
          className={`w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 rounded-xl transition-all group font-bold ${isCollapsed ? 'justify-center px-0' : ''}`}
        >
          <div className={`flex items-center justify-center ${isCollapsed ? 'w-10' : ''}`}>
            <LogOut size={isCollapsed ? 22 : 18} />
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-sm whitespace-nowrap"
              >
                {t.nav_logout}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
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

        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">{t.logout_warn_title}</h2>
              <p className="text-sm text-slate-500 font-medium mb-8">
                {t.logout_warn_msg}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => signOut()}
                  className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 uppercase tracking-widest text-[10px]"
                >
                  {t.btn_logout}
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full bg-slate-100 text-slate-600 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                >
                  {t.btn_cancel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
