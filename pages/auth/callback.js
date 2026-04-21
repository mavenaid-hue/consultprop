import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in…');

  useEffect(() => {
    if (!router.isReady) return;

    const handleCallback = async () => {
      try {
        const { code } = router.query;

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          router.push('/login');
          return;
        }

        const role = localStorage.getItem('consultprop_role') || 'buyer';

        // Check if profile already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (!existing) {
          setStatus('Setting up your profile…');
          await supabase.from('profiles').insert({
            id: session.user.id,
            role,
            name: session.user.user_metadata?.full_name || '',
            email: session.user.email,
          });
          localStorage.removeItem('consultprop_role');
          router.push(role === 'seller' ? '/seller' : '/buyer');
        } else {
          localStorage.removeItem('consultprop_role');
          router.push(existing.role === 'seller' ? '/seller' : '/buyer');
        }
      } catch (err) {
        console.error('[callback]', err);
        router.push('/login');
      }
    };

    handleCallback();
  }, [router.isReady]);

  return (
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: '#E8A020', marginBottom: '1rem' }} />
      <div style={{ color: 'rgba(240,237,232,0.5)', fontSize: 14 }}>{status}</div>
    </div>
  );
}
