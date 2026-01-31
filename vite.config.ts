/// <reference types="vite/client" />

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: import.meta.env.VITE_APP_BASE_URL,
  plugins: [react()],
})
