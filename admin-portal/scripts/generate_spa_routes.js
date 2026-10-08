import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('[SPA ROUTE GEN] dist/index.html does not exist. Run vite build first.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

const routes = ['privacy', 'delete-account'];

for (const route of routes) {
  // 1. Directory with index.html (e.g. dist/privacy/index.html)
  const routeDir = path.join(distDir, route);
  if (!fs.existsSync(routeDir)) {
    fs.mkdirSync(routeDir, { recursive: true });
  }
  fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);

  // 2. HTML file (e.g. dist/privacy.html)
  fs.writeFileSync(path.join(distDir, `${route}.html`), indexContent);

  console.log(`[SPA ROUTE GEN] Generated fallback files for /${route}`);
}
