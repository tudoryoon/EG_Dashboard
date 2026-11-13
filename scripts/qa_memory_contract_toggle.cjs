const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'memory-contract-toggle');
fs.mkdirSync(out, {recursive: true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/tech/memory-data', {waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => typeof Chart === 'function' && memorySpotRuntime.loaded && document.querySelector('[data-memory-contract-panel]'));
    const panel = page.locator('[data-memory-contract-panel]');
    const summary = panel.locator('summary');
    const canvas = panel.locator('canvas');
    const dollarRows = page.locator('.memory-spot-contract-row');
    const checks = await page.evaluate(() => memorySpotData.spotContractChecks);
    assert.equal(await dollarRows.count(), checks.rows.length);
    for (const [index, row] of checks.rows.entries()) {
      assert.ok((await dollarRows.nth(index).innerText()).includes(row.contractDate));
      assert.ok((await dollarRows.nth(index).innerText()).includes(row.contractBasis));
      assert.ok((await dollarRows.nth(index).innerText()).includes(`$${row.contractPrice.toFixed(3)}`));
      assert.equal(await dollarRows.nth(index).locator('a').getAttribute('href'), row.contractSourceUrl);
    }
    const chartId = () => canvas.evaluate(canvas => Chart.getChart(canvas)?.id ?? null);
    const isOpen = () => panel.evaluate(panel => panel.open);
    assert.equal(await isOpen(), false);
    assert.equal(await canvas.isVisible(), false);
    assert.equal(await chartId(), null);
    const sources = await panel.locator('.memory-contract-content a').evaluateAll(links => links.map(link => link.href));
    assert.ok(sources.length > 0);
    assert.equal(await panel.locator('.memory-contract-content a:visible').count(), 0);
    await panel.screenshot({path: path.join(out, 'closed-desktop.png')});
    await summary.click();
    await page.waitForFunction(() => state.memoryContractGuideOpen && Chart.getChart(document.querySelector('[data-memory-contract-guide]')));
    assert.equal(await canvas.isVisible(), true);
    const firstId = await chartId();
    const verifyCanvas = async () => {
      const result = await canvas.evaluate(canvas => {
        const chart = Chart.getChart(canvas);
        const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let colored = 0;
        for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] > 100 && Math.max(rgba[i],rgba[i+1],rgba[i+2]) - Math.min(rgba[i],rgba[i+1],rgba[i+2]) > 70) colored++;
        return {width: chart.width, height: chart.height, colored, labels: chart.data.labels,
          count: charts.filter(chart => chart.canvas === canvas).length};
      });
      assert.ok(result.width > 240 && result.height > 200, JSON.stringify(result));
      assert.ok(result.colored > 100);
      assert.equal(result.count, 1);
      assert.deepEqual(result.labels, await page.evaluate(() => memorySpotData.trendforceContractGuide.quarterlyRows.map(row => row.period)));
    };
    await verifyCanvas();
    assert.equal(await panel.locator('.memory-contract-content a:visible').count(), sources.length);
    await panel.screenshot({path: path.join(out, 'open-desktop.png')});
    await summary.press('Enter');
    await page.waitForFunction(() => !state.memoryContractGuideOpen);
    assert.equal(await isOpen(), false);
    assert.equal(await canvas.isVisible(), false);
    await summary.press('Space');
    await page.waitForFunction(() => state.memoryContractGuideOpen);
    assert.equal(await chartId(), firstId);
    await verifyCanvas();
    await page.locator('.memory-module-panel [data-memory-range="3m"]').click();
    await page.waitForFunction(() => document.querySelector('.memory-module-panel [data-memory-range="3m"]').classList.contains('active'));
    assert.equal(await isOpen(), true, 'Keep an explicitly-open guide open during other chart updates');
    await verifyCanvas();
    assert.deepEqual(await panel.locator('.memory-contract-content a').evaluateAll(links => links.map(link => link.href)), sources);
    await summary.click();
    await page.waitForFunction(() => !state.memoryContractGuideOpen);
    await page.locator('.memory-module-panel [data-memory-range="ytd"]').click();
    assert.equal(await isOpen(), false);
    assert.equal(await chartId(), null, 'Do not recreate a collapsed chart during other updates');
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(250);
    await panel.screenshot({path: path.join(out, 'closed-mobile.png')});
    await summary.click();
    await page.waitForFunction(() => state.memoryContractGuideOpen);
    await verifyCanvas();
    const overflow = await panel.evaluate(panel => panel.scrollWidth - panel.clientWidth);
    assert.ok(overflow <= 1, `Mobile guide overflow: ${overflow}`);
    await panel.screenshot({path: path.join(out, 'open-mobile.png')});
    await page.reload({waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => memorySpotRuntime.loaded);
    assert.equal(await isOpen(), false, 'A fresh page starts collapsed');
    assert.equal(await chartId(), null);
    assert.deepEqual(errors, []);
    console.log('Memory guide browser QA passed: collapsed default, graph and sources together, mouse/keyboard toggles, lazy chart, no duplicates, rerender persistence and desktop/mobile.');
    console.log(out);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
