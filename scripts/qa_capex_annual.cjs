const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts', 'capex-annual');
fs.mkdirSync(out, {recursive:true});
const url = (process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href) + '#/tech/capex-fcf';

(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url, {waitUntil:'load',timeout:120000});
    await page.waitForFunction(() => typeof Chart === 'function' && document.querySelector('[data-capex-chart="annual-capex"]'));
    const inspect = () => page.evaluate(() => ['annual-big5-capex','annual-capex'].map(key => {
      const canvas = document.querySelector(`[data-capex-chart="${key}"]`);
      const chart = Chart.getChart(canvas);
      const data = canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let pixels = 0;
      for(let i=0;i<data.length;i+=4) if(data[i+3] && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])>50) pixels++;
      return {key, labels:chart.data.labels, ticks:chart.scales.x.ticks.map(t=>t.label),
        datasets:chart.data.datasets.map(s=>({name:s.label,last:s.data.at(-1),color:s.backgroundColor,
          border:s.borderWidth})), pixels};
    }));
    const annual = page.locator('[data-capex-chart="annual-capex"]').locator('..').locator('..');
    const total = page.locator('[data-capex-chart="annual-big5-capex"]').locator('..').locator('..');
    const desktop = await inspect();
    for(const chart of desktop) {
      assert.equal(chart.labels.length, 10);
      assert.equal(chart.labels.at(-1), '2026(E)');
      assert.ok(chart.ticks.includes('2026(E)'), JSON.stringify(chart.ticks));
      assert.ok(chart.pixels > 200);
    }
    assert.deepEqual(desktop[0].datasets.map(s=>s.last), [730,77.1]);
    assert.deepEqual(desktop[1].datasets.map(s=>s.last), [170,200,140,220,null]);
    for(const dataset of desktop[1].datasets) {
      assert.notEqual(dataset.color.at(-1), dataset.color.at(-2));
      assert.equal(dataset.border.at(-1), 1.5);
    }
    assert.equal(await annual.locator('a').count(), 6);
    assert.match(await annual.innerText(), /\$170B/);
    assert.match(await annual.innerText(), /7월 \$175B/);
    assert.doesNotMatch(await annual.innerText(), /기존 추정치 유지|기존 2Q 추정치/);
    assert.match(await total.innerText(), /전년 동일 4사/);
    await annual.screenshot({path:path.join(out,'annual-desktop.png')});
    await total.screenshot({path:path.join(out,'total-desktop.png')});
    await page.setViewportSize({width:390,height:844});
    await page.waitForTimeout(300);
    const mobile = await inspect();
    for(const chart of mobile) {
      assert.ok(chart.ticks.includes('2026(E)'), JSON.stringify(chart.ticks));
      assert.ok(chart.pixels > 100);
    }
    for(const panel of [annual,total]) {
      const size = await panel.evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));
      assert.ok(size.scroll <= size.width+1, JSON.stringify(size));
    }
    await annual.screenshot({path:path.join(out,'annual-mobile.png')});
    await total.screenshot({path:path.join(out,'total-mobile.png')});
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({desktop,mobile,errors}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
