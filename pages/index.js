import { useRouter } from 'next/router';

const gradientText = {
  background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const glassCard = {
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  borderRadius: 16,
};

export default function Home() {
  const router = useRouter();

  return (
    <>
      <div style={{ minHeight: '100vh', background: '#0F1115', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: '0.5rem' }}>
          <span style={{ fontSize: 30, fontWeight: 600, color: '#E6EAF2', letterSpacing: '-0.03em' }}>consult</span>
          <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', ...gradientText }}>prop</span>
          <span style={{ fontSize: 30, fontWeight: 600, color: '#6B7280', letterSpacing: '-0.03em' }}>.ai</span>
        </div>

        {/* Hero */}
        <h1 style={{ fontSize: 42, fontWeight: 600, color: '#E6EAF2', letterSpacing: '-0.03em', textAlign: 'center', marginBottom: '0.6rem', lineHeight: 1.2 }}>
          Find your home.{' '}
          <span style={gradientText}>Smarter.</span>
        </h1>
        <p style={{ fontSize: 16, color: '#9AA3B2', marginBottom: '3rem', textAlign: 'center' }}>
          Your own AI property guide
        </p>

        {/* Two glass cards */}
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/login?role=buyer')}
            style={{ width: 240, padding: '2rem 1.5rem', ...glassCard, cursor: 'pointer', textAlign: 'left', transition: 'transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(47,107,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(47,107,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
          >
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>🏠</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#E6EAF2', marginBottom: '0.5rem' }}>I want to buy</div>
            <div style={{ fontSize: 13, color: '#9AA3B2', lineHeight: 1.6 }}>Get honest advice tailored to your needs — no pressure, no commission.</div>
          </button>

          <button
            onClick={() => router.push('/login?role=seller')}
            style={{ width: 240, padding: '2rem 1.5rem', ...glassCard, cursor: 'pointer', textAlign: 'left', transition: 'transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(123,63,242,0.2)'; e.currentTarget.style.borderColor = 'rgba(123,63,242,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
          >
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>📋</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: '#E6EAF2', marginBottom: '0.5rem' }}>I want to sell</div>
            <div style={{ fontSize: 13, color: '#9AA3B2', lineHeight: 1.6 }}>List your property through a quick conversation — we extract everything we need.</div>
          </button>
        </div>

        {/* Four promises */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['No commission to earn', 'No listings to push', 'No pressure to close', 'Just honest advice'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6B7280' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)', flexShrink: 0 }} />
              {t}
            </div>
          ))}
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { overflow-x: hidden; }`}</style>
    </>
  );
}
