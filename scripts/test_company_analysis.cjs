const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const classes = new Set();
let currentChart;
const context = vm.createContext({
  structuredClone,
  state: { tab: 'Screening', screeningView: 'Company' },
  document: { body: { classList: {
    remove(value) { classes.delete(value); },
    toggle(value, enabled) { if (enabled) classes.add(value); else classes.delete(value); },
  } } },
  Chart: { getChart() { return currentChart; } },
});
const run = code => vm.runInContext(code, context);
const companySource = fs.readFileSync(path.join(root, 'company-view.js'), 'utf8');
assert.doesNotMatch(companySource, /companyDepth|company(?:Financial|Trend)Mode\b|data-company-(?:financial|trend)-mode/);
assert.equal(fs.existsSync(path.join(root, 'company-depth-chart.js')), false);
run(companySource);
run('prepareCompanyViewRender()');
assert.equal(classes.has('company-workspace'), true);
run('state.screeningView = "RS"; prepareCompanyViewRender()');
assert.equal(classes.has('company-workspace'), false);

const sourceContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/market-rs-financials-data.js'), 'utf8'), sourceContext);
const data = Object.values(sourceContext.window)[0];
const originalData = JSON.stringify(data);
context.financialItem = data.financials.AAPL;
assert.deepEqual(Array.from(run('companyFinancialSelected')), ['revenue', 'revenueYoyPct']);
let model = run('companyFinancialModel(financialItem)');
assert.equal(model.quarters.length, data.financials.AAPL.quarters.length);
assert.equal(model.datasets.length, 2);
assert.equal(model.datasets[0].data.at(-1), data.financials.AAPL.quarters[0].revenue / 1e9);
run('companyFinancialRange = "4"; COMPANY_FINANCIAL_METRICS.forEach(metric => companyFinancialSelected.add(metric.key))');
model = run('companyFinancialModel(financialItem)');
assert.equal(model.quarters.length, 4);
assert.equal(model.datasets.length, 8);
assert.equal(model.datasets.find(item => item.metricKey === 'grossMarginPct').data.at(-1), 48.1);
assert.equal(model.datasets.find(item => item.metricKey === 'epsDiluted').yAxisID, 'eps');
assert.equal(model.datasets.find(item => item.metricKey === 'operatingMarginYoyPp').yAxisID, 'pct');

// Missing disclosures stay null, and dollars/percentages/EPS retain separate units.
for (const ticker of ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA']) {
  context.financialItem = data.financials[ticker];
  model = run('companyFinancialModel(financialItem)');
  const zeroPositions = Object.values(model.scales).map(axis => -axis.min / (axis.max - axis.min));
  assert.ok(zeroPositions.every(value => Math.abs(value - zeroPositions[0]) < 1e-12));
  for (const dataset of model.datasets) {
    const bounds = model.scales[dataset.yAxisID];
    assert.ok(dataset.data.filter(Number.isFinite).every(value => value >= bounds.min && value <= bounds.max));
    model.quarters.forEach((quarter, index) => {
      if (quarter[dataset.metricKey] == null) assert.equal(dataset.data[index], null);
    });
  }
}
assert.equal(JSON.stringify(data), originalData);
context.financialItem = { quarters: [
  { periodEnd: '2026-06-30', revenue: 3e9, fcf: -2e9, grossMarginPct: 30, epsDiluted: -2 },
  { periodEnd: '2026-03-31', revenue: 1e9, fcf: -1e9, grossMarginPct: -20, epsDiluted: 1 },
] };
model = run('companyFinancialModel(financialItem)');
const zeros = Object.values(model.scales).map(axis => -axis.min / (axis.max - axis.min));
assert.ok(zeros.every(value => Math.abs(value - zeros[0]) < 1e-12));
assert.ok(zeros[0] > 0 && zeros[0] < 1);
run('companyFinancialSelected.clear()');
assert.equal(run('companyFinancialModel(financialItem).datasets.length'), 0);
assert.equal(run('companyFinite(null)'), null);
assert.equal(run('companyFinite("")'), null);
assert.equal(run('companyFinite(0)'), 0);

// Only Company chart instances are themed; source values, visibility and axes are untouched.
let updates = 0;
currentChart = {
  data: { datasets: [
    { label: 'Stock Price(R)', data: [100, 110], borderColor: '#111827', ohlc: [{ o: 100, c: 110 }] },
    { label: '20EMA', data: [95, 96], hidden: true },
    { label: '1D Return', isDailyReturn: true, borderColor: 'transparent', data: [1, 2] },
  ] },
  options: {
    scales: { y1: { min: 80, max: 120, ticks: {}, grid: {}, border: {}, title: {} } },
    plugins: { legend: { labels: {} }, tooltip: {} },
  },
  update() { updates++; },
};
context.canvas = { closest() { return false; } };
run('applyCompanyChartTheme(canvas)');
assert.equal(updates, 0);
assert.equal(currentChart.data.datasets[0].borderColor, '#111827');
context.canvas = { closest() { return true; } };
run('applyCompanyChartTheme(canvas)');
assert.equal(updates, 1);
assert.equal(currentChart.data.datasets[0].borderColor, '#ecf0ed');
assert.equal(currentChart.data.datasets[0].candleColors.up, '#39d3a1');
assert.equal(currentChart.data.datasets[1].hidden, true);
assert.equal(currentChart.data.datasets[2].borderColor, 'transparent');
assert.deepEqual(currentChart.data.datasets[0].data, [100, 110]);
assert.equal(currentChart.options.scales.y1.min, 80);
assert.equal(currentChart.options.scales.y1.max, 120);
// Chart.js can parse a missing bar as zero. Its tooltip must filter by the raw value.
let capturedConfig;
context.Chart = function(canvas, config) { capturedConfig = config; };
context.Chart.getChart = () => null;
context.canvas = { parentElement: {} };
run('const charts = []; companyModal = {querySelector() {return {};}}; companyFinancialSelected.add("revenue"); createCompanyFinancialChart(canvas, financialItem)');
assert.equal(capturedConfig.options.plugins.tooltip.filter({dataset:{data:[null]},dataIndex:0}),false);
assert.equal(capturedConfig.options.plugins.tooltip.filter({dataset:{data:[0]},dataIndex:0}),true);
console.log('Company analysis: 8 metrics, real quarters, null preservation, aligned units and theme isolation passed.');
