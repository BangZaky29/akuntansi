
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, Loader2, Briefcase, ShieldCheck, CheckCircle2, ArrowRight, Info, AlertCircle } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      setLoading(false);
      return;
    }

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { business_name: businessName },
          emailRedirectTo: redirectTo
        }
      });

      if (signUpError) throw signUpError;

      // Inisialisasi Profile Bisnis di tabel public.profiles
      // Meskipun user belum konfirmasi email, kita siapkan record profilnya
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            business_name: businessName,
            fiscal_year: new Date().getFullYear(),
            currency: 'IDR'
          }]);
        
        if (profileError) console.error("Gagal buat profil:", profileError);
      }

      setIsEmailSent(true);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan pada pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-10">
      <AnimatePresence mode="wait">
        {!isEmailSent ? (
          <motion.div
            key="register-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200"
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-200">
                <UserPlus size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Daftar Akun Baru</h1>
              <p className="text-slate-500 mt-1">Sistem Akuntansi Profesional</p>
            </div>

            {error && (
              <div className="p-4 rounded-xl text-sm mb-6 bg-red-50 text-red-600 border border-red-200 flex gap-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Nama Bisnis</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text" required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    placeholder="Contoh: PT. Nuansa Solution"
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email" required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    placeholder="email@bisnis.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Kata Sandi</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password" required minLength={6}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Ulangi Kata Sandi</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password" required
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl outline-none"
                    placeholder="Konfirmasi password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 mt-4 hover:bg-blue-700 transition-all"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Daftar Sekarang'}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-100 pt-6">
              <p className="text-slate-600 text-sm">Sudah punya akun? <Link to="/login" className="text-blue-600 font-bold">Masuk</Link></p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl text-center"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={48} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">Pendaftaran Berhasil!</h1>
            <p className="text-slate-600 mb-6">Link verifikasi telah dikirim ke: <br/><span className="font-bold">{email}</span></p>
            <Link to="/login" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
              Sudah Verifikasi? Masuk <ArrowRight size={18} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
