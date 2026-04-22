import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';
import { resolveRole, syncProfile } from '../lib/auth-profile';
import BrandMark from '@/components/BrandMark';
import ChatMessage from '@/components/ChatMessage';
import LoadingScreen from '@/components/LoadingScreen';
import TypingDots from '@/components/TypingDots';
import styles from '@/styles/Workspace.module.css';

const promises = [
  'No commission to earn',
  'No listings to push',
  'No pressure to close',
  'Just honest advice',
];

export default function Buyer() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [journeyLog, setJourneyLog] = useState({});
  const [sessionId] = useState(() => `buyer_${Date.now()}`);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login?role=buyer');
        return;
      }

      const { data: profile, error } = await supabase.from('profiles').select('role,name').eq('id', session.user.id).maybeSingle();
      if (error) {
        console.error('[buyer] Profile lookup failed:', error.message);
      }

      const role = profile?.role || resolveRole(session.user);
      if (role !== 'buyer') {
        router.push('/login?role=buyer');
        return;
      }

      await syncProfile(supabase, session.user, role);
      setUser({
        ...session.user,
        name: profile?.name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
      });
      setAuthChecked(true);
    });
  }, []);

  useEffect(() => {
    if (authChecked) startConversation();
  }, [authChecked]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function startConversation() {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'start' }], sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([{ role: 'assistant', content: data.reply }]);
      if (data.journeyLog) setJourneyLog(data.journeyLog);
    } catch (e) {
      console.error('[startConversation]', e);
      setMessages([{ role: 'assistant', content: "Hey - what's on your mind?" }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ messages: newMessages, sessionId, journeyLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      if (data.journeyLog) setJourneyLog((prev) => ({ ...prev, ...data.journeyLog }));
    } catch (e) {
      console.error('[sendMessage]', e);
      setMessages((prev) => [...prev, { role: 'assistant', content: e.message || 'Something went wrong - try again.' }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const logEntries = Object.entries(journeyLog).filter(
    ([, value]) => value && value !== 'null' && !(Array.isArray(value) && value.length === 0)
  );

  if (!authChecked) {
    return <LoadingScreen message="Loading your buyer advisory workspace..." />;
  }

  return (
    <main className={`cp-page ${styles.page}`}>
      <div className={`cp-shell ${styles.shell}`}>
        <aside className={`cp-glass cp-panel ${styles.sidebar}`}>
          <div className={styles.sidebarTop}>
            <BrandMark />

            {user && (
              <div className={styles.userCard}>
                <div className={styles.userMeta}>
                  <div className={styles.userMetaLabel}>Signed in as</div>
                  <div className={styles.userMetaValue}>{user.name || user.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`cp-button cp-buttonGhost ${styles.logoutButton}`}
                >
                  Sign out
                </button>
              </div>
            )}

            <div className={`cp-glassSoft ${styles.sidebarCard}`}>
              <div className={styles.sectionLabel}>Advisory principles</div>
              <div className={`${styles.sectionBody} ${styles.promiseList}`}>
                {promises.map((promise) => (
                  <div key={promise} className={styles.promiseItem}>
                    <span className={styles.promiseDot} />
                    <div className={styles.promiseText}>{promise}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {logEntries.length > 0 && (
            <div className={`cp-glassSoft ${styles.sidebarCard} ${styles.sidebarFooter}`}>
              <div className={styles.sectionLabel}>What I know so far</div>
              <div className={`${styles.sectionBody} ${styles.summaryList}`}>
                {logEntries.map(([key, value]) => (
                  <div key={key} className={styles.summaryItem}>
                    <span className={styles.promiseDot} />
                    <div>
                      <div className={styles.summaryKey}>{key.replace(/_/g, ' ')}</div>
                      <div className={styles.summaryValue}>{Array.isArray(value) ? value.join(', ') : String(value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className={`cp-glass cp-panel ${styles.main}`}>
          <header className={styles.mainHeader}>
            <div className={styles.mainHeaderCopy}>
              <div className="cp-kicker">Buyer workspace</div>
              <h1 className={`cp-heading ${styles.mainTitle}`}>Calm guidance for a high-stakes property decision.</h1>
              <p className={`cp-body ${styles.mainText}`}>
                Share what matters and the advisory flow will keep track of goals, tradeoffs, and context as the
                conversation unfolds.
              </p>
            </div>

            <div className={styles.headerMeta}>
              <div className="cp-chip">
                <span className="cp-chipDot" />
                Honest advice only
              </div>
              <div className="cp-chip">{logEntries.length} signals captured</div>
            </div>
          </header>

          <div className={styles.chatFeed}>
            <div className={styles.chatFeedInner}>
              {messages.map((msg, index) => (
                <ChatMessage key={`${msg.role}-${index}`} role={msg.role} content={msg.content} />
              ))}

              {loading && (
                <div className="cp-chatRow">
                  <div className="cp-chatAvatar">C</div>
                  <div className="cp-chatBubble cp-chatBubble--assistant">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          <div className={styles.composer}>
            <div className={styles.composerInner}>
              <div className={styles.composerField}>
                <label className="cp-srOnly" htmlFor="buyer-message">
                  Message
                </label>
                <textarea
                  id="buyer-message"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Tell me what you are looking for..."
                  disabled={loading}
                  rows={1}
                  className="cp-textarea"
                />
              </div>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="cp-iconButton cp-iconButton--primary"
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M4 10h12M16 10l-4.5-4.5M16 10l-4.5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <p className={styles.footerNote}>ConsultProp has no commission to earn. It will always tell you the truth.</p>
        </section>
      </div>
    </main>
  );
}
