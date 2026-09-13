const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'artifacts', 'market-regime-qa');
fs.mkdirSync(output, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true,
    ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1100}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4177';
    await page.goto(base + '/study/market-regime/index.html', {waitUntil: 'load'});
    await page.evaluate(() => document.fonts.ready);
    const state = await page.evaluate(() => ({
      us: DATA.us.asof, kr: DATA.kr.asof, cn: DATA.cn.asof, mode: DATA.us.mode,
      columns: document.querySelectorAll('.cmpcol').length,
      cards: document.querySelectorAll('#us_cards .card').length,
      paths: [...document.querySelectorAll('#us_sm svg')].map(svg => svg.querySelectorAll('path').length),
      notice: document.querySelector('.snapshot-chip').textContent,
      rows: document.querySelectorAll('#us_tbl tbody tr').length,
      width: document.documentElement.scrollWidth,
    }));
    assert.equal(state.mode, 'eg-us-regime-v1');
    assert.equal(state.cards, 7);
    assert.equal(state.columns, 3);
    assert.equal(state.rows, 10);
    assert.ok(state.paths.every(count => count >= 1));
    assert.ok(state.notice.includes('미국 자동 갱신'));
    assert.ok(state.width <= 1440);
    await page.screenshot({path: path.join(output, 'desktop.png')});
    await page.locator('[data-k="kr"]').click();
    await page.locator('#pane_kr').waitFor({state: 'visible'});
    await page.locator('[data-k="cn"]').click();
    await page.locator('#pane_cn').waitFor({state: 'visible'});
    await page.locator('[data-k="us"]').click();
    await page.setViewportSize({width: 390, height: 844});
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({path: path.join(output, 'mobile.png')});
    await page.setViewportSize({width: 1440, height: 1100});
    await page.goto(base + '/#/research/market-regime', {waitUntil: 'load', timeout: 90000});
    const frame = page.frameLocator('[data-study-market-regime]');
    await frame.locator('#us_cards .card').first().waitFor({timeout: 90000});
    assert.match(await frame.locator('.snapshot-chip').innerText(), /미국 자동 갱신/);
    await page.screenshot({path: path.join(output, 'dashboard.png')});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(state));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
