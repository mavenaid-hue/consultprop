import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';
import { normalizeRole, persistRoleMetadata, syncProfile } from '../../lib/auth-profile';
import LoadingScreen from '@/components/LoadingScreen';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    let isActive = true;
    let timeoutId;
    let authSubscription;

    async function finishSignIn(session, role) {
      if (!session?.user || !isActive) return;

      await persistRoleMetadata(supabase, session.user, role);
      await syncProfile(supabase, session.user, role);
      localStorage.removeItem('consultprop_role');

      router.replace(role === 'seller' ? '/seller' : '/buyer');
    }

    async function handleCallback() {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const role = normalizeRole(localStorage.getItem('consultprop_role') || 'buyer');
        const errorDescription =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await finishSignIn(session, role);
          return;
        }

        setStatus('Waiting for secure sign in to finish...');

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && nextSession) {
            clearTimeout(timeoutId);
            subscription.unsubscribe();
            await finishSignIn(nextSession, role);
          }
        });

        authSubscription = subscription;

        timeoutId = setTimeout(() => {
          if (!isActive) return;
          authSubscription?.unsubscribe();
          setStatus('Sign in failed. No session was established.');
        }, 10000);
      } catch (err) {
        console.error('Callback error:', err);
        setStatus(`Sign in failed: ${err.message || 'Something went wrong.'}`);
      }
    }

    handleCallback();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      authSubscription?.unsubscribe();
    };
  }, [router]);

  return <LoadingScreen message={status} />;
}
