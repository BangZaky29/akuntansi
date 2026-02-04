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

        // Detect verification type from search, hash, or raw URL string
        const typeSearch = urlParams.get('type');
        const typeHash = hashParams.get('type');
        const isRecovery = window.location.href.includes('type=recovery') || typeSearch === 'recovery' || typeHash === 'recovery';
        const isUnlock = window.location.href.includes('unlock=true') || urlParams.get('unlock') === 'true' || hashParams.get('unlock') === 'true';

        console.log('AuthCallback: analysis', {
          typeSearch,
          typeHash,
          isRecovery,
          isUnlock,
          fullUrl: window.location.href
        });

        // ⬇️ penting untuk signup / email confirmation / recovery
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(window.location.href)

        if (exchangeError) {
          console.error('Exchange session error:', exchangeError)
          // Don't immediately exit if we might be in an implicit flow or already have a session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            navigate('/login', { replace: true })
            return
          }
        }

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          console.log('AuthCallback: no session found after exchange attempt');
          navigate('/login', { replace: true })
          return
        }

        // Determine verification type and redirect
        let verificationType = 'register';

        // Priority 1: Recovery/Reset Password (Must go directly to reset page)
        if (isRecovery) {
          console.log('AuthCallback: MATCHED recovery flow, redirecting to /reset-password');
          navigate('/reset-password', { replace: true });
          return;
        }

        // Priority 2: Unlock Balance flow
        if (isUnlock) {
          console.log('AuthCallback: MATCHED unlock flow');
          verificationType = 'unlockBalance';
        }
        // Priority 3: Magiclink login or standard confirm
        else if (typeSearch === 'magiclink' || typeHash === 'magiclink') {
          console.log('AuthCallback: MATCHED magiclink flow');
          // Secondary check for unlock inside magiclink (legacy support)
          const redirectTo = urlParams.get('redirect_to') || hashParams.get('redirect_to') || '';
          if (redirectTo.includes('unlock=true')) {
            verificationType = 'unlockBalance';
          }
        }

        console.log('AuthCallback: FINAL verificationType', { verificationType });

        // Redirect to success animation page for non-recovery flows
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
