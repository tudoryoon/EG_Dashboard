const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const dates = Array.from({length: 25}, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
const state = {
  totalCurveWindow: 21,
  totalDashboardSelection: ['macro:rates:us30y_minus_us10y'],
  totalDashboardCustomStart: dates[23], totalDashboardCustomEnd: dates[24],
};
const rates = {
  us10y: {dates, values: dates.map((_, i) => 4 + i * 0.01), name: 'US10Y'},
  us30y: {dates, values: dates.map((_, i) => 4.3 + i * 0.02), name: 'US30Y'},
};
let chartConfig;
const context = vm.createContext({
  state, marketMacroData: {panels: {rates: {title: 'Rates', series: rates}}},
  marketPriceData: {items: {}}, buildMacroIndicatorDashboardItem: () => null,
  shiftDateByRange: () => dates[0], charts: [],
  buildRegularDateTickIndexes: () => [0, 1], formatRangeAxisDate: value => value,
  Chart: class {constructor(canvas, config) {chartConfig = config;}},
});
vm.runInContext(source.slice(source.indexOf('const yearColors ='), source.indexOf('const MARKET_TREND_PRICE_CHART_TYPES')), context);
vm.runInContext(source.slice(source.indexOf('function getYieldCurveRows('), source.indexOf('function getMarketMacroPanel(')), context);
const classify = (a, b) => context.classifyYieldCurve(a, b);
assert.equal(classify(10, 20).key, 'bear_steepening');
assert.equal(classify(20, 10).key, 'bear_flattening');
assert.equal(classify(-20, -10).key, 'bull_steepening');
assert.equal(classify(-10, -20).key, 'bull_flattening');
assert.equal(classify(0, 10).key, 'bear_steepening');
assert.equal(classify(0, -10).key, 'bull_flattening');
assert.equal(classify(-10, 10).label, '혼합 스티프닝');
assert.equal(classify(10, -10).label, '혼합 플래트닝');
assert.equal(classify(20, 20).label, '베어 평행 이동');
assert.equal(classify(-20, -20).label, '불 평행 이동');
assert.equal(classify(0.4, -0.4).label, '중립');
assert.equal(classify(1, 2).key, 'bear_steepening');
assert.equal(classify(null, 2).key, 'insufficient');
assert.equal(classify(NaN, 2).key, 'insufficient');

const sparse = context.getYieldCurveRows({
  us10y: {dates: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24'], values: [4, null, 4.2, 0]},
  us30y: {dates: ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-25'], values: [4.5, 4.6, 4.4, 4.3]},
});
assert.equal(sparse.length, 2);
assert.equal(sparse[0].spread, 0.5);
assert.equal(sparse[1].spread, 0.2);
assert.equal(context.buildYieldCurveRegimeSeries(sparse, 1)[1].key, 'mixed');
const rows = context.getYieldCurveRows();
const series = context.buildYieldCurveRegimeSeries(rows, 21);
assert.equal(series[20].key, 'insufficient');
assert.equal(series[21].baseDate, dates[0]);
assert.equal(series[21].delta10, 21);
assert.equal(series[21].delta30, 42);
assert.equal(series[21].slopeBp, 21);
assert.equal(series[21].key, 'bear_steepening');
assert.equal(context.buildYieldCurveRegimeSeries(rows, 999)[21].sessions, 21);

const spread = context.getTotalDashboardSelectedItems()[0];
assert.equal(spread.label, 'US 30Y - 10Y');
assert.equal(spread.values[0], 0.3);
const payload = context.buildTotalDashboardBarPayload('1m');
assert.equal(payload.labels.length, 2);
assert.equal(payload.regimes[0].baseDate, dates[2]);
assert.equal(payload.regimes[1].date, dates[24]);
assert.equal(payload.datasets[0].data[1], 0.54);
assert.ok(context.renderYieldCurveSummary(payload.regimes[1]).includes('+21.0bp'));
assert.ok(!context.renderYieldCurveSummary(null).includes('undefined'));
assert.deepEqual(Array.from(context.fitTotalDashboardDateTicks([0, 1, 2, 3, 4, 5, 6, 7], 310)), [0, 4, 7]);
assert.equal(context.fitTotalDashboardDateTicks([], 310).length, 0);

context.createTotalDashboardSpreadChart({}, '1m');
assert.equal(chartConfig.options.scales.y.title.text, '30Y - 10Y (%p)');
assert.equal(chartConfig.data.datasets[0].backgroundColor[0], classify(21, 42).color);
const tooltip = chartConfig.options.plugins.tooltip.callbacks.afterLabel({dataIndex: 1});
assert.ok(tooltip.includes('베어 스티프닝'));
assert.ok(tooltip.includes('30Y−10Y 변화 +21.0bp'));
state.totalCurveWindow = 1;
assert.equal(context.buildTotalDashboardBarPayload('1m').regimes[1].baseDate, dates[23]);

// Verify the dashboard's actual daily data uses paired dates, not forward-filled yields.
const actual = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/market-macro-data.js'), 'utf8'), actual);
const realRows = context.getYieldCurveRows(Object.values(actual.window)[0].panels.rates.series);
const realLatest = context.buildYieldCurveRegimeSeries(realRows, 21).at(-1);
assert.ok(realLatest.baseDate);
assert.ok(Number.isFinite(realLatest.slopeBp));
assert.ok(Math.abs(realLatest.spread - (realLatest.thirty - realLatest.ten)) < 0.001);
assert.ok(!source.includes('us10y_minus_us30y'));
console.log('Yield curve: 4 regimes, mixed/neutral, 30Y-10Y sign, nulls, lookback outside view, custom dates, colors and tooltip passed.');
console.log('Latest 1M:', JSON.stringify(realLatest));
