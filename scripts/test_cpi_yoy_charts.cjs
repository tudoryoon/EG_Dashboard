const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const context = vm.createContext({window: {}});
for (const file of ['macro-indicators-data.js', 'market-macro-data.js', 'market-price-data.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'data', file), 'utf8'), context);
}
vm.runInContext(`const macroIndicatorsData = window.macroIndicatorsData;
const marketMacroData = window.marketMacroData; const marketPriceData = window.marketPriceData;
const TOTAL_DASHBOARD_COLOR_BY_KEY = {}; const yearColors = ['black'];
const state = {macroDashboardSelection: [], totalDashboardSelection: []};
function toDateKey(date) {return date;} function escapeHtml(value) {return String(value);}`, context);
for (const name of ['shiftDateByRange', 'getMacroDerivedValues', 'getMacroDashboardSeriesByKey', 'alignPublishedMacroSeries',
  'macroValueBefore', 'macroReleaseTooltip', 'renderMacroEstimateNotes', 'buildMacroIndicatorDashboardItem',
  'mergeSeriesPreferRecent', 'scaleSeriesValues', 'getMacroDashboardItems', 'getYieldCurveRows', 'getTotalDashboardSeriesItems',
  'getTotalDashboardSelectedItems', 'buildMacroDashboardChartPayload', 'buildTotalDashboardPayload']) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
const run = expression => vm.runInContext(expression, context);
for (const [seriesKey, expected] of [['headline_cpi', 4.02], ['core_cpi', 2.81]]) {
  const series = run(`getMacroDashboardSeriesByKey('${seriesKey}')`);
  assert.equal(series.latestDate, '2026-10');
  assert.equal(series.yoyPct, expected);
  assert.ok(!series.dates.includes('2025-10'), 'Missing raw base must stay missing');
  const key = `indicator:${seriesKey}_yoy`;
  const item = run(`getMacroDashboardItems().find(item => item.key === '${key}')`);
  assert.equal(item.values.at(-1), expected);
  assert.equal(item.dates.at(-1), '2026-11-10');
  assert.equal(item.releasePoints.at(-1).estimate.status, 'estimate');
  assert.match(run(`macroReleaseTooltip(${JSON.stringify(item)}, '2026-11-10')`), /추정 YoY/);
  assert.doesNotMatch(run(`macroReleaseTooltip(${JSON.stringify(item)}, '2026-11-09')`), /추정/);
  assert.match(run(`renderMacroEstimateNotes([${JSON.stringify(item)}])`), /BLS 공식 YoY가 아닙니다/);
  assert.equal(run(`renderMacroEstimateNotes([${JSON.stringify(item)}], '2026-11-09')`), '');
  run(`state.macroDashboardSelection = ['${key}', 'market:sp500']; state.totalDashboardSelection = ['${key}', 'market:sp500'];
    state.macroDashboardCustomStart = state.totalDashboardCustomStart = '2026-11-09';
    state.macroDashboardCustomEnd = state.totalDashboardCustomEnd = '2026-11-10';`);
  for (const payload of [run(`buildMacroDashboardChartPayload('1m')`), run(`buildTotalDashboardPayload('1m')`)]) {
    const dataset = payload.datasets.find(dataset => dataset.label === item.label);
    const previous = payload.labels.indexOf('2026-11-09');
    const current = payload.labels.indexOf('2026-11-10');
    assert.ok(previous >= 0 && current >= 0);
    assert.equal(dataset.data[previous], item.values.at(-2));
    assert.equal(dataset.data[current], expected);
    assert.equal(dataset.pointRadius({dataIndex: previous}), 0);
    assert.equal(dataset.pointRadius({dataIndex: current}), 4);
    assert.equal(dataset.pointStyle({dataIndex: current}), 'triangle');
  }
}
console.log('CPI YoY charts: 4.02/2.81 estimates, unchanged raw gap, publication-date alignment, no lookahead, labels and triangle markers passed.');
