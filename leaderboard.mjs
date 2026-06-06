import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;

const res = await client.reports.visibility({
  category_id: categoryId,
  start_date: start, end_date: end,
  date_interval: "month",
  dimensions: ["asset_name"],
  metrics: ["average_position", "mentions_count", "share_of_voice", "visibility_score"],
});

const rows = res.data ?? [];
const byBrand = {};
for (const r of rows) {
  const name = r.dimensions[0];
  const [pos, mentions, sov, vis] = r.metrics;
  if (!byBrand[name]) byBrand[name] = { brand: name, mentions: 0, sov: 0, vis: 0, posSum: 0, n: 0 };
  const b = byBrand[name];
  b.mentions += mentions || 0;
  b.sov += sov || 0;
  b.vis = Math.max(b.vis, vis || 0);
  b.posSum += (pos || 0); b.n++;
}
const table = Object.values(byBrand)
  .map(b => ({
    brand: b.brand,
    sov_pct: +(b.sov * 100).toFixed(2),
    visibility_pct: +(b.vis * 100).toFixed(2),
    avg_position: +(b.posSum / b.n).toFixed(1),
    mentions: b.mentions,
  }))
  .sort((a, b) => b.mentions - a.mentions);

fs.writeFileSync("leaderboard.json", JSON.stringify(table, null, 2));

console.log("\n=== TOP 15 BRANDS BY MENTIONS ===");
console.table(table.slice(0, 15));

const targets = /gemini|chatgpt|openai|claude|anthropic|copilot|perplexity|grok|deepseek|llama|gpt/i;
console.log("\n=== THE LLM FIELD ===");
console.table(table.filter(r => targets.test(r.brand)));
