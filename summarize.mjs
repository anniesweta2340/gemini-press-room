import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
console.log("CATEGORIES FOUND:");
arr.forEach(c => console.log(`  • ${c.name ?? c.id}  (id: ${c.id})`));

const categoryId = process.env.CATEGORY_ID || arr[0]?.id;
console.log(`\nUsing: ${categoryId}\n`);

const byAsset = await client.reports.visibility({
  category_id: categoryId,
  start_date: start, end_date: end,
  dimensions: ["asset_name"],
  metrics: ["share_of_voice", "visibility_score", "average_position", "mentions_count"],
});

const rows = byAsset?.data ?? byAsset ?? [];
fs.writeFileSync("visibility_raw.json", JSON.stringify(byAsset, null, 2));

console.log("=== BRAND RANKING (last 30 days) ===");
console.table(
  rows
    .map(r => ({
      brand: r.asset_name ?? r.dimensions?.asset_name ?? "?",
      share_of_voice: r.share_of_voice ?? r.metrics?.share_of_voice,
      visibility: r.visibility_score ?? r.metrics?.visibility_score,
      avg_position: r.average_position ?? r.metrics?.average_position,
      mentions: r.mentions_count ?? r.metrics?.mentions_count,
    }))
    .sort((a, b) => (b.share_of_voice ?? 0) - (a.share_of_voice ?? 0))
);
console.log("\nFull data saved to visibility_raw.json");
