import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

// Remove the Deployment Map heading, its note, and the #infl-desk container —
// but NOT the Outreach List that follows it.
const block = `      <h4 class="infl-subhead">The Deployment Map</h4>
      <p class="infl-note">For each buried question, the channel where rivals already win — and where Gemini should send its creators.</p>
      <div id="infl-desk"></div>

`;

if (html.includes(block)) {
  html = html.replace(block, '');
  fs.writeFileSync('index.html', html);
  console.log('✅ Deployment Map removed');
} else {
  console.log('⚠️ exact block not found — pasting current text below for matching');
}
