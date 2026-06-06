import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

if (html.includes('// live-date-update')) {
  console.log('already added — skipping');
  process.exit(0);
}

// Inside kpLiveRefresh, right after the success note is set, also refresh the date label.
const anchor = "note.textContent='✓ Live from Profound — '+d.info.total_rows.toLocaleString()+' citation rows, refreshed just now.';";
const replacement = anchor + `
    // live-date-update: reflect the refresh time in the masthead window label
    try {
      const now = new Date();
      const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const wl = document.getElementById('window-label');
      if(wl) wl.textContent = 'Refreshed live · ' + mo[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    } catch(e){}`;

if (!html.includes(anchor)) {
  console.log('⚠️ anchor not found — the refresh function may differ. Stopping so nothing breaks.');
  process.exit(1);
}
html = html.replace(anchor, replacement);
fs.writeFileSync('index.html', html);
console.log('✅ date label now updates on live refresh');
