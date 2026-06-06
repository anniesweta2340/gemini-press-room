import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;
const range = { category_id: categoryId, start_date: start, end_date: end, date_interval: "month" };

// per-prompt citations
const cit = await client.reports.citations({
  ...range, dimensions: ["prompt", "root_domain"], metrics: ["citation_share", "count"],
});

// Gemini's buried prompts from pressroom.json (position > 3)
const pressroom = JSON.parse(fs.readFileSync("pressroom.json", "utf8"));
const buried = (pressroom.gemini_worst_prompts || []).map(p => p.prompt);

// classify a domain into a "channel" (the influencer/earned-media surface)
const channelOf = d => {
  if (/reddit/i.test(d)) return "Reddit / community";
  if (/youtube/i.test(d)) return "YouTube / creators";
  if (/medium|substack|dev\.to|hashnode/i.test(d)) return "Blogs / writers";
  if (/g2|capterra|trustradius|getapp/i.test(d)) return "Review platforms";
  if (/github/i.test(d)) return "Developer community";
  if (/quora|stackexchange|stackoverflow/i.test(d)) return "Q&A communities";
  if (/linkedin|twitter|x\.com|tiktok|instagram/i.test(d)) return "Social creators";
  return "Editorial / other";
};

// group citations per buried prompt
const rows = cit.data.map(r => ({ prompt: r.dimensions[0], domain: r.dimensions[1], share: r.metrics[0], count: r.metrics[1] }));
const desk = buried.map(prompt => {
  const sources = rows.filter(r => r.prompt === prompt).sort((a, b) => b.count - a.count).slice(0, 5);
  const channels = {};
  for (const s of sources) channels[channelOf(s.domain)] = (channels[channelOf(s.domain)] || 0) + s.count;
  const topChannel = Object.entries(channels).sort((a, b) => b[1] - a[1])[0]?.[0] || "Editorial / other";
  return {
    prompt,
    top_sources: sources.map(s => ({ domain: s.domain, share: +(s.share * 100).toFixed(1), count: s.count, channel: channelOf(s.domain) })),
    recommended_channel: topChannel,
  };
}).filter(d => d.top_sources.length);

// the macro "Claude playbook" proof: community-source share across the whole category
const allRows = rows;
const totalCount = allRows.reduce((s, r) => s + r.count, 0);
const byChannel = {};
for (const r of allRows) byChannel[channelOf(r.domain)] = (byChannel[channelOf(r.domain)] || 0) + r.count;
const channelMix = Object.entries(byChannel)
  .map(([channel, count]) => ({ channel, share: +((count / totalCount) * 100).toFixed(1) }))
  .sort((a, b) => b.share - a.share);

pressroom.influence = { channel_mix: channelMix, desk };
fs.writeFileSync("pressroom.json", JSON.stringify(pressroom, null, 2));

console.log("=== CHANNEL MIX (the Claude playbook proof) ===");
console.table(channelMix);
console.log("\n=== INFLUENCE DESK (first 2 buried prompts) ===");
desk.slice(0, 2).forEach(d => {
  console.log(`\n▸ "${d.prompt}"  → recommend: ${d.recommended_channel}`);
  d.top_sources.forEach(s => console.log(`    ${s.share}%  ${s.domain}  [${s.channel}]`));
});
console.log("\n✅ influence data written into pressroom.json");
