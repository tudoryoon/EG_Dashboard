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
  studyCrwvBondData: { observations: [{date:'2026-10-20', ytmPct:15.33, pricePer100:80.61}], checkedAt:'2026-10-22' },
  state: { studyCrwvBondRange:'1y', studyCdsRange:'6m' }, charts: [],
  escapeHtml: text => String(text), formatKstDateTime: text => text || '',
  Chart: function(canvas, config) { this.canvas = canvas; this.config = config; },
});
for (const name of ['getStudyCrwvBondPayload', 'renderStudyCrwvBondSection', 'createStudyCrwvBondChart', 'bindStudyCrwvBondControls']) {
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
assert.ok(config.options.plugins.tooltip.callbacks.afterLabel({dataIndex:0}).includes('80.61'));
context.studyCrwvBondData.observations.unshift({date:'2026-10-16', ytmPct:14.9, pricePer100:82});
assert.equal(JSON.stringify(context.getStudyCrwvBondPayload('1y').values), '[14.9,null,15.33]');
context.studyCrwvBondData.observations.unshift({date:'2025-08-01', ytmPct:9.1});
assert.equal(context.getStudyCrwvBondPayload('3m').observations.filter(Boolean).length, 2);
assert.equal(context.getStudyCrwvBondPayload('max').observations.filter(Boolean).length, 3);
context.studyCrwvBondData.observations.push({date:'2026-10-21', ytmPct:null});
assert.equal(context.getStudyCrwvBondPayload('1y').labels.at(-1), '2026-10-20');
// The new control only redraws its own panel; CDS filters and charts stay intact.
const handler = {};
const button = { dataset:{studyCrwvBondRange:'3m'}, addEventListener:(_, fn) => handler.click = fn };
const panel = {querySelector:() => canvas, outerHTML:''};
context.charts[0].destroy = () => handler.destroyed = true;
let bindCount = 0;
context.usOverviewRoot = {
  querySelectorAll:() => (++bindCount === 1 ? [button] : []),
  querySelector:selector => selector.includes('panel') ? panel : canvas,
};
context.bindStudyCrwvBondControls();
handler.click();
assert.equal(context.state.studyCrwvBondRange, '3m');
assert.equal(context.state.studyCdsRange, '6m');
assert.ok(handler.destroyed && panel.outerHTML.includes('study-bond-section'));
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
console.log('CRWV bond chart tests passed');
