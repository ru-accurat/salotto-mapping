import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outLabels = path.resolve(__dirname, '../salotto-network-hires-labels.png');
const outNoLabels = path.resolve(__dirname, '../salotto-network-hires-nolabels.png');
const appTsx = path.resolve(__dirname, '../viz/src/App.tsx');

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 2560, height: 1440, deviceScaleFactor: 2 });
await page.goto('http://localhost:5174', { waitUntil: 'networkidle0', timeout: 15000 });

// Wait for simulation to settle and fitView to fire
await new Promise(r => setTimeout(r, 12000));

// Screenshot WITH labels
await page.screenshot({ path: outLabels, type: 'png', fullPage: false });
console.log(`Saved with labels: ${outLabels}`);

// Now modify App.tsx to disable labels, let HMR reload
const original = fs.readFileSync(appTsx, 'utf-8');
const noLabels = original
  .replace('showLabels={true}', 'showLabels={false}')
  .replace('showDynamicLabels={true}', 'showDynamicLabels={false}')
  .replace('showTopLabels={true}', 'showTopLabels={false}')
  .replace('showHoveredPointLabel={true}', 'showHoveredPointLabel={false}');
fs.writeFileSync(appTsx, noLabels);

// Wait for HMR to pick up the change and re-render
await new Promise(r => setTimeout(r, 8000));

// Screenshot WITHOUT labels
await page.screenshot({ path: outNoLabels, type: 'png', fullPage: false });
console.log(`Saved without labels: ${outNoLabels}`);

// Revert App.tsx
fs.writeFileSync(appTsx, original);
console.log('Reverted App.tsx');

await browser.close();
