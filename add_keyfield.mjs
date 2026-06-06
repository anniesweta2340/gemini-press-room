import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');
let changed = [];

// 1. HTML: insert key panel right after the top bar
if (!html.includes('id="key-panel"')) {
  const anchor = '</header>';
  if (html.includes(anchor)) {
    html = html.replace(anchor, anchor + `

    <div id="key-panel" class="key-panel reveal" style="animation-delay:.08s">
      <div class="kp-label">Live Refresh</div>
      <div class="kp-row">
        <input id="kp-input" type="password" placeholder="Paste your Profound API key to refresh from live data" autocomplete="off" />
        <button id="kp-btn" onclick="kpRefresh()">Refresh</button>
      </div>
      <div class="kp-note" id="kp-note">This report runs on a schedule. Enter your own Profound key to regenerate it from live data on your instance.</div>
    </div>`);
    changed.push('html');
  }
}

// 2. CSS
if (!html.includes('.key-panel{')) {
  const cssAnchor = '  /* ---- load animation ---- */';
  html = html.replace(cssAnchor,
`  /* ---- key panel ---- */
  .key-panel{max-width:1080px;margin:0 auto;padding:14px 0 0;border-top:1px solid var(--rule-soft)}
  .kp-label{font-family:"Archivo",sans-serif;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:var(--crimson);font-weight:700;margin-bottom:8px}
  .kp-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
  .kp-row input{flex:1;min-width:260px;font-family:"Archivo",sans-serif;font-size:13px;padding:10px 12px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);border-radius:2px}
  .kp-row input:focus{outline:none;border-color:var(--crimson)}
  .kp-row button{font-family:"Archivo",sans-serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;padding:10px 20px;border:1px solid var(--crimson);background:var(--crimson);color:#fff;cursor:pointer;border-radius:2px;transition:opacity .15s}
  .kp-row button:hover{opacity:.85}
  .kp-note{font-family:"Archivo",sans-serif;font-size:12px;color:var(--ink-soft);margin-top:9px;letter-spacing:.02em;line-height:1.5}
  .kp-note.cmd{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--cream-deep);padding:9px 12px;border-radius:2px;color:var(--ink);border-left:2px solid var(--crimson)}

  /* ---- load animation ---- */`);
  changed.push('css');
}

// 3. JS: add the handler before the footer line
if (!html.includes('function kpRefresh')) {
  const jsAnchor = '// footer';
  html = html.replace(jsAnchor,
`// live refresh (demo mode — safe, no client-side API calls)
window.kpRefresh = function(){
  const v = (document.getElementById('kp-input').value || '').trim();
  const note = document.getElementById('kp-note');
  if(!v){ note.className='kp-note'; note.textContent='Enter your Profound API key to continue.'; return; }
  if(!/^[A-Za-z0-9_\\-]{12,}$/.test(v)){ note.className='kp-note'; note.textContent='That does not look like a valid key. Check and try again.'; return; }
  note.className='kp-note cmd';
  note.textContent='Key accepted. To regenerate from live data, run:  PROFOUND_API_KEY=*** node refresh.mjs';
  document.getElementById('kp-input').value='';
};

// footer`);
  changed.push('js');
}

fs.writeFileSync('index.html', html);
console.log('Applied:', changed.length ? changed.join(', ') : 'nothing (already present or anchors not found)');
