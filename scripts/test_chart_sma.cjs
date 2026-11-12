const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const section = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));
const context = vm.createContext({});
vm.runInContext(section('function calculateSmaSeries(', 'function calculateAtrPercentSeries('), context);
const sma = (values, period) => Array.from(context.calculateSmaSeries(values, period));
assert.deepEqual(sma([1, 2, 9, 4, 5], 3), [null, null, 4, 5, 6]);
assert.deepEqual(sma([null, null, 3, 6, 12], 3), [null, null, null, null, 7]);
assert.deepEqual(sma([1, 2, null, 4, 5, 6], 3), [null, null, null, null, null, 5]);
assert.deepEqual(sma([1, NaN, Infinity, 4], 1), [1, null, null, 4]);
assert.deepEqual(sma([1, 2], 3), [null, null]);
assert.deepEqual(sma([1, 2], 0), []);
assert.deepEqual(sma(null, 20), []);

const defaults = vm.runInNewContext(`(${source.match(/rsChartSeries: (\{[^}]+\})/)[1]})`);
assert.deepEqual(Object.keys(defaults).filter(key => defaults[key]), ['rs', 'sma20', 'sma50', 'sma200']);
assert.match(source, /marketTrendSmas: \[20, 50, 200\]/);
assert.match(source, /rsChartSeries: \{ rs: true, sma10: false, sma20: true, sma50: true, sma100: false, sma200: true \}/);
const options = section('const MARKET_RS_CHART_SERIES =', 'const MARKET_RS_PRICE_CHART_TYPES');
assert.ok(!options.includes('EMA'));
assert.deepEqual([...options.matchAll(/period: (\d+)/g)].map(match => Number(match[1])), [10, 20, 50, 100, 200]);
const rsChart = section('function createMarketRsChart(', 'function createMarketRsVolumeChart(');
assert.ok(rsChart.includes('calculateSmaSeries(fullPrice, series.period).slice(startIndex)'));
assert.ok(!rsChart.includes('calculateEmaSeries'));
assert.ok(rsChart.includes('borderDash: []'), 'SMA overlays use solid lines');
assert.ok(!rsChart.includes('borderDash: [5, 5]'));
const indexChart = section('function createMarketTrendChart(', 'function createMarketTrendRiskChart(');
assert.ok(indexChart.includes('payload.smaReferenceSeries'));
assert.ok(!indexChart.includes('emaReferenceSeries'));

const prices = Array.from({length: 260}, (_, index) => 100 + index * index / 100);
const dates = prices.map((_, index) => new Date(Date.UTC(2025, 0, 1 + index)).toISOString().slice(0, 10));
const item = {label: 'Test', isIndex: true, closeOnly: true, dates, values: prices};
Object.assign(context, {
  state: {marketTrendChartType: 'line', marketTrendSmas: [20, 50, 200], marketTrendIndex: 'test', marketTrendRange: '1m'},
  marketPriceData: {startDate: dates[0], items: {test: item}},
  MARKET_PRICE_SMA_OPTIONS: [20, 50, 100, 200],
  shiftDateByRange: (_, range) => range === '1m' ? dates.at(-20) : dates[0],
  calculateDrawdownPercentSeries: values => values.map(() => null),
  calculateRollingDrawdownPercentSeries: values => values.map(() => null),
  calculateAtrDrawdownMultipleSeries: values => values,
});
vm.runInContext(section('function getMarketTrendDayChange(', 'function formatMarketTrendGap('), context);
vm.runInContext(section('function buildMarketTrendGapSummary(', 'function buildMarketTrendRiskSummary('), context);
const short = context.buildMarketTrendChartPayload('1m', 'test');
const full = context.buildMarketTrendChartPayload('max', 'test');
assert.equal(short.labels.length, 20);
assert.deepEqual(Array.from(short.datasets, dataset => dataset.label), ['Test · Line', 'SMA 20', 'SMA 50', 'SMA 200']);
for (const period of [20, 50, 100, 200]) {
  const expected = Number((prices.slice(-period).reduce((sum, value) => sum + value, 0) / period).toFixed(4));
  assert.equal(short.smaReferenceSeries[period].at(-1), expected);
  assert.equal(short.smaReferenceSeries[period].at(-1), full.smaReferenceSeries[period].at(-1));
  assert.equal(short.smaReferenceSeries[period][0], full.smaReferenceSeries[period].at(-20));
}
context.state.marketTrendSmas = [100];
assert.equal(context.buildMarketTrendChartPayload('1m', 'test').datasets[1].label, 'SMA 100');
item.values = prices.slice(0, 25);
item.dates = dates.slice(0, 25);
context.state.marketTrendRange = 'max';
const summary = Array.from(context.buildMarketTrendGapSummary());
assert.ok(Number.isFinite(summary[0].gap));
assert.equal(summary.find(value => value.period === 200).smaValue, null);
assert.equal(summary.find(value => value.period === 200).gap, null);
assert.ok(source.includes('const ema50 = calculateEmaSeries(values, 50).at(-1);'));
assert.ok(source.includes('const extensionMarkup = ["ema21", "sma50"]'));
console.log('SMA charts: rolling arithmetic, warmup/null handling, defaults, full-history range invariance, gaps and scoped EMA preservation passed.');
