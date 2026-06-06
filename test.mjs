import Profound from '@profoundai/client';

console.log("✅ SDK loaded successfully:", typeof Profound);

const client = new Profound({ apiKey: process.env.PROFOUND_API_KEY });

try {
  const categories = await client.organizations.categories.list();
  console.log("Categories:", categories);
} catch (err) {
  console.log("⚠️  API call failed (expected if you don't have a key yet):", err.message);
}
