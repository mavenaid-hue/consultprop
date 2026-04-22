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
    <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", gap: '1rem' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>C</div>
      <div style={{ color: '#9AA3B2', fontSize: 14 }}>{status}</div>
    </div>
  );
}
