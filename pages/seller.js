import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import supabase from '../lib/supabase';

const FIELD_LABELS = {
  location: 'Location', area: 'Area', price: 'Price', property_type: 'Type',
  bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', floor: 'Floor',
  has_lift: 'Lift', parking: 'Parking', unique_features: 'Features',
  is_owner: 'Owner/Broker', contact_name: 'Contact Name', contact_phone: 'Phone',
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
    <div style={{ minHeight: '100vh', background: '#0D1B2A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(240,237,232,0.4)', fontSize: 14, fontFamily: 'sans-serif' }}>Loading…</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>ConsultProp — Seller</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display: 'flex', height: '100vh', background: '#0D1B2A', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 260, background: '#0A1520', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '2rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#E8A020', color: '#0A1520', fontFamily: "'DM Serif Display', serif", fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</div>
            <span style={{ fontSize: 18, fontWeight: 500, color: '#F0EDE8', letterSpacing: '-0.02em' }}>ConsultProp</span>
          </div>

          {user && (
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 12, color: 'rgba(240,237,232,0.35)', marginBottom: 4 }}>Listing as</div>
              <div style={{ fontSize: 13, color: '#F0EDE8', fontWeight: 500, marginBottom: '0.75rem' }}>{user.name || user.email}</div>
              <button onClick={handleLogout} style={{ fontSize: 11, color: 'rgba(240,237,232,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign out</button>
            </div>
          )}

          {/* Property data sidebar */}
          {dataEntries.length > 0 && (
            <div>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,232,0.3)', marginBottom: '0.75rem' }}>Listing so far</div>
              {dataEntries.map(([k, v]) => (
                <div key={k} style={{ marginBottom: '0.6rem' }}>
                  <div style={{ fontSize: 10, color: 'rgba(240,237,232,0.3)', marginBottom: 1 }}>{FIELD_LABELS[k] || k}</div>
                  <div style={{ fontSize: 12, color: '#E8A020', fontWeight: 500, wordBreak: 'break-word' }}>
                    {Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Photos */}
          {photos.length > 0 && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(240,237,232,0.3)', marginBottom: '0.75rem' }}>Photos ({photos.length})</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {photos.map((url, i) => (
                  <img key={i} src={url} alt={`Photo ${i + 1}`} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }} />
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
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: '#E8A020', color: '#0A1520', fontFamily: "'DM Serif Display',serif", fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>C</div>
                )}
                <div style={{ padding: '0.75rem 1rem', borderRadius: 16, fontSize: 14, lineHeight: 1.65, maxWidth: 500, background: msg.role === 'assistant' ? 'rgba(255,255,255,0.06)' : '#E8A020', color: msg.role === 'assistant' ? '#F0EDE8' : '#0A1520', fontWeight: msg.role === 'user' ? 500 : 400, borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16, borderTopRightRadius: msg.role === 'user' ? 4 : 16, whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {(loading || uploading) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: '#E8A020', color: '#0A1520', fontFamily: "'DM Serif Display',serif", fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>C</div>
                <div style={{ padding: '0.85rem 1rem', borderRadius: 16, borderTopLeftRadius: 4, background: 'rgba(255,255,255,0.06)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(240,237,232,0.4)', animation: `bounce 1.3s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: '1rem 2rem 0.75rem', display: 'flex', gap: 10, alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
            {/* Photo upload button */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              title="Upload photos"
              style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: 'rgba(240,237,232,0.5)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: uploading ? 0.4 : 1 }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="7.5" cy="10.5" r="1.5" fill="currentColor"/><path d="M2 14l4-4 3 3 3-4 4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 5V3M10 5V2M13 5V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Describe your property..."
              disabled={loading || uploading}
              rows={1}
              style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: 14, fontFamily: "'DM Sans',sans-serif", color: '#F0EDE8', resize: 'none', outline: 'none', lineHeight: 1.5 }}
            />
            <button onClick={sendMessage} disabled={loading || uploading || !input.trim()} style={{ width: 44, height: 44, borderRadius: 12, background: '#E8A020', color: '#0A1520', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: loading || uploading || !input.trim() ? 0.3 : 1 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(240,237,232,0.2)', padding: '0.4rem 2rem 0.75rem' }}>
            Your listing details are saved automatically as you chat.
          </p>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden}`}</style>
    </>
  );
}
