import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

if (html.includes('/* mobile-sticker-fix */')) {
  console.log('already added — skipping');
  process.exit(0);
}

// Add a media query before the load-animation CSS block
const anchor = '  /* ---- load animation ---- */';
const css = `  /* mobile-sticker-fix */
  @media(max-width:680px){
    .masthead-sticker{
      position:static !important;
      display:block;
      margin:0 auto 14px;
      height:120px !important;
    }
  }

`;
if (!html.includes(anchor)) {
  console.log('⚠️ anchor not found — stopping so nothing breaks.');
  process.exit(1);
}
html = html.replace(anchor, css + anchor);
fs.writeFileSync('index.html', html);
console.log('✅ mobile sticker fix added');
