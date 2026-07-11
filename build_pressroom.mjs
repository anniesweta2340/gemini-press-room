import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;
const range = { category_id: categoryId, start_date: start, end_date: end, date_interval: "month" };

// Canonical display name for every brand we track, keyed by lowercase+trimmed
// name. The Profound API is not guaranteed to return consistent casing for
// asset_name between pulls (e.g. "Llama" vs "LLaMA", "Copilot" vs "CoPilot"),
// so all brand aggregation MUST key off this normalized form rather than the
// raw string — otherwise case variants silently split into separate
// leaderboard rows on refresh.
const CANONICAL_BRANDS = [
  "Gemini", "Google", "OpenAI", "ChatGPT", "Claude", "Anthropic",
  "Copilot", "Perplexity", "Grok", "DeepSeek", "Llama", "Mistral", "Microsoft",
];
const canonicalByKey = new Map(CANONICAL_BRANDS.map(b => [b.toLowerCase().trim(), b]));
const normalizeBrandKey = (name) => name.trim().toLowerCase();
const canonicalBrandName = (name) => canonicalByKey.get(normalizeBrandKey(name)) ?? name.trim();

// --- 1) BRAND LEADERBOARD ---
const lb = await client.reports.visibility({
  ...range,
  dimensions: ["asset_name"],
  metrics: ["average_position", "mentions_count", "share_of_voice", "visibility_score"],
});
const brandAgg = {};
for (const r of lb.data) {
  const [pos, mentions, sov, vis] = r.metrics;
  const key = normalizeBrandKey(r.dimensions[0]);
  const b = (brandAgg[key] ??= { brand: canonicalBrandName(r.dimensions[0]), mentions: 0, sov: 0, vis: 0, posSum: 0, n: 0 });
  b.mentions += mentions || 0; b.sov += sov || 0;
  b.vis = Math.max(b.vis, vis || 0); b.posSum += pos || 0; b.n++;
}
const llm = /^(gemini|google|openai|chatgpt|claude|anthropic|copilot|perplexity|grok|deepseek|llama|mistral|microsoft)$/i;
const leaderboard = Object.values(brandAgg)
  .map(b => ({ brand: b.brand, sov: +(b.sov * 100).toFixed(2), visibility: +(b.vis * 100).toFixed(1), avg_position: +(b.posSum / b.n).toFixed(1), mentions: b.mentions }))
  .filter(b => llm.test(b.brand))
  .sort((a, b) => b.sov - a.sov);

// --- 2) GEMINI'S WORST PROMPTS ---
const bp = await client.reports.visibility({
  ...range,
  dimensions: ["asset_name", "prompt"],
  metrics: ["average_position", "mentions_count", "visibility_score"],
});
const gemPrompts = bp.data
  .filter(r => normalizeBrandKey(r.dimensions[0]) === "gemini")
  .map(r => ({ prompt: r.dimensions[1], avg_position: r.metrics[0], mentions: r.metrics[1], visibility: +(r.metrics[2] * 100).toFixed(1) }))
  .filter(p => p.mentions >= 3)                       // ignore noise
  .sort((a, b) => b.avg_position - a.avg_position);   // worst position first

// --- 3) TOP CITED SOURCES ---
const cit = await client.reports.citations({
  ...range,
  dimensions: ["root_domain"],
  metrics: ["citation_share", "count"],
});
const sources = cit.data
  .map(r => ({ domain: r.dimensions[0], share: +(r.metrics[0] * 100).toFixed(2), count: r.metrics[1] }))
  .sort((a, b) => b.count - a.count)
  .slice(0, 20);

const gemini = leaderboard.find(b => b.brand === "Gemini");
const pressroom = {
  generated: new Date().toISOString(),
  window: { start, end },
  hero: gemini,
  rank_among_llms: leaderboard.findIndex(b => b.brand === "Gemini") + 1,
  leaderboard,
  gemini_worst_prompts: gemPrompts.slice(0, 15),
  top_sources: sources,
};
fs.writeFileSync("pressroom.json", JSON.stringify(pressroom, null, 2));

console.log("✅ pressroom.json written");
console.log("Gemini rank among LLMs:", pressroom.rank_among_llms);
console.log("Gemini:", JSON.stringify(gemini));
console.log("Worst prompts (top 5):");
gemPrompts.slice(0, 5).forEach(p => console.log(`  pos ${p.avg_position} | ${p.mentions} mentions | ${p.prompt}`));
