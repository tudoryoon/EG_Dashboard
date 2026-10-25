const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const start = source.indexOf('function renderStudyCdsOverview(');
const end = source.indexOf('\nfunction ', start + 1);
const tickers = ['GOOGL', 'MSFT', 'NVDA', 'META', 'ORCL', 'AMZN', 'SPCX'];
const items = Object.fromEntries(tickers.map((ticker, i) => [ticker.toLowerCase(), {
  ticker, name: ticker, latest: {bps: i === 6 ? null : 50 + i, staleDays: i === 6 ? null : 0},
}]));
const rootElement = {classList: {remove() {}}, innerHTML: '', querySelectorAll: () => [], querySelector: () => ({})};
const charts = [];
const context = vm.createContext({
  studyCdsData: {items, dates: ['2026-10-23'], ranges: [{key: '1y', label: '1Y'}]},
  state: {studyCdsRange: '1y', studyCdsCompanySelection: tickers, studyCdsIndexSelection: ['sox']},
  usOverviewRoot: rootElement, companyGrid: {classList: {add() {}}, innerHTML: ''},
  escapeHtml: value => String(value), formatStudyCdsBps: value => value == null ? '-' : `${value}bp`,
  getStudyCdsFreshness: () => ({className: '', label: ''}), formatStudyCdsObservationDate: value => value || '-',
  renderStudyCrwvBondSection: () => '<div>bond panel</div>', bindStudyCrwvBondControls() {},
  createStudyCrwvBondChart() {}, createStudyCdsChart: (_, item) => charts.push(item.ticker),
  createStudyCdsComparisonChart: (_, selected) => charts.push(selected.map(item => item.ticker)),
});
vm.runInContext(source.slice(start, end), context);
context.renderStudyCdsOverview();
assert.ok(rootElement.innerHTML.includes('Index & 7-Company CDS Comparison'));
assert.ok(rootElement.innerHTML.includes('data-study-cds-company="SPCX"'));
assert.ok(rootElement.innerHTML.includes('data-study-cds-chart="SPCX"'));
assert.ok(rootElement.innerHTML.includes('6개사 중앙값'));
assert.ok(rootElement.innerHTML.includes('GOOGL 50bp'));
assert.ok(charts[0].includes('SPCX') && charts.includes('SPCX'));
items.spcx.latest.bps = 265;
context.renderStudyCdsOverview();
assert.ok(rootElement.innerHTML.includes('7개사 중앙값'));
assert.ok(rootElement.innerHTML.includes('SPCX 265bp'));
assert.match(source, /studyCdsCompanySelection: Object\.values\(studyCdsData\.items \?\? \{\}\)/);
for (const name of ['formatStudyCdsBps', 'getStudyCdsFreshness', 'getStudyCdsPayload', 'createStudyCdsChart', 'createStudyCdsComparisonChart']) {
  const offset = source.indexOf(`function ${name}(`);
  vm.runInContext(source.slice(offset, source.indexOf('\nfunction ', offset + 1)), context);
}
assert.equal(context.formatStudyCdsBps(null), '-');
assert.equal(context.getStudyCdsFreshness({staleDays: null}).label, '관측 없음');
context.charts = [];
context.Chart = function(_, config) { this.config = config; };
context.getMacroTickIndexes = () => [];
context.getStudyCdsIndexPayload = () => null;
context.studyCdsData.dates = ['2026-10-21', '2026-10-22', '2026-10-23'];
const sample = {...items.spcx, values: [null, 250, 250], observedBps: [null, 250, null]};
context.createStudyCdsChart({}, sample, '1y');
const single = context.charts[0].config;
assert.equal(JSON.stringify(single.data.datasets[0].pointRadius), '[0,2.8,0]');
assert.ok(single.options.plugins.tooltip.callbacks.label({dataIndex: 2, parsed: {y: 250}}).includes('이월'));
assert.ok(single.options.plugins.tooltip.callbacks.label({dataIndex: 1, parsed: {y: 250}}).includes('일별 중앙값'));
assert.equal(JSON.stringify(single.data.datasets[0].segment.borderDash({p1DataIndex: 2})), '[5,4]');
context.createStudyCdsComparisonChart({}, [sample], '1y', []);
const combo = context.charts[1].config;
assert.equal(JSON.stringify(combo.data.datasets[0].data), '[null,250,250]');
assert.equal(JSON.stringify(combo.data.datasets[0].pointRadius), '[0,2.1,0]');
assert.ok(combo.options.plugins.tooltip.callbacks.label({dataIndex: 2, parsed: {y: 250}, dataset: combo.data.datasets[0]}).includes('이월'));
console.log('CDS company selection and summary tests passed');
