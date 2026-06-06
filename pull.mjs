import Profound from '@profoundai/client';

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });

const end = new Date().toISOString().slice(0, 10);
const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);

// 1) What categories exist in this instance?
const categories = await client.organizations.categories.list();
console.log("CATEGORIES:\n", JSON.stringify(categories, null, 2));

// pick category: env override, else first one found
const arr = Array.isArray(categories) ? categories : (categories?.data ?? []);
const categoryId = process.env.CATEGORY_ID || arr[0]?.id;
if (!categoryId) { console.log("No categories yet — set one up in the dashboard first."); process.exit(0); }
console.log("\nUsing category:", categoryId, "\n");

// 2) Share of voice across all tracked brands (Gemini vs competitors)
const byAsset = await client.reports.visibility({
  category_id: categoryId,
  start_date: start,
  end_date: end,
  dimensions: ["asset_name"],
  metrics: ["share_of_voice", "visibility_score", "average_position", "mentions_count"],
});
console.log("=== SHARE OF VOICE BY BRAND ===");
console.log(JSON.stringify(byAsset?.data ?? byAsset, null, 2));

// 3) The self-preference cut: brand mentions broken out by which engine answered
const byAssetModel = await client.reports.visibility({
  category_id: categoryId,
  start_date: start,
  end_date: end,
  dimensions: ["asset_name", "model"],
  metrics: ["share_of_voice", "visibility_score"],
});
console.log("\n=== BRAND × ENGINE (self-preference signal) ===");
console.log(JSON.stringify(byAssetModel?.data ?? byAssetModel, null, 2));
