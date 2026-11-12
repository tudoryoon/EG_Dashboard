const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'rs-search-placement');
fs.mkdirSync(out, {recursive: true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/screening/rs', {waitUntil: 'load', timeout: 120000});
    await page.waitForSelector('[data-rs-search-slot] #search-input');
    await page.evaluate(() => {window.__originalSearch = document.querySelector('#search-input');});
    const input = page.locator('#search-input');
    const slot = page.locator('[data-rs-search-slot]');
    const assertPosition = async () => {
      const position = await page.evaluate(() => {
        const leader = document.querySelector('.market-rs-leaders');
        const slot = document.querySelector('[data-rs-search-slot]');
        const detail = document.querySelector('.market-rs-detail');
        const input = document.querySelector('#search-input');
        return {leaderBottom: leader.getBoundingClientRect().bottom, slotTop: slot.getBoundingClientRect().top,
          slotBottom: slot.getBoundingClientRect().bottom, detailTop: detail.getBoundingClientRect().top,
          sameInput: input === window.__originalSearch, count: document.querySelectorAll('#search-input').length,
          toolbarHidden: document.querySelector('.toolbar-row-filters').classList.contains('hidden')};
      });
      assert.ok(position.leaderBottom <= position.slotTop);
      assert.ok(position.slotBottom <= position.detailTop);
      assert.equal(position.sameInput, true);
      assert.equal(position.count, 1);
      assert.equal(position.toolbarHidden, true);
    };
    await assertPosition();
    const search = async (ticker) => {
      await input.scrollIntoViewIfNeeded();
      await input.click();
      const y = (await input.boundingBox()).y;
      await input.pressSequentially(ticker, {delay: 210});
      await page.waitForFunction(value => state.query === value && document.querySelector('.market-rs-detail h2')?.textContent === value, ticker);
      assert.equal(await input.inputValue(), ticker);
      assert.equal(await input.evaluate(element => document.activeElement === element), true);
      assert.equal(await input.evaluate(element => element.selectionStart), ticker.length);
      assert.ok(Math.abs((await input.boundingBox()).y - y) < 3, 'Search must not jump as leader rows shrink');
      await assertPosition();
    };
    await search('AAPL');
    assert.equal(await page.locator('.market-rs-leaders [data-rs-ticker]').count(), 1);
    await input.fill('');
    await page.waitForFunction(() => state.query === '' && document.querySelectorAll('.market-rs-leaders [data-rs-ticker]').length > 1);
    await page.evaluate(() => {const el = document.querySelector('[data-rs-search-slot]'); window.scrollBy(0, el.getBoundingClientRect().top - 180);});
    await page.screenshot({path: path.join(out, 'desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(250);
    await search('RBRK');
    const bounds = await slot.boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391);
    await page.screenshot({path: path.join(out, 'mobile.png')});
    await input.fill('');
    await page.waitForFunction(() => state.query === '' && document.querySelectorAll('.market-rs-leaders [data-rs-ticker]').length > 1);
    await page.setViewportSize({width: 1600, height: 1000});
    for (const view of ['TrendScore', 'Canslim']) {
      await page.evaluate(view => {state.screeningView = view; render();}, view);
      assert.equal(await page.locator('.toolbar-row-filters #search-input').isVisible(), true);
      assert.equal(await page.evaluate(() => document.querySelector('#search-input') === window.__originalSearch), true);
      assert.equal(await page.locator('[data-rs-search-slot]').count(), 0);
      await input.fill('NVDA');
      await page.waitForTimeout(250);
      assert.equal(await page.evaluate(() => state.query), 'NVDA');
      await input.fill('');
      await page.waitForTimeout(250);
    }
    await page.evaluate(() => {state.screeningView = 'RS'; render();});
    await assertPosition();
    await search('AAPL');
    await input.press('Home');
    await input.press('ArrowRight');
    await input.press('ArrowRight');
    await input.press('Backspace');
    await page.waitForFunction(() => state.query === 'APL');
    await page.waitForTimeout(200);
    assert.equal(await input.evaluate(element => element.selectionStart), 1, 'Preserve caret while editing the middle of the query');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    await input.fill('ZZZZNOTFOUND');
    await page.waitForFunction(() => document.querySelector('.market-rs-leaders .market-rs-empty'));
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    await input.fill('');
    await page.waitForFunction(() => state.query === '' && document.querySelectorAll('.market-rs-leaders [data-rs-ticker]').length > 1);
    const countBeforeComposition = await page.locator('.market-rs-leaders [data-rs-ticker]').count();
    await input.evaluate(element => {
      element.focus(); element.value = '가';
      element.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: true}));
    });
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.market-rs-leaders [data-rs-ticker]').count(), countBeforeComposition, 'Do not interrupt an active IME composition');
    await input.evaluate(element => {
      element.value = 'NVDA'; element.dispatchEvent(new InputEvent('input', {bubbles: true, isComposing: false}));
    });
    await page.waitForFunction(() => document.querySelector('.market-rs-detail h2')?.textContent === 'NVDA');
    assert.equal(await input.evaluate(element => document.activeElement === element), true);
    assert.deepEqual(errors, []);
    console.log('Browser QA passed: Leaders/search/detail order, single persistent input, slow typing, viewport/caret continuity, empty results, mobile and other Screening tabs.');
    console.log(out);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
