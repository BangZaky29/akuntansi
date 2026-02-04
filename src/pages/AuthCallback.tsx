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
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));

        console.log('AuthCallback: detecting params', {
          search: window.location.search,
          hash: window.location.hash
        });

        // Detect verification type from URL params
        const type = urlParams.get('type') || hashParams.get('type') || 'email';
        const unlockParam = urlParams.get('unlock') || hashParams.get('unlock');

        console.log('AuthCallback: params found', { type, unlockParam });

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
          console.log('AuthCallback: no session found');
          navigate('/login', { replace: true })
          return
        }

        // Determine verification type and redirect to success page
        let verificationType = 'register';

        // Check if unlock param is present (for unlock balance flow)
        if (unlockParam === 'true') {
          console.log('AuthCallback: detected unlock flow from param');
          verificationType = 'unlockBalance';
        }
        // Priority 2: Recovery/Reset Password type
        else if (type === 'recovery') {
          console.log('AuthCallback: detected password recovery flow, redirecting to reset-password');
          navigate('/reset-password', { replace: true });
          return;
        }
        // Priority 3: Magiclink type with secondary checks
        else if (type === 'magiclink') {
          const redirectTo = urlParams.get('redirect_to') || hashParams.get('redirect_to') || '';
          console.log('AuthCallback: checking magiclink redirect_to', { redirectTo });

          if (redirectTo.includes('unlock=true')) {
            console.log('AuthCallback: detected unlock flow from redirect_to');
            verificationType = 'unlockBalance';
          }
        }

        // Redirect to success page with type
        navigate(`/verification-success?type=${verificationType}`, { replace: true });
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
