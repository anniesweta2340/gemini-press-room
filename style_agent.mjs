import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');

if (html.includes('/* agent-kit-style */')) { console.log('already added — skipping'); process.exit(0); }

// 1. Add CSS: give .fix cards an agent treatment + a badge
const cssAnchor = '  /* ---- load animation ---- */';
const css = `  /* agent-kit-style */
  .fix{position:relative;border-left:3px solid var(--crimson);background:linear-gradient(180deg,#FBF3E8,#FBF6EC)}
  .fix .agent-badge{display:inline-flex;align-items:center;gap:6px;font-family:"Archivo",sans-serif;
    font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:#fff;background:var(--crimson);
    padding:3px 9px;border-radius:2px;margin-bottom:10px;font-weight:700}
  .fix .agent-badge::before{content:"";width:5px;height:5px;border-radius:50%;background:#7ED957;display:inline-block}
  .kit-intro{font-style:italic;color:var(--ink-soft);font-size:16px;max-width:680px;margin-bottom:20px;line-height:1.55;
    border-left:2px solid var(--crimson);padding-left:14px}

`;
if (!html.includes(cssAnchor)) { console.log('⚠️ css anchor not found'); process.exit(1); }
html = html.replace(cssAnchor, css + cssAnchor);

// 2. Add an intro line above the kit explaining it's agent output
const introAnchor = '<div id="kit"></div>';
if (html.includes(introAnchor) && !html.includes('kit-intro')) {
  html = html.replace(introAnchor,
    '<p class="kit-intro">Each brief below was diagnosed, drafted, and self-evaluated by the agent. One additional draft was rejected by the agent\\'s own guardrail.</p>\n      <div id="kit"></div>');
}

// 3. Add the badge inside each rendered fix card
const renderAnchor = '<div class="for">Counter for: <span>&ldquo;${f.prompt}&rdquo;</span></div>';
if (html.includes(renderAnchor)) {
  html = html.replace(renderAnchor,
    '<div class="agent-badge">Agent-drafted · self-evaluated</div>\n      <div class="for">Counter for: <span>&ldquo;${f.prompt}&rdquo;</span></div>');
}

fs.writeFileSync('index.html', html);
console.log('✅ agent styling added to Press Kit');
