
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://acixwwacztqxpgkxvgim.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaXh3d2FjenRxeHBna3h2Z2ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NTExMTQsImV4cCI6MjA4NTMyNzExNH0.yrghJL3X8IZM6E2ZZ80SzmUboWM0L45ELoU-5OHkLJw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
