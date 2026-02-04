import { supabase } from '../lib/supabase';

/**
 * Send password reset email
 * 
 * @param email - User email address
 * @param onSuccess - Callback on success
 * @param onError - Callback on error
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function sendPasswordResetEmail(
    email: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
    });

    if (error) {
        const errorMsg = `Gagal mengirim email: ${error.message}`;
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
    }

    onSuccess?.();
    return { success: true };
}

/**
 * Update user password
 * 
 * @param newPassword - New password
 * @param onSuccess - Callback on success
 * @param onError - Callback on error
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function updatePassword(
    newPassword: string,
    onSuccess?: () => void,
    onError?: (error: string) => void
): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.updateUser({
        password: newPassword
    });

    if (error) {
        const errorMsg = `Gagal update password: ${error.message}`;
        onError?.(errorMsg);
        return { success: false, error: errorMsg };
    }

    onSuccess?.();
    return { success: true };
}
