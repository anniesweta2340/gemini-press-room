import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

// Replace the previous mobile fix block with a "stay beside title, just smaller" version
const oldBlock = `  /* mobile-sticker-fix */
  @media(max-width:680px){
    .masthead-sticker{
      position:static !important;
      display:block;
      margin:0 auto 14px;
      height:120px !important;
    }
  }

`;
const newBlock = `  /* mobile-sticker-fix */
  @media(max-width:680px){
    .masthead-sticker{
      height:64px !important;
      top:10px !important;
      right:0 !important;
    }
    .masthead{padding-right:74px}
  }

`;

if (html.includes(oldBlock)) {
  html = html.replace(oldBlock, newBlock);
  fs.writeFileSync('index.html', html);
  console.log('✅ sticker now stays beside title on mobile (smaller)');
} else if (html.includes('mobile-sticker-fix')) {
  console.log('⚠️ found the marker but block text differs — paste me the current block');
} else {
  console.log('⚠️ no existing mobile fix found');
}
