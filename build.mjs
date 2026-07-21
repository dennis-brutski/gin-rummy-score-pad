import { build } from 'esbuild';
import { cpSync, rmSync } from 'node:fs';

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
