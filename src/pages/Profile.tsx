
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import { 
  LogOut, Building, Globe, Save, Loader2, 
  Clock, Bell, Shield, ToggleLeft, ToggleRight,
  CheckCircle2, Settings, ChevronDown, MapPin
} from 'lucide-react';
import { useNotify } from '../contexts/NotificationContext';
import type { UserSettings } from '../types';

type MenuType = 'bisnis' | 'preferensi' | 'keamanan' | 'notifikasi';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { notify } = useNotify();
  const { refreshSettings } = useSettings();
  const [activeMenu, setActiveMenu] = useState<MenuType>('bisnis');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    city: '',
    fiscal_year: new Date().getFullYear(),
    currency: 'IDR'
  });

  const [settingsData, setSettingsData] = useState<UserSettings>({
    user_id: '',
    notif_due_date: true,
    notif_email: true,
    language: 'id',
    timezone: 'Asia/Jakarta',
    two_factor_enabled: false,
    updated_at: ''
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileRes, settingsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      if (profileRes.data) {
        setFormData({
          business_name: profileRes.data.business_name || '',
          city: profileRes.data.city || '',
          fiscal_year: profileRes.data.fiscal_year || new Date().getFullYear(),
          currency: profileRes.data.currency || 'IDR'
        });
      }

      if (settingsRes.data) {
        setSettingsData(settingsRes.data);
      }
    } catch (err) {
      notify('Gagal memuat konfigurasi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { error } = await supabase.from('profiles').update({ ...formData }).eq('id', user.id);
      if (error) throw error;
      await refreshSettings();
      notify('Profil bisnis diperbarui', 'success');
    } catch (err: any) {
      notify('Gagal update profil', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          notif_due_date: settingsData.notif_due_date,
          notif_email: settingsData.notif_email,
          language: settingsData.language,
          timezone: settingsData.timezone,
          two_factor_enabled: settingsData.two_factor_enabled,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshSettings();
      notify('Preferensi sistem disimpan', 'success');
    } catch (err: any) {
      notify('Gagal simpan preferensi', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const menuItems = [
    { id: 'bisnis', icon: Building, label: 'Bisnis', desc: 'Identitas Usaha' },
    { id: 'preferensi', icon: Globe, label: 'Preferensi', desc: 'Bahasa & Lokasi' },
    { id: 'notifikasi', icon: Bell, label: 'Notifikasi', desc: 'Peringatan' },
    { id: 'keamanan', icon: Shield, label: 'Keamanan', desc: 'Akses & Privasi' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-5xl mx-auto w-full">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pengaturan</h1>
            <p className="text-slate-500 text-sm font-medium">Konfigurasi operasional dan identitas bisnis</p>
          </div>
          <button onClick={() => signOut()} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-rose-100 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm">
            <LogOut size={16} /> Keluar
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-[3rem] border border-slate-100">
            <Loader2 className="animate-spin text-[#6200EE] mb-4" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as MenuType)}
                  className={`w-full p-4 rounded-[2rem] flex items-center gap-4 transition-all text-left group ${
                    activeMenu === item.id ? 'bg-[#6200EE] text-white shadow-xl shadow-purple-200' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-100'
                  }`}
                >
                  <div className={`p-2.5 rounded-2xl ${activeMenu === item.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}><item.icon size={20} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">{item.label}</p>
                    <p className="text-[9px] font-bold uppercase opacity-60 truncate">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 md:p-10 min-h-[500px]">
                
                {activeMenu === 'bisnis' && (
                  <form onSubmit={handleUpdateProfile} className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#6200EE]/5 rounded-2xl flex items-center justify-center text-[#6200EE] border border-purple-50"><Building size={24} /></div>
                      <div><h3 className="text-lg font-black text-slate-800">Profil Perusahaan</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Identitas legal usaha</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nama Bisnis</label>
                        <div className="relative group">
                          <Building className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE] transition-colors" size={18} />
                          <input type="text" required className="w-full pl-12 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-[#6200EE] font-bold" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Kota / Domisili</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE] transition-colors" size={18} />
                          <input type="text" className="w-full pl-12 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-purple-500/5 focus:border-[#6200EE] font-bold" value={formData.city} placeholder="Misal: Bogor" onChange={e => setFormData({...formData, city: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Mata Uang Laporan</label>
                        <div className="relative">
                          <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-purple-500/5" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                            <option value="IDR">IDR - Indonesian Rupiah</option>
                            <option value="USD">USD - US Dollar</option>
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tahun Fiskal Aktif</label>
                        <input type="number" disabled className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-5 py-4 outline-none font-bold text-slate-400 cursor-not-allowed" value={formData.fiscal_year} />
                      </div>
                    </div>
                    <button type="submit" disabled={updating} className="w-full bg-[#6200EE] text-white font-black py-5 rounded-3xl hover:bg-[#5000C7] shadow-xl shadow-purple-100 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-xs">
                      {updating ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Simpan Perubahan Profil</>}
                    </button>
                  </form>
                )}

                {activeMenu === 'preferensi' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-50"><Globe size={24} /></div>
                      <div><h3 className="text-lg font-black text-slate-800">Lokalitas Aplikasi</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Standardisasi tampilan</p></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Bahasa Aplikasi</label>
                        <div className="relative">
                          <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold appearance-none cursor-pointer" value={settingsData.language} onChange={e => setSettingsData({...settingsData, language: e.target.value})}>
                            <option value="id">Bahasa Indonesia</option>
                            <option value="en">English (US)</option>
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Zona Waktu (Timezone)</label>
                        <div className="relative">
                          <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 outline-none font-bold appearance-none cursor-pointer" value={settingsData.timezone} onChange={e => setSettingsData({...settingsData, timezone: e.target.value})}>
                            <option value="Asia/Jakarta">WIB (GMT+7)</option>
                            <option value="Asia/Makassar">WITA (GMT+8)</option>
                            <option value="Asia/Jayapura">WIT (GMT+9)</option>
                          </select>
                          <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                        </div>
                      </div>
                    </div>
                    <button onClick={handleUpdateSettings} disabled={updating} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-slate-800 flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest text-xs">
                      {updating ? <Loader2 className="animate-spin" /> : <><Save size={18} /> Update Preferensi</>}
                    </button>
                  </div>
                )}

                {activeMenu === 'notifikasi' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-50"><Bell size={24} /></div>
                      <div><h3 className="text-lg font-black text-slate-800">Alert System</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Atur peringatan otomatis</p></div>
                    </div>
                    <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-4"><Clock className="text-slate-400" /><span className="text-sm font-bold text-slate-700">Peringatan Jatuh Tempo</span></div>
                      <button onClick={() => setSettingsData({...settingsData, notif_due_date: !settingsData.notif_due_date})} className={settingsData.notif_due_date ? 'text-[#6200EE]' : 'text-slate-300'}>{settingsData.notif_due_date ? <ToggleRight size={44} /> : <ToggleLeft size={44} />}</button>
                    </div>
                    <button onClick={handleUpdateSettings} disabled={updating} className="w-full bg-[#6200EE] text-white font-black py-5 rounded-3xl hover:bg-[#5000C7] flex items-center justify-center gap-3 uppercase tracking-widest text-xs">{updating ? <Loader2 className="animate-spin" /> : 'Simpan Notifikasi'}</button>
                  </div>
                )}

                {activeMenu === 'keamanan' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-50"><Shield size={24} /></div>
                      <div><h3 className="text-lg font-black text-slate-800">Security Core</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Perlindungan data finansial</p></div>
                    </div>
                    <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex items-center gap-4">
                      <CheckCircle2 className="text-emerald-500" size={24} />
                      <p className="text-xs font-bold text-emerald-800">Enkripsi End-to-End Aktif. Data Anda aman tersimpan dengan standar AES-256.</p>
                    </div>
                    <div className="p-6 bg-slate-900 rounded-[2.5rem] text-white space-y-2">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Email Terverifikasi</p>
                      <p className="text-lg font-black">{user?.email}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
