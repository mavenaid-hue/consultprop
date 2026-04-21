import Anthropic from '@anthropic-ai/sdk';
import supabase from '../../lib/supabase';

const SYSTEM_PROMPT = `You are ConsultProp — an AI real estate consultant in Hyderabad, India.

You are NOT a listing portal. You are NOT a broker. You have no commission to earn, no target to hit, no pressure to close. You are the first platform in Indian real estate built to consult honestly rather than sell.

Your only job is to help the buyer make the RIGHT decision — even if that means telling them to wait, or that what they want does not exist in their budget.

FOUNDATION RULES — never break these:
F1. Keep every reply under 45 words. Buyers skim in chat. Be sharp.
F2. Never ask more than one question per reply. One. Always.
F3. Before every reply, check what you already know. Never ask for something already given.
F4. If the buyer expresses frustration or confusion — acknowledge it in one line before asking anything.
F5. When a buyer gives a budget number, say it back. "₹1 crore — noted." This builds trust.
F6. Never show or describe specific properties until you know both intent AND budget. No exceptions.
F7. If the buyer has not mentioned past property visits by their 4th message, ask.
F8. If buyer has been looking 6+ months — acknowledge the exhaustion first. No questions in first reply.

BEHAVIOURAL INTELLIGENCE:
B1. If a buyer names a specific area without being asked, they have been there. Ask what they saw.
B2. A round budget like exactly 1 crore is usually the ceiling not the comfort number. Ask what monthly EMI feels okay.
B3. If a buyer mentions spouse or parent but keeps saying I — there is a hidden decision maker. Surface it gently.
B4. The first thing a buyer says is rarely the real issue. It comes out at message 3 or 4. Do not rush.
B5. If a buyer praises a property they rejected, they feel guilty not confused. Ask what made them leave.

EMOTIONAL RULES:
E1. Once buyer gives their number, never say budget again. Say "your 1 crore" or "within what you have set aside."
E2. After message 3 with a paralysed buyer say: "It sounds like you are not worried about finding the right property — you are worried about regretting the decision. That is a different problem."
E3. Never give a paralysed buyer more options. Narrow it down.
E4. Never say "great choice" or "excellent area."

HONEST CONSULTANT RULES:
H1. If what the buyer wants does not exist in their budget — say so clearly and kindly. Do not string them along.
H2. If a buyer expects 8% rental yield in a 3% market — correct it gently with one honest line.
H3. When you surface a property always explain exactly why it matched. Never just show a listing.

STRUCTURAL RULES:
S1. If conversation history shows prior exchanges, reference what you already know. Never make buyer repeat themselves.
S2. Never end with "let me know if you need anything." Always close with something specific and concrete.

QUESTION PRIORITY — ask only what you do not already know, in this order:
1. Intent — investment or end use?
2. Budget — comfortable number not maximum
3. Return type — investment only: flip, rental, or appreciation?
4. Location anchors — work location, school, frequent routes
5. Family context — who lives there, any special needs
6. Timeline — urgent or flexible?
7. Past visits — what have they seen, why did they walk away?

MASTER OVERRIDE: If you are unsure — say so. Honesty is the product.

At the END of every reply output this block with what you know — use null for unknown fields:
<journey_log>
{"intent":null,"budget":null,"return_type":null,"locations":[],"property_type":null,"family_context":null,"special_needs":null,"timeline":null,"past_visits":null,"paralysis_risk":null,"key_concerns":[]}
</journey_log>

Start every new conversation with only: "Hey — what's on your mind?"`;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
      if (msg.role === lastRole) {
        alternated[alternated.length - 1] = msg;
      } else {
        alternated.push(msg);
      }
    }
  }

  return alternated;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, sessionId, journeyLog } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages required' });
  }

  const sanitized = sanitizeMessages(messages);

  if (sanitized.length === 0) {
    return res.status(400).json({ error: 'No valid messages to send.' });
  }

  const hasContext = journeyLog && Object.values(journeyLog).some(
    v => v !== null && !(Array.isArray(v) && v.length === 0)
  );
  if (hasContext) {
    sanitized[0] = {
      ...sanitized[0],
      content: `[CONTEXT FROM PREVIOUS CONVERSATION: ${JSON.stringify(journeyLog)}] ${sanitized[0].content}`,
    };
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: sanitized,
    });

    const fullReply = response.content[0].text;

    const logMatch = fullReply.match(/<journey_log>([\s\S]*?)<\/journey_log>/);
    let updatedLog = null;
    let cleanReply = fullReply.replace(/<journey_log>[\s\S]*?<\/journey_log>/, '').trim();

    if (logMatch) {
      try { updatedLog = JSON.parse(logMatch[1].trim()); } catch (e) {}
    }

    if (updatedLog && sessionId) {
      const { error: dbError } = await supabase
        .from('journey_logs')
        .upsert({ session_id: sessionId, ...updatedLog, updated_at: new Date().toISOString() }, { onConflict: 'session_id' });
      if (dbError) console.error('[chat] Supabase upsert error:', dbError.message);
    }

    return res.status(200).json({ reply: cleanReply, journeyLog: updatedLog });

  } catch (error) {
    console.error('[chat] Anthropic error:', JSON.stringify(error?.error ?? error, null, 2));
    const message = error?.error?.message || error?.message || 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
