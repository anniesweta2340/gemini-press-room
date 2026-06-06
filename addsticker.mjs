import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');
if (html.includes('profound-hackathon-sticker.png')) {
  console.log('sticker already present');
} else {
  const before = html.length;
  html = html.replace(
    '<div>Powered by <b>Profound</b></div>',
    '<div style="display:flex;align-items:center;gap:8px">Powered by <b>Profound</b><img src="profound-hackathon-sticker.png" alt="Profound Hackathon" style="height:26px;width:auto"></div>'
  );
  fs.writeFileSync('index.html', html);
  console.log(html.length > before ? '✅ sticker added' : '⚠️ no match — text not found');
}
