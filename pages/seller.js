import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';
import { resolveRole, syncProfile } from '../lib/auth-profile';
import BrandMark from '@/components/BrandMark';
import ChatMessage from '@/components/ChatMessage';
import LoadingScreen from '@/components/LoadingScreen';
import TypingDots from '@/components/TypingDots';
import styles from '@/styles/Workspace.module.css';

const FIELD_LABELS = {
  location: 'Location',
  area: 'Area',
  price: 'Price',
  property_type: 'Type',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  floor: 'Floor',
  has_lift: 'Lift',
  parking: 'Parking',
  unique_features: 'Features',
  is_owner: 'Owner/Broker',
  contact_name: 'Contact Name',
  contact_phone: 'Phone',
};

export default function Seller() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [propertyData, setPropertyData] = useState({});
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sessionId] = useState(() => `seller_${Date.now()}`);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login?role=seller');
        return;
      }

      const { data: profile, error } = await supabase.from('profiles').select('role,name').eq('id', session.user.id).maybeSingle();
      if (error) {
        console.error('[seller] Profile lookup failed:', error.message);
      }

      const role = profile?.role || resolveRole(session.user);
      if (role !== 'seller') {
        router.push('/login?role=seller');
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

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }

  async function startConversation() {
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch('/api/seller-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'start' }], sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([{ role: 'assistant', content: data.reply }]);
      if (data.propertyData) setPropertyData(data.propertyData);
    } catch (e) {
      console.error('[startConversation]', e);
      setMessages([{ role: 'assistant', content: 'Tell me about the property - where is it and what type?' }]);
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
      const token = await getToken();
      const res = await fetch('/api/seller-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages, sessionId, propertyData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      if (data.propertyData) setPropertyData((prev) => ({ ...prev, ...data.propertyData }));
    } catch (e) {
      console.error('[sendMessage]', e);
      setMessages((prev) => [...prev, { role: 'assistant', content: e.message || 'Something went wrong - try again.' }]);
    }

    setLoading(false);
    inputRef.current?.focus();
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    const token = await getToken();
    const uploaded = [];

    for (const file of files) {
      try {
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ base64, filename: file.name, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      } catch (err) {
        console.error('[upload]', err);
      }
    }

    if (uploaded.length > 0) {
      setPhotos((prev) => [...prev, ...uploaded]);
      const photoMsg = `I've added ${uploaded.length} photo${uploaded.length > 1 ? 's' : ''}.`;
      const newMessages = [...messages, { role: 'user', content: photoMsg }];
      setMessages(newMessages);
      setLoading(true);

      try {
        const res = await fetch('/api/seller-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: newMessages,
            sessionId,
            propertyData: { ...propertyData, photos: [...(propertyData.photos || []), ...uploaded] },
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
        if (data.propertyData) {
          setPropertyData((prev) => ({ ...prev, ...data.propertyData, photos: [...(prev.photos || []), ...uploaded] }));
        }
      } catch (err) {
        console.error('[photo-chat]', err);
      }

      setLoading(false);
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const dataEntries = Object.entries(propertyData).filter(
    ([key, value]) =>
      key !== 'status' &&
      value !== null &&
      value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      value !== 'null'
  );

  if (!authChecked) {
    return <LoadingScreen message="Loading your seller listing workspace..." />;
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
                  <div className={styles.userMetaLabel}>Listing as</div>
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

            {dataEntries.length > 0 && (
              <div className={`cp-glassSoft ${styles.sidebarCard}`}>
                <div className={styles.sectionLabel}>Listing so far</div>
                <div className={`${styles.sectionBody} ${styles.summaryList}`}>
                  {dataEntries.map(([key, value]) => (
                    <div key={key} className={styles.summaryItem}>
                      <span className={styles.promiseDot} />
                      <div>
                        <div className={styles.summaryKey}>{FIELD_LABELS[key] || key}</div>
                        <div className={styles.summaryValue}>
                          {Array.isArray(value)
                            ? value.join(', ')
                            : typeof value === 'boolean'
                              ? value
                                ? 'Yes'
                                : 'No'
                              : String(value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div className={`cp-glassSoft ${styles.sidebarCard} ${styles.sidebarFooter}`}>
              <div className={styles.sectionLabel}>Photos ({photos.length})</div>
              <div className={styles.photosGrid}>
                {photos.map((url, index) => (
                  <div key={`${url}-${index}`} className={styles.photoThumb}>
                    <img src={url} alt={`Photo ${index + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className={`cp-glass cp-panel ${styles.main}`}>
          <header className={styles.mainHeader}>
            <div className={styles.mainHeaderCopy}>
              <div className="cp-kicker">Seller workspace</div>
              <h1 className={`cp-heading ${styles.mainTitle}`}>Capture listing details in a way that feels premium.</h1>
              <p className={`cp-body ${styles.mainText}`}>
                Use the conversation to collect accurate property information, upload photos, and keep every detail in a
                single structured flow.
              </p>
            </div>

            <div className={styles.headerMeta}>
              <div className="cp-chip">
                <span className="cp-chipDot" />
                Listing intake
              </div>
              <div className="cp-chip">{dataEntries.length} data points captured</div>
              <div className="cp-chip">{photos.length} photos attached</div>
            </div>
          </header>

          <div className={styles.chatFeed}>
            <div className={styles.chatFeedInner}>
              {messages.map((msg, index) => (
                <ChatMessage key={`${msg.role}-${index}`} role={msg.role} content={msg.content} />
              ))}

              {(loading || uploading) && (
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
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="cp-srOnly"
                tabIndex={-1}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                className="cp-iconButton"
                aria-label="Upload photos"
                title="Upload photos"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="7.5" cy="10.5" r="1.5" fill="currentColor" />
                  <path
                    d="M2 14l4-4 3 3 3-4 4 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 5V3M10 5V2M13 5V3"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div className={styles.composerField}>
                <label className="cp-srOnly" htmlFor="seller-message">
                  Message
                </label>
                <textarea
                  id="seller-message"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Describe your property..."
                  disabled={loading || uploading}
                  rows={1}
                  className="cp-textarea"
                />
              </div>

              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || uploading || !input.trim()}
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

          <p className={styles.footerNote}>Your listing details are saved automatically as you chat.</p>
        </section>
      </div>
    </main>
  );
}
