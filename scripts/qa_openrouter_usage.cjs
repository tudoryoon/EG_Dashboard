const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'openrouter-audit');
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;
fs.mkdirSync(out, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1600, height: 1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#/tech/openrouter', {waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => document.querySelector('#openrouter-company-usage-chart') && Chart.getChart(document.querySelector('#openrouter-company-usage-chart')));
    const companies = await page.evaluate(() => openrouterRankingsData.weeklyUsage.companies);
    const keys = companies.map(company => company.key);
    for (const alias of ['meta-llama','alibaba','Qwen','bytedance-seed']) assert.ok(!keys.includes(alias));
    assert.equal(await page.locator('#openrouter-usage-company option').count(), companies.length + 1);
    for (const key of ['openai','anthropic','google','meta','qwen','bytedance','openai-anthropic']) {
      await page.locator('#openrouter-usage-company').selectOption(key);
      const expected = key === 'openai-anthropic'
        ? companies.filter(company => ['openai','anthropic'].includes(company.key)) : companies.filter(company => company.key === key);
      const tokens = expected.reduce((sum, company) => sum + company.tokens, 0);
      const models = expected.reduce((sum, company) => sum + company.modelCount, 0);
      const selection = await page.evaluate(() => {
        const {usage, company} = getOpenrouterUsageSelection();
        const history = getOpenrouterUsageHistory(usage, company);
        const chart = Chart.getChart(document.querySelector('#openrouter-company-usage-chart'));
        return {key: company.key, tokens: company.tokens, modelCount: company.modelCount,
          labels: chart.data.labels, types: chart.data.datasets.map(dataset => dataset.type),
          values: chart.data.datasets[0].data, growth: chart.data.datasets[1].data,
          expectedValues: history.values.slice(-53), expectedGrowth: history.growth.slice(-53),
          partial: history.partial.slice(-53), colors: chart.data.datasets[0].backgroundColor,
          window: `${usage.windowStart} ~ ${usage.asOf} UTC`};
      });
      assert.equal(selection.key, key);
      assert.equal(selection.tokens, tokens);
      assert.equal(selection.modelCount, models);
      assert.deepEqual(selection.types, ['bar','line']);
      assert.deepEqual(selection.values, selection.expectedValues);
      assert.deepEqual(selection.growth, selection.expectedGrowth);
      selection.partial.forEach((partial, index) => {
        if (partial) {
          assert.equal(selection.growth[index], null);
          assert.ok(selection.colors[index].includes('0.3'));
        }
      });
      assert.equal(await page.locator('.openrouter-usage-table tbody tr').count(), models);
      assert.ok((await page.locator('.openrouter-usage-summary').innerText()).includes(selection.window));
    }
    await page.locator('#openrouter-usage-company').selectOption('meta');
    assert.ok((await page.locator('.openrouter-usage-panel').innerText()).includes('meta, meta-llama'));
    const llama = companies.find(company => company.key === 'meta').models.find(model => model.key.startsWith('meta-llama/'));
    await page.locator('#openrouter-usage-model').selectOption(llama.key);
    assert.equal(await page.evaluate(() => getOpenrouterUsageSelection().model.key), llama.key);
    await page.locator('#openrouter-usage-company').selectOption('openai-anthropic');
    await page.locator('[data-openrouter-usage-range="1m"]').click();
    assert.equal(await page.evaluate(() => Chart.getChart(document.querySelector('#openrouter-company-usage-chart')).data.labels.length), 5);
    await page.locator('.openrouter-usage-panel').screenshot({path: path.join(out, 'combined-desktop.png')});
    await page.setViewportSize({width: 390, height: 844});
    await page.reload({waitUntil: 'load', timeout: 120000});
    await page.waitForFunction(() => document.querySelector('#openrouter-company-usage-chart') && Chart.getChart(document.querySelector('#openrouter-company-usage-chart')));
    await page.locator('#openrouter-usage-company').selectOption('openai-anthropic');
    await page.waitForTimeout(200);
    const size = await page.locator('.openrouter-usage-panel').evaluate(panel => ({client: panel.clientWidth, scroll: panel.scrollWidth}));
    assert.ok(size.scroll <= size.client + 1, JSON.stringify(size));
    assert.ok(size.client <= 390, JSON.stringify(size));
    await page.locator('.openrouter-usage-panel').screenshot({path: path.join(out, 'combined-mobile.png')});
    assert.deepEqual(errors, []);
    console.log('OpenRouter browser QA passed: company aliases, all model rows, combined totals, chart data, partial weeks, WoW, models, ranges and mobile layout.');
    console.log(out);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
