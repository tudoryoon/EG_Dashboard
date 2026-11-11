const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'cpi-yoy');
fs.mkdirSync(out, {recursive: true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/daily-briefing', {waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => typeof Chart === 'function' && typeof macroIndicatorsData !== 'undefined');
    await page.evaluate(() => {
      Object.assign(state, {tab: 'Market', marketView: 'Macro', macroIndicatorKey: 'cpi', macroSeriesKey: 'headline_cpi',
        macroDashboardRange: '1y', macroDashboardSelection: ['market:sp500', 'indicator:headline_cpi_yoy', 'indicator:core_cpi_yoy']});
      render();
    });
    await page.waitForSelector('[data-macro-indicator-chart]');
    const verifyIndividual = async (expected) => {
      const result = await page.locator('[data-macro-indicator-chart]').evaluate(canvas => {
        const chart = Chart.getChart(canvas), index = chart.data.labels.length - 1;
        return {value: chart.data.datasets[0].data[index], radius: chart.data.datasets[0].pointRadius({dataIndex: index}),
          style: chart.data.datasets[0].pointStyle({dataIndex: index}),
          tooltip: chart.config.options.plugins.tooltip.callbacks.label({dataIndex: index, parsed: {y: chart.data.datasets[0].data[index]}}),
          detail: chart.config.options.plugins.tooltip.callbacks.afterLabel({dataIndex: index})};
      });
      assert.equal(result.value, expected);
      assert.equal(result.radius, 4);
      assert.equal(result.style, 'triangle');
      assert.ok(result.tooltip.includes('추정 YoY'));
      assert.ok(result.detail.includes('기하평균'));
    };
    await verifyIndividual(4.02);
    assert.equal(await page.locator('.macro-dashboard-panel [data-macro-estimate-note]').count(), 2);
    const individual = page.locator('[data-macro-indicator-chart]').locator('xpath=ancestor::section[1]');
    await individual.screenshot({path: path.join(out, 'cpi-desktop.png')});
    await page.locator('[data-macro-series="core_cpi"]').click();
    await verifyIndividual(2.81);
    await individual.screenshot({path: path.join(out, 'core-cpi-desktop.png')});
    const dashboard = page.locator('.macro-dashboard-panel');
    await dashboard.screenshot({path: path.join(out, 'macro-desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(250);
    await dashboard.screenshot({path: path.join(out, 'macro-mobile.png')});
    const overflow = await dashboard.evaluate(element => element.scrollWidth - element.clientWidth);
    assert.ok(overflow <= 1, `Macro panel overflow: ${overflow}`);
    await individual.screenshot({path: path.join(out, 'core-cpi-mobile.png')});
    await page.setViewportSize({width: 1600, height: 1000});
    await page.evaluate(() => {
      Object.assign(state, {marketView: 'Index', marketIndexView: 'Total', totalDashboardRange: '1y',
        totalDashboardSelection: ['market:sp500', 'indicator:headline_cpi_yoy', 'indicator:core_cpi_yoy']});
      render();
    });
    await page.waitForSelector('[data-market-total="overview"]');
    const result = await page.locator('[data-market-total="overview"]').evaluate(canvas => {
      const chart = Chart.getChart(canvas), index = chart.data.labels.indexOf('2026-11-10');
      const datasets = chart.data.datasets.filter(dataset => dataset.label.includes('CPI'));
      const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i+3] > 100 && Math.max(pixels[i], pixels[i+1], pixels[i+2]) - Math.min(pixels[i], pixels[i+1], pixels[i+2]) > 70) count++;
      return {values: datasets.map(dataset => dataset.data[index]), markers: datasets.map(dataset => dataset.pointStyle({dataIndex:index})), pixels:count};
    });
    assert.deepEqual(result.values, [4.02, 2.81]);
    assert.deepEqual(result.markers, ['triangle', 'triangle']);
    assert.ok(result.pixels > 100);
    const totalPanel = page.locator('[data-market-total="overview"]').locator('xpath=ancestor::section[1]');
    assert.equal(await totalPanel.locator('[data-macro-estimate-note]').count(), 2);
    await totalPanel.screenshot({path: path.join(out, 'total-desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.waitForTimeout(250);
    await totalPanel.screenshot({path: path.join(out, 'total-mobile.png')});
    assert.deepEqual(errors, []);
    console.log('CPI browser QA passed: headline/core values, estimate labels/sources, tooltip, markers, combined charts, nonblank canvas and desktop/mobile.');
    console.log(out);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
