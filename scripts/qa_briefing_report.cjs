const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4176';
const out = path.join(root, 'output', 'pdf');
const artifacts = path.join(root, 'artifacts', 'briefing-report');
fs.mkdirSync(out, {recursive: true});
fs.mkdirSync(artifacts, {recursive: true});

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width: 1280, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/study/briefing-report/index.html?live=1', {waitUntil: 'load', timeout: 90000});
    await page.locator('.leaders tbody tr').first().waitFor({timeout: 90000});
    await page.evaluate(() => document.fonts.ready);
    const check = async () => page.evaluate(() => {
      const sheet = document.querySelector('.sheet');
      return {height: sheet.clientHeight, content: sheet.scrollHeight, disabled: document.querySelector('#print').disabled,
        bottomSpace: sheet.getBoundingClientRect().bottom - sheet.lastElementChild.getBoundingClientRect().bottom,
        sections: [...sheet.children].map(el => [el.className, el.getBoundingClientRect().height]),
        sparks: document.querySelectorAll('.spark').length, rows: [...document.querySelectorAll('.leaders tbody')].map(el => el.children.length),
        dates: document.querySelector('.scope-line').innerText};
    });
    const initial = await check();
    console.log('Initial layout', initial);
    assert.equal(initial.disabled, false);
    assert.equal(initial.sparks, 20);
    assert.deepEqual(initial.rows, [10, 10]);
    assert.ok(initial.content <= initial.height + 1);
    assert.deepEqual(await page.locator('.leaders h2').allTextContents(), ['1주 수익률 상위', '1개월 수익률 상위']);
    const rankings = await page.evaluate(() => {
      const model = window.EgBriefingReport.build(window.marketBriefingData, window.marketRsData);
      const selected = window.EgBriefingReport.select(model);
      return ['week', 'month'].map(period => ({
        expected: selected[period].map(row => row.ticker),
        actual: [...document.querySelectorAll(`[data-period="${period}"] tr[data-ticker]`)].map(row => row.dataset.ticker),
        highlighted: [...document.querySelectorAll(`[data-period="${period}"] .key-metric`)].map(cell => cell.cellIndex),
        expectedCell: period === 'week' ? 4 : 5,
        countShown: document.querySelector('.scope-line').textContent.includes(`미국 전체 ${model.universeCount}개 · 순위 대상 ${selected.eligible}개`),
      }));
    });
    for (const ranking of rankings) {
      assert.deepEqual(ranking.actual, ranking.expected);
      assert.ok(ranking.highlighted.every(index => index === ranking.expectedCell));
      assert.equal(ranking.countShown, true);
    }
    await page.locator('#preview-scale').selectOption('1');
    await page.screenshot({path: path.join(artifacts, 'desktop.png'), fullPage: true});
    const date = await page.locator('.report-date strong').innerText();
    const pdf = path.join(out, `eg-daily-briefing-${date}.pdf`);
    await page.pdf({path: pdf, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false});
    await page.locator('#cap-floor').uncheck();
    assert.equal((await check()).disabled, false);
    await page.locator('#cap-floor').check();
    await page.evaluate(() => { window.__printed = 0; window.print = () => { window.__printed += 1; }; });
    await page.locator('#print').click();
    assert.equal(await page.evaluate(() => window.__printed), 1);

    await page.evaluate(() => {
      const data = window.EgBriefingReport.build(window.marketBriefingData, window.marketRsData);
      data.rows.slice(0, 12).forEach(row => { row.newHigh = true; row.highGap = -1; });
      data.briefingDate = '2026-01-01';
      window.postMessage({type: 'eg-briefing-report', model: data}, location.origin);
    });
    await page.locator('.date-warning').waitFor();
    await page.waitForFunction(() => document.querySelectorAll('.highs-table tbody tr').length === 8);
    console.log('Maximum density', await check());
    await page.screenshot({path: path.join(artifacts, 'maximum-density.png'), fullPage: true});
    assert.equal((await check()).disabled, false, 'Maximum high-list length and a date warning must fit');
    await page.reload({waitUntil: 'load'});
    await page.locator('.leaders tbody tr').first().waitFor({timeout: 90000});
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: path.join(artifacts, 'mobile.png'), fullPage: true});
    const mobile = await page.evaluate(() => ({width: innerWidth, body: document.documentElement.scrollWidth,
      printRight: document.querySelector('#print').getBoundingClientRect().right}));
    assert.ok(mobile.body <= mobile.width + 1);
    assert.ok(mobile.printRight <= mobile.width);

    await page.setViewportSize({width: 1440, height: 1100});
    await page.goto(base + '/#/research/briefing-pdf', {waitUntil: 'load', timeout: 90000});
    const frame = page.frameLocator('[data-study-briefing-print]');
    await frame.locator('.spark').first().waitFor({timeout: 90000});
    assert.equal(await frame.locator('.spark').count(), 20);
    assert.equal(await frame.locator('#print').isEnabled(), true);
    const archivedOptions = await frame.locator('#archive-select option').count();
    if (archivedOptions > 1) {
      await page.waitForFunction(() => Boolean(document.querySelector('[data-study-briefing-print]').contentDocument.querySelector('#archive-select').value));
      assert.equal(await frame.locator('#cap-floor').isDisabled(), true);
      assert.ok((await frame.locator('#archive-pdf').getAttribute('href')).endsWith('/report.pdf'));
      assert.equal(await frame.locator('.highs-section h2').innerText(), '52주 고점 대비 5% 이내');
    }
    await page.screenshot({path: path.join(artifacts, 'dashboard.png'), fullPage: true});
    await frame.locator('#archive-select').selectOption('');
    assert.equal(await frame.locator('#cap-floor').isEnabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS: PDF, desktop/mobile, max-density, date mismatch, print handler and Research iframe.', pdf);
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
