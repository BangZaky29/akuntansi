import { supabase } from '../lib/supabase';

/**
 * Types of magic link verification
 */
export type MagicLinkType = 'register' | 'unlockBalance' | 'confirmAction' | 'resetPassword';

/**
 * Configuration for magic link
 */
interface MagicLinkConfig {
    email: string;
    type: MagicLinkType;
    redirectPath?: string; // Optional: custom redirect path
    onSuccess?: () => void;
    onError?: (error: string) => void;
}

/**
 * Get redirect URL based on type
 */
const getRedirectUrl = (type: MagicLinkType, customPath?: string): string => {
    if (customPath) {
        return `${window.location.origin}${customPath}`;
    }

    switch (type) {
        case 'register':
            return `${window.location.origin}/profile`;
        case 'unlockBalance':
            return window.location.href; // Stay on current page
        case 'confirmAction':
            return window.location.href;
        case 'resetPassword':
            return `${window.location.origin}/reset-password`; // Go to password reset page
        default:
            return window.location.href;
    }
};

/**
 * Check if user should be created for this type
 */
const shouldCreateUser = (type: MagicLinkType): boolean => {
    return type === 'register'; // Only create user for registration
};

/**
 * Validate session before sending magic link (for non-registration types)
 */
const validateSession = async (type: MagicLinkType): Promise<boolean> => {
    if (type === 'register' || type === 'resetPassword') return true; // No session needed for registration or password reset

    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};

/**
 * Send magic link email
 * 
 * @param config - Configuration for magic link
 * @returns Promise<{ success: boolean; error?: string }>
 * 
 * @example
 * // For unlocking balance
 * sendMagicLink({
 *   email: user.email,
 *   type: 'unlockBalance',
 *   onSuccess: () => notify('Link sent!', 'success'),
 *   onError: (err) => notify(err, 'error')
 * });
 * 
 * @example
 * // For registration
 * sendMagicLink({
 *   email: newUser.email,
 *   type: 'register',
 *   redirectPath: '/welcome'
 * });
 */
export async function sendMagicLink(config: MagicLinkConfig): Promise<{ success: boolean; error?: string }> {
    const { email, type, redirectPath, onSuccess, onError } = config;

    // Validate session for non-registration types
    const hasValidSession = await validateSession(type);
    if (!hasValidSession) {
        const errorMsg = 'Session login tidak valid. Silakan login ulang.';
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
    }

    // Get redirect URL
    const redirectUrl = getRedirectUrl(type, redirectPath);

    // Send OTP
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: redirectUrl,
            shouldCreateUser: shouldCreateUser(type)
        }
    });

    if (error) {
        const errorMsg = `Gagal mengirim link: ${error.message}`;
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
    }

    onSuccess?.();
    return { success: true };
}

/**
 * Get user-friendly message based on type
 */
export const getMagicLinkMessage = (type: MagicLinkType, email: string): string => {
    const messages = {
        register: `Link konfirmasi akun telah dikirim ke ${email}`,
        unlockBalance: `Link verifikasi keamanan telah dikirim ke ${email}`,
        confirmAction: `Link konfirmasi telah dikirim ke ${email}`,
        resetPassword: `Link reset password telah dikirim ke ${email}`
    };

    return messages[type] || `Link verifikasi telah dikirim ke ${email}`;
};
