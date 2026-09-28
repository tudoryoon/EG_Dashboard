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
  'scaleSeriesValues', 'getMacroDashboardItems', 'getYieldCurveRows', 'getTotalDashboardSeriesItems',
  'getTotalDashboardSelectedItems', 'buildMacroDashboardChartPayload', 'buildTotalDashboardPayload']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
const run = (expression) => vm.runInContext(expression, context);
const cpi = run(`buildMacroIndicatorDashboardItem({key:'indicator:headline_cpi_yoy', label:'CPI', seriesKey:'headline_cpi', kind:'yoy'})`);
const latestCpiMonth = run(`macroIndicatorsData.indicators.find(i => i.key === 'cpi').series.find(s => s.key === 'headline_cpi').dates.at(-1)`);
const latestCpiRelease = run(`macroIndicatorsData.releaseCalendar.groups.cpi[${JSON.stringify(latestCpiMonth)}].releaseDate`);
assert.equal(cpi.dates.at(-1), latestCpiRelease);
assert.equal(cpi.releasePoints.at(-1).reference, latestCpiMonth);
const julyReleaseIndex = cpi.releasePoints.findIndex(point => point.reference === '2026-07');
assert.ok(julyReleaseIndex > 0);
assert.equal(cpi.dates[julyReleaseIndex], '2026-08-12');
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
const last = cpi.values[julyReleaseIndex], previous = cpi.values[julyReleaseIndex - 1];
assert.equal(a.data[macro.labels.indexOf('2026-08-11')], previous);
assert.equal(a.data[macro.labels.indexOf('2026-08-12')], last);
const augustReleaseIndex = cpi.releasePoints.findIndex(point => point.reference === '2026-08');
assert.ok(augustReleaseIndex > 0);
assert.equal(cpi.dates[augustReleaseIndex], '2026-09-11');
run(`state.macroDashboardCustomStart = state.totalDashboardCustomStart = '2026-09-10';
state.macroDashboardCustomEnd = state.totalDashboardCustomEnd = '2026-09-14';`);
for (const payload of [run(`buildMacroDashboardChartPayload('1m')`), run(`buildTotalDashboardPayload('1m')`)]) {
  const values = payload.datasets.find(d => d.label === 'CPI YoY').data;
  assert.equal(values[payload.labels.indexOf('2026-09-10')], cpi.values[augustReleaseIndex - 1]);
  assert.equal(values[payload.labels.indexOf('2026-09-11')], cpi.values[augustReleaseIndex]);
}
run(`macroIndicatorsData.releaseCalendar.groups.test = {
 '2026-01':{releaseDate:'2026-03-01'}, '2026-02':{releaseDate:'2026-03-01'}}`);
assert.equal(run(`alignPublishedMacroSeries({dates:['2026-01','2026-02'],values:[1,2]}, 'test').values[0]`), 2);

const gdpYoy = run(`getMacroDashboardItems().find(item => item.key === 'gdp:real_gdp_yoy')`);
const totalGdpYoy = run(`getTotalDashboardSeriesItems().find(item => item.key === 'macro:gdp:real_gdp_yoy')`);
assert.ok(gdpYoy && totalGdpYoy, 'GDP YoY must be selectable in both dashboards');
assert.equal(gdpYoy.normalize, false);
assert.equal(gdpYoy.axis, 'percent');
assert.equal(totalGdpYoy.isRate, true);
assert.deepEqual(gdpYoy.dates, totalGdpYoy.dates);
assert.deepEqual(gdpYoy.values, totalGdpYoy.values);
assert.ok(run(`marketMacroData.panels.gdp.series.real_gdp_yoy.dates.length >= 180`));
assert.equal(run(`marketMacroData.panels.gdp.series.real_gdp_yoy.dates[0]`), '1981-01-01');
assert.ok(run(`getMacroDashboardItems().some(item => item.key === 'gdp:real_gdp_annualized')`));
assert.ok(run(`getTotalDashboardSeriesItems().some(item => item.key === 'macro:gdp:real_gdp_annualized')`));
const q2 = gdpYoy.releasePoints.findIndex(point => point.reference === '2026-04');
assert.ok(q2 > 0);
assert.equal(gdpYoy.dates[q2], '2026-07-30');
assert.equal(run(`alignPublishedMacroSeries({dates:['1900-01-01'],values:[2]}, 'gdp').dates.length`), 0);
run(`state.macroDashboardSelection = ['market:sp500','gdp:real_gdp_yoy'];
state.totalDashboardSelection = ['market:sp500','macro:gdp:real_gdp_yoy'];
state.macroDashboardCustomStart = state.totalDashboardCustomStart = '2026-07-29';
state.macroDashboardCustomEnd = state.totalDashboardCustomEnd = '2026-08-03';`);
for (const [payload, axis] of [
  [run(`buildMacroDashboardChartPayload('1m')`), 'yPercent'],
  [run(`buildTotalDashboardPayload('1m')`), 'yYield'],
]) {
  const dataset = payload.datasets.find(d => d.label === 'Real GDP YoY');
  assert.equal(dataset.yAxisID, axis);
  assert.equal(dataset.stepped, 'before');
  assert.equal(dataset.data[payload.labels.indexOf('2026-07-29')], gdpYoy.values[q2 - 1]);
  assert.equal(dataset.data[payload.labels.indexOf('2026-07-30')], gdpYoy.values[q2]);
  assert.equal(dataset.data[payload.labels.indexOf('2026-08-03')], gdpYoy.values[q2]);
}
console.log('Macro release charts: date alignment, no look-ahead date shift, carry-in, nulls, same-day releases, and both dashboards PASS');
