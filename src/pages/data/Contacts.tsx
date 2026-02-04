// C:\codingVibes\nuansasolution\.subpath\akuntansi\src\pages\data\Contacts.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import Sidebar from '../../components/Sidebar';
import MobileNav from '../../components/MobileNav';
import { Users, Plus, Loader2, Trash2, Mail, Phone, MapPin, AlertTriangle } from 'lucide-react';
import type { Contact } from '../../types';

export default function Contacts() {
  const { user } = useAuth();
  const { notify, confirm } = useNotify();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'pelanggan' as any, address: '' });

  useEffect(() => {
    if (user?.id) fetchContacts();
  }, [user?.id]);

  const fetchContacts = async () => {
    setLoading(true);
    setTableError(false);
    try {
      const { data, error } = await supabase.from('contacts').select('*').order('name');

      if (error) {
        // PGRST205: Table not found
        if (error.code === 'PGRST205' || error.message?.includes('not find')) {
          setTableError(true);
          setContacts([]);
          return;
        }
        throw error;
      }

      setContacts(data || []);
    } catch (err: any) {
      console.error('Fetch error:', err);
      notify('Gagal memuat kontak: ' + (err.message || 'Error tidak dikenal'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tableError) {
      notify('Tabel "contacts" belum ada di database Supabase Anda.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('contacts').insert([{ ...form, user_id: user.id }]);
      if (error) throw error;

      setForm({ name: '', email: '', phone: '', type: 'pelanggan', address: '' });
      await fetchContacts();
      notify('Kontak berhasil ditambahkan', 'success');
    } catch (err: any) {
      notify('Gagal menambah kontak. Pastikan tabel sudah dibuat.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteContact = async (id: string) => {
    const confirmed = await confirm('Hapus kontak ini?', { type: 'danger' });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      setContacts(contacts.filter(c => c.id !== id));
      notify('Kontak dihapus', 'info');
    } catch (err) {
      notify('Gagal menghapus kontak', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-6 md:pb-6 pb-24 max-w-6xl mx-auto w-full">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Daftar Kontak</h1>
          <p className="text-slate-500 text-sm">Kelola Vendor, Pelanggan, dan Rekan Bisnis</p>
        </header>

        {tableError && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col md:flex-row items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-bold text-amber-900">Tabel Database Belum Siap</h3>
              <p className="text-sm text-amber-700">Tabel <code>contacts</code> belum ditemukan di Supabase. Silakan buat tabel tersebut melalui Supabase Dashboard atau SQL Editor Anda agar fitur ini dapat berfungsi.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-6">Tambah Kontak</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text" placeholder="Nama Lengkap" required
                disabled={tableError}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6200EE]/10 disabled:opacity-50"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  disabled={tableError}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
                  value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}
                >
                  <option value="pelanggan">Pelanggan</option>
                  <option value="vendor">Vendor</option>
                  <option value="lainnya">Lainnya</option>
                </select>
                <input
                  type="text" placeholder="Telepon"
                  disabled={tableError}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <input
                type="email" placeholder="Email (Opsional)"
                disabled={tableError}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none disabled:opacity-50"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              />
              <textarea
                placeholder="Alamat Lengkap"
                disabled={tableError}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none min-h-[80px] disabled:opacity-50"
                value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
              />
              <button
                disabled={submitting || tableError}
                className="w-full bg-[#6200EE] text-white font-bold py-3 rounded-xl hover:bg-[#5000C7] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Simpan Kontak</>}
              </button>
            </form>
          </section>

          <section className="lg:col-span-2 space-y-4">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#6200EE]" /></div> :
              contacts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {contacts.map(contact => (
                    <div key={contact.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative group">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${contact.type === 'pelanggan' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                          {contact.type}
                        </span>
                        <button onClick={() => deleteContact(contact.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <h4 className="font-bold text-slate-800 text-lg mb-2">{contact.name}</h4>
                      <div className="space-y-1">
                        {contact.phone && <p className="text-xs text-slate-500 flex items-center gap-2"><Phone size={12} /> {contact.phone}</p>}
                        {contact.email && <p className="text-xs text-slate-500 flex items-center gap-2"><Mail size={12} /> {contact.email}</p>}
                        {contact.address && <p className="text-xs text-slate-500 flex items-center gap-2"><MapPin size={12} /> {contact.address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                  <Users size={48} className="mx-auto text-slate-200 mb-4 opacity-20" />
                  <p className="text-slate-500">Belum ada kontak terdaftar.</p>
                </div>
              )
            }
          </section>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
