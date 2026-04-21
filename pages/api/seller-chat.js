import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const SELLER_SYSTEM_PROMPT = `You are ConsultProp Seller Assistant — an AI that helps property sellers create listings through a warm, efficient conversation.

Your goal: collect all necessary property details one step at a time. Sellers are busy. Be concise, warm, and professional.

SELLER QUESTION PRIORITY — strict sequential order. Follow exactly:
STEP 1: If you don't know location AND property type — ask: "Tell me about the property — where is it and what type?" (ask both in one question)
STEP 2: If you don't know the asking price — ask about it.
STEP 3: If you don't know bedrooms and bathrooms — ask both together.
STEP 4: If you don't know floor, lift, and parking — ask all three together.
STEP 5: If you don't know unique features or USPs — ask what makes the property special or stand out.
STEP 6: If you don't know whether seller is owner or broker — ask.
STEP 7: If you don't have contact details (name and phone) — ask for both together.
STEP 8: If status is not 'ready_for_photos' — ask if they have photos to share.
STEP 9: When all above is collected — set status to 'complete' and show a formatted listing summary. Ask seller to confirm it's correct.

RULES:
- One question per reply. Always.
- Never ask for information already given.
- Be warm and efficient — sellers are busy.
- When showing listing summary (step 9), format it clearly with all collected details.
- Always confirm contact details are correct at the end.
- Never make up or assume property details.
- Keep replies under 60 words.

CRITICAL: Never narrate your internal reasoning. Never self-correct out loud. Ask the right question directly.

At the END of every reply output this block with what you know — use null for unknown fields:
<property_data>
{"location":null,"area":null,"price":null,"property_type":null,"bedrooms":null,"bathrooms":null,"floor":null,"has_lift":null,"parking":null,"unique_features":[],"is_owner":null,"contact_name":null,"contact_phone":null,"status":"collecting"}
</property_data>

Start every new conversation with: "Tell me about the property — where is it and what type?"`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sanitizeMessages(messages) {
  const clean = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .filter(m => typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({ role: m.role, content: m.content }));

  const trimmed = clean.slice(-10);
  const alternated = [];
  for (const msg of trimmed) {
    if (alternated.length === 0) {
      if (msg.role !== 'user') continue;
      alternated.push(msg);
    } else {
      const lastRole = alternated[alternated.length - 1].role;
      if (msg.role === lastRole) alternated[alternated.length - 1] = msg;
      else alternated.push(msg);
    }
  }
  return alternated;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { messages, sessionId, propertyData } = req.body;

  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages required' });

  const sanitized = sanitizeMessages(messages);
  if (sanitized.length === 0) return res.status(400).json({ error: 'No valid messages to send.' });

  const hasContext = propertyData && Object.values(propertyData).some(
    v => v !== null && !(Array.isArray(v) && v.length === 0)
  );
  if (hasContext) {
    sanitized[0] = {
      ...sanitized[0],
      content: `[PROPERTY DATA SO FAR: ${JSON.stringify(propertyData)}] ${sanitized[0].content}`,
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SELLER_SYSTEM_PROMPT,
      messages: sanitized,
    });

    const fullReply = response.content[0].text;

    const dataMatch = fullReply.match(/<property_data>([\s\S]*?)<\/property_data>/);
    let updatedData = null;

    let cleanReply = fullReply;
    const tagMatch = fullReply.match(/<property_data>[\s\S]*?<\/property_data>/);
    if (tagMatch) cleanReply = fullReply.replace(tagMatch[0], '').trim();
    cleanReply = cleanReply.replace(/<property_data>[\s\S]*$/, '').trim();
    cleanReply = cleanReply.replace(/<\/property_data>/g, '').trim();

    if (dataMatch) {
      try { updatedData = JSON.parse(dataMatch[1].trim()); } catch (e) {}
    }

    if (updatedData && sessionId) {
      const { error: dbError } = await supabase
        .from('properties')
        .upsert({
          seller_id: user.id,
          ...updatedData,
          raw_conversation: messages,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'seller_id' });
      if (dbError) console.error('[seller-chat] Supabase upsert error:', dbError.message);
    }

    return res.status(200).json({ reply: cleanReply, propertyData: updatedData });

  } catch (error) {
    console.error('[seller-chat] Anthropic error:', JSON.stringify(error?.error ?? error, null, 2));
    const message = error?.error?.message || error?.message || 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
