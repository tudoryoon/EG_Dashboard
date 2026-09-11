const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const state = {trendScoreUniverse: 'all', trendScoreBriefingSector: 'briefingAll', query: ''};
const index = {ticker: 'MIWD00000NUS', name: 'MSCI ACWI NTR USD', isIndex: true, marketCap: null};
const stock = {ticker: 'NVDA', name: 'NVIDIA'};
const sectorData = {allTickers: ['NVDA'], groups: []};
const context = vm.createContext({
  state, marketTrendScoreData: {rows: {all: [stock, index]}},
  getMarketRsBriefingSectorData: () => sectorData,
  matchesTrendScoreCapRange: () => true, matchesTrendScoreScoreRange: () => true,
  matchesTrendScoreClimaxRange: () => true, sortTrendScoreRows: rows => rows,
  normalizeMarketTickerSearch: query => query.toLowerCase(),
  marketTickerSearchTerms: (ticker, name) => [ticker.toLowerCase(), name.toLowerCase()],
});
const start = source.indexOf('function getTrendScoreRows()');
const end = source.indexOf('function getSelectedTrendScoreRow(', start);
vm.runInContext(source.slice(start, end), context);
const visible = () => vm.runInContext('getVisibleTrendScoreRows().map(row => row.ticker).join(",")', context);
assert.equal(visible(), 'NVDA');
state.trendScoreBriefingSector = 'all';
assert.equal(visible(), 'NVDA,MIWD00000NUS');
state.trendScoreBriefingSector = 'indices';
assert.equal(visible(), 'MIWD00000NUS');
assert.equal(vm.runInContext('getTrendScoreBriefingSectorLabel("indices")', context), '\uC9C0\uC218');
state.query = 'msci';
assert.equal(visible(), 'MIWD00000NUS');

const button = {dataset: {trendScoreBriefingSector: 'indices'}, addEventListener(_, callback) {this.click = callback;}};
const listenerStart = source.indexOf('  usOverviewRoot.querySelectorAll("[data-trend-score-briefing-sector]")');
const listenerEnd = source.indexOf('  usOverviewRoot.querySelectorAll("[data-trend-score-market-cap]")', listenerStart);
Object.assign(context, {usOverviewRoot: {querySelectorAll: () => [button]}, resetTrendScoreCardLimit() {}, render() {}});
vm.runInContext(source.slice(listenerStart, listenerEnd), context);
Object.assign(state, {trendScoreUniverse: 'sp500', trendScoreMarketCapRange: 'large', trendScoreCustomMarketCapMin: '10b', query: 'NVDA'});
button.click();
assert.equal(state.trendScoreUniverse, 'all');
assert.equal(state.trendScoreMarketCapRange, 'all');
assert.equal(state.trendScoreCustomMarketCapMin, '');
assert.equal(state.query, '');
assert.equal(visible(), 'MIWD00000NUS');
assert.match(source, /trendScoreBriefingSector: "briefingAll"/);
const configs = [];
Object.assign(context, {
  Chart: class {constructor(canvas, config) {configs.push(config);}}, charts: [],
  shiftDateByRange: () => '2026-09-09',
});
context.marketTrendScoreData.historyDates = ['2026-09-09', '2026-09-10'];
context.marketTrendScoreData.histories = {all: {
  MIWD00000NUS: {rank: [null, null], score: [8, 9], climaxScore: [0, 0]},
  NVDA: {rank: [2, 1], score: [9, 10], climaxScore: [0, 0]},
}};
context.index = index;
context.stock = stock;
const chartStart = source.indexOf('function createTrendScoreChart(');
const chartEnd = source.indexOf('function getTrendScoreClimaxSnapshot(', chartStart);
vm.runInContext(source.slice(chartStart, chartEnd), context);
vm.runInContext('createTrendScoreChart({}, index); createTrendScoreChart({}, stock);', context);
assert.equal(configs[0].data.datasets.map(d => d.label).join(','), 'Trend Score,Climax Score');
assert.equal(configs[0].data.datasets[0].data.at(-1), 9);
assert.equal(configs[0].options.scales.y.display, false);
assert.equal(configs[1].data.datasets.map(d => d.label).join(','), 'Rank,Trend Score,Climax Score');
assert.equal(configs[1].options.scales.y.display, true);
console.log('Trend index filter is selectable independently of Daily Briefing, with defaults preserved.');
