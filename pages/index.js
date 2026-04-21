import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [journeyLog, setJourneyLog] = useState({});
  const [sessionId] = useState(() => 'session_' + Date.now());
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    startConversation();
  }, []);

  async function startConversation() {
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'start' }], sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages([{ role: 'assistant', content: data.reply }]);
      if (data.journeyLog) setJourneyLog(data.journeyLog);
    } catch (e) {
      console.error('[startConversation]', e);
      setMessages([{ role: 'assistant', content: "Hey — what's on your mind?" }]);
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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, sessionId, journeyLog }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      if (data.journeyLog) setJourneyLog(prev => ({ ...prev, ...data.journeyLog }));
    } catch (e) {
      console.error('[sendMessage]', e);
      setMessages(prev => [...prev, { role: 'assistant', content: e.message || 'Something went wrong — try again.' }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  }

  const logEntries = Object.entries(journeyLog).filter(([, v]) =>
    v && v !== 'null' && !(Array.isArray(v) && v.length === 0)
  );

  return (
    <>
      <Head>
        <title>ConsultProp</title>
        <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ display:'flex', height:'100vh', background:'#0D1B2A', fontFamily:"'DM Sans', sans-serif", overflow:'hidden' }}>

        {/* Sidebar */}
        <div style={{ width:260, background:'#0A1520', borderRight:'1px solid rgba(255,255,255,0.06)', display:'flex', flexDirection:'column', padding:'2rem 1.5rem', overflowY:'auto' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:'2rem' }}>
            <div style={{ width:36, height:36, borderRadius:10, background:'#E8A020', color:'#0A1520', fontFamily:"'DM Serif Display', serif", fontSize:20, display:'flex', alignItems:'center', justifyContent:'center' }}>C</div>
            <span style={{ fontSize:18, fontWeight:500, color:'#F0EDE8', letterSpacing:'-0.02em' }}>ConsultProp</span>
          </div>
          <p style={{ fontFamily:"'DM Serif Display', serif", fontSize:14, lineHeight:1.6, color:'rgba(240,237,232,0.5)', marginBottom:'2rem', fontStyle:'italic' }}>
            The first property consultant that works only for you.
          </p>
          <div style={{ padding:'1rem', background:'rgba(232,160,32,0.07)', border:'1px solid rgba(232,160,32,0.15)', borderRadius:12, marginBottom:'2rem' }}>
            {['No commission to earn','No listings to push','No pressure to close','Just honest advice'].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'rgba(240,237,232,0.65)', marginBottom:8 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#E8A020', flexShrink:0 }} />
                {t}
              </div>
            ))}
          </div>

          {logEntries.length > 0 && (
            <div style={{ marginTop:'auto', paddingTop:'1.5rem', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize:10, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.08em', color:'rgba(240,237,232,0.3)', marginBottom:'0.75rem' }}>What I know so far</div>
              {logEntries.map(([k, v]) => (
                <div key={k} style={{ marginBottom:'0.6rem' }}>
                  <div style={{ fontSize:10, color:'rgba(240,237,232,0.3)', textTransform:'capitalize', marginBottom:1 }}>{k.replace(/_/g,' ')}</div>
                  <div style={{ fontSize:12, color:'#E8A020', fontWeight:500, wordBreak:'break-word' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chat */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flex:1, overflowY:'auto', padding:'2rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:12, maxWidth:640, alignSelf: msg.role==='assistant'?'flex-start':'flex-end', flexDirection: msg.role==='assistant'?'row':'row-reverse' }}>
                {msg.role === 'assistant' && (
                  <div style={{ width:32, height:32, borderRadius:9, background:'#E8A020', color:'#0A1520', fontFamily:"'DM Serif Display',serif", fontSize:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>C</div>
                )}
                <div style={{ padding:'0.75rem 1rem', borderRadius:16, fontSize:14, lineHeight:1.65, maxWidth:500, background: msg.role==='assistant'?'rgba(255,255,255,0.06)':'#E8A020', color: msg.role==='assistant'?'#F0EDE8':'#0A1520', fontWeight: msg.role==='user'?500:400, borderTopLeftRadius: msg.role==='assistant'?4:16, borderTopRightRadius: msg.role==='user'?4:16 }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'#E8A020', color:'#0A1520', fontFamily:"'DM Serif Display',serif", fontSize:16, display:'flex', alignItems:'center', justifyContent:'center' }}>C</div>
                <div style={{ padding:'0.85rem 1rem', borderRadius:16, borderTopLeftRadius:4, background:'rgba(255,255,255,0.06)', display:'flex', gap:5, alignItems:'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'rgba(240,237,232,0.4)', animation:`bounce 1.3s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding:'1rem 2rem 0.75rem', display:'flex', gap:10, alignItems:'flex-end', borderTop:'1px solid rgba(255,255,255,0.06)', background:'rgba(0,0,0,0.15)' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} }}
              placeholder="Tell me what's on your mind..."
              disabled={loading}
              rows={1}
              style={{ flex:1, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.75rem 1rem', fontSize:14, fontFamily:"'DM Sans',sans-serif", color:'#F0EDE8', resize:'none', outline:'none', lineHeight:1.5 }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{ width:44, height:44, borderRadius:12, background:'#E8A020', color:'#0A1520', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity: loading||!input.trim()?0.3:1 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10H16M16 10L11 5M16 10L11 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <p style={{ textAlign:'center', fontSize:11, color:'rgba(240,237,232,0.2)', padding:'0.4rem 2rem 0.75rem' }}>
            ConsultProp has no commission to earn. It will always tell you the truth.
          </p>
        </div>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:0.4}40%{transform:translateY(-5px);opacity:1}}*{box-sizing:border-box;margin:0;padding:0}body{overflow:hidden}`}</style>
    </>
  );
}