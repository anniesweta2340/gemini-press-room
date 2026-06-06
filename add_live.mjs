import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

if (html.includes('function kpLiveRefresh')) {
  console.log('already added — skipping');
  process.exit(0);
}

// Add a live refresh handler. It reads the key from the existing #kp-input,
// calls Profound citations, and re-renders the #sources section live.
const jsAnchor = '// footer';
const liveCode = `// LIVE refresh from Profound (key comes from the input, never stored)
window.kpLiveRefresh = async function(){
  const key = (document.getElementById('kp-input').value || '').trim();
  const note = document.getElementById('kp-note');
  if(!key){ note.className='kp-note'; note.textContent='Paste your Profound API key first.'; return; }
  note.className='kp-note'; note.textContent='Pulling live citation data from Profound…';
  try {
    const r = await fetch('https://api.tryprofound.com/v1/reports/citations', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'X-API-Key': key },
      body: JSON.stringify({
        category_id:'7943f355-67f3-4792-b172-981db56ef33c',
        start_date:'2026-05-07', end_date:'2026-06-06',
        date_interval:'month', dimensions:['root_domain'],
        metrics:['citation_share','count']
      })
    });
    const d = await r.json();
    if(!d.data){ note.className='kp-note'; note.textContent='No data returned — check the key.'; return; }
    // aggregate by domain: metrics[0]=citation_share, metrics[1]=count
    const agg = {};
    d.data.forEach(row=>{
      const dom = row.dimensions && row.dimensions[0];
      const share = row.metrics && row.metrics[0];
      if(!dom) return;
      if(!agg[dom]) agg[dom] = 0;
      agg[dom] += (share||0);
    });
    const top = Object.entries(agg).map(([domain,share])=>({domain, share:+(share*100).toFixed(2)}))
      .sort((a,b)=>b.share-a.share).slice(0,12);
    const maxShare = Math.max(...top.map(s=>s.share));
    document.getElementById('sources').innerHTML = top.map((s,i)=>{
      const flagged = /reddit/i.test(s.domain);
      return \`<div class="source \${flagged?'flagged':''}">
        <div class="rk">\${i+1}</div>
        <div class="dom">\${s.domain}</div>
        <div class="track"><div class="fill" style="width:\${(s.share/maxShare)*100}%"></div></div>
        <div class="pct">\${s.share}%</div>
      </div>\`;
    }).join('');
    note.className='kp-note cmd';
    note.textContent='✓ Live from Profound — '+d.info.total_rows.toLocaleString()+' citation rows, refreshed just now.';
  } catch(e){
    note.className='kp-note'; note.textContent='Live call failed: '+e.message;
  }
};

// footer`;
html = html.replace(jsAnchor, liveCode);

// Add a "Refresh live" button next to the existing one
html = html.replace(
  '<button id="kp-btn" onclick="kpRefresh()">Refresh</button>',
  '<button id="kp-btn" onclick="kpRefresh()">Show command</button><button id="kp-live-btn" onclick="kpLiveRefresh()" style="margin-left:8px">Refresh live</button>'
);

fs.writeFileSync('index.html', html);
console.log('✅ live refresh added');
