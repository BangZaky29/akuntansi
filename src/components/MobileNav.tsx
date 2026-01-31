
import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, PieChart, User, Menu, X } from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';

export default function MobileNav() {
  const { toggleSidebar, isSidebarOpen } = useLayout();

  const navItems = [
    { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
    { icon: BookOpen, label: 'Jurnal', path: '/journal' },
    { icon: PieChart, label: 'Laporan', path: '/reports' },
    { icon: User, label: 'Profil', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around items-center md:hidden pb-safe px-2 h-16 z-[60] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
      {/* Tombol Menu Hamburger - Posisi di paling kiri sebelum Dashboard */}
      <button
        onClick={toggleSidebar}
        className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-90 ${
          isSidebarOpen ? 'text-[#6200EE]' : 'text-slate-400'
        }`}
      >
        <div className={`p-1 rounded-lg transition-colors ${isSidebarOpen ? 'bg-[#6200EE]/10' : ''}`}>
          {isSidebarOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
        </div>
        <span className="text-[9px] font-black uppercase tracking-tighter">Menu</span>
      </button>

      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `flex flex-col items-center justify-center gap-1 w-full h-full transition-all active:scale-95 ${
              isActive ? 'text-[#6200EE]' : 'text-slate-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-[#6200EE]/10' : ''}`}>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] uppercase tracking-tighter ${isActive ? 'font-black' : 'font-bold'}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
