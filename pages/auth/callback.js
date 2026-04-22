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
        // PKCE flow: exchange the code for a session
        const { code, error: oauthError } = router.query;

        if (oauthError) {
          throw new Error(`OAuth error: ${router.query.error_description || oauthError}`);
        }

        if (code) {
          setStatus('Verifying with Google…');
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(String(code));
          if (exchangeError) throw exchangeError;
        }

        // Confirm we have a valid session (works for both PKCE and implicit flow)
        setStatus('Loading your account…');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;
        if (!session) throw new Error('No session established after sign-in. Please try again.');

        // Read role saved before the OAuth redirect
        const role = localStorage.getItem('consultprop_role') || 'buyer';
        localStorage.removeItem('consultprop_role');

        // Check if this user already has a profile
        const { data: existing, error: profileReadError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileReadError) throw profileReadError;

        if (!existing) {
          setStatus('Setting up your account…');
          const { error: insertError } = await supabase.from('profiles').insert({
            id: session.user.id,
            role,
            name: session.user.user_metadata?.full_name || '',
            email: session.user.email,
          });
          if (insertError) throw insertError;
          router.replace(role === 'seller' ? '/seller' : '/buyer');
        } else {
          router.replace(existing.role === 'seller' ? '/seller' : '/buyer');
        }
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
        <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,100,100,0.3)', borderRadius: 16, padding: '1.5rem 2rem', maxWidth: 400 }}>
          <p style={{ color: '#E6EAF2', fontSize: 15, fontWeight: 500, marginBottom: '0.5rem' }}>Sign-in failed</p>
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
