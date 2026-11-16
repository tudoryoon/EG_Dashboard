const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'nebius-spot');
fs.mkdirSync(out, {recursive: true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;

(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport: {width:1600,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const load = async () => {
      await page.goto(base + '#/tech/gpu-rental-price', {waitUntil:'load',timeout:120000});
      await page.waitForFunction(() => document.querySelector('[data-nebius-spot-chart]') && Chart.getChart(document.querySelector('[data-nebius-spot-chart]')));
    };
    await load();
    const panel = page.locator('.nebius-spot-panel');
    const chart = () => page.evaluate(() => {
      const canvas = document.querySelector('[data-nebius-spot-chart]');
      const chart = Chart.getChart(canvas);
      return {labels:chart.data.labels, data:chart.data.datasets.map((item,index) => ({label:item.label,values:item.data,visible:chart.isDatasetVisible(index)})),
        max:chart.scales.y.max, count:charts.filter(item => item.canvas === canvas).length};
    });
    let actual = await chart();
    const expected = await page.evaluate(() => ({labels:nebiusSpotData.labels,series:Object.values(nebiusSpotData.series)}));
    assert.deepEqual(actual.labels, expected.labels);
    assert.equal(actual.data.length,5);
    assert.ok(actual.data.every(item => item.visible));
    assert.equal(actual.count,1);
    expected.series.forEach((item,index) => assert.deepEqual(actual.data[index].values,item.values));
    assert.ok((await panel.innerText()).includes(expected.labels.at(-1)));
    assert.equal(await panel.locator('a[href="https://docs.nebius.com/signup-billing/spot-prices"]').count(),1);
    const originalMax = actual.max;
    for (const key of ['b300','b200','h200','rtx6000']) await page.locator(`[data-nebius-series="${key}"]`).click();
    actual = await chart();
    assert.deepEqual(actual.data.filter(item => item.visible).map(item => item.label),['H100']);
    assert.ok(actual.max < originalMax,'Scale follows the visible GPU');
    await page.locator('[data-nebius-range="1m"]').click();
    assert.equal((await chart()).data.filter(item => item.visible).length,1);
    await page.locator('[data-nebius-series="h100"]').click();
    assert.ok((await chart()).data.every(item => !item.visible));
    for (const key of ['b300','b200','h200','h100','rtx6000']) await page.locator(`[data-nebius-series="${key}"]`).click();
    await page.locator('[data-nebius-range="max"]').click();
    await panel.scrollIntoViewIfNeeded();
    const pixels = await panel.locator('canvas').evaluate(canvas => {
      const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let count=0;
      for(let i=0;i<data.length;i+=4) if(data[i+3]>100 && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>65) count++;
      return count;
    });
    assert.ok(pixels>200);
    await panel.screenshot({path:path.join(out,'desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.reload({waitUntil:'load',timeout:120000});
    await page.waitForFunction(() => document.querySelector('[data-nebius-spot-chart]') && Chart.getChart(document.querySelector('[data-nebius-spot-chart]')));
    const size = await panel.evaluate(panel => ({width:panel.clientWidth,scroll:panel.scrollWidth}));
    assert.ok(size.width<=390 && size.scroll<=size.width+1,JSON.stringify(size));
    await panel.screenshot({path:path.join(out,'mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('Nebius browser QA passed: exact source series, all toggles, independent ranges, automatic scale, nonblank canvas, no duplicates and desktop/mobile.');
    console.log(out);
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
