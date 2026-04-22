import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

const gradientText = {
  background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function Login() {
  const router = useRouter();
  const { role } = router.query;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
          .then(({ data }) => {
            if (data) router.push(data.role === 'seller' ? '/seller' : '/buyer');
            else setChecking(false);
          });
      } else {
        setChecking(false);
      }
    });
  }, []);

  async function handleGoogleLogin() {
    if (!role) return;
    setLoading(true);
    localStorage.setItem('consultprop_role', role);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const label = role === 'seller' ? 'seller' : 'buyer';
  const icon = role === 'seller' ? '📋' : '🏠';

  if (checking) return (
    <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6B7280', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
    </div>
  );

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#0F1115', fontFamily: "'Inter', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0, marginBottom: '2rem' }}>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#E6EAF2', letterSpacing: '-0.03em' }}>consult</span>
            <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em', ...gradientText }}>prop</span>
            <span style={{ fontSize: 24, fontWeight: 600, color: '#6B7280', letterSpacing: '-0.03em' }}>.ai</span>
          </div>

          {/* Glass card */}
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, padding: '2rem' }}>
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>{icon}</div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: '#E6EAF2', marginBottom: '0.5rem' }}>
              Sign in as a {label}
            </h1>
            <p style={{ fontSize: 13, color: '#9AA3B2', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              {role === 'seller'
                ? 'List your property through a quick conversation.'
                : 'Get honest, unbiased advice on your property search.'}
            </p>

            {/* Glass Google button */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading || !role}
              style={{ width: '100%', padding: '0.85rem 1.5rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: "'Inter', sans-serif", color: '#E6EAF2', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 300ms ease, box-shadow 300ms ease, transform 300ms ease', opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(47,107,255,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>
          </div>

          <button
            onClick={() => router.push('/')}
            style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: '#6B7280', fontSize: 13, cursor: 'pointer', transition: 'color 300ms ease' }}
            onMouseEnter={e => e.currentTarget.style.color = '#9AA3B2'}
            onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
          >
            ← Back
          </button>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </>
  );
}
