const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const stockRows = ['AAA', 'BBB', 'CCC'].map(ticker => ({ticker}));
const state = {
  tab: 'DailyBriefing', briefingRsChartOpen: false, briefingRsChartList: 'buyWatch', briefingRsChartTicker: '',
  rsUniverse: 'nasdaq100', rsSelectedTicker: 'AAPL', rsHistoryRange: '6m', rsPriceChartType: 'line',
  rsVolumeVisible: false, rsChartSeries: {rs: false, sma20: true}, rsBriefingSector: 'software', rsFilter: 'newHigh1y',
};
const original = structuredClone(state);
const context = vm.createContext({
  state, structuredClone,
  window: {marketBriefingData: {rotationSignal: {candidates: {
    buyWatch: [{ticker:'AAA'}, {ticker:'AAA'}, {ticker:'MISSING'}, {ticker:'BBB'}],
    earlyRotation: [{ticker:'CCC'}], trimWatch: [],
  }}}},
  marketRsRowByTicker: new Map(stockRows.map(row => [row.ticker, row])),
  marketRsData: {histories: {AAA: {price: [10, 11]}, BBB: {price: [20, 19]}, CCC: {price: [null, 30]}}},
});
vm.runInContext(`
  const BRIEFING_RS_CHART_KEYS = ${JSON.stringify(['rsUniverse','rsSelectedTicker','rsHistoryRange','rsPriceChartType','rsVolumeVisible','rsChartSeries'])};
  const BRIEFING_RS_LISTS = {buyWatch:'Buy Watch',earlyRotation:'Early Rotation',trimWatch:'Trim Watch'};
  let briefingRsSavedState = null;
  let briefingRsChartPreferences = null;
`, context);
for (const name of ['getMarketRsChartNavigation', 'hasBriefingRsChart', 'getBriefingRsChartSelection',
  'enterBriefingRsChartContext', 'prepareBriefingRsChartRender']) vm.runInContext(functionSource(name), context);
const plain = value => JSON.parse(JSON.stringify(value));
let selection = context.getBriefingRsChartSelection();
assert.deepEqual(plain(selection.rows).map(row => row.ticker), ['AAA','BBB']);
assert.equal(selection.selected.ticker, 'AAA');
assert.equal(selection.navigation.previous, null);
state.briefingRsChartTicker = 'BBB';
selection = context.getBriefingRsChartSelection();
assert.equal(selection.navigation.previous, 'AAA');
assert.equal(selection.navigation.next, null);
state.briefingRsChartList = 'earlyRotation';
assert.deepEqual(plain(context.getBriefingRsChartSelection().rows), [{ticker:'CCC'}]);
state.briefingRsChartList = 'trimWatch';
assert.equal(context.getBriefingRsChartSelection().list, 'buyWatch');
state.briefingRsChartList = 'buyWatch';
state.briefingRsChartOpen = true;
context.enterBriefingRsChartContext('AAA');
assert.equal(state.rsUniverse, 'all');
assert.equal(state.rsSelectedTicker, 'AAA');
assert.equal(state.rsHistoryRange, '1y');
assert.equal(state.rsPriceChartType, 'candle');
assert.equal(state.rsBriefingSector, original.rsBriefingSector);
state.rsHistoryRange = '3m';
state.rsChartSeries.sma20 = false;
context.prepareBriefingRsChartRender();
assert.equal(state.rsSelectedTicker, 'AAA');
state.briefingRsChartOpen = false;
context.prepareBriefingRsChartRender();
for (const key of ['rsUniverse','rsSelectedTicker','rsHistoryRange','rsPriceChartType','rsVolumeVisible','rsChartSeries','rsBriefingSector','rsFilter']) {
  assert.deepEqual(plain(state[key]), plain(original[key]), key);
}
state.briefingRsChartOpen = true;
context.enterBriefingRsChartContext('CCC');
assert.equal(state.rsHistoryRange, '3m');
assert.equal(state.rsChartSeries.sma20, false);
state.tab = 'Screening';
context.prepareBriefingRsChartRender();
assert.equal(state.rsSelectedTicker, 'AAPL');
assert.equal(state.rsHistoryRange, '6m');
context.window.marketBriefingData.rotationSignal.candidates = {};
assert.equal(context.getBriefingRsChartSelection().selected, null);
assert.equal(context.getBriefingRsChartSelection().navigation.total, 0);

let destroyed = 0, cleaned = 0;
const other = {canvas: {id:'rotation'}, destroy() {throw Error('Unrelated chart destroyed');}};
const own = {canvas: {id:'detail', __marketRsYAxisDragCleanup() {cleaned++;}}, destroy() {destroyed++;}};
const lifecycle = vm.createContext({charts: [other, own], marketRsDetailChart: own, marketRsVolumeChart: null});
vm.runInContext(functionSource('destroyBriefingRsCharts'), lifecycle);
lifecycle.destroyBriefingRsCharts({contains: canvas => canvas === own.canvas});
assert.equal(destroyed, 1);
assert.equal(cleaned, 1);
assert.equal(lifecycle.charts.length, 1);
assert.equal(lifecycle.charts[0], other);
assert.equal(lifecycle.marketRsDetailChart, null);
assert.match(source, /briefingRsChartOpen: false/);
assert.match(source, /renderMarketRsChartControls\(selected, chartNavigationMarkup\)/);
assert.match(source, /renderMarketRsChartControls\(selected, navigationMarkup\)/);
assert.match(source, /renderMarketRsChartPanels\(selected\)/);
console.log('Briefing RS chart: list boundaries, empty data, isolated preferences and scoped cleanup passed.');
