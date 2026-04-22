import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import supabase from '../../lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [status, setStatus] = useState('Completing sign in...')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (session) {
          const role = localStorage.getItem('consultprop_role') || 'buyer'

          await supabase.from('profiles').upsert({
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || '',
            role: role
          })

          router.push(role === 'seller' ? '/seller' : '/buyer')
          return
        }

        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (data.session) {
            const role = localStorage.getItem('consultprop_role') || 'buyer'
            await supabase.from('profiles').upsert({
              id: data.session.user.id,
              email: data.session.user.email,
              name: data.session.user.user_metadata?.full_name || '',
              role: role
            })
            router.push(role === 'seller' ? '/seller' : '/buyer')
            return
          }
        }

        setStatus('Sign in failed. Redirecting...')
        setTimeout(() => router.push('/'), 2000)

      } catch (err) {
        console.error('Callback error:', err)
        setStatus('Something went wrong. Redirecting...')
        setTimeout(() => router.push('/'), 2000)
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{
      height: '100vh',
      background: '#0F1115',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      color: '#E6EAF2',
      fontSize: '16px'
    }}>
      {status}
    </div>
  )
}
