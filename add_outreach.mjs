import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');
let changed = [];

// 1. HTML: add outreach container after the deployment map div
if (!html.includes('id="outreach"')) {
  const anchor = '<div id="infl-desk"></div>';
  if (html.includes(anchor)) {
    html = html.replace(anchor, anchor +
`

      <h4 class="infl-subhead">The Outreach List</h4>
      <p class="infl-note">The real sources already shaping each answer — pulled from live citation data. This is where to engage, by name.</p>
      <div id="outreach"></div>`);
    changed.push('html');
  }
}

// 2. CSS: add outreach styles before the load animation block
if (!html.includes('.out-row{')) {
  const cssAnchor = '  /* ---- load animation ---- */';
  if (html.includes(cssAnchor)) {
    html = html.replace(cssAnchor,
`  /* ---- outreach list ---- */
  .out-row{background:var(--paper);border:1px solid var(--rule-soft);padding:18px 22px;margin-bottom:12px}
  .out-row .oq{font-family:"Bodoni Moda",serif;font-size:18px;font-weight:500;margin-bottom:12px}
  .out-srcs{display:flex;flex-wrap:wrap;gap:10px}
  .out-src{display:flex;align-items:center;gap:8px;background:var(--cream);border:1px solid var(--rule-soft);border-radius:2px;padding:6px 11px;font-family:"Archivo",sans-serif;font-size:13px}
  .out-src .od{font-weight:600;color:var(--ink)}
  .out-src .oc{font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:2px 6px;border-radius:2px;background:var(--rule-soft);color:var(--ink-soft)}
  .out-src .oc.Community{background:#E8D5D0;color:var(--crimson)}
  .out-src .oc.Creator{background:#E3D9C4;color:var(--gold)}
  .out-src .oc.Vendor{background:#D9DEE0;color:#3A5560}
  .out-src .osh{color:var(--ink-soft);font-variant-numeric:tabular-nums}

` + cssAnchor);
    changed.push('css');
  }
}

// 3. JS: add outreach render at the end of the influence IIFE
if (!html.includes("getElementById('outreach')") && !html.includes('getElementById("outreach")')) {
  // insert right before the closing of the influence IIFE: the deployment-map block ends with `}).join('');\n  }\n})();`
  const jsAnchor = "})();\n\n// footer";
  if (html.includes(jsAnchor)) {
    const renderCode = `  // outreach list (real cited sources per prompt)
  const out = DATA.outreach || [];
  const oe = document.getElementById('outreach');
  if(oe && out.length){
    oe.innerHTML = out.map(o=>\`
      <div class="out-row">
        <div class="oq">&ldquo;\${o.prompt}&rdquo;</div>
        <div class="out-srcs">
          \${(o.sources||[]).map(s=>\`
            <div class="out-src">
              <span class="od">\${s.domain}</span>
              <span class="oc \${s.channel}">\${s.channel}</span>
              <span class="osh">\${s.share}%</span>
            </div>\`).join('')}
        </div>
      </div>\`).join('');
  }
})();

// footer`;
    html = html.replace(jsAnchor, renderCode);
    changed.push('js');
  }
}

fs.writeFileSync('index.html', html);
console.log('Applied:', changed.length ? changed.join(', ') : 'nothing (already present or anchors not found)');
