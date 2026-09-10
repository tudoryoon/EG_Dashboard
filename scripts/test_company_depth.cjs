// Run against the local dashboard server. PLAYWRIGHT_MODULE may point to a bundled runtime.
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DASHBOARD_URL || 'http://127.0.0.1:4173/';

async function financial(page) {
  await page.locator('[data-company-lazy=financial]').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Chart.getChart(document.querySelector('[data-canslim-chart=financials]'))?.$companyDepth?.active);
  await page.waitForTimeout(650);
}

async function inspect(page) {
  return page.evaluate(() => {
    const chart = Chart.getChart(document.querySelector('[data-canslim-chart=financials]'));
    const source = chart.canvas.parentElement.querySelector('.company-depth-canvas');
    const copy = document.createElement('canvas');
    copy.width = source.width; copy.height = source.height;
    const ctx = copy.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const pixels = ctx.getImageData(0, 0, copy.width, copy.height).data;
    let visible = 0, hash = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3]) visible++;
      hash = (Math.imul(hash, 31) + pixels[i] + pixels[i + 1] + pixels[i + 2]) >>> 0;
    }
    const a = source.getBoundingClientRect(), b = chart.canvas.getBoundingClientRect();
    return {visible, hash, width:a.width, bounds:[a.x-b.x,a.y-b.y,a.width-b.width,a.height-b.height],
      data:chart.data.datasets.map(d => d.data), geometry:chart.$companyDepth.geometryCount,
      zeros:Object.values(chart.scales).filter(s => s.axis === 'y').map(s => s.getPixelForValue(0))};
  });
}

(async () => {
  const browser = await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1080}});
    const errors = [], failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {if (/company-depth|vendor\/three/.test(response.url()) && !response.ok()) failedAssets.push(response.url());});
    await page.goto(`${base}#/screening/company/nvda`, {waitUntil:'load',timeout:90000});
    await financial(page);
    const initial = await inspect(page);
    assert.ok(initial.visible > 1000 && initial.geometry > 10);
    assert.ok(initial.bounds.every(v => Math.abs(v) < 1));
    assert.equal(initial.data[1].filter(Number.isFinite).length, 8);
    const priceId = await page.evaluate(() => marketRsDetailChart.id);
    const point = await page.evaluate(() => {
      const chart = Chart.getChart(document.querySelector('[data-canslim-chart=financials]'));
      const rect = chart.canvas.getBoundingClientRect();
      return {x:rect.x+chart.scales.x.getPixelForValue(3), y:rect.y+(chart.chartArea.top+chart.chartArea.bottom)/2};
    });
    await page.mouse.move(point.x,point.y);
    await page.waitForTimeout(150);
    assert.notEqual((await inspect(page)).hash, initial.hash, '3D highlight must react to hover');
    assert.ok(await page.evaluate(() => Chart.getChart(document.querySelector('[data-canslim-chart=financials]')).tooltip.dataPoints.length > 0));
    await page.locator('[data-company-financial-mode="2d"]').click();
    assert.equal(await page.locator('[data-company-lazy=financial] .company-depth-canvas').count(), 0);
    assert.deepEqual(await page.evaluate(() => Chart.getChart(document.querySelector('[data-canslim-chart=financials]')).data.datasets.map(d=>d.data)), initial.data);
    await page.locator('[data-company-financial-mode="3d"]').click();
    await financial(page);
    assert.equal(await page.evaluate(() => marketRsDetailChart.id), priceId);
    await page.mouse.move(2,2);
    await page.screenshot({path:'artifacts/company-depth-financial-desktop.png'});
    await page.locator('[data-company-lazy=trend]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => Chart.getChart(document.querySelector('[data-company-chart=trend]'))?.$companyDepth?.active);
    await page.locator('[data-company-trend-mode="2d"]').click();
    assert.equal(await page.locator('[data-company-lazy=trend] .company-depth-canvas').count(), 0);
    await page.locator('[data-company-trend-mode="3d"]').click();
    await page.waitForTimeout(700);
    await page.screenshot({path:'artifacts/company-depth-trend-desktop.png'});
    for (const ticker of ['GOOGL','TSLA','MSFT','NVDA']) {
      await page.locator('[data-company-picker]').selectOption(ticker);
      await financial(page);
      assert.ok(await page.locator('.company-depth-canvas').count() <= 2, 'Old company renderers must be disposed');
      assert.ok((await inspect(page)).visible > 1000);
    }
    for (const width of [1920,768,390]) {
      await page.setViewportSize({width,height:1000});
      await page.waitForTimeout(350);
      await financial(page);
      const result = await inspect(page);
      assert.ok(result.visible > 1000 && result.bounds.every(v=>Math.abs(v)<1));
      assert.ok(await page.locator('.company-dialog-body').evaluate(e=>e.scrollWidth <= e.clientWidth+1));
      await page.screenshot({path:`artifacts/company-depth-financial-${width}.png`});
    }
    for (const key of ['ocf','fcf','grossMarginPct','operatingMarginPct','operatingMarginYoyPp','epsDiluted']) {
      await page.locator(`[data-company-financial="${key}"]`).check();
    }
    await financial(page);
    const multiple = await inspect(page);
    assert.equal(multiple.data.length,8);
    assert.ok(multiple.zeros.every(v=>Math.abs(v-multiple.zeros[0])<1));
    await page.screenshot({path:'artifacts/company-depth-financial-all-mobile.png'});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.company-depth-canvas').count(),0);
    assert.deepEqual(errors,[]); assert.deepEqual(failedAssets,[]);
    await page.close();

    // Unavailable WebGL must leave a usable 2D chart, not a blank panel.
    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type,...args) {
        return /webgl/i.test(type) ? null : original.call(this,type,...args);
      };
    });
    await fallback.goto(`${base}#/screening/company/nvda`,{waitUntil:'load',timeout:90000});
    await fallback.locator('[data-company-lazy=financial]').scrollIntoViewIfNeeded();
    await fallback.waitForFunction(() => document.querySelector('[data-company-financial-mode="2d"]')?.getAttribute('aria-pressed') === 'true');
    assert.equal(await fallback.locator('.company-depth-canvas').count(),0);
    assert.equal(await fallback.evaluate(() => Chart.getChart(document.querySelector('[data-canslim-chart=financials]')).data.datasets[0].data.length),8);
    console.log('PASS: 3D pixels/hover, aligned axes, 2D parity, responsive framing, renderer cleanup and WebGL fallback.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
