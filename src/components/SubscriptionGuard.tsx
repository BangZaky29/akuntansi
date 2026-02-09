// =========================================
// FILE: components/SubscriptionGuard.tsx
// Subscription Access Guard for React App
// =========================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionSession {
    phone: string;
    feature: string;
    expiredAt: string;
    createdAt: number;
    expiresAt: number;
}

interface SubscriptionGuardProps {
    children: React.ReactNode;
    featureSlug?: string;
}

// Configuration
const CONFIG = {
    // 🔧 LOCAL: 'http://localhost:5000/api/access/check'
    // 🌐 PRODUCTION:
    API_URL: 'https://payment.nuansasolution.id/api/access/check',
    PAYMENT_URL: 'https://payment.nuansasolution.id/',
    SESSION_EXPIRY_MS: 60 * 60 * 1000, // 1 hour
    STORAGE_KEY_PREFIX: 'ns_access_',
    DEFAULT_FEATURE_SLUG: 'akuntansi'
};

const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
    children,
    featureSlug = CONFIG.DEFAULT_FEATURE_SLUG
}) => {
    const { user } = useAuth();
    const [isVerified, setIsVerified] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');

    const storageKey = `${CONFIG.STORAGE_KEY_PREFIX}${featureSlug}`;

    // Check existing session on mount
    useEffect(() => {
        const checkSession = () => {
            try {
                const data = localStorage.getItem(storageKey);
                if (!data) {
                    setIsVerified(false);
                    return;
                }

                const session: SubscriptionSession = JSON.parse(data);

                // Check if session is expired
                if (session.expiresAt && Date.now() > session.expiresAt) {
                    localStorage.removeItem(storageKey);
                    setIsVerified(false);
                    return;
                }

                setIsVerified(true);
            } catch {
                localStorage.removeItem(storageKey);
                setIsVerified(false);
            }
        };

        checkSession();
    }, [storageKey]);

    // Normalize phone number
    const normalizePhone = (phoneNumber: string): string => {
        let cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.startsWith('0')) {
            cleaned = '62' + cleaned.slice(1);
        } else if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }
        return cleaned;
    };

    // Handle verification
    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    phone: normalizePhone(phone),
                    feature_slug: featureSlug
                })
            });

            const result = await response.json();

            if (result.status === true) {
                // Save session
                const session: SubscriptionSession = {
                    phone: phone,
                    feature: featureSlug,
                    expiredAt: result.expired_at,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + CONFIG.SESSION_EXPIRY_MS
                };
                localStorage.setItem(storageKey, JSON.stringify(session));
                setIsVerified(true);
            } else {
                setError(result.message || 'Subscription tidak aktif');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setError('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    // Still checking session
    if (isVerified === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Not verified - show verification form
    if (!isVerified) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-700 p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
                    <div className="text-center mb-6">
                        <span className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase mb-4">
                            {featureSlug.replace(/-/g, ' ')}
                        </span>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifikasi Akses</h1>
                        <p className="text-gray-600">Masukkan nomor WhatsApp untuk melanjutkan</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleVerify}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Nomor WhatsApp
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">+62</span>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                    placeholder="8123456789"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 px-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {isLoading ? 'Memverifikasi...' : 'Verifikasi'}
                        </button>
                    </form>

                    <div className="mt-4">
                        <a
                            href={CONFIG.PAYMENT_URL}
                            className="block w-full text-center bg-gray-100 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                            Daftar Berlangganan
                        </a>
                    </div>

                    {user && (
                        <p className="text-center text-sm text-gray-500 mt-4">
                            Login sebagai: {user.email}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    // Verified - render children
    return <>{children}</>;
};

export default SubscriptionGuard;

// =========================================
// UTILITY: Logout function to clear session
// =========================================
export const clearSubscriptionSession = (featureSlug: string = 'akuntansi') => {
    localStorage.removeItem(`${CONFIG.STORAGE_KEY_PREFIX}${featureSlug}`);
};

// =========================================
// UTILITY: Check if has valid session
// =========================================
export const hasSubscriptionSession = (featureSlug: string = 'akuntansi'): boolean => {
    try {
        const data = localStorage.getItem(`${CONFIG.STORAGE_KEY_PREFIX}${featureSlug}`);
        if (!data) return false;

        const session = JSON.parse(data);
        return session.expiresAt && Date.now() < session.expiresAt;
    } catch {
        return false;
    }
};
