// src/pages/hooks/useEnsureProfile.ts
import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';

export function useEnsureProfile() {
  const { user } = useAuth();
  const { refreshSettings } = useSettings();
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (checkedRef.current === user.id) return;

    const ensureData = async () => {
      try {
        // 1️⃣ PROFILE
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Gagal cek profil:', profileError.message);
          return;
        }

        if (!profile) {
          const meta = user.user_metadata ?? {};

          const { error } = await supabase.from('profiles').insert({
            id: user.id,
            business_name: meta.business_name || 'Bisnis Baru',
            fiscal_year: meta.fiscal_year || new Date().getFullYear(),
            currency: 'IDR',
            city: meta.city || '',
          });

          if (error) {
            console.error('Gagal insert profile:', error.message);
          }
        }

        // 2️⃣ USER SETTINGS
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!settings && !settingsError) {
          const { error } = await supabase.from('user_settings').insert({
            user_id: user.id,
            language: 'id',
            timezone: 'Asia/Jakarta',
          });

          if (error) {
            console.error('Gagal insert settings:', error.message);
          }
        }

        await refreshSettings();
        checkedRef.current = user.id;

      } catch (err) {
        console.error('Ensure profile crash:', err);
      }
    };

    ensureData();
  }, [user, refreshSettings]);
}
