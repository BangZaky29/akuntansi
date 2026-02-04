import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

type VerificationType = 'register' | 'resetPassword' | 'unlockBalance';

interface VerificationConfig {
    title: string;
    message: string;
    icon: string;
    redirectPath: string;
    buttonText: string;
    autoRedirectDelay: number;
}

const verificationConfig: Record<VerificationType, VerificationConfig> = {
    register: {
        title: 'Akun Terkonfirmasi!',
        message: 'Selamat! Akun Anda telah berhasil diverifikasi. Anda sekarang dapat melanjutkan ke aplikasi.',
        icon: '🎉',
        redirectPath: '/dashboard',
        buttonText: 'Kembali ke tampilan Anda sebelumnya',
        autoRedirectDelay: 3000
    },
    resetPassword: {
        title: 'Password Berhasil Direset!',
        message: 'Password Anda telah berhasil diperbarui. Silakan login dengan password baru Anda.',
        icon: '🔐',
        redirectPath: '/login',
        buttonText: 'Masuk ke Login',
        autoRedirectDelay: 5000
    },
    unlockBalance: {
        title: 'Verifikasi Berhasil!',
        message: 'Akses edit saldo awal telah dibuka. Anda sekarang dapat mengedit saldo pembukuan.',
        icon: '✅',
        redirectPath: '/initial-balance?unlock=true',
        buttonText: 'Kembali ke tampilan Anda sebelumnya',
        autoRedirectDelay: 2000
    }
};

export default function VerificationSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(3);
    const [isAnimating, setIsAnimating] = useState(false);

    // Get verification type from URL query param
    const type = (searchParams.get('type') || 'register') as VerificationType;
    const config = verificationConfig[type];

    useEffect(() => {
        // Start checkmark animation
        setTimeout(() => setIsAnimating(true), 300);

        // Countdown timer
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    navigate(config.redirectPath, { replace: true });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [config.redirectPath, navigate]);

    const handleManualRedirect = () => {
        navigate(config.redirectPath, { replace: true });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#F8FAFC] via-purple-50/30 to-blue-50/30 px-4 overflow-hidden relative">
            {/* Background decorative elements */}
            <div className="absolute top-20 left-20 w-72 h-72 bg-[#6200EE]/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 15, stiffness: 100 }}
                className="bg-white p-12 rounded-[40px] max-w-lg w-full text-center shadow-2xl border border-slate-100 relative z-10"
            >
                {/* Animated Success Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: isAnimating ? 1 : 0 }}
                    transition={{
                        type: 'spring',
                        damping: 10,
                        stiffness: 100,
                        delay: 0.2
                    }}
                    className="relative mb-8"
                >
                    {/* Outer glow ring */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1.2, opacity: 0 }}
                        transition={{
                            repeat: Infinity,
                            duration: 2,
                            ease: 'easeOut'
                        }}
                        className="absolute inset-0 m-auto w-32 h-32 bg-emerald-500/20 rounded-full"
                    />

                    {/* Main icon container */}
                    <div className="relative w-32 h-32 mx-auto bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                damping: 12,
                                stiffness: 100,
                                delay: 0.4
                            }}
                        >
                            <CheckCircle2 className="text-white" size={64} strokeWidth={3} />
                        </motion.div>
                    </div>

                    {/* Emoji overlay */}
                    <motion.div
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6, type: 'spring', damping: 10 }}
                        className="absolute -top-4 -right-4 text-5xl"
                    >
                        {config.icon}
                    </motion.div>
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <h1 className="text-3xl font-black text-slate-900 mb-4">
                        {config.title}
                    </h1>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {config.message}
                    </p>

                    {/* Auto redirect countdown */}
                    <div className="flex items-center justify-center gap-2 mb-6 text-sm text-slate-500">
                        <Loader2 className="animate-spin" size={16} />
                        <span>Redirect otomatis dalam {countdown} detik...</span>
                    </div>

                    {/* Manual redirect button */}
                    <button
                        onClick={handleManualRedirect}
                        className="w-full bg-gradient-to-r from-[#6200EE] to-[#5000C7] hover:from-[#5000C7] hover:to-[#4000A0] text-white font-black py-5 rounded-2xl shadow-2xl shadow-[#6200EE]/30 transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest group"
                    >
                        {config.buttonText}
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Confetti particles */}
                {isAnimating && (
                    <>
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{
                                    x: 0,
                                    y: 0,
                                    opacity: 1,
                                    scale: 0
                                }}
                                animate={{
                                    x: Math.cos(i * 30) * 200,
                                    y: Math.sin(i * 30) * 200,
                                    opacity: 0,
                                    scale: 1
                                }}
                                transition={{
                                    duration: 1.5,
                                    delay: 0.5 + (i * 0.05),
                                    ease: 'easeOut'
                                }}
                                className="absolute top-1/4 left-1/2 w-3 h-3 rounded-full"
                                style={{
                                    background: ['#6200EE', '#34D399', '#3B82F6', '#F59E0B'][i % 4]
                                }}
                            />
                        ))}
                    </>
                )}
            </motion.div>
        </div>
    );
}
