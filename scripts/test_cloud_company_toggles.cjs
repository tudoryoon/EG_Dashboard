const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const panels = ['growth', 'margin', 'revenue', 'rpo', 'rpo-ratio', 'arr', 'gpu-pricing'];
const companies = ['amazon', 'microsoft', 'google'];
const controls = key => `[data-cloud-company-toggles="${key}"]`;
const checkbox = (page, key, company) => page.locator(`${controls(key)} [data-cloud-company="${company}"]`);

async function snapshot(page, key) {
  return page.locator(controls(key)).evaluate(element => {
    const panel = element.closest('.cloud-panel');
    const canvas = panel.querySelector('[data-cloud-chart]');
    const chart = canvas ? Chart.getChart(canvas) : null;
    return {
      checked: Array.from(element.querySelectorAll('input:checked'), input => input.dataset.cloudCompany),
      visible: chart?.data.datasets.map((dataset, index) => chart.isDatasetVisible(index)) ?? [],
      max: chart?.options.scales.y.max ?? null,
      items: Array.from(panel.querySelectorAll('[data-cloud-company-item]'), item => ({
        company: getCloudCompanyKey(item.dataset.cloudCompanyItem),
        hidden: item.classList.contains('hidden'),
      })),
    };
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href + '#/tech/cloud');
    await page.waitForFunction(() => document.querySelectorAll('[data-cloud-company-toggles]').length === 7
      && typeof Chart !== 'undefined' && !!Chart.getChart(document.querySelector('[data-cloud-chart="growth"]')));
    assert.equal(await page.locator('[data-cloud-company-toggles] input:checked').count(), 21);

    const baseline = {};
    for (const key of panels) baseline[key] = await snapshot(page, key);
    for (const key of panels) {
      for (const company of companies) {
        await checkbox(page, key, company).uncheck();
        const result = await snapshot(page, key);
        assert.deepEqual(result.checked, companies.filter(item => item !== company));
        assert.ok(result.items.every(item => item.hidden === (item.company === company)));
        const expected = await page.locator(controls(key)).evaluate((element, company) => {
          const canvas = element.closest('.cloud-panel').querySelector('[data-cloud-chart]');
          return canvas ? Chart.getChart(canvas).data.datasets.map(dataset =>
            dataset.companyKey !== company && dataset.hidden !== true) : [];
        }, company);
        assert.deepEqual(result.visible, expected, `${key}/${company}: related series only`);
        for (const other of panels.filter(item => item !== key)) {
          assert.deepEqual(await snapshot(page, other), baseline[other], `${key}: independent of ${other}`);
        }
        await checkbox(page, key, company).check();
        assert.deepEqual(await snapshot(page, key), baseline[key]);
      }
      for (const company of companies) await checkbox(page, key, company).uncheck();
      const empty = await snapshot(page, key);
      assert.ok(empty.visible.every(visible => !visible));
      assert.ok(empty.items.every(item => item.hidden));
      for (const company of companies) await checkbox(page, key, company).check();
      assert.deepEqual(await snapshot(page, key), baseline[key], `${key}: restore after all-off`);
    }

    await checkbox(page, 'growth', 'google').uncheck();
    assert.equal((await snapshot(page, 'growth')).max, 55);
    await page.evaluate(() => { location.hash = '#/tech/llm'; });
    await page.waitForFunction(() => !document.querySelector('[data-cloud-company-toggles]'));
    await page.evaluate(() => { location.hash = '#/tech/cloud'; });
    await page.waitForSelector('[data-cloud-company-toggles="growth"]');
    assert.equal(await checkbox(page, 'growth', 'google').isChecked(), false);
    assert.deepEqual(await snapshot(page, 'margin'), baseline.margin);
    await checkbox(page, 'growth', 'google').check();

    // An explicit legend selection must survive a company off/on cycle.
    await page.evaluate(() => {
      const chart = Chart.getChart(document.querySelector('[data-cloud-chart="revenue"]'));
      const index = chart.data.datasets.findIndex(dataset => dataset.hidden === true);
      chart.options.plugins.legend.onClick(null, { datasetIndex: index });
    });
    const revenueWithLegacy = await snapshot(page, 'revenue');
    assert.ok(revenueWithLegacy.visible.every(Boolean));
    await checkbox(page, 'revenue', 'microsoft').uncheck();
    await checkbox(page, 'revenue', 'microsoft').check();
    assert.deepEqual(await snapshot(page, 'revenue'), revenueWithLegacy);

    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.cloud-overview canvas'))
        .every(canvas => Chart.getChart(canvas)?.width > 100));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: no overflow`);
      const nonblank = await page.locator('.cloud-overview canvas').evaluateAll(canvases => canvases.map(canvas => {
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let colored = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] && Math.max(pixels[i], pixels[i + 1], pixels[i + 2])
            - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 30) colored += 1;
        }
        return colored > 50;
      }));
      assert.ok(nonblank.every(Boolean), `${width}: all charts contain plotted data`);
      if (process.env.CLOUD_TOGGLE_SCREENSHOTS) {
        await page.locator('[data-cloud-company-toggles="growth"]').locator('..').screenshot({
          path: path.join(process.env.CLOUD_TOGGLE_SCREENSHOTS, `company-toggles-${width}.png`),
        });
      }
    }
    await page.reload();
    await page.waitForSelector('[data-cloud-company-toggles="growth"]');
    assert.equal(await page.locator('[data-cloud-company-toggles] input:checked').count(), 21);
    assert.deepEqual(errors, []);
    console.log('PASS: 7 independent company filters, defaults, legacy series, all-off, resize and desktop/mobile charts.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
