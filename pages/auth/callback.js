import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabase';
import { normalizeRole, persistRoleMetadata, syncProfile } from '../../lib/auth-profile';
import LoadingScreen from '@/components/LoadingScreen';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Completing sign in...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const role = normalizeRole(localStorage.getItem('consultprop_role') || 'buyer');
        const authCode = searchParams.get('code');
        const errorDescription =
          searchParams.get('error_description') ||
          searchParams.get('error') ||
          hashParams.get('error_description') ||
          hashParams.get('error');

        if (errorDescription) {
          throw new Error(errorDescription);
        }

        if (authCode) {
          setStatus('Finishing secure sign in...');

          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;

          if (data.session) {
            await persistRoleMetadata(supabase, data.session.user, role);
            await syncProfile(supabase, data.session.user, role);

            localStorage.removeItem('consultprop_role');
            router.replace(role === 'seller' ? '/seller' : '/buyer');
            return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          await persistRoleMetadata(supabase, session.user, role);
          await syncProfile(supabase, session.user, role);

          localStorage.removeItem('consultprop_role');
          router.replace(role === 'seller' ? '/seller' : '/buyer');
          return;
        }
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          setStatus('Restoring your session...');

          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;

          if (data.session) {
            await persistRoleMetadata(supabase, data.session.user, role);
            await syncProfile(supabase, data.session.user, role);

            localStorage.removeItem('consultprop_role');
            router.replace(role === 'seller' ? '/seller' : '/buyer');
            return;
          }
        }

        setStatus('Sign in failed. Redirecting...');
        setTimeout(() => router.push('/'), 2000);
      } catch (err) {
        console.error('Callback error:', err);
        setStatus(`Sign in failed: ${err.message || 'Something went wrong.'}`);
      }
    };

    handleCallback();
  }, []);

  return <LoadingScreen message={status} />;
}
