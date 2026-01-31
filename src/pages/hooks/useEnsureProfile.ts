
import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

/**
 * Custom hook to ensure user profile and settings exist in the database.
 * This is designed to be called unconditionally at the top level of a component.
 */
export function useEnsureProfile() {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    // 🛡️ Guard: Only proceed if we have a user and haven't successfully synced this user ID yet.
    if (!user || checkedRef.current === user.id) return;

    const ensureData = async () => {
      try {
        // 1️⃣ CHECK/CREATE PROFILE
        // We use maybeSingle to avoid throw errors if the row doesn't exist.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Failed to verify profile status:', profileError.message);
          return;
        }

        if (!profile) {
          const meta = user.user_metadata ?? {};
          const { error: profileInsertError } = await supabase.from('profiles').insert({
            id: user.id,
            business_name: meta.business_name || 'Bisnis Baru',
            fiscal_year: meta.fiscal_year || new Date().getFullYear(),
            currency: 'IDR',
            city: meta.city || '',
          });

          if (profileInsertError) {
            console.error('Critical: Failed to auto-initialize profile:', profileInsertError.message);
          }
        }

        // 2️⃣ CHECK/CREATE USER SETTINGS
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings && !settingsError) {
          const { error: settingsInsertError } = await supabase.from('user_settings').insert({
            user_id: user.id,
            language: 'id',
            timezone: 'Asia/Jakarta',
          });

          if (settingsInsertError) {
            console.error('Critical: Failed to auto-initialize user settings:', settingsInsertError.message);
          }
        }

        // 🔄 Sync local settings context with the database state
        await refreshSettings();
        
        // 📝 Mark as processed to prevent redundant checks during re-renders or navigation
        checkedRef.current = user.id;

      } catch (err) {
        console.error('System synchronization error:', err);
      }
    };

    ensureData();
  }, [user, refreshSettings]);
}
