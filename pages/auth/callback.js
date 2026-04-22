import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';

const gradientBg = { background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)' };

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Signing you in…');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!router.isReady) return;

    const handleCallback = async () => {
      try {
        const { code, error: urlError, error_description } = router.query;

        // Step 1 — surface any OAuth-level error from the redirect URL
        if (urlError) {
          throw new Error(error_description || urlError);
        }

        // Step 2 — exchange the code for a session
        let session = null;

        if (code) {
          setStatus('Verifying with Google…');
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
          if (!exchangeError && data?.session) {
            session = data.session;
          }
        }

        // Step 3 — fall back to getSession (covers implicit flow / already-exchanged code)
        if (!session) {
          setStatus('Loading your account…');
          const { data: { session: existing } } = await supabase.auth.getSession();
          session = existing;
        }

        // Step 4 — wait 2 s and try one final time if still nothing
        if (!session) {
          setStatus('Finishing up…');
          await new Promise(resolve => setTimeout(resolve, 2000));
          const { data: { session: retried } } = await supabase.auth.getSession();
          session = retried;
        }

        if (!session) {
          throw new Error('No session established after sign-in. Please try again.');
        }

        const user = session.user;

        // Step 5 — read role and upsert profile
        const role = localStorage.getItem('consultprop_role') || 'buyer';
        localStorage.removeItem('consultprop_role');

        setStatus('Setting up your account…');
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || '',
          role,
        });

        if (upsertError) throw upsertError;

        // Step 6 — redirect
        router.replace(role === 'seller' ? '/seller' : '/buyer');

      } catch (err) {
        console.error('[callback]', err);
        setError(err.message || 'Something went wrong during sign-in.');
      }
    };

    handleCallback();
  }, [router.isReady]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", padding: '2rem', gap: '1.5rem', textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, ...gradientBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>C</div>
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,100,100,0.25)', borderRadius: 16, padding: '1.5rem 2rem', maxWidth: 420 }}>
          <p style={{ color: '#E6EAF2', fontSize: 15, fontWeight: 600, marginBottom: '0.5rem' }}>Sign-in failed</p>
          <p style={{ color: '#9AA3B2', fontSize: 13, lineHeight: 1.6, marginBottom: '1.25rem' }}>{error}</p>
          <a href="/" style={{ display: 'inline-block', padding: '0.6rem 1.25rem', borderRadius: 50, fontSize: 13, fontWeight: 500, color: '#fff', textDecoration: 'none', ...gradientBg }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif", gap: '1.25rem' }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, ...gradientBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>C</div>
      <div style={{ color: '#9AA3B2', fontSize: 14 }}>{status}</div>
      <div style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B7280', animation: `pulse 1.3s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <style>{`@keyframes pulse{0%,80%,100%{opacity:0.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
    </div>
  );
}
