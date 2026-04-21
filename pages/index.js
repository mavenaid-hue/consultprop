import Head from 'next/head';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>ConsultProp</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0D1B2A', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E8A020', color: '#0A1520', fontFamily: "'DM Serif Display', serif", fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</div>
          <span style={{ fontSize: 26, fontWeight: 500, color: '#F0EDE8', letterSpacing: '-0.02em' }}>ConsultProp</span>
        </div>

        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: 'rgba(240,237,232,0.5)', fontStyle: 'italic', marginBottom: '3rem', textAlign: 'center' }}>
          The first property consultant that works only for you.
        </p>

        {/* Two cards */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '3rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/login?role=buyer')}
            style={{ width: 240, padding: '2rem 1.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#E8A020'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,160,32,0.3)'}
          >
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>🏠</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#F0EDE8', marginBottom: '0.5rem' }}>I want to buy</div>
            <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.45)', lineHeight: 1.5 }}>Get honest advice tailored to your needs — no pressure, no commission.</div>
          </button>

          <button
            onClick={() => router.push('/login?role=seller')}
            style={{ width: 240, padding: '2rem 1.5rem', background: 'rgba(232,160,32,0.07)', border: '1px solid rgba(232,160,32,0.3)', borderRadius: 16, cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#E8A020'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(232,160,32,0.3)'}
          >
            <div style={{ fontSize: 28, marginBottom: '0.75rem' }}>📋</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: '#F0EDE8', marginBottom: '0.5rem' }}>I want to sell</div>
            <div style={{ fontSize: 13, color: 'rgba(240,237,232,0.45)', lineHeight: 1.5 }}>List your property through a quick conversation — we extract everything we need.</div>
          </button>
        </div>

        {/* Four promises */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['No commission to earn', 'No listings to push', 'No pressure to close', 'Just honest advice'].map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(240,237,232,0.4)' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#E8A020', flexShrink: 0 }} />
              {t}
            </div>
          ))}
        </div>
      </div>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { overflow-x: hidden; }`}</style>
    </>
  );
}
