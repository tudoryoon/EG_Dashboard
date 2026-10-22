const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const context = vm.createContext({
  studyCrwvBondData: { bond:{ticker:'CRWV',issuer:'CoreWeave',cusip:'21873SAC2',isin:'US21873SAC26',couponPct:9},
    observations: [{date:'2026-10-20', ytmPct:15.33, pricePer100:80.61}], checkedAt:'2026-10-22' },
  state: { studyCrwvBondRange:'1y', studyCdsRange:'6m',studyCreditBondTicker:'CRWV' }, charts: [],
  macroIndicatorsData: {releaseCalendar:{groups:{cpi:{'2026-09':{releaseDate:'2026-10-14',sourceUrl:'https://www.bls.gov/schedule/2026/home.htm'}}}}},
  escapeHtml: text => String(text), formatKstDateTime: text => text || '',
  Chart: function(canvas, config) { this.canvas = canvas; this.config = config; this.destroy=()=>{}; },
});
context.studyCreditBondData={CRWV:context.studyCrwvBondData,
  ORCL:{bond:{ticker:'ORCL',issuer:'Oracle',cusip:'68389XDX0',couponPct:4.95},source:{fund:'LQD',termsUrl:'https://www.sec.gov/oracle'},observations:[{date:'2026-10-20',ytmPct:7.5,pricePer100:90.74}]},
  EQIX:{bond:{ticker:'EQIX',issuer:'Equinix',cusip:'29444UBS4',couponPct:2.5},source:{fund:'LQD'},observations:[{date:'2026-10-20',ytmPct:5.8,pricePer100:86.86}]}};
for (const name of ['getStudySelectedCreditBond', 'getStudyCrwvBondCpiEvents', 'getStudyCrwvBondPayload', 'renderStudyCrwvBondSection', 'createStudyCrwvBondChart', 'bindStudyCrwvBondControls', 'redrawStudyCrwvBondPanel']) {
  vm.runInContext(functionSource(name), context);
}
const html = context.renderStudyCrwvBondSection();
assert.ok(html.includes('15.33%') && html.includes('2026-10-20') && html.includes('$80.61'));
assert.ok(html.includes('1개 관측점') && html.includes('실거래 수익률'));
assert.ok(html.includes('21873SAC2') && html.includes('US21873SAC26'));
assert.equal(context.getStudyCrwvBondPayload('1y').values[0], 15.33);
const canvas = {clientWidth:390};
context.createStudyCrwvBondChart(canvas);
const config = context.charts[0].config;
assert.equal(config.data.datasets[0].data[0], 15.33);
assert.equal(config.data.datasets[0].pointRadius, 6);
assert.equal(config.data.datasets[0].spanGaps, false);
assert.ok(config.options.scales.y.min < 15.33 && config.options.scales.y.max > 15.33);
assert.equal(config.options.scales.y.title.text, 'YTM (%)');
assert.equal(config.options.scales.x.offset, true);
assert.ok(config.options.plugins.tooltip.callbacks.afterLabel({dataIndex:0}).join(' ').includes('80.61'));
context.studyCrwvBondData.observations.unshift({date:'2026-10-16', ytmPct:14.9, pricePer100:82});
assert.equal(JSON.stringify(context.getStudyCrwvBondPayload('1y').values), '[14.9,null,15.33]');
context.studyCrwvBondData.observations.unshift({date:'2025-08-01', ytmPct:9.1});
assert.equal(context.getStudyCrwvBondPayload('3m').observations.filter(Boolean).length, 2);
assert.equal(context.getStudyCrwvBondPayload('max').observations.filter(Boolean).length, 3);
context.studyCrwvBondData.observations.push({date:'2026-10-21', ytmPct:null});
assert.equal(context.getStudyCrwvBondPayload('1y').labels.at(-1), '2026-10-20');
context.studyCrwvBondData.observations.push({date:'2026-10-13',ytmPct:13.77},{date:'2026-10-14',ytmPct:14.90});
const payload = context.getStudyCrwvBondPayload('1m');
assert.equal(payload.cpiEvents[0].date,'2026-10-14');
assert.equal(payload.observations.find(row=>row?.date==='2026-10-14').changeBps,113);
assert.ok(context.renderStudyCrwvBondSection().includes('최근 CPI 발표 2026-10-14'));
assert.ok(context.renderStudyCrwvBondSection().includes('+113bp'));
context.createStudyCrwvBondChart(canvas);
const cpiConfig = context.charts.at(-1).config;
const cpiIndex = cpiConfig.data.labels.indexOf('2026-10-14');
assert.ok(cpiConfig.options.plugins.tooltip.callbacks.title([{dataIndex:cpiIndex}]).includes('CPI 발표일'));
let lines=0;
const mockChart={ctx:{save(){},restore(){},setLineDash(){},beginPath(){},moveTo(){},lineTo(){},stroke(){lines++;},fillText(){}},
  chartArea:{top:0,bottom:200,right:350},scales:{x:{getPixelForValue:index=>index*10}}};
cpiConfig.plugins[0].beforeDatasetsDraw(mockChart);
assert.equal(lines,1);
context.state.studyCrwvBondCpi=false;
cpiConfig.plugins[0].beforeDatasetsDraw(mockChart);
assert.equal(lines,1);
context.state.studyCrwvBondCpi=true;
// The new control only redraws its own panel; CDS filters and charts stay intact.
const handler = {};
const button = { dataset:{studyCrwvBondRange:'3m'}, addEventListener:(_, fn) => handler.click = fn };
const panel = {querySelector:() => canvas, outerHTML:''};
context.charts[0].destroy = () => handler.destroyed = true;
const tabs=Object.fromEntries(['CRWV','ORCL','EQIX'].map(key=>{const handlers={};return [key,{
  dataset:{studyBondTicker:key},addEventListener:(event,fn)=>handlers[event]=fn,
  click:()=>handlers.click(),focus:()=>handler.focused=key,handlers}];}));
context.usOverviewRoot = {
  querySelectorAll:selector => selector.includes('ticker') ? Object.values(tabs) : [button],
  querySelector:selector => selector.includes('panel') ? panel : selector.includes('cpi]') ? null
    : selector.includes('ticker=') ? tabs[selector.match(/ticker="(\w+)"/)[1]] : canvas,
};
context.bindStudyCrwvBondControls();
handler.click();
assert.equal(context.state.studyCrwvBondRange, '3m');
assert.equal(context.state.studyCdsRange, '6m');
assert.ok(handler.destroyed && panel.outerHTML.includes('study-bond-section'));
tabs.ORCL.click();
assert.equal(context.state.studyCreditBondTicker,'ORCL');
assert.equal(context.getStudyCrwvBondPayload('3m').values[0],7.5);
assert.ok(panel.outerHTML.includes('68389XDX0') && panel.outerHTML.includes('LQD') && !panel.outerHTML.includes('21873SAC2'));
assert.equal(context.charts.at(-1).config.data.datasets[0].borderColor,'#b34736');
assert.equal(handler.focused,'ORCL');
tabs.ORCL.handlers.keydown({key:'ArrowRight',preventDefault(){}});
assert.equal(context.state.studyCreditBondTicker,'EQIX');
assert.equal(context.getStudyCrwvBondPayload('3m').values[0],5.8);
assert.ok(panel.outerHTML.includes('29444UBS4'));
assert.equal(context.state.studyCdsRange,'6m');
assert.equal(context.state.studyCrwvBondRange,'3m');
tabs.EQIX.handlers.keydown({key:'Home',preventDefault(){}});
assert.equal(context.state.studyCreditBondTicker,'CRWV');
context.studyCrwvBondData.observations = [];
assert.equal(context.getStudyCrwvBondPayload('1y').labels.length, 0);
assert.ok(!context.renderStudyCrwvBondSection().includes('<canvas'));
const render = functionSource('renderStudyCdsOverview');
assert.ok(render.indexOf('${renderStudyCrwvBondSection()}') > render.indexOf('DTCC 원자료'));
const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(index.indexOf('./data/study-crwv-bond-data.js') < index.indexOf('./dashboard.js'));
const stored = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root,'data/study-crwv-bond-data.js'),'utf8'),stored);
const data = stored.window.studyCrwvBondData;
assert.equal(data.bond.cusip, '21873SAC2');
assert.ok(data.observations.every(row => Number.isFinite(row.ytmPct) && row.date <= data.updatedAt));
assert.equal(new Set(data.observations.map(row=>row.date)).size,data.observations.length);
assert.ok(data.observations.length > 250, 'Historical trend must not regress to one snapshot');
assert.ok(data.observations[0].date < '2025-08-01', 'Keep the issue-date history');
assert.equal(data.source.historyMode,'date-verified-official-holdings');
assert.ok(data.observations.some(row=>row.date==='2026-10-14'), 'CPI release observation retained');
for(const [ticker,variable,cusip,minCount] of [['ORCL','studyOrclBondData','68389XDX0',150],['EQIX','studyEqixBondData','29444UBS4',250]]) {
  const file=`data/study-${ticker.toLowerCase()}-bond-data.js`;
  assert.ok(index.indexOf(`./${file}`) < index.indexOf('./dashboard.js'));
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),stored);
  const value=stored.window[variable];
  assert.equal(value.bond.cusip,cusip);
  assert.equal(value.source.fund,'LQD');
  assert.ok(value.observations.length > minCount);
  assert.ok(value.observations.every(row=>Number.isFinite(row.ytmPct) && row.date>=value.bond.issueDate));
  assert.equal(new Set(value.observations.map(row=>row.date)).size,value.observations.length);
}
console.log('Unsecured bond chart and ticker selection tests passed');
