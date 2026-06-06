import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove the tiny top-bar sticker (revert that div to original)
html = html.replace(
  /<div style="display:flex;align-items:center;gap:8px">Powered by <b>Profound<\/b><img src="profound-hackathon-sticker\.png"[^>]*><\/div>/,
  '<div>Powered by <b>Profound</b></div>'
);

// 2. Make masthead position:relative so we can place the sticker in its corner
if (!html.includes('.masthead{position:relative')) {
  html = html.replace(
    '.masthead{text-align:center;',
    '.masthead{position:relative;text-align:center;'
  );
}

// 3. Add the sticker in the top-right of the masthead (bigger)
if (!html.includes('class="masthead-sticker"')) {
  html = html.replace(
    '<header class="masthead reveal" style="animation-delay:.05s">',
    '<header class="masthead reveal" style="animation-delay:.05s">\n      <img class="masthead-sticker" src="profound-hackathon-sticker.png" alt="Profound Hackathon" style="position:absolute;top:18px;right:0;height:96px;width:auto">'
  );
}

fs.writeFileSync('index.html', html);
const ok = html.includes('masthead-sticker') && !html.match(/topbar[\s\S]{0,200}profound-hackathon/);
console.log(ok ? '✅ sticker moved to masthead' : '⚠️ check result');
