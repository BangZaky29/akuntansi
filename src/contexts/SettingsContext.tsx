
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { formatCurrency, formatDate } from '../utils/accounting';

interface SettingsContextType {
  currency: string;
  language: string;
  timezone: string;
  refreshSettings: () => Promise<void>;
  fmtCurrency: (val: number) => string;
  fmtDate: (date: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('IDR');
  const [language, setLanguage] = useState('id');
  const [timezone, setTimezone] = useState('Asia/Jakarta');

  const refreshSettings = async () => {
    if (!user) return;
    
    const [pRes, sRes] = await Promise.all([
      supabase.from('profiles').select('currency').eq('id', user.id).maybeSingle(),
      supabase.from('user_settings').select('language, timezone').eq('user_id', user.id).maybeSingle()
    ]);

    if (pRes.data?.currency) setCurrency(pRes.data.currency);
    if (sRes.data?.language) setLanguage(sRes.data.language);
    if (sRes.data?.timezone) setTimezone(sRes.data.timezone);
  };

  useEffect(() => {
    refreshSettings();
  }, [user]);

  const fmtCurrency = (val: number) => formatCurrency(val, currency);
  const fmtDate = (date: string) => formatDate(date, language, timezone);

  return (
    <SettingsContext.Provider value={{ 
      currency, 
      language, 
      timezone, 
      refreshSettings, 
      fmtCurrency, 
      fmtDate 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
