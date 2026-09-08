const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const context = vm.createContext({ window: {}, console });
vm.runInContext(fs.readFileSync(path.join(root, 'data/macro-indicators-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'data/market-macro-data.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'data/market-price-data.js'), 'utf8'), context);
vm.runInContext(`const macroIndicatorsData = window.macroIndicatorsData;
const marketMacroData = window.marketMacroData;
const marketPriceData = window.marketPriceData;
const TOTAL_DASHBOARD_COLOR_BY_KEY = {};
const yearColors = ['black'];
const state = { macroDashboardSelection: [], totalDashboardSelection: [] };
function toDateKey(date) { return date; }
function shiftDateByRange() { return '2026-08-01'; }`, context);
for (const name of ['getMacroDerivedValues', 'getMacroDashboardSeriesByKey', 'alignPublishedMacroSeries',
  'macroValueBefore', 'macroReleaseTooltip', 'buildMacroIndicatorDashboardItem', 'mergeSeriesPreferRecent',
  'scaleSeriesValues', 'getMacroDashboardItems', 'getTotalDashboardSeriesItems',
  'getTotalDashboardSelectedItems', 'buildMacroDashboardChartPayload', 'buildTotalDashboardPayload']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
const run = (expression) => vm.runInContext(expression, context);
const cpi = run(`buildMacroIndicatorDashboardItem({key:'indicator:headline_cpi_yoy', label:'CPI', seriesKey:'headline_cpi', kind:'yoy'})`);
assert.equal(cpi.dates.at(-1), '2026-08-12');
assert.equal(cpi.releasePoints.at(-1).reference, '2026-07');
assert.ok(!cpi.dates.includes('2026-07-01'));
assert.equal(run(`getMacroDerivedValues({dates:['2025-01','2026-01'], values:[100,110], yoyValues:[null,null]}, 'yoy')[1]`), 10);
assert.equal(run(`alignPublishedMacroSeries({dates:['1900-01'],values:[1]},'cpi').dates.length`), 0);
assert.equal(run(`alignPublishedMacroSeries({dates:['2026-07'],values:[null]},'cpi').dates.length`), 0);
run(`state.macroDashboardSelection = ['market:sp500','indicator:headline_cpi_yoy'];
state.totalDashboardSelection = ['market:sp500','indicator:headline_cpi_yoy'];
state.macroDashboardCustomStart = state.totalDashboardCustomStart = '2026-08-03';
state.macroDashboardCustomEnd = state.totalDashboardCustomEnd = '2026-08-14';`);
const macro = run(`buildMacroDashboardChartPayload('1m')`);
const total = run(`buildTotalDashboardPayload('1m')`);
const a = macro.datasets.find(d => d.label === 'CPI YoY');
const b = total.datasets.find(d => d.label === 'CPI YoY');
assert.equal(a.stepped, 'before');
assert.equal(b.stepped, 'before');
assert.ok(Number.isFinite(a.data[0]), 'Carry previous publication into a mid-month range');
for (const date of ['2026-08-03','2026-08-11','2026-08-12','2026-08-13']) {
  assert.equal(a.data[macro.labels.indexOf(date)], b.data[total.labels.indexOf(date)], date);
}
const last = cpi.values.at(-1), previous = cpi.values.at(-2);
assert.equal(a.data[macro.labels.indexOf('2026-08-11')], previous);
assert.equal(a.data[macro.labels.indexOf('2026-08-12')], last);
run(`macroIndicatorsData.releaseCalendar.groups.test = {
 '2026-01':{releaseDate:'2026-03-01'}, '2026-02':{releaseDate:'2026-03-01'}}`);
assert.equal(run(`alignPublishedMacroSeries({dates:['2026-01','2026-02'],values:[1,2]}, 'test').values[0]`), 2);
console.log('Macro release charts: date alignment, no look-ahead date shift, carry-in, nulls, same-day releases, and both dashboards PASS');
