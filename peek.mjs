import Profound from '@profoundai/client';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;

const res = await client.reports.visibility({
  category_id: categoryId,
  start_date: start, end_date: end,
  dimensions: ["asset_name"],
  metrics: ["share_of_voice", "visibility_score", "average_position", "mentions_count"],
});

console.log("TOP-LEVEL KEYS:", Object.keys(res));
console.log("\nINFO BLOCK:", JSON.stringify(res.info ?? "(none)", null, 2));
const rows = res?.data ?? res ?? [];
console.log("\nROW COUNT:", Array.isArray(rows) ? rows.length : "not an array");
console.log("\nFIRST ROW:\n", JSON.stringify(Array.isArray(rows) ? rows[0] : rows, null, 2));
