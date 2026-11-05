const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'memory-rdimm');
fs.mkdirSync(out, {recursive:true});
const url = (process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href) + '#/tech/memory-data';

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, {waitUntil:'load',timeout:120000});
    await page.waitForFunction(() => typeof Chart === 'function' && document.querySelector('[data-memory-series="ddr5_rdimm_32gb"]'));
    const directQuotes = await page.evaluate(() => Object.fromEntries(
      ['ddr5_16gb','ddr4_16gb','ddr4_8gb'].map(key => {
        const item = memorySpotRuntime.items[key];
        const chart = Chart.getChart(document.querySelector(`[data-memory-series="${key}"]`));
        const index = chart.data.labels.indexOf(item.latestDate);
        return [key,{date:item.latestDate,value:item.latestValue,
          chartValue:chart.data.datasets[0].data[index],source:item.latestSource}];
      })
    ));
    for(const [key,quote] of Object.entries(directQuotes)) {
      assert.equal(quote.chartValue, quote.value);
      if(quote.source) {
        const itemPanel = page.locator(`[data-memory-series="${key}"]`).locator('..').locator('..');
        assert.match(await itemPanel.innerText(), /원출처 발표 \(KST\)/);
        assert.equal(await itemPanel.locator(`a[href="${quote.source.url}"]`).count(), 1);
      }
    }
    const panel = page.locator('.memory-module-panel');
    assert.match(await panel.innerText(), /2,?165(?:\.00)?/);
    assert.match(await panel.innerText(), /시트 수집일/);
    assert.match(await panel.innerText(), /계약가격/);
    assert.equal(await panel.locator('a').count(), 2);
    const chartInfo = () => page.evaluate(() => {
      const canvas = document.querySelector('[data-memory-series="ddr5_rdimm_32gb"]');
      const chart = Chart.getChart(canvas);
      const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const colored = [0,0,0];
      const colors = [[220,38,38],[37,99,235],[5,150,105]];
      for(let i=0;i<pixels.length;i+=4) {
        colors.forEach((color,index) => {
          if(pixels[i+3] && color.every((value,channel) => pixels[i+channel] === value)) colored[index]++;
        });
      }
      return {first:chart.data.labels[0],last:chart.data.labels.at(-1),count:chart.data.labels.length,
        visible:chart.data.datasets.map((_,index) => chart.isDatasetVisible(index)),
        series:chart.data.datasets.map(d => ({label:d.label,points:d.data.filter(Number.isFinite).length})),
        colored,charts:charts.length,instances:Object.keys(Chart.instances).length};
    });
    const initial = await chartInfo();
    assert.equal(initial.first, '2025-11-24');
    assert.deepEqual(initial.series.map(series => series.label), ['High','Average','Low']);
    assert.ok(initial.series.every(series => series.points >= 222));
    assert.ok(initial.colored.every(count => count > 100), JSON.stringify(initial));
    assert.deepEqual(initial.visible, [true,true,true]);
    const high = panel.locator('[data-memory-series-toggle="high"]');
    const average = panel.locator('[data-memory-series-toggle="average"]');
    const low = panel.locator('[data-memory-series-toggle="low"]');
    for(const input of [high,average,low]) assert.ok(await input.isChecked());
    await high.uncheck();
    await low.uncheck();
    assert.deepEqual((await chartInfo()).visible, [false,true,false]);
    await panel.locator('[data-memory-range="1m"]').click();
    assert.deepEqual((await chartInfo()).visible, [false,true,false]);
    assert.equal(await high.isChecked(), false);
    assert.equal(await low.isChecked(), false);
    await average.uncheck();
    assert.deepEqual((await chartInfo()).visible, [false,false,false]);
    for(const input of [high,average,low]) await input.check();
    assert.deepEqual((await chartInfo()).visible, [true,true,true]);
    for(const range of ['1m','3m','1y','max']) {
      await panel.locator(`[data-memory-range="${range}"]`).click();
      const info = await chartInfo();
      assert.equal(info.charts, initial.charts);
      assert.equal(info.instances, initial.instances);
      assert.ok(info.series.every(series => series.points > 0));
      if(range === '1m') assert.ok(info.count <= 32);
    }
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({path:path.join(out,'desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(300);
    await panel.scrollIntoViewIfNeeded();
    const overflow = await panel.evaluate(el => ({width:el.clientWidth,scroll:el.scrollWidth}));
    assert.ok(overflow.scroll <= overflow.width + 1, JSON.stringify(overflow));
    assert.ok((await chartInfo()).colored.every(count => count > 50));
    await panel.screenshot({path:path.join(out,'mobile.png')});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({directQuotes,desktop:initial,mobile:overflow,errors},null,2));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
