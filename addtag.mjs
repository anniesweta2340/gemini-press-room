import fs from 'fs';
let html = fs.readFileSync('index.html', 'utf8');
if (html.includes('<script src="pressroom.js">')) {
  console.log('tag already present — nothing to do');
} else {
  html = html.replace('<body>', '<body>\n<script src="pressroom.js"></script>');
  fs.writeFileSync('index.html', html);
  console.log('✅ added pressroom.js script tag');
}
