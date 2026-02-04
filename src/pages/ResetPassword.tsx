import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { updatePassword } from '../utils/passwordReset';

export default function ResetPassword() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const validatePassword = (): boolean => {
        if (newPassword.length < 6) {
            setError('Password minimal 6 karakter');
            return false;
        }

        if (newPassword !== confirmPassword) {
            setError('Password dan konfirmasi tidak sama');
            return false;
        }

        return true;
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!validatePassword()) return;

        setLoading(true);

        await updatePassword(
            newPassword,
            () => {
                setSuccess(true);
                setTimeout(() => navigate('/login'), 3000);
            },
            (err) => setError(err)
        );

        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white p-10 rounded-3xl max-w-md w-full text-center shadow-2xl"
                >
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="text-emerald-600" size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 mb-4">Password Berhasil Diubah!</h1>
                    <p className="text-slate-600 mb-6">
                        Password Anda telah berhasil diperbarui. Anda akan diarahkan ke halaman login...
                    </p>
                    <Loader2 className="animate-spin mx-auto text-[#6200EE]" size={24} />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-10 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#6200EE] rounded-3xl flex items-center justify-center text-white mb-6 shadow-xl shadow-[#6200EE]/20 mx-auto">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-900">Reset Password</h1>
                    <p className="text-slate-500 mt-2">Buat password baru untuk akun Anda</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 rounded-2xl text-xs mb-6 bg-rose-50 text-rose-600 border border-rose-100 font-bold"
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">Password Baru</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all"
                                placeholder="Minimal 6 karakter"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600">Konfirmasi Password</label>
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Lock size={20} />
                            </div>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-14 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6200EE]/5 focus:border-[#6200EE] transition-all"
                                placeholder="Masukkan password yang sama"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#6200EE] hover:bg-[#5000C7] text-white font-black py-5 rounded-2xl shadow-2xl shadow-[#6200EE]/30 transition-all disabled:opacity-70 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Update Password'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
