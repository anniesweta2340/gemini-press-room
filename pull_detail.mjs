import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;

// 1) PER-PROMPT visibility (where is Gemini ranked low?)
const byPrompt = await client.reports.visibility({
  category_id: categoryId,
  start_date: start, end_date: end,
  date_interval: "month",
  dimensions: ["prompt", "asset_name"],
  metrics: ["average_position", "mentions_count", "visibility_score"],
});
fs.writeFileSync("byprompt_raw.json", JSON.stringify(byPrompt, null, 2));
console.log("=== PER-PROMPT ===");
console.log("metrics order:", byPrompt.info?.query?.metrics);
console.log("dimensions order:", byPrompt.info?.query?.dimensions);
console.log("total rows:", byPrompt.info?.total_rows);
console.log("FIRST ROW:", JSON.stringify(byPrompt.data?.[0], null, 2));

// 2) CITATIONS (who is being quoted?)
const citations = await client.reports.citations({
  category_id: categoryId,
  start_date: start, end_date: end,
  date_interval: "month",
  dimensions: ["root_domain"],
  metrics: ["count", "citation_share"],
});
fs.writeFileSync("citations_raw.json", JSON.stringify(citations, null, 2));
console.log("\n=== CITATIONS ===");
console.log("metrics order:", citations.info?.query?.metrics);
console.log("dimensions order:", citations.info?.query?.dimensions);
console.log("total rows:", citations.info?.total_rows);
console.log("FIRST ROW:", JSON.stringify(citations.data?.[0], null, 2));
