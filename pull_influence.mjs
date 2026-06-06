import Profound from '@profoundai/client';
import fs from 'fs';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });
const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

const categories = await client.organizations.categories.list();
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;

// citations broken out by prompt + source domain
const res = await client.reports.citations({
  category_id: categoryId,
  start_date: start, end_date: end,
  date_interval: "month",
  dimensions: ["prompt", "root_domain"],
  metrics: ["citation_share", "count"],
});

console.log("dimensions order:", res.info?.query?.dimensions);
console.log("metrics order:", res.info?.query?.metrics);
console.log("total rows:", res.info?.total_rows);
console.log("FIRST ROW:", JSON.stringify(res.data?.[0], null, 2));

fs.writeFileSync("influence_raw.json", JSON.stringify(res, null, 2));
console.log("\n✅ saved influence_raw.json");
