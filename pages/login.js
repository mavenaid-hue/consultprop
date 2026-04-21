import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';

export default function Login() {
  const router = useRouter();
  const { role } = router.query;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
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
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(240,237,232,0.4)', fontSize: 14 }}>Loading…</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Sign in — ConsultProp</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0D1B2A', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: '2rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#E8A020', color: '#0A1520', fontFamily: "'DM Serif Display', serif", fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</div>
            <span style={{ fontSize: 20, fontWeight: 500, color: '#F0EDE8', letterSpacing: '-0.02em' }}>ConsultProp</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '2rem' }}>
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>{icon}</div>
            <h1 style={{ fontSize: 20, fontWeight: 500, color: '#F0EDE8', marginBottom: '0.5rem' }}>
              Sign in as a {label}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(240,237,232,0.45)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
              {role === 'seller'
                ? 'List your property through a quick conversation.'
                : 'Get honest, unbiased advice on your property search.'}
            </p>

            <button
              onClick={handleGoogleLogin}
              disabled={loading || !role}
              style={{ width: '100%', padding: '0.85rem 1.5rem', background: loading ? 'rgba(232,160,32,0.5)' : '#E8A020', color: '#0A1520', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#0A1520"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#0A1520"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#0A1520"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#0A1520"/>
              </svg>
              {loading ? 'Redirecting…' : 'Continue with Google'}
            </button>
          </div>

          <button onClick={() => router.push('/')} style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: 'rgba(240,237,232,0.3)', fontSize: 13, cursor: 'pointer' }}>
            ← Back
          </button>
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </>
  );
}
