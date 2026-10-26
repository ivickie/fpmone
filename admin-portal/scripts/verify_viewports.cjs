const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const PORT = 4180;
const DIST_DIR = path.join(__dirname, '..', 'dist');
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  let filePath = path.join(DIST_DIR, parsedUrl.pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const VIEWPORTS = [
  { width: 320, height: 800, name: '320px_narrow_mobile' },
  { width: 375, height: 812, name: '375px_iphone_se' },
  { width: 390, height: 844, name: '390px_iphone_14' },
  { width: 430, height: 932, name: '430px_iphone_14_pro_max' },
  { width: 768, height: 1024, name: '768px_tablet' },
  { width: 1024, height: 768, name: '1024px_laptop' },
  { width: 1440, height: 900, name: '1440px_large_desktop' }
];

const EDGE_EXECUTABLE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

server.listen(PORT, async () => {
  console.log(`[TEST SERVER] Running at http://localhost:${PORT}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: EDGE_EXECUTABLE,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.message}`));
    const testResults = [];

    for (const vp of VIEWPORTS) {
      console.log(`\n--- Testing Viewport: ${vp.width}px x ${vp.height}px (${vp.name}) ---`);
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.goto(`http://localhost:${PORT}/?mockAdmin=true&tab=bible-challenge`, {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      // 1. Verify No Horizontal Page Overflow
      const overflowInfo = await page.evaluate(() => {
        const bodyScrollWidth = document.body.scrollWidth;
        const docScrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const mainEl = document.querySelector('main');
        const mainScrollWidth = mainEl ? mainEl.scrollWidth : 0;
        return {
          bodyScrollWidth,
          docScrollWidth,
          innerWidth,
          mainScrollWidth,
          hasOverflow: docScrollWidth > innerWidth + 1 || bodyScrollWidth > innerWidth + 1
        };
      });

      console.log(`  Horizontal Overflow Check: docWidth=${overflowInfo.docScrollWidth}, windowWidth=${overflowInfo.innerWidth}`);
      const passNoOverflow = !overflowInfo.hasOverflow;
      if (passNoOverflow) {
        console.log(`  [PASS] No horizontal overflow at ${vp.width}px`);
      } else {
        console.error(`  [FAIL] Horizontal overflow detected at ${vp.width}px: scrollWidth=${overflowInfo.docScrollWidth} > innerWidth=${overflowInfo.innerWidth}`);
      }

      // Screenshot Tab 1 (Question Bank)
      const shot1 = path.join(OUTPUT_DIR, `tab_questions_${vp.width}.png`);
      await page.screenshot({ path: shot1 });

      // 2. Switch to Tab 2 (Today's Daily Challenge)
      const tabButtons = await page.$$('button');
      let clickedChallenge = false;
      for (const btn of tabButtons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes("Today's Daily Challenge")) {
          await btn.click();
          clickedChallenge = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 200));
      const shot2 = path.join(OUTPUT_DIR, `tab_challenge_${vp.width}.png`);
      await page.screenshot({ path: shot2 });

      // 3. Switch to Tab 3 (Game Rules & Badges)
      let clickedSettings = false;
      const tabButtons2 = await page.$$('button');
      for (const btn of tabButtons2) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes("Game Rules & Badges")) {
          await btn.click();
          clickedSettings = true;
          break;
        }
      }
      await new Promise(r => setTimeout(r, 200));
      const shot3 = path.join(OUTPUT_DIR, `tab_rules_badges_${vp.width}.png`);
      await page.screenshot({ path: shot3 });

      // 4. Test Question Editor Modal Sizing & Scrolling
      // Switch back to questions tab and click "New Question"
      const tabButtons3 = await page.$$('button');
      for (const btn of tabButtons3) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text && text.includes("Question Bank")) {
          await btn.click();
          break;
        }
      }
      await new Promise(r => setTimeout(r, 200));

      const pageDiag = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim());
        const bodySnippet = document.body.innerText.substring(0, 150).replace(/\n+/g, ' ');
        return { btns, bodySnippet };
      });
      console.log(`  Page state: ${pageDiag.bodySnippet}`);
      console.log(`  Found ${pageDiag.btns.length} buttons:`, pageDiag.btns.filter(Boolean).slice(0, 8));

      // Click "New Question" button directly
      const clickedNewQ = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent && b.textContent.includes('New Question'));
        if (target) {
          target.click();
          return true;
        }
        return false;
      });
      console.log(`  Clicked New Question: ${clickedNewQ}`);
      await new Promise(r => setTimeout(r, 400));

      // Verify modal is open and body overflow is locked
      const modalInfo = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        const bodyOverflow = document.body.style.overflow;
        if (!dialog) return { open: false };
        const rect = dialog.getBoundingClientRect();
        return {
          open: true,
          bodyOverflow,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          fitsViewport: rect.width <= window.innerWidth && rect.height <= window.innerHeight
        };
      });

      let passModal = false;
      if (modalInfo.open) {
        const shotModal = path.join(OUTPUT_DIR, `modal_editor_${vp.width}.png`);
        await page.screenshot({ path: shotModal });
        passModal = modalInfo.fitsViewport && modalInfo.bodyOverflow === 'hidden';
        console.log(`  Modal Sizing Check: dialogWidth=${modalInfo.width.toFixed(1)}px (viewport: ${vp.width}px), bodyOverflow="${modalInfo.bodyOverflow}"`);
        if (passModal) {
          console.log(`  [PASS] Modal fits within viewport and locks body scroll at ${vp.width}px`);
        } else {
          console.error(`  [FAIL] Modal sizing issue at ${vp.width}px`);
        }

        // Close modal
        const closeBtn = await page.$('button[aria-label="Close dialog"]');
        if (closeBtn) await closeBtn.click();
        await new Promise(r => setTimeout(r, 200));
      }

      testResults.push({
        viewport: vp.width,
        passNoOverflow,
        passModal,
        passed: passNoOverflow && passModal
      });
    }

    await browser.close();

    console.log('\n=============================================');
    console.log('VIEWPORT VERIFICATION RESULTS:');
    for (const r of testResults) {
      console.log(`  - ${r.viewport}px: ${r.passed ? 'PASSED' : 'FAILED'} (No Overflow: ${r.passNoOverflow ? 'YES' : 'NO'}, Modal Fit: ${r.passModal ? 'YES' : 'NO'})`);
    }
    const allPassed = testResults.every(r => r.passed);
    console.log(`OVERALL: ${allPassed ? 'ALL PASSED' : 'FAILURES DETECTED'}`);
    console.log('=============================================\n');

    server.close(() => {
      process.exit(allPassed ? 0 : 1);
    });

  } catch (err) {
    console.error('Test execution error:', err);
    if (browser) await browser.close();
    server.close(() => process.exit(1));
  }
});
