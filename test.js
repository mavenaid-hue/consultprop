const BASE_URL = 'http://localhost:3000/api/chat';

async function chat(messages, journeyLog = null) {
  const body = { messages, sessionId: `test-${Date.now()}` };
  if (journeyLog) body.journeyLog = journeyLog;
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

function assert(label, condition, detail = '') {
  return { label, pass: condition, detail };
}

function report(testName, reply, checks) {
  const failed = checks.filter(c => !c.pass);
  const status = failed.length === 0 ? 'PASS' : 'FAIL';
  const icon = status === 'PASS' ? '✓' : '✗';
  console.log(`\n${icon} ${status} — ${testName}`);
  console.log(`  Reply: "${reply}"`);
  if (failed.length > 0) {
    failed.forEach(c => console.log(`  FAILED [${c.label}]: ${c.detail || '(no detail)'}`));
  }
  return status === 'PASS';
}

async function run() {
  console.log('ConsultProp API Test Suite');
  console.log('==========================');

  let passed = 0;
  let failed = 0;

  // T1: Investment intent → should ask about budget
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I want to invest in property' }
    ]);
    const r = (reply || '').toLowerCase();
    const ok = report('T1: Investment intent asks about budget', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('asks about budget', r.includes('budget') || r.includes('crore') || r.includes('lakh') || r.includes('invest') || r.includes('much') || r.includes('amount') || r.includes('money'), `Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T1: ERROR — ${e.message}`); failed++; }

  // T2: Investment + budget → should confirm amount and ask about return type
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I want to invest in property' },
      { role: 'assistant', content: 'What budget are you working with?' },
      { role: 'user', content: 'I have 1 crore' },
    ]);
    const r = (reply || '').toLowerCase();
    const ok = report('T2: Budget confirmation and return type question', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('confirms the amount', r.includes('1 crore') || r.includes('one crore') || r.includes('crore') || r.includes('noted') || r.includes('₹'), `Reply: "${reply}"`),
      assert('asks about return type', r.includes('rental') || r.includes('flip') || r.includes('appreciation') || r.includes('return') || r.includes('income') || r.includes('sell') || r.includes('profit'), `Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T2: ERROR — ${e.message}`); failed++; }

  // T3: Investment + budget + flip → should not mention rental, ask about location
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I want to invest in property' },
      { role: 'assistant', content: 'What budget are you working with?' },
      { role: 'user', content: 'I have 1 crore' },
      { role: 'assistant', content: '₹1 crore — noted. Are you looking for rental income or capital appreciation?' },
      { role: 'user', content: 'I want to invest 1 crore, flip in 2-3 years' },
    ]);
    const r = (reply || '').toLowerCase();
    const ok = report('T3: Flip intent — no rental mention, asks location', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('does not push rental', !r.includes('rental income') && !r.includes('rent out'), `Mentioned rental when flip was stated. Reply: "${reply}"`),
      assert('asks about location', r.includes('location') || r.includes('area') || r.includes('where') || r.includes('hyderabad') || r.includes('part') || r.includes('zone'), `Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T3: ERROR — ${e.message}`); failed++; }

  // T4: Investment + budget + flip + Gachibowli → should ask what they saw there
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I want to invest 1 crore for a flip in 2-3 years' },
      { role: 'assistant', content: 'Which area are you looking at?' },
      { role: 'user', content: 'Gachibowli' },
    ]);
    const r = (reply || '').toLowerCase();
    const ok = report('T4: Named area → asks what they saw', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('asks what they saw', r.includes('saw') || r.includes('seen') || r.includes('visited') || r.includes('look') || r.includes('properties') || r.includes('there') || r.includes('visit'), `Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T4: ERROR — ${e.message}`); failed++; }

  // T5: Looking 8 months → should acknowledge pain before asking anything
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I have been looking for 8 months and cannot decide' },
    ]);
    const r = (reply || '').toLowerCase();
    const acknowledgementWords = ['understand', 'exhausting', 'long', 'months', 'difficult', 'hard', 'frustrat', 'been', 'that\'s', 'thats', 'feels', 'sound', 'know'];
    const hasAcknowledgement = acknowledgementWords.some(w => r.includes(w));
    const ok = report('T5: 8 months search → acknowledges exhaustion first', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('acknowledges the pain', hasAcknowledgement, `No acknowledgement found. Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T5: ERROR — ${e.message}`); failed++; }

  // T6: All context in one message → should not re-ask for intent, budget, or return type
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I have 1 crore to invest, looking for rental income, Kondapur area' },
    ]);
    const r = (reply || '').toLowerCase();
    const ok = report('T6: Full context in one message — no re-asking known info', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('does not ask for intent', !r.includes('investment or') && !r.includes('invest or') && !r.includes('end use') && !r.includes('are you looking to invest'), `Re-asked intent. Reply: "${reply}"`),
      assert('does not ask for budget', !r.includes('what is your budget') && !r.includes('what\'s your budget') && !r.includes('how much are you') && !r.includes('budget are you'), `Re-asked budget. Reply: "${reply}"`),
      assert('does not ask for return type', !r.includes('rental or') && !r.includes('flip or') && !r.includes('appreciation or'), `Re-asked return type. Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T6: ERROR — ${e.message}`); failed++; }

  // T7: Impossible ask → should gently correct expectation
  try {
    const { reply } = await chat([
      { role: 'user', content: 'I want a 4BHK villa in Jubilee Hills for 50 lakhs' },
    ]);
    const r = (reply || '').toLowerCase();
    const correctionWords = ['honest', 'reality', 'difficult', 'hard', 'not', 'unlikely', 'crore', 'higher', 'more', 'range', 'market', 'budget', 'actually', 'truth', 'challenge'];
    const hasCorrection = correctionWords.some(w => r.includes(w));
    const ok = report('T7: Impossible ask → gently corrects expectation', reply, [
      assert('reply not empty', reply && reply.trim().length > 0, 'Got empty reply'),
      assert('corrects the expectation', hasCorrection, `No correction found. Reply: "${reply}"`),
    ]);
    ok ? passed++ : failed++;
  } catch (e) { console.log(`\n✗ FAIL — T7: ERROR — ${e.message}`); failed++; }

  console.log(`\n==========================`);
  console.log(`Results: ${passed} passed, ${failed} failed out of 7 tests`);
  console.log(`==========================\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
