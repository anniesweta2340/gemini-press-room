import fs from 'fs';
const d = fs.readFileSync('pressroom.json', 'utf8');
fs.writeFileSync('pressroom.js', 'window.PRESSROOM_DATA = ' + d + ';');
console.log('✅ wrote pressroom.js — refresh index.html');
