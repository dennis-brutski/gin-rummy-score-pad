import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
const html = `<body style="margin:0;width:100vw;height:100vh;display:grid;place-items:center;
  background:radial-gradient(circle at 50% 35%, #2e4636, #16241c)">
  <div style="font:700 55vh Georgia,serif;color:#c9a35c;
    text-shadow:0 1vh 3vh rgba(0,0,0,.45)">♠</div></body>`;

const browser = await chromium.launch();
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html);
  await page.screenshot({ path: `public/icons/icon-${size}.png` });
  await page.close();
}
await browser.close();
console.log('icons written');
