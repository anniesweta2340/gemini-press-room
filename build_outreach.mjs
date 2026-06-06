import fs from 'fs';
const raw = JSON.parse(fs.readFileSync('influence_raw.json','utf8'));
const rows = raw.data || raw;
const pr = JSON.parse(fs.readFileSync('pressroom.json','utf8'));

const channelOf = (d) => {
  if (/reddit|quora|news\.ycombinator|stackexchange|stackoverflow/i.test(d)) return 'Community';
  if (/youtube|tiktok|instagram|twitch/i.test(d)) return 'Creator';
  if (/g2|capterra|trustpilot|producthunt/i.test(d)) return 'Review';
  if (/medium|substack|dev\.to|hashnode/i.test(d)) return 'Writer';
  if (/linkedin|twitter|x\.com|threads/i.test(d)) return 'Social';
  if (/github|huggingface/i.test(d)) return 'Developer';
  // AI product/vendor sites (own a .ai or known tool domains)
  if (/\.ai$|sudowrite|scholarcy|lokalise|klippa|koncile|coworker|laper/i.test(d)) return 'Vendor';
  return 'Editorial';
};

const prompts = (pr.revenue?.by_prompt || []).slice(0,6).map(p=>p.prompt);
const outreach = prompts.map(prompt => {
  const key = prompt.toLowerCase();
  const matches = rows.filter(r => {
    const rp = (r.dimensions?.[0]||'').toLowerCase();
    return rp === key || rp.includes(key) || key.includes(rp);
  });
  const byDomain = {};
  matches.forEach(r => {
    const dom = r.dimensions?.[1]; const share = r.metrics?.[0]||0;
    if(!dom) return; byDomain[dom] = (byDomain[dom]||0) + share;
  });
  const top = Object.entries(byDomain).sort((a,b)=>b[1]-a[1]).slice(0,3)
    .map(([domain,share])=>({domain, channel:channelOf(domain), share:+(share*100).toFixed(1)}));
  return { prompt, sources: top };
}).filter(o => o.sources.length);

pr.outreach = outreach;
fs.writeFileSync('pressroom.json', JSON.stringify(pr,null,2));
console.log('✅ built outreach for', outreach.length, 'prompts');
