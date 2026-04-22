import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';

const FIELD_LABELS = {
  location: 'Location', area: 'Area', price: 'Price', property_type: 'Type',
  bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', floor: 'Floor',
  has_lift: 'Lift', parking: 'Parking', unique_features: 'Features',
  is_owner: 'Owner/Broker', contact_name: 'Contact Name', contact_phone: 'Phone',
};

const gradientText = {
  background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

const gradientBg = {
  background: 'linear-gradient(135deg, #2F6BFF, #7B3FF2)',
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
  const [sessionId] = useState(() => 'seller_' + Date.now());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login?role=seller'); return; }
      const { data: profile } = await supabase.from('profiles').select('role,name').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'seller') { router.push('/login?role=seller'); return; }
      setUser({ ...session.user, name: profile.name });
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'start' }], sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([{ role: 'assistant', content: data.reply }]);
      if (data.propertyData) setPropertyData(data.propertyData);
    } catch (e) {
      console.error('[startConversation]', e);
      setMessages([{ role: 'assistant', content: "Tell me about the property — where is it and what type?" }]);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ messages: newMessages, sessionId, propertyData }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      if (data.propertyData) setPropertyData(prev => ({ ...prev, ...data.propertyData }));
    } catch (e) {
      console.error('[sendMessage]', e);
      setMessages(prev => [...prev, { role: 'assistant', content: e.message || 'Something went wrong — try again.' }]);
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ base64, filename: file.name, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.url) uploaded.push(data.url);
      } catch (err) {
        console.error('[upload]', err);
      }
    }

    if (uploaded.length > 0) {
      setPhotos(prev => [...prev, ...uploaded]);
      const photoMsg = `I've added ${uploaded.length} photo${uploaded.length > 1 ? 's' : ''}.`;
      const newMessages = [...messages, { role: 'user', content: photoMsg }];
      setMessages(newMessages);
      setLoading(true);
      try {
        const res = await fetch('/api/seller-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ messages: newMessages, sessionId, propertyData: { ...propertyData, photos: [...(propertyData.photos || []), ...uploaded] } }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
        if (data.propertyData) setPropertyData(prev => ({ ...prev, ...data.propertyData, photos: [...(prev.photos || []), ...uploaded] }));
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

  const dataEntries = Object.entries(propertyData).filter(([k, v]) =>
    k !== 'status' && v !== null && v !== undefined &&
    !(Array.isArray(v) && v.length === 0) && v !== 'null'
  );

  if (!authChecked) return (
    <div style={{ minHeight: '100vh', background: '#0F1115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6B7280', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>Loading…</div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', height: '100vh', background: '#0F1115', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 260, background: '#1A1D23', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', overflowY: 'auto' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0, marginBottom: '2rem' }}>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#E6EAF2', letterSpacing: '-0.03em' }}>consult</span>
            <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.03em', ...gradientText }}>prop</span>
            <span style={{ fontSize: 20, fontWeight: 600, color: '#6B7280', letterSpacing: '-0.03em' }}>.ai</span>
          </div>

          {user && (
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 4 }}>Listing as</div>
              <div style={{ fontSize: 13, color: '#E6EAF2', fontWeight: 500, marginBottom: '0.75rem' }}>{user.name || user.email}</div>
              <button
                onClick={handleLogout}
                style={{ fontSize: 11, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 300ms ease' }}
                onMouseEnter={e => e.currentTarget.style.color = '#9AA3B2'}
                onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
              >Sign out</button>
            </div>
          )}

          {/* Property data */}
          {dataEntries.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 16, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: '0.75rem' }}>Listing so far</div>
              {dataEntries.map(([k, v]) => (
                <div key={k} style={{ marginBottom: '0.6rem' }}>
                  <div style={{ fontSize: 10, color: '#6B7280', marginBottom: 1 }}>{FIELD_LABELS[k] || k}</div>
                  <div style={{ fontSize: 12, fontWeight: 500, wordBreak: 'break-word', ...gradientText }}>
                    {Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6B7280', marginBottom: '0.75rem' }}>Photos ({photos.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)' }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, maxWidth: 640, alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end', flexDirection: msg.role === 'assistant' ? 'row' : 'row-reverse' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', ...gradientBg }}>C</div>
                )}
                <div style={{
                  padding: '0.75rem 1rem', borderRadius: 16, fontSize: 14, lineHeight: 1.65, maxWidth: 500,
                  background: msg.role === 'assistant' ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #2F6BFF, #7B3FF2)',
                  border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.18)' : 'none',
                  backdropFilter: msg.role === 'assistant' ? 'blur(20px)' : 'none',
                  WebkitBackdropFilter: msg.role === 'assistant' ? 'blur(20px)' : 'none',
                  color: '#E6EAF2',
                  fontWeight: msg.role === 'user' ? 500 : 400,
                  borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                  borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                  whiteSpace: 'pre-wrap',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {(loading || uploading) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', ...gradientBg }}>C</div>
                <div style={{ padding: '0.85rem 1rem', borderRadius: 16, borderTopLeftRadius: 4, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9AA3B2', animation: `bounce 1.3s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '1rem 2rem 0.75rem', display: 'flex', gap: 10, alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(26,29,35,0.8)' }}>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              title="Upload photos"
              style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', color: '#9AA3B2', border: '1px solid rgba(255,255,255,0.18)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: uploading ? 0.4 : 1, transition: 'background 300ms ease, box-shadow 300ms ease, transform 300ms ease' }}
              onMouseEnter={e => { if (!uploading && !loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(47,107,255,0.25)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/><path d="M2 14l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5V3M10 5V2M13 5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(47,107,255,0.6)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(47,107,255,0.15)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.boxShadow = 'none'; }}
              placeholder="Describe your property..."
              disabled={loading || uploading}
              rows={1}
              style={{ flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 50, padding: '0.75rem 1.25rem', fontSize: 14, fontFamily: "'Inter', sans-serif", color: '#E6EAF2', resize: 'none', outline: 'none', lineHeight: 1.5, transition: 'border-color 300ms ease, box-shadow 300ms ease' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || uploading || !input.trim()}
              style={{ width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: loading || uploading || !input.trim() ? 0.35 : 1, transition: 'opacity 300ms ease, box-shadow 300ms ease, transform 300ms ease', flexShrink: 0, ...gradientBg }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.boxShadow = '0 0 20px rgba(47,107,255,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#6B7280', padding: '0.4rem 2rem 0.75rem' }}>
            Your listing details are saved automatically as you chat.
          </p>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden}textarea::placeholder{color:#6B7280}`}</style>
    </>
  );
}
