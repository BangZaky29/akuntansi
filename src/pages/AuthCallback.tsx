import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // ⬇️ penting untuk signup / email confirmation
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(window.location.href)

        if (exchangeError) {
          console.error('Exchange session error:', exchangeError)
          navigate('/login', { replace: true })
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!data.session) {
          navigate('/login', { replace: true })
          return
        }

        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Auth callback fatal error:', err)
        navigate('/login', { replace: true })
      }
    }

    handleAuth()
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6">
          <Loader2 className="animate-spin" size={32} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Mengonfirmasi Akun
        </h1>
        <p className="text-slate-500 text-sm">
          Mohon tunggu sebentar, kami sedang menyiapkan lingkungan akuntansi Anda...
        </p>
      </motion.div>
    </div>
  )
}
