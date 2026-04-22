import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import supabase from '../lib/supabase';
import { resolveRole } from '../lib/auth-profile';
import BrandMark from '@/components/BrandMark';
import LoadingScreen from '@/components/LoadingScreen';
import RoleGlyph from '@/components/RoleGlyph';
import styles from '@/styles/Auth.module.css';

const copyByRole = {
  buyer: {
    title: 'A private advisory room for your search.',
    body: 'Get grounded, commission-free guidance while you compare neighborhoods, budgets, and tradeoffs.',
    pitch: 'Every prompt is tuned to surface clarity, not pressure.',
  },
  seller: {
    title: 'A premium intake flow for serious listings.',
    body: 'Capture the right details, shape the story, and move from raw information to a polished listing faster.',
    pitch: 'Your property details are structured as the conversation unfolds.',
  },
};

const sharedBenefits = [
  { label: 'Secure sign-in', text: 'Google authentication keeps entry fast while preserving your role-specific flow.' },
  { label: 'Intent-aware', text: 'Buyer and seller experiences stay separated so the questions always fit the task.' },
  { label: 'Premium UX', text: 'Every step is wrapped in a calm visual system built for trust-heavy decisions.' },
];

export default function Login() {
  const router = useRouter();
  const { role } = router.query;
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!router.isReady) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (data?.role) {
              router.push(data.role === 'seller' ? '/seller' : '/buyer');
              return;
            }

            if (error) {
              console.error('[login] Profile lookup failed:', error.message);
            }

            const resolvedRole = resolveRole(session.user);
            router.push(resolvedRole === 'seller' ? '/seller' : '/buyer');
          });
      } else {
        setChecking(false);
      }
    });
  }, [router]);

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
  const copy = copyByRole[label];

  if (checking) {
    return <LoadingScreen message="Preparing secure sign in..." />;
  }

  return (
    <main className={`cp-page ${styles.page}`}>
      <div className={`cp-shell ${styles.frame}`}>
        <section className={`cp-glass cp-panel ${styles.infoPanel}`}>
          <div className={styles.eyebrow}>
            <BrandMark size="lg" />
            <div className="cp-chip">
              <span className="cp-chipDot" />
              Role-aware entry
            </div>
          </div>

          <div className={styles.intro}>
            <div className="cp-kicker">Welcome back</div>
            <h1 className={`cp-heading ${styles.title}`}>{copy.title}</h1>
            <p className="cp-body">{copy.body}</p>
            <p className="cp-body">{copy.pitch}</p>
          </div>

          <div className={styles.benefitGrid}>
            {sharedBenefits.map((item) => (
              <div key={item.label} className={styles.benefitCard}>
                <div className={styles.benefitLabel}>{item.label}</div>
                <div className={styles.benefitText}>{item.text}</div>
              </div>
            ))}
          </div>
        </section>

        <section className={`cp-glass cp-panel ${styles.authPanel}`}>
          <div className={`cp-glassSoft ${styles.authCard}`}>
            <div className={styles.authCardHeader}>
              <BrandMark />
              <div className={styles.roleBadge}>
                <RoleGlyph role={label} />
              </div>
            </div>

            <div className="cp-kicker">Continue as {label}</div>
            <h2 className={`cp-heading ${styles.authTitle}`}>Enter your {label} workspace.</h2>
            <p className={`cp-body ${styles.authText}`}>
              {label === 'seller'
                ? 'Sign in to continue the listing intake flow and keep your property details organized.'
                : 'Sign in to continue your advisory chat and keep your property journey in one place.'}
            </p>

            <div className={styles.buttonRow}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || !role}
                className={`cp-button cp-buttonPrimary ${styles.button}`}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                    fill="#EA4335"
                  />
                </svg>
                {loading ? 'Redirecting...' : 'Continue with Google'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => router.push('/')}
              className={`cp-button cp-buttonGhost ${styles.backButton}`}
            >
              Back to home
            </button>

            <p className={styles.legal}>Your role is remembered locally so the callback can restore the right workspace.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
