const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'chart-sma');
fs.mkdirSync(out, {recursive: true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/screening/rs', {waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => typeof Chart === 'function' && typeof marketRsDetailChart !== 'undefined' && marketRsDetailChart);
    const verifyRs = async () => {
      const result = await page.evaluate(() => {
        const chart = marketRsDetailChart;
        const prices = marketRsData.histories[state.rsSelectedTicker].price;
        return chart.data.datasets.filter(dataset => dataset.isMovingAverage).map(dataset => {
          const period = Number(dataset.label.match(/\d+/)[0]);
          const window = prices.slice(-period);
          const expected = window.length === period && window.every(Number.isFinite)
            ? Number((window.reduce((sum, value) => sum + value, 0) / period).toFixed(4)) : null;
          return {label: dataset.label, expected, actual: dataset.data[chart.$marketRsDataBounds.latestIndex], visible: chart.isDatasetVisible(chart.data.datasets.indexOf(dataset))};
        });
      });
      for (const item of result) {
        assert.ok(item.label.endsWith('SMA'));
        assert.ok(item.expected === null ? item.actual === null : Math.abs(item.actual - item.expected) <= 0.000101, JSON.stringify(item));
      }
      return result;
    };
    await page.evaluate(() => {state.rsSelectedTicker = 'NVDA'; render();});
    assert.deepEqual((await verifyRs()).filter(item => item.visible).map(item => item.label), ['20SMA', '50SMA', '200SMA']);
    for (const range of ['1m', '3m', '6m', '1y', '3y', 'ytd']) {
      await page.locator('.market-rs-detail [data-rs-range="' + range + '"]').click();
      await verifyRs();
    }
    await page.locator('.market-rs-detail [data-rs-chart-series="sma10"]').click();
    assert.equal((await verifyRs()).find(item => item.label === '10SMA').visible, true);
    assert.ok((await page.locator('[data-rs-sma-readout]').innerText()).includes('10SMA'));
    await page.locator('.market-rs-detail [data-rs-chart-series="sma10"]').click();
    await page.locator('.market-rs-detail [data-rs-price-chart-type="line"]').click();
    await verifyRs();
    await page.locator('.market-rs-detail [data-rs-price-chart-type="candle"]').click();
    await page.locator('.market-rs-detail [data-rs-range="1y"]').click();
    const candlePixels = await page.locator('[data-rs-chart="detail"]').evaluate(canvas => {
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] && ((pixels[i] === 8 && pixels[i + 1] === 153 && pixels[i + 2] === 129) || (pixels[i] === 242 && pixels[i + 1] === 54 && pixels[i + 2] === 69))) count++;
      return count;
    });
    assert.ok(candlePixels > 100);
    const rsDetail = page.locator('.market-rs-detail');
    await rsDetail.screenshot({path: path.join(out, 'rs-desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(300);
    const overflow = await page.locator('[data-rs-sma-readout]').evaluate(element => element.scrollWidth - element.clientWidth);
    assert.ok(overflow <= 1, 'RS SMA readout overflow: ' + overflow);
    await rsDetail.screenshot({path: path.join(out, 'rs-mobile.png')});
    await page.setViewportSize({width: 1600, height: 1000});
    await page.evaluate(() => {state.rsBriefingSector = 'all'; state.rsSelectedTicker = 'QNDX'; render();});
    const young = await verifyRs();
    assert.equal(young.find(item => item.label === '200SMA').actual, null);

    await page.evaluate(() => {location.hash = '#/market/index/trend';});
    await page.waitForSelector('[data-market-trend="sma"]');
    assert.deepEqual(await page.evaluate(() => state.marketTrendSmas), [20, 50, 200]);
    const verifyIndex = async () => {
      const result = await page.evaluate(() => {
        const chart = marketTrendDetailChart;
        const prices = marketPriceData.items[state.marketTrendIndex].values;
        return chart.data.datasets.slice(1).map(dataset => {
          const period = Number(dataset.label.match(/\d+/)[0]);
          const window = prices.slice(-period);
          const expected = window.length === period && window.every(Number.isFinite)
            ? Number((window.reduce((sum, value) => sum + value, 0) / period).toFixed(4)) : null;
          return {label: dataset.label, actual: dataset.data.at(-1), expected};
        });
      });
      for (const item of result) {
        assert.ok(item.label.startsWith('SMA '));
        assert.ok(item.expected === null ? item.actual === null : Math.abs(item.actual - item.expected) <= 0.000101, JSON.stringify(item));
      }
    };
    for (const key of await page.locator('[data-market-trend-index]').evaluateAll(buttons => buttons.map(button => button.dataset.marketTrendIndex))) {
      await page.locator('[data-market-trend-index="' + key + '"]').click();
      await verifyIndex();
    }
    await page.locator('[data-market-trend-index="sp500"]').click();
    for (const range of ['1m', '1y', '3y']) {
      await page.locator('[data-market-trend-range="' + range + '"]').click();
      await verifyIndex();
    }
    await page.locator('[data-market-trend-sma="100"]').click();
    await verifyIndex();
    assert.equal(await page.evaluate(() => marketTrendDetailChart.data.datasets.length), 5);
    await page.locator('[data-market-trend-sma="100"]').click();
    await page.locator('[data-market-trend-chart-type="line"]').click();
    await verifyIndex();
    await page.locator('[data-market-trend-chart-type="candle"]').click();
    const span = () => page.evaluate(() => marketTrendDetailChart.scales.x.max - marketTrendDetailChart.scales.x.min);
    const beforeZoom = await span();
    await page.locator('[data-market-trend-chart-zoom="in"]').click();
    assert.ok(await span() < beforeZoom);
    await page.locator('[data-market-trend-chart-zoom="reset"]').click();
    assert.ok(!(await page.locator('.market-trend-legend').innerText()).includes('EMA'));
    await page.locator('.us-price-panel').first().screenshot({path: path.join(out, 'index-desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(300);
    await page.locator('.us-price-panel').first().screenshot({path: path.join(out, 'index-mobile.png')});
    assert.ok((await page.locator('[data-market-trend="sma"]').boundingBox()).width > 250);

    await page.setViewportSize({width: 1600, height: 1000});
    await page.evaluate(() => {location.hash = '#/screening/company/nvda';});
    await page.waitForSelector('.company-dialog[open] [data-rs-sma-readout]');
    assert.deepEqual((await verifyRs()).filter(item => item.visible).map(item => item.label), ['20SMA', '50SMA', '200SMA']);
    assert.ok((await page.locator('.company-dialog [data-rs-sma-readout]').innerText()).includes('200SMA'));
    await page.locator('.company-dialog').screenshot({path: path.join(out, 'company-desktop.png')});
    assert.deepEqual(errors, []);
    console.log('Browser SMA QA passed: RS/Index/Company, real SMA values, null warmup, default/toggled lines, ranges, Candle/Line, zoom, readouts, canvas pixels and desktop/mobile screenshots.');
    console.log(out);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
