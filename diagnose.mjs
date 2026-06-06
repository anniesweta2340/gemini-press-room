import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

// ── Tunable constants ──────────────────────────────────────────────────────────
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;
const TOP_N_PROMPTS = 5;          // how many prompts to run the chain on
const TOP_N_SOURCES = 5;          // citation sources fed into stage 1
const MIN_CONFIDENCE = 0.6;       // self-eval acceptance threshold

// ── Client ─────────────────────────────────────────────────────────────────────
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Helpers ────────────────────────────────────────────────────────────────────

// Strip markdown code fences before parsing — Claude sometimes wraps JSON in ```json
function parseJSON(text) {
  const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
  return JSON.parse(clean);
}

// Pull top citation sources for a prompt from influence_raw.json rows.
// Rows are { dimensions: [prompt, domain], metrics: [share, count] }.
function topSourcesFor(rows, prompt, n = TOP_N_SOURCES) {
  return rows
    .filter(r => r.dimensions[0] === prompt)
    .map(r => ({ domain: r.dimensions[1], share: r.metrics[0], count: r.metrics[1] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

// ── Stage 1: DIAGNOSE ──────────────────────────────────────────────────────────
// Given a prompt + Gemini's poor position + the winning citation sources,
// ask Claude what the structural root cause is and what angle would fix it.
async function stageDiagnose(prompt, avgPosition, sources) {
  const sourceLines = sources.length
    ? sources.map(s => `  - ${s.domain} (${(s.share * 100).toFixed(1)}% share, ${s.count} citations)`).join('\n')
    : '  (no citation data available for this prompt)';

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{
      role: 'user',
      content: `You are an AEO (Answer Engine Optimization) strategist diagnosing why Gemini is buried for a query.

Query: "${prompt}"
Gemini's average position: ${avgPosition} (above 3 = not in the recommended set)

Top sources LLMs cite when answering this query:
${sourceLines}

Identify the structural reason Gemini loses here and what content angle would move it into the top 3.

Return ONLY valid JSON — no other text:
{
  "root_cause": "one sentence: the structural reason Gemini is buried for this query",
  "recommended_angle": "one sentence: the specific content angle that would close the gap",
  "recommended_format": "one of: comparison, how-to, use-case, benchmark, integration-guide",
  "target_sources": ["domain1", "domain2"]
}`,
    }],
  });

  return parseJSON(msg.content[0].text);
}

// ── Stage 2: DRAFT ─────────────────────────────────────────────────────────────
// Given the diagnosis, write a concrete 2-3 sentence content brief that
// Gemini's marketing team can act on immediately.
async function stageDraft(prompt, diagnosis) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{
      role: 'user',
      content: `You are writing a content brief for Gemini's marketing team to reclaim LLM visibility for a buried query.

Query: "${prompt}"
Root cause: ${diagnosis.root_cause}
Recommended angle: ${diagnosis.recommended_angle}
Recommended format: ${diagnosis.recommended_format}
Target sources to appear in: ${diagnosis.target_sources.join(', ')}

Write a 2-3 sentence brief the team could act on this week.
Rules:
- Be specific to this exact query — no generic AI marketing copy
- Ground the recommended angle in what those winning domains typically cover (their audience, content type, and editorial focus) — you don't have their page content, so don't invent specific claims from them; instead make sure the angle fits what those domains would actually publish or discuss
- Position Gemini positively; do NOT mention or disparage any competitors

Return ONLY valid JSON — no other text:
{
  "draft": "your 2-3 sentence brief here"
}`,
    }],
  });

  return parseJSON(msg.content[0].text);
}

// ── Stage 3: SELF-EVALUATE (required guardrail) ────────────────────────────────
// A separate Claude call critiques the draft against three explicit criteria.
// Drafts that fail grounded && on_brand && specific && confidence >= 0.6 are rejected.
async function stageEvaluate(prompt, draftText, diagnosis) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{
      role: 'user',
      content: `You are a quality auditor reviewing a content brief. Score it strictly against three criteria.

Original query: "${prompt}"
Cited sources the brief should reference: ${diagnosis.target_sources.join(', ')}

Brief to evaluate:
"${draftText}"

Criteria (all must be true to pass):
1. grounded — Does the recommended angle and distribution channel fit what the winning domains (${diagnosis.target_sources.join(', ')}) typically cover — their audience type, content format, and editorial focus? Mark FALSE only if the brief recommends an angle that is clearly mismatched with what those domains publish (e.g. suggesting a deep technical whitepaper for a Reddit community, or a consumer how-to for an enterprise integration site). We only have domain names, not page content, so do NOT penalise the brief for failing to quote specific claims from those sources.
2. on_brand — Does it position Gemini positively WITHOUT mentioning or disparaging any competitors?
3. specific — Is it specific to this exact query ("${prompt}"), not generic AI marketing copy?

Return ONLY valid JSON — no other text:
{
  "grounded": true or false,
  "on_brand": true or false,
  "specific": true or false,
  "confidence": 0.0 to 1.0,
  "reason": "one sentence explaining the score and any concerns"
}`,
    }],
  });

  return parseJSON(msg.content[0].text);
}

// ── Main ───────────────────────────────────────────────────────────────────────
const pressroom = JSON.parse(fs.readFileSync('pressroom.json', 'utf8'));
const rawFile   = JSON.parse(fs.readFileSync('influence_raw.json', 'utf8'));

// influence_raw.json is wrapped: { data: [...] }
const influenceRows = Array.isArray(rawFile) ? rawFile : (rawFile.data ?? []);

// Top N prompts by revenue_at_risk (already sorted descending by revenue_ladder.mjs)
const candidates = (pressroom.revenue?.by_prompt ?? []).slice(0, TOP_N_PROMPTS);

if (!candidates.length) {
  console.error('❌  revenue.by_prompt is empty — run revenue_ladder.mjs first.');
  process.exit(1);
}

console.log(`Diagnosing ${candidates.length} prompts with model ${MODEL}…\n`);

const fixes = [];
const summary = [];

for (const p of candidates) {
  console.log(`── "${p.prompt}"`);
  console.log(`   avg_position ${p.avg_position} | $${p.revenue_at_risk} at risk`);

  const sources = topSourcesFor(influenceRows, p.prompt);
  console.log(`   citation sources: ${sources.map(s => s.domain).join(', ') || 'none'}`);

  let diagnosis, draftResult, evalResult;

  try {
    // Stage 1 ─ understand why Gemini loses
    process.stdout.write('   Stage 1 diagnose… ');
    diagnosis = await stageDiagnose(p.prompt, p.avg_position, sources);
    console.log('done');

    // Stage 2 ─ write the counter-narrative brief
    process.stdout.write('   Stage 2 draft…    ');
    draftResult = await stageDraft(p.prompt, diagnosis);
    console.log('done');

    // Stage 3 ─ critique the draft; only accepted drafts advance
    process.stdout.write('   Stage 3 evaluate… ');
    evalResult = await stageEvaluate(p.prompt, draftResult.draft, diagnosis);
    console.log('done');

  } catch (err) {
    console.log(`\n   ERROR: ${err.message}`);
    summary.push({ prompt: p.prompt, confidence: '—', status: 'ERROR' });
    continue;
  }

  const pass =
    evalResult.grounded &&
    evalResult.on_brand &&
    evalResult.specific &&
    evalResult.confidence >= MIN_CONFIDENCE;

  if (pass) {
    fixes.push({
      prompt:               p.prompt,
      root_cause:           diagnosis.root_cause,
      recommended_channel:  diagnosis.recommended_format,
      draft:                draftResult.draft,
      confidence:           evalResult.confidence,
    });
    summary.push({ prompt: p.prompt, confidence: evalResult.confidence.toFixed(2), status: 'ACCEPTED ✓' });
    console.log(`   → ACCEPTED  (confidence ${evalResult.confidence.toFixed(2)})`);
  } else {
    // Rejected drafts are logged but not written
    const flags = [
      !evalResult.grounded  && 'not grounded',
      !evalResult.on_brand  && 'off brand',
      !evalResult.specific  && 'too generic',
      evalResult.confidence < MIN_CONFIDENCE && `confidence ${evalResult.confidence.toFixed(2)} < ${MIN_CONFIDENCE}`,
    ].filter(Boolean).join(', ');

    summary.push({ prompt: p.prompt, confidence: evalResult.confidence.toFixed(2), status: `REJECTED (${flags})` });
    console.log(`   → REJECTED  (${flags})`);
    console.log(`     Reason: ${evalResult.reason}`);
  }

  console.log();
}

// ── Write accepted fixes back into pressroom.json ─────────────────────────────
pressroom.fixes = fixes;
fs.writeFileSync('pressroom.json', JSON.stringify(pressroom, null, 2));

// ── Summary table ─────────────────────────────────────────────────────────────
console.log('─'.repeat(82));
console.log(`${'Prompt'.padEnd(52)} ${'Conf'.padEnd(6)} Status`);
console.log('─'.repeat(82));
for (const row of summary) {
  console.log(`${row.prompt.slice(0, 50).padEnd(52)} ${String(row.confidence).padEnd(6)} ${row.status}`);
}
console.log('─'.repeat(82));
console.log(`\n✅  ${fixes.length}/${candidates.length} accepted → pressroom.json updated`);
console.log(`    ${fixes.length > 0 ? 'Press Kit section in index.html will now render these fixes.' : 'No fixes written — try loosening MIN_CONFIDENCE or re-running.'}`);
