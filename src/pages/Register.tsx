
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { UserPlus, Mail, Lock, Loader2, Briefcase, ShieldCheck, CheckCircle2, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailSent, setIsEmailSent] = useState(false);

  // Validasi Email
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validasi Nama Bisnis
    if (businessName.trim().length < 3) {
      setError('Nama bisnis minimal 3 karakter.');
      return;
    }

    // 2. Validasi Email
    if (!isValidEmail(email)) {
      setError('Format email tidak valid.');
      return;
    }

    // 3. Validasi Kekuatan Password
    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    // 4. Validasi Konfirmasi Password
    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            business_name: businessName,
            fiscal_year: new Date().getFullYear(),
          },
          emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`
        }
      });

      if (signUpError) {
        if (signUpError.status === 429) throw new Error("Terlalu banyak permintaan. Silakan coba lagi nanti.");
        throw signUpError;
      }
      
      setIsEmailSent(true);
    } catch (err: any) {
      console.error("Signup Error:", err);
      setError(err?.message || 'Terjadi kesalahan sistem pada pendaftaran.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-10 overflow-hidden">
      <AnimatePresence mode="wait">
        {!isEmailSent ? (
          <motion.div
            key="register-form"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden"
          >
            <div className="flex flex-col items-center mb-10 relative z-10">
              <div className="w-16 h-16 bg-[#6200EE] rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#6200EE]/20 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                <UserPlus size={32} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Daftar Akun</h1>
              <p className="text-slate-400 mt-2 font-medium text-center text-sm">Bergabung dengan ekosistem akuntansi digital</p>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="p-4 rounded-2xl text-[11px] mb-6 bg-rose-50 text-rose-600 border border-rose-100 font-bold flex items-center gap-3"
              >
                <AlertCircle size={18} className="shrink-0" />
                <span className="leading-tight">{error}</span>
              </motion.div>
            )}

            <form onSubmit={handleRegister} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Bisnis</label>
                <div className={`relative group transition-all ${businessName.length > 0 && businessName.length < 3 ? 'ring-2 ring-rose-500/20' : ''}`}>
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE]" size={20} />
                  <input 
                    type="text" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6200EE] font-bold transition-all" 
                    placeholder="Misal: PT. Maju Jaya" 
                    value={businessName} 
                    onChange={e => setBusinessName(e.target.value)} 
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <div className={`relative group transition-all ${email.length > 0 && !isValidEmail(email) ? 'ring-2 ring-rose-500/20' : ''}`}>
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE]" size={20} />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6200EE] font-bold transition-all" 
                    placeholder="email@bisnis.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kata Sandi</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE]" size={20} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    minLength={6} 
                    className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6200EE] font-bold" 
                    placeholder="Minimal 6 karakter" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#6200EE] transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Sandi</label>
                <div className={`relative group transition-all ${confirmPassword.length > 0 && password !== confirmPassword ? 'ring-2 ring-rose-500/20' : ''}`}>
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE]" size={20} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required 
                    className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6200EE] font-bold" 
                    placeholder="Ulangi kata sandi" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#6200EE] transition-colors">
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#6200EE] hover:bg-[#5000C7] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 mt-4 text-xs uppercase tracking-[0.2em] active:scale-95 transition-all shadow-xl shadow-purple-100 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={22} /> : 'Mulai Sekarang'}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-slate-50 pt-6">
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                Sudah punya akun? <Link to="login" className="text-[#6200EE] ml-1 hover:underline">Masuk</Link>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-12 rounded-[40px] w-full max-w-md shadow-2xl text-center border border-slate-100">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={48} /></div>
            <h1 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Cek Email Anda</h1>
            <p className="text-slate-500 mb-8 font-medium text-sm leading-relaxed">Link verifikasi telah dikirim ke <br/><span className="font-black text-[#6200EE]">{email}</span>.<br/> Silakan verifikasi sebelum login.</p>
            <Link to="login" className="w-full bg-[#6200EE] text-white font-black py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-xs shadow-xl shadow-purple-100">
              Sudah Verifikasi? Masuk <ArrowRight size={20} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
