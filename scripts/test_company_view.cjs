const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'company-view.js'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const originalState = {
  tab: 'Screening', screeningView: 'Company', companyTicker: 'NVDA',
  rsUniverse: 'nasdaq100', rsSelectedTicker: 'MU', rsHistoryRange: '6m',
  rsPriceChartType: 'line', rsVolumeVisible: false,
  rsChartSeries: { rs: true, ema20: false, ema100: true },
  trendScoreUniverse: 'dailyBriefing', trendScoreRange: '3m', canslimUniverse: 'dailyBriefing',
  query: 'micron', rsBriefingSector: 'memory', rsNewHighBriefingOnly: false,
};
const state = structuredClone(originalState);
let lazyDraws = 0;
const context = vm.createContext({
  state, structuredClone,
  document: { body: { classList: { remove() {} } } },
  marketRsData: { histories: {
    NVDA: { price: [null, 100, 110] },
    AAPL: { price: [NaN, 100, 95, null] },
    META: { price: [100] }, TSLA: { price: [0, 10] },
  } },
  createMarketRsMddChart() { lazyDraws += 1; },
  createMarketRsAtrChart() { lazyDraws += 1; },
});
const run = code => vm.runInContext(code, context);
run(source);
assert.deepEqual(Array.from(run('COMPANY_PILOT.map(item => item.ticker)')),
  ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA']);
assert.equal(run('isCompanyPilotTicker("nvda")'), true);
for (const ticker of ['SPCX', 'MU', '<script>', '', null]) {
  assert.equal(run(`isCompanyPilotTicker(${JSON.stringify(ticker)})`), false);
}
assert.ok(Math.abs(run('companyDailyChange("NVDA")') - 10) < 1e-10);
assert.ok(Math.abs(run('companyDailyChange("AAPL")') + 5) < 1e-10);
for (const ticker of ['META', 'TSLA', 'MISSING']) {
  assert.equal(run(`companyDailyChange("${ticker}")`), null);
}
assert.equal(run('companySigned(null)'), '-');
assert.equal(run('companySigned(0)'), '+0.00%');

run('enterCompanyChartContext("NVDA")');
assert.equal(state.rsUniverse, 'all');
assert.equal(state.rsHistoryRange, '1y');
assert.equal(state.rsPriceChartType, 'candle');
assert.equal(state.rsVolumeVisible, true);
assert.deepEqual(structuredClone(state.rsChartSeries),
  { rs: true, ema10: false, ema20: true, ema50: false, ema100: true, ema200: false });
state.rsHistoryRange = '3m';
state.rsChartSeries.ema50 = true;
state.companyTicker = 'AAPL';
run('prepareCompanyViewRender(); enterCompanyChartContext("AAPL")');
assert.equal(state.rsHistoryRange, '3m');
assert.equal(state.rsSelectedTicker, 'AAPL');
state.companyTicker = '';
run('prepareCompanyViewRender()');
assert.deepEqual(state, { ...originalState, companyTicker: '' });

// Company preferences survive reopening without leaking into the other tabs.
state.companyTicker = 'MSFT';
run('enterCompanyChartContext("MSFT")');
assert.equal(state.rsHistoryRange, '3m');
assert.equal(state.rsChartSeries.ema50, true);
state.screeningView = 'RS';
run('prepareCompanyViewRender()');
assert.deepEqual(state, { ...originalState, companyTicker: 'MSFT', screeningView: 'RS' });

// Old observer work must not draw a previously selected ticker into the new dialog.
run('companyModal = {open: true, querySelector() { return {}; }}');
run('drawCompanyLazy("risk", {ticker:"NVDA"}, null)');
assert.equal(lazyDraws, 0);
run('drawCompanyLazy("risk", {ticker:"MSFT"}, null)');
assert.equal(lazyDraws, 2);
assert.match(source, /if \(companyModal !== dialog \|\| !dialog\.open\) return;/);

const routeStart = dashboard.indexOf('const DASHBOARD_ROUTE_META =');
const routeEnd = dashboard.indexOf('function syncDashboardRoute(');
run(dashboard.slice(routeStart, routeEnd));
assert.equal(run('applyDashboardRouteFromHash("#/screening/company/nvda")'), '#/screening/company/nvda');
assert.equal(state.companyTicker, 'NVDA');
assert.equal(run('applyDashboardRouteFromHash("#/screening/company/MSFT")'), '#/screening/company/msft');
assert.equal(run('applyDashboardRouteFromHash("#/screening/company/mu")'), '#/screening/company');
assert.equal(state.companyTicker, '');
assert.equal(run('applyDashboardRouteFromHash("#/screening/rs")'), '#/screening/rs');
assert.equal(run('applyDashboardRouteFromHash("#/market/index/trend")'), '#/market/index/trend');

assert.ok(index.indexOf('src="./company-view.js?') < index.indexOf('src="./dashboard.js?'));
assert.match(index, /href="\.\/company-view\.css\?/);
assert.match(dashboard, /function render\(\) \{\s*prepareCompanyViewRender\(\);/);
assert.match(dashboard, /state\.screeningView === "Company"\) renderCompanyOverview\(\)/);
console.log('Company pilot: M7 coverage, defaults, state isolation, lazy rendering and routes passed.');
