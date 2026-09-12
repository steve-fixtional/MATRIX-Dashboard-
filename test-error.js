const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('pageerror', (err) => {
    console.error('PAGE ERROR:', err.toString());
    console.error(err.stack);
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('CONSOLE ERROR:', msg.text());
    }
  });

  try {
    await page.goto('http://localhost:3000/files', { waitUntil: 'networkidle0', timeout: 5000 });
  } catch (e) {
    console.log("Navigated, but timed out or failed:", e.message);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();
