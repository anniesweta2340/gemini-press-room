import fs from 'fs';

// reuse the raw pull we already saved
const raw = JSON.parse(fs.readFileSync("influence_raw.json", "utf8"));
const rows = raw.data.map(r => ({ prompt: r.dimensions[0], domain: r.dimensions[1], share: r.metrics[0], count: r.metrics[1] }));

// --- smarter classifier ---
const COMMUNITY = /reddit|quora|stackexchange|stackoverflow|ycombinator|hacker|discord|producthunt/i;
const CREATORS  = /youtube|tiktok|vimeo|twitch/i;
const WRITERS   = /medium|substack|dev\.to|hashnode|ghost\.io|wordpress|blogspot|hackernoon/i;
const SOCIAL    = /linkedin|twitter|x\.com|instagram|facebook|threads/i;
const REVIEWS   = /g2\.com|capterra|trustradius|getapp|softwareadvice/i;
const DEV       = /github|gitlab|huggingface|kaggle/i;
const REFERENCE = /wikipedia|wikimedia/i;
const VENDOR    = /anthropic|openai|google|microsoft|deepmind|gemini|perplexity\.ai|x\.ai/i;

function channelOf(d){
  if (COMMUNITY.test(d)) return "Community (Reddit/HN/Quora)";
  if (CREATORS.test(d))  return "Creators (YouTube/TikTok)";
  if (WRITERS.test(d))   return "Writers (blogs/Medium)";
  if (SOCIAL.test(d))    return "Social (LinkedIn/X)";
  if (REVIEWS.test(d))   return "Review platforms";
  if (DEV.test(d))       return "Developer (GitHub/HF)";
  if (REFERENCE.test(d)) return "Reference (Wikipedia)";
  if (VENDOR.test(d))    return "Owned/Vendor";
  return "News/Editorial";
}
// "earned by people" = the ambassador-driven surfaces
const isCommunityEarned = ch => /Community|Creators|Writers|Social|Review/.test(ch);

// --- category-wide channel mix ---
const total = rows.reduce((s,r)=>s+r.count,0);
const mix = {};
for (const r of rows) mix[channelOf(r.domain)] = (mix[channelOf(r.domain)]||0)+r.count;
const channelMix = Object.entries(mix).map(([channel,count])=>({channel, share:+((count/total)*100).toFixed(1)})).sort((a,b)=>b.share-a.share);

// --- per-brand community share (PROXY: questions ABOUT each brand) ---
const brands = { Claude:/claude/i, Gemini:/gemini|bard/i, ChatGPT:/chatgpt|openai|gpt/i };
const brandShare = Object.entries(brands).map(([brand,re])=>{
  const br = rows.filter(r=>re.test(r.prompt));
  const tot = br.reduce((s,r)=>s+r.count,0);
  const comm = br.filter(r=>isCommunityEarned(channelOf(r.domain))).reduce((s,r)=>s+r.count,0);
  return { brand, community_share: tot? +((comm/tot)*100).toFixed(1):0, total_citations: tot };
}).sort((a,b)=>b.community_share-a.community_share);

const pressroom = JSON.parse(fs.readFileSync("pressroom.json","utf8"));
pressroom.influence = { ...(pressroom.influence||{}), channel_mix: channelMix, brand_community_share: brandShare };
fs.writeFileSync("pressroom.json", JSON.stringify(pressroom,null,2));

console.log("=== CHANNEL MIX (fixed classifier) ===");
console.table(channelMix);
console.log("\n=== COMMUNITY SHARE BY BRAND (ambassador fingerprint, proxy) ===");
console.table(brandShare);
