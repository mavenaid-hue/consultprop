import { useRouter } from 'next/router';
import BrandMark from '@/components/BrandMark';
import RoleGlyph from '@/components/RoleGlyph';
import styles from '@/styles/Home.module.css';

const roleCards = [
  {
    role: 'buyer',
    title: 'I want to buy',
    body: 'Get calm, unbiased property guidance tailored to your goals, budget, and timeline.',
    meta: 'Advisory mode',
    href: '/login?role=buyer',
  },
  {
    role: 'seller',
    title: 'I want to sell',
    body: 'Launch a polished listing flow through one guided conversation and structured follow-up.',
    meta: 'Listing mode',
    href: '/login?role=seller',
  },
];

const promises = [
  'No commission to protect',
  'No listings to push',
  'No pressure to close',
  'Just clear property advice',
];

const metrics = [
  { value: '24/7', label: 'Strategic guidance on demand' },
  { value: 'Zero', label: 'Commission-driven incentives' },
  { value: '1', label: 'Streamlined AI conversation flow' },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className={`cp-page ${styles.page}`}>
      <div className={`cp-shell ${styles.frame}`}>
        <section className={`cp-glass cp-panel ${styles.heroPanel}`}>
          <div className={styles.brandRow}>
            <BrandMark size="lg" />
            <div className="cp-chip">
              <span className="cp-chipDot" />
              Premium PropTech advisory
            </div>
          </div>

          <div className={styles.heroBody}>
            <div className="cp-kicker">Glassmorphism workspace for modern property decisions</div>
            <h1 className={`cp-heading ${styles.headline}`}>
              Find, assess, and launch property moves with{' '}
              <span className={`cp-gradientText ${styles.headlineAccent}`}>signal over noise.</span>
            </h1>
            <p className={`cp-body ${styles.lead}`}>
              ConsultProp pairs a refined client experience with a structured AI flow so buyers get honest advice and
              sellers list faster without losing clarity.
            </p>
          </div>

          <div className={styles.metrics}>
            {metrics.map((item) => (
              <div key={item.label} className={styles.metricCard}>
                <span className={styles.metricValue}>{item.value}</span>
                <span className={styles.metricLabel}>{item.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.dashboardCard}>
            <div>
              <p className="cp-kicker">What feels premium here</p>
              <h2 className={styles.dashboardTitle}>A calmer front door for a high-stakes decision.</h2>
              <p className={styles.dashboardBody}>
                The experience is tuned for trust: soft glass layers, clear next steps, and an interface that feels
                more like a private deal room than a generic chatbot.
              </p>
            </div>

            <div className={styles.dashboardStats}>
              <div className={styles.dashboardStat}>
                <strong>Buyer</strong>
                <span>Needs capture, guidance, and decision support</span>
              </div>
              <div className={styles.dashboardStat}>
                <strong>Seller</strong>
                <span>Structured listing intake with media-ready details</span>
              </div>
            </div>
          </div>
        </section>

        <section className={`cp-glass cp-panel ${styles.selectionPanel}`}>
          <div className={styles.selectionHeader}>
            <div className="cp-chip">
              <span className="cp-chipDot" />
              Choose your path
            </div>
            <h2 className={`cp-heading ${styles.selectionTitle}`}>Step into a workspace built for your role.</h2>
            <p className="cp-body">
              Same intelligence, different flow. Pick the experience that matches what you are trying to do today.
            </p>
          </div>

          <div className={styles.roleGrid}>
            {roleCards.map((card) => (
              <button
                key={card.role}
                type="button"
                className={`cp-button cp-buttonGhost ${styles.roleCard}`}
                onClick={() => router.push(card.href)}
              >
                <div className={styles.roleTop}>
                  <span className={styles.roleIconWrap}>
                    <RoleGlyph role={card.role} />
                  </span>
                  <svg className={styles.roleArrow} width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M4.5 10h11M15.5 10 11 5.5M15.5 10 11 14.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className={styles.roleTitle}>{card.title}</div>
                <div className={styles.roleBody}>{card.body}</div>
                <div className={styles.roleMeta}>{card.meta}</div>
              </button>
            ))}
          </div>

          <div className={styles.promiseStrip}>
            {promises.map((promise) => (
              <div key={promise} className={styles.promiseItem}>
                <span />
                {promise}
              </div>
            ))}
          </div>

          <p className={styles.microcopy}>Designed to feel expensive, deliberate, and trustworthy without adding friction.</p>
        </section>
      </div>
    </main>
  );
}
