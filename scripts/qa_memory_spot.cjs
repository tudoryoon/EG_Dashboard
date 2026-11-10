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
    const combinedCharts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-memory-series]')).map(canvas => {
      const chart = Chart.getChart(canvas);
      const changes = chart.data.datasets.find(dataset => dataset.isMemoryDailyChange);
      const ratio = chart.currentDevicePixelRatio;
      const pixels = canvas.getContext('2d').getImageData(
        Math.ceil(chart.chartArea.left * ratio), Math.ceil(chart.scales.yChange.top * ratio),
        Math.floor(chart.chartArea.width * ratio), Math.floor(chart.scales.yChange.height * ratio)).data;
      let barPixels = 0;
      for(let i=0;i<pixels.length;i+=4) {
        const [red,green,blue,alpha] = pixels.slice(i,i+4);
        if(alpha && ((green>red*1.4 && green>blue*1.1) || (red>green*1.4 && red>blue*1.1))) barPixels++;
      }
      const colors = new Set();
      for(const value of changes.data) if(Number.isFinite(value) && value !== 0) colors.add(changes.backgroundColor({raw:value}));
      return {key:canvas.dataset.memorySeries,
        priceBottom:chart.scales.y.bottom,changeTop:chart.scales.yChange.top,
        changeHeight:chart.scales.yChange.height,areaHeight:chart.chartArea.height,
        changes:changes.data.filter(Number.isFinite).length,
        colors:[...colors],lineCount:chart.data.datasets.filter(dataset => dataset.type === 'line').length,
        changeCount:chart.data.datasets.filter(dataset => dataset.type === 'bar').length,barPixels};
    }));
    assert.equal(combinedCharts.length, 7);
    for(const info of combinedCharts) {
      assert.equal(info.changeCount, 1);
      assert.ok(info.priceBottom <= info.changeTop + 1, JSON.stringify(info));
      assert.ok(info.changeHeight > 140, JSON.stringify(info));
      assert.ok(info.changeHeight / info.areaHeight > 0.48, JSON.stringify(info));
      assert.ok(info.changes > 0, JSON.stringify(info));
      assert.ok(info.barPixels > 0, JSON.stringify(info));
      assert.ok(info.colors.every(color => ['#059669','#dc2626'].includes(color)));
    }
    for(const [key,quote] of Object.entries(directQuotes)) {
      assert.equal(quote.chartValue, quote.value);
      if(quote.source) {
        const itemPanel = page.locator(`[data-memory-series="${key}"]`).locator('..').locator('..');
        assert.match(await itemPanel.innerText(), /원출처 발표 \(KST\)/);
        assert.equal(await itemPanel.locator(`a[href="${quote.source.url}"]`).count(), 1);
      }
    }
    const panel = page.locator('.memory-module-panel');
    const moduleQuote = await page.evaluate(() => memorySpotRuntime.items.ddr5_rdimm_32gb);
    assert.ok((await panel.innerText()).includes(`$${moduleQuote.latestValue.toFixed(3)}`));
    assert.match(await panel.innerText(), /수집일/);
    assert.match(await panel.innerText(), /계약가격/);
    assert.equal(await panel.locator('a').count(), moduleQuote.latestSource ? 2 : 1);
    assert.equal(await panel.locator('a[href="https://www.trendforce.com/price/dram/module_spot"]').count(), 1);
    if(moduleQuote.latestSource) {
      assert.match(await panel.innerText(), /원출처 발표 \(KST\)/);
      assert.equal(await panel.locator(`a[href="${moduleQuote.latestSource.url}"]`).count(), 1);
    }
    const memoryPage = page.locator('.memory-overview');
    assert.equal(await memoryPage.locator('a[href*="docs.google.com/spreadsheets"], a[href*="memorysupercycle.net"]').count(), 0);
    assert.doesNotMatch(await memoryPage.innerText(), /memorysupercycle|기존 수집 시트|공개 시트/);
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
        visible:chart.data.datasets.flatMap((dataset,index) => dataset.isMemoryDailyChange ? [] : [chart.isDatasetVisible(index)]),
        series:chart.data.datasets.filter(dataset => !dataset.isMemoryDailyChange).map(d => ({label:d.label,points:d.data.filter(Number.isFinite).length})),
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
    const changeToggle = panel.locator('[data-memory-change-toggle="ddr5_rdimm_32gb"]');
    const priceToggle = panel.locator('[data-memory-price-toggle="ddr5_rdimm_32gb"]');
    const layoutInfo = key => page.evaluate(key => {
      const canvas = document.querySelector(`[data-memory-series="${key}"]`);
      const chart = Chart.getChart(canvas);
      const pixels = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let barPixels = 0;
      for(let i=0;i<pixels.length;i+=4) {
        const [r,g,b,a] = pixels.slice(i,i+4);
        if(a && ((g>r*1.4 && g>b*1.1) || (r>g*1.4 && r>b*1.1))) barPixels++;
      }
      return {priceHeight:chart.scales.y.height,changeHeight:chart.scales.yChange.height,
        areaHeight:chart.chartArea.height,priceVisible:chart.options.scales.y.display,
        changeVisible:chart.options.scales.yChange.display,
        barPixels,
        pricesVisible:chart.data.datasets.flatMap((dataset,index) => dataset.isMemoryDailyChange ? [] : [chart.isDatasetVisible(index)])};
    },key);
    const changesVisible = () => page.evaluate(() => {
      const chart = Chart.getChart(document.querySelector('[data-memory-series="ddr5_rdimm_32gb"]'));
      return chart.isDatasetVisible(chart.data.datasets.findIndex(dataset => dataset.isMemoryDailyChange));
    });
    assert.ok(await changeToggle.isChecked());
    await changeToggle.uncheck();
    assert.equal(await changesVisible(), false);
    let solo = await layoutInfo('ddr5_rdimm_32gb');
    assert.ok(solo.priceHeight / solo.areaHeight > 0.95, JSON.stringify(solo));
    await panel.locator('[data-memory-range="1m"]').click();
    assert.equal(await changesVisible(), false);
    await changeToggle.check();
    assert.equal(await changesVisible(), true);
    await priceToggle.uncheck();
    solo = await layoutInfo('ddr5_rdimm_32gb');
    assert.ok(solo.changeHeight / solo.areaHeight > 0.95, JSON.stringify(solo));
    assert.ok(solo.barPixels > 100, JSON.stringify(solo));
    assert.ok(solo.pricesVisible.every(visible => !visible));
    assert.ok(await high.isDisabled());
    await panel.locator('[data-memory-range="3m"]').click();
    assert.equal(await priceToggle.isChecked(), false);
    assert.ok((await layoutInfo('ddr5_rdimm_32gb')).changeHeight > 300);
    await changeToggle.uncheck();
    const empty = await layoutInfo('ddr5_rdimm_32gb');
    assert.equal(empty.priceVisible, false);
    assert.equal(empty.changeVisible, false);
    assert.ok(Number.isFinite(empty.areaHeight));
    await priceToggle.check();
    assert.ok((await layoutInfo('ddr5_rdimm_32gb')).priceHeight > 300);
    assert.equal(await high.isDisabled(), false);
    assert.deepEqual((await chartInfo()).visible, [true,true,true]);
    await changeToggle.check();
    await panel.locator('[data-memory-range="max"]').click();
    await panel.scrollIntoViewIfNeeded();
    await panel.screenshot({path:path.join(out,'desktop.png')});
    const chipPanel = page.locator('[data-memory-series="ddr5_16gb"]').locator('..').locator('..');
    await chipPanel.locator('[data-memory-range="3m"]').click();
    await chipPanel.screenshot({path:path.join(out,'daily-change-desktop.png')});
    const chipPrice = chipPanel.locator('[data-memory-price-toggle="ddr5_16gb"]');
    await chipPrice.uncheck();
    await chipPanel.locator('[data-memory-range="1m"]').click();
    solo = await layoutInfo('ddr5_16gb');
    assert.ok(solo.changeHeight / solo.areaHeight > 0.95, JSON.stringify(solo));
    assert.ok(solo.barPixels > 100, JSON.stringify(solo));
    assert.equal(solo.priceVisible, false);
    await chipPanel.screenshot({path:path.join(out,'change-only-desktop.png')});
    await chipPrice.check();
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(300);
    await panel.scrollIntoViewIfNeeded();
    const overflow = await panel.evaluate(el => ({width:el.clientWidth,scroll:el.scrollWidth}));
    assert.ok(overflow.scroll <= overflow.width + 1, JSON.stringify(overflow));
    assert.ok((await chartInfo()).colored.every(count => count > 50));
    await panel.screenshot({path:path.join(out,'mobile.png')});
    await chipPanel.screenshot({path:path.join(out,'daily-change-mobile.png')});
    await chipPrice.uncheck();
    solo = await layoutInfo('ddr5_16gb');
    assert.ok(solo.changeHeight > 300, JSON.stringify(solo));
    assert.ok(solo.barPixels > 100, JSON.stringify(solo));
    await chipPanel.screenshot({path:path.join(out,'change-only-mobile.png')});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({directQuotes,combinedCharts,desktop:initial,mobile:overflow,errors},null,2));
  } finally {
    await browser.close();
  }
})().catch(error => {console.error(error);process.exitCode=1;});
