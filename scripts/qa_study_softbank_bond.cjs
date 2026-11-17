const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');
const root = path.join(__dirname, '..');
const out = path.join(root, 'artifacts', 'softbank-bond');
fs.mkdirSync(out, {recursive:true});
const base = process.env.QA_BASE_URL || pathToFileURL(path.join(root, 'index.html')).href;

(async () => {
  const browser = await chromium.launch({headless:true,...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  try {
    const page = await browser.newPage({viewport:{width:1600,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base+'#/flows/cds',{waitUntil:'load',timeout:120000});
    await page.waitForSelector('[data-study-bond-ticker="SBG"]');
    const panel=page.locator('[data-study-crwv-bond-panel]');
    const upperState=()=>page.evaluate(()=>({range:state.studyCdsRange,
      charts:charts.filter(chart=>!chart.canvas.closest('[data-study-crwv-bond-panel]')).map(chart=>chart.id)}));
    const before=await upperState();
    assert.equal(await page.locator('[data-study-bond-ticker="SBG"]').innerText(),'SoftBank');
    await page.locator('[data-study-bond-ticker="SBG"]').click();
    const payload=await page.evaluate(()=>({bond:studyCreditBondData.SBG.bond,
      ytm:studyCreditBondData.SBG.observations,spread:studyCreditSpreadsData.items.SBG.observations}));
    let text=await panel.innerText();
    assert.ok(text.includes('83408KAB5') && text.includes('US83408KAB52') && text.includes('2032-04-01'));
    assert.ok(text.includes('HYG') && text.includes(`${payload.ytm.at(-1).ytmPct.toFixed(2)}%`));
    const chartState=()=>page.evaluate(()=>{
      const canvas=document.querySelector('[data-study-crwv-bond-chart]');
      const chart=Chart.getChart(canvas);
      return {values:chart.data.datasets[0].data,labels:chart.data.labels,
        axis:chart.options.scales.y.title.text,count:charts.filter(item=>item.canvas===canvas).length};
    });
    let chart=await chartState();
    assert.equal(chart.axis,'YTM (%)');
    assert.equal(chart.values.filter(Number.isFinite).length,payload.ytm.length);
    await page.locator('[data-study-bond-mode="gspread"]').click();
    chart=await chartState();
    assert.equal(chart.axis,'G-spread (bp)');
    assert.equal(chart.count,1);
    const expected=payload.spread.filter(row=>row.spreadBps!==null);
    assert.deepEqual(chart.values.filter(Number.isFinite),expected.map(row=>row.spreadBps));
    assert.ok(chart.values.some(value=>value===null));
    assert.ok(chart.labels.every(day=>day>=payload.bond.issueDate));
    text=await panel.innerText();
    assert.ok(text.includes(`${expected.at(-1).spreadBps.toFixed(1)}bp`) && text.includes('통신 자회사 SoftBank Corp. 채권이 아닙니다'));
    assert.deepEqual(await upperState(),before,'Do not redraw CDS charts when switching bond panels');
    await panel.screenshot({path:path.join(out,'gspread-desktop.png')});
    await page.locator('[data-study-crwv-bond-range="1m"]').click();
    assert.equal(await page.evaluate(()=>state.studyCreditBondTicker),'SBG');
    assert.ok((await chartState()).labels[0]>'2026-09-29');
    await page.locator('[data-study-bond-mode="ytm"]').click();
    assert.equal(await page.evaluate(()=>state.studyCrwvBondRange),'1m');
    assert.equal((await chartState()).axis,'YTM (%)');
    await page.locator('[data-study-bond-ticker="SBG"]').press('ArrowLeft');
    assert.equal(await page.evaluate(()=>state.studyCreditBondTicker),'SPCX');
    await page.locator('[data-study-bond-ticker="SPCX"]').press('ArrowRight');
    assert.equal(await page.evaluate(()=>state.studyCreditBondTicker),'SBG');
    await page.setViewportSize({width:390,height:844});
    await page.reload({waitUntil:'load',timeout:120000});
    await page.waitForSelector('[data-study-bond-ticker="SBG"]');
    await page.locator('[data-study-bond-ticker="SBG"]').click();
    await page.locator('[data-study-bond-mode="gspread"]').click();
    const size=await panel.evaluate(panel=>({width:panel.clientWidth,scroll:panel.scrollWidth}));
    assert.ok(size.width<=390 && size.scroll<=size.width+1,JSON.stringify(size));
    await panel.screenshot({path:path.join(out,'gspread-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('SoftBank browser QA passed: exact bond, YTM/G-spread, dated history, Treasury gaps, isolated CDS state, keyboard tabs and desktop/mobile.');
    console.log(out);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
