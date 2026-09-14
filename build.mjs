import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { cpSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
await build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  minify: true,
  jsx: 'automatic',
  outfile: 'dist/app.js',
  logLevel: 'info',
});
cpSync('public', 'dist', { recursive: true });
cpSync('src/styles.css', 'dist/styles.css');

// Version the service worker cache by content: a deploy that changes the app
// shows the update toast, a README-only push doesn't.
// ponytail: fonts/icons aren't hashed; rename the file when replacing one.
const hash = createHash('sha256');
for (const f of ['app.js', 'styles.css', 'index.html', 'manifest.json', 'sw.js']) {
  hash.update(readFileSync(`dist/${f}`));
}
const PLACEHOLDER = "const CACHE = 'gr-dev'";
const sw = readFileSync('dist/sw.js', 'utf8');
if (!sw.includes(PLACEHOLDER)) throw new Error('sw.js cache placeholder not found');
writeFileSync('dist/sw.js', sw.replace(PLACEHOLDER, `const CACHE = 'gr-${hash.digest('hex').slice(0, 12)}'`));
