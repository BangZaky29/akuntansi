
import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/Sidebar';
import MobileNav from '../components/MobileNav';
import { User, LogOut, Mail, Building, Settings, Shield, Bell, ChevronRight, Globe, Save, Loader2 } from 'lucide-react';
import { useNotify } from '../contexts/NotificationContext';
import type { UserProfile } from '../types';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { notify } = useNotify();
  const [activeMenu, setActiveMenu] = useState<'profile' | 'settings'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const [formData, setFormData] = useState({
    business_name: '',
    city: '',
    fiscal_year: new Date().getFullYear(),
    currency: 'IDR'
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const p = data[0];
        setProfile(p);
        setFormData({
          business_name: p.business_name || '',
          city: p.city || '',
          fiscal_year: p.fiscal_year || new Date().getFullYear(),
          currency: p.currency || 'IDR'
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id,
          ...formData 
        });
      
      if (error) throw error;
      notify('Profil bisnis berhasil diperbarui', 'success');
      await fetchProfile();
    } catch (err: any) {
      notify('Gagal memperbarui profil: ' + err.message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  const settingItems = [
    { icon: Settings, label: 'Informasi Bisnis', desc: 'Ubah nama dan alamat bisnis' },
    { icon: Shield, label: 'Keamanan', desc: 'Ubah kata sandi dan 2FA' },
    { icon: Bell, label: 'Notifikasi', desc: 'Atur peringatan jatuh tempo' },
    { icon: Globe, label: 'Bahasa & Lokasi', desc: 'WIB (GMT+7) - Bahasa Indonesia' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-4xl mx-auto w-full">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pengaturan Profil</h1>
            <p className="text-slate-500 text-sm">Kelola identitas bisnis dan konfigurasi sistem</p>
          </div>
          <div className="flex gap-2 p-1 bg-white border border-slate-200 rounded-xl">
             <button 
               onClick={() => setActiveMenu('profile')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMenu === 'profile' ? 'bg-[#6200EE] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >Bisnis</button>
             <button 
               onClick={() => setActiveMenu('settings')}
               className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeMenu === 'settings' ? 'bg-[#6200EE] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >Preferensi</button>
          </div>
        </header>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#6200EE]" size={32} /></div> : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-center p-8">
                <div className="w-24 h-24 bg-[#6200EE]/10 rounded-3xl flex items-center justify-center text-[#6200EE] text-3xl font-bold mx-auto mb-4 border-4 border-white shadow-xl">
                  {formData.business_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-slate-800 truncate mb-1">{formData.business_name || 'Bisnis Tanpa Nama'}</h3>
                <p className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit mx-auto uppercase tracking-tighter">Administrator</p>
                
                <div className="mt-8 pt-8 border-t border-slate-50 space-y-3">
                   <button 
                     onClick={() => signOut()}
                     className="w-full py-3 text-rose-600 bg-rose-50 rounded-xl text-sm font-bold hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                   >
                     <LogOut size={16} /> Keluar Aplikasi
                   </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {activeMenu === 'profile' ? (
                <form onSubmit={handleUpdateProfile} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Building size={18} className="text-[#6200EE]" /> Informasi Entitas Bisnis
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Nama Bisnis / Perusahaan</label>
                      <input 
                        type="text" required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6200EE]/10"
                        value={formData.business_name}
                        onChange={e => setFormData({...formData, business_name: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Kota Kedudukan</label>
                      <input 
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6200EE]/10"
                        placeholder="Contoh: Bogor"
                        value={formData.city}
                        onChange={e => setFormData({...formData, city: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Tahun Fiskal</label>
                        <input 
                          type="number" required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                          value={formData.fiscal_year}
                          onChange={e => setFormData({...formData, fiscal_year: parseInt(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Mata Uang</label>
                        <select 
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none"
                          value={formData.currency}
                          onChange={e => setFormData({...formData, currency: e.target.value})}
                        >
                          <option value="IDR">IDR (Rupiah)</option>
                          <option value="USD">USD (Dollar)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 mt-4">
                      <Mail className="text-blue-500" size={20} />
                      <div className="flex-1">
                        <p className="text-[10px] uppercase font-bold text-blue-400">Email Akun (Login)</p>
                        <p className="text-blue-700 font-semibold text-sm">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={updating}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Simpan Perubahan</>}
                  </button>
                </form>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-2">
                  {settingItems.map((item, idx) => (
                    <button 
                      key={idx}
                      onClick={() => notify('Pengaturan ini dikunci oleh kebijakan organisasi.', 'info')}
                      className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-all rounded-2xl group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-[#6200EE]/10 group-hover:text-[#6200EE]">
                          <item.icon size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <MobileNav />
    </div>
  );
}
