const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const helper = source.slice(source.indexOf('function getMarketRsChartNavigation('), source.indexOf('function renderMarketRsSelectionPreservingScroll()'));
const context = {};
vm.runInNewContext(helper, context);
const rows = [{ticker: 'NVDA'}, {ticker: 'MSFT'}, {ticker: 'META'}];
const nav = (items, ticker) => ({...context.getMarketRsChartNavigation(items, ticker)});
assert.deepEqual(nav(rows, 'MSFT'), {previous: 'NVDA', next: 'META', position: 2, total: 3});
assert.equal(nav(rows, 'NVDA').previous, null);
assert.equal(nav(rows, 'META').next, null);
assert.deepEqual(nav([], 'NVDA'), {previous: null, next: null, position: 0, total: 0});
assert.deepEqual(nav(rows.slice(0, 1), 'NVDA'), {previous: null, next: null, position: 1, total: 1});
assert.deepEqual(nav(rows, 'OUTSIDE'), {previous: null, next: 'NVDA', position: 0, total: 3});
assert.equal(nav([...rows].reverse(), 'MSFT').next, 'NVDA');
assert.match(source, /getMarketRsChartNavigation\(leaderRows, selected\?\.ticker\)/);

// Execute the actual click binding, checking that filters and chart preferences survive.
const binding = source.slice(source.indexOf('  usOverviewRoot.querySelectorAll("[data-rs-chart-navigate]")'), source.indexOf('  usOverviewRoot.querySelectorAll("[data-rs-chart-zoom]")'));
const state = {rsSelectedTicker: 'MSFT', rsMonitorSelectedTicker: 'OUTSIDE', rsBriefingSector: 'briefingAll', rsUniverse: 'all', rsHistoryRange: '1y', rsLeaderSort: 'rs', rsChartSeries: {ema20: true}, rsPriceChartType: 'candle'};
const before = structuredClone(state);
let click;
let renders = 0;
let focused = false;
vm.runInNewContext(binding, {
  state,
  chartNavigation: nav(rows, 'MSFT'),
  usOverviewRoot: {
    querySelectorAll: () => [{dataset: {rsChartNavigate: 'next'}, addEventListener: (event, handler) => {click = handler;}}],
    querySelector: () => ({focus: options => {assert.equal(options.preventScroll, true); focused = true;}}),
  },
  renderMarketRsSelectionPreservingScroll: () => {renders += 1;},
});
click();
assert.deepEqual(state, {...before, rsSelectedTicker: 'META', rsMonitorSelectedTicker: ''});
assert.equal(renders, 1);
assert.equal(focused, true);
console.log('RS chart navigation: filtered order, boundaries, external selections and preserved settings passed.');
