/* Rebuild dedicated Tailwind CSS files for every publishable HTML page.
   Run from this folder after: npm install
   Usage: node build-css.js
*/
const fs = require('fs');
const path = require('path');
const { compile } = require('tailwindcss');

const SOURCE_DIR = __dirname;
const ROOT = path.resolve(SOURCE_DIR, '..');
const CSS_DIR = path.join(ROOT, 'css');
const themeCss = fs.readFileSync(path.join(SOURCE_DIR, 'theme.css'), 'utf8');
const tailwindLib = require.resolve('tailwindcss');
const tailwindIndex = path.resolve(path.dirname(tailwindLib), '..', 'index.css');
const tailwindBase = fs.readFileSync(tailwindIndex, 'utf8');

const customClasses = new Set([
  'article-prose','theme-card','card-hover','nav-link','festival-hero','quick-card','badge','festival-visual','festival-visual-alt'
]);

function candidates(html) {
  const set = new Set();
  const re = /class\s*=\s*(["'])(.*?)\1/gs;
  let m;
  while ((m = re.exec(html)) !== null) {
    for (const cls of m[2].split(/\s+/).filter(Boolean)) {
      if (cls.startsWith('fa-') || ['fas','far','fab'].includes(cls) || customClasses.has(cls)) continue;
      set.add(cls);
    }
  }
  return [...set].sort();
}

(async () => {
  fs.mkdirSync(CSS_DIR, { recursive: true });
  const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
  for (const file of pages) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const compiler = await compile(tailwindBase);
    const compiled = compiler.build(candidates(html));
    const out = compiled + '\n\n/* Shraddh / Pitru Paksha custom theme */\n' + themeCss + '\n';
    fs.writeFileSync(path.join(CSS_DIR, path.basename(file, '.html') + '.css'), out);
    console.log('built', file);
  }
})();
