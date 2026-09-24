const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'dashboard.js'), 'utf8');
const item = {label: 'NASDAQ Composite', isIndex: true,
  dates: ['2026-09-21', '2026-09-22', '2026-09-23'], values: [27122.09, 27244.28, 26936.04],
  opens: [26723.19, 27161.20, 27213.52], highs: [27183.93, 27288.79, 27217.33], lows: [26707.42, 27161.20, 26873.54]};
const state = {marketTrendChartType: 'candle', marketTrendEmas: [20, 100]};
let config;
const context = vm.createContext({
  state, marketPriceData: {startDate: '1965-01-01', items: {nasdaq: item}},
  MARKET_PRICE_EMA_OPTIONS: [20, 50, 100, 200], MARKET_RS_CANDLESTICK_PLUGIN: {},
  shiftDateByRange: () => '2026-09-22',
  calculateEmaSeries: values => values, calculateAtrPercentSeries: values => values,
  calculateDrawdownPercentSeries: values => values, calculateRollingDrawdownPercentSeries: values => values,
  calculateAtrDrawdownMultipleSeries: values => values,
  formatSignedPercent: value => value == null ? '-' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`,
  formatUsStockPrice: value => `$${value}`, charts: [],
  Chart: class {constructor(canvas, value) {config = value;}},
  attachMarketTrendYAxisDrag() {}, fitMarketTrendChartYToVisible() {},
});
vm.runInContext(source.slice(source.indexOf('function getMarketTrendDayChange('), source.indexOf('function calculateMarketTrendGap(')), context);
vm.runInContext(source.slice(source.indexOf('function createMarketTrendChart('), source.indexOf('function createMarketTrendRiskChart(')), context);
const payload = vm.runInContext('buildMarketTrendChartPayload("1m", "nasdaq")', context);
assert.equal(payload.useCandlestick, true);
assert.equal(payload.candlestickData[0].previousCloseDate, '2026-09-21');
assert.equal(payload.candlestickData[0].changePct.toFixed(2), '0.45');
assert.equal(payload.candlestickData[1].changePct.toFixed(2), '-1.13');
assert.equal(vm.runInContext('getMarketTrendDayChange([100, null, 105], 2)', context), null);
assert.equal(vm.runInContext('getMarketTrendDayChange([100], 0)', context), null);
for (const mode of ['candle', 'line']) {
  state.marketTrendChartType = mode;
  vm.runInContext('createMarketTrendChart({}, "1m", "nasdaq")', context);
  assert.equal(config.options.plugins.tooltip.callbacks.title([{label: '2026-09-23', dataIndex: 1}])[1], '전일 대비 -1.13%');
  assert.equal(config.options.plugins.tooltip.titleFont.weight, 'bold');
  const text = config.options.plugins.tooltip.callbacks.label({dataset: config.data.datasets[0], dataIndex: 1, parsed: {y: 26936.04}});
  assert.ok(String(text).includes('pt'));
  assert.ok(!String(text).includes('$'));
}
const options = source.slice(source.indexOf('const MARKET_PRICE_TREND_INDEX_OPTIONS'), source.indexOf('const BRIEFING_ROTATION_DISTRIBUTION_BENCHMARKS'));
assert.ok(options.includes('key: "nasdaq"'));
assert.ok(options.includes('key: "nasdaq100"'));
console.log('Index Trend: NASDAQ Composite, per-session returns, first-visible-bar base and Candle/Line tooltip passed.');
