import { execSync } from 'child_process';
const run = (cmd) => { console.log(`\n▶ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
console.log("Refreshing The Press Room from live Profound data...\n");
run('node build_pressroom.mjs');
run('node revenue_ladder.mjs');
run('node diagnose.mjs');
run('node tojs.mjs');
console.log("\n✅ Done — refresh index.html to see the latest.");
