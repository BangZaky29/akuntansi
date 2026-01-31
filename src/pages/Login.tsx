
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, LogIn, Loader2, Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard', { replace: true });
    }
  }, [session, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const auth = supabase.auth as any;
      const { error: signInError } = await auth.signInWithPassword({ email, password });
      
      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          setError('Email Anda belum terverifikasi. Silakan cek inbox Anda.');
        } else if (signInError.message === 'Invalid login credentials') {
          setError('Email atau kata sandi salah.');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat masuk");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bg-white p-10 rounded-[40px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden"
      >
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#6200EE]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-400/5 rounded-full -ml-16 -mb-16 blur-3xl"></div>

        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-[#6200EE] rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#6200EE]/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <Building2 size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h1>
          <p className="text-slate-400 mt-2 font-medium text-center">Kelola pembukuan bisnis Anda dengan sistem akuntansi profesional</p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl text-xs mb-8 bg-rose-50 text-rose-600 border border-rose-100 font-bold flex items-center gap-3"
          >
            <div className="w-6 h-6 bg-rose-100 rounded-full flex items-center justify-center shrink-0">!</div>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-6 relative z-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Bisnis</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE] transition-colors">
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all text-slate-900 font-bold placeholder:text-slate-300 placeholder:font-normal"
                placeholder="email@bisnis.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kata Sandi</label>
              <Link to="/forgot-password" title="Fitur belum tersedia" className="text-[10px] font-black text-[#6200EE] uppercase tracking-widest hover:underline">Lupa?</Link>
            </div>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#6200EE] transition-colors">
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all text-slate-900 font-bold placeholder:text-slate-300 placeholder:font-normal"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6200EE] hover:bg-[#5000C7] text-white font-black py-5 rounded-2xl shadow-2xl shadow-[#6200EE]/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-6 text-sm uppercase tracking-widest active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> Masuk Akuntansi</>}
          </button>
        </form>

        <div className="mt-10 text-center border-t border-slate-50 pt-8 relative z-10">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-tighter">
            Belum memiliki akun?{' '}
            <Link to="/register" className="text-[#6200EE] hover:underline ml-1">
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
