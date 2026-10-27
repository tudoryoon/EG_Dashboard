const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
function payload(file) {
  const text = fs.readFileSync(path.join(root, 'data', file), 'utf8');
  return JSON.parse(text.slice(text.indexOf('=') + 1).trim().replace(/;$/, ''));
}
const briefing = payload('market-briefing-data.js');
const rs = payload('market-rs-data.js');
const trend = payload('market-trend-score-data.js');
const financials = payload('market-rs-financials-data.js');
const earnings = payload('market-canslim-earnings-data.js');
const expected = ['ACN', 'CTSH', 'EPAM', 'G', 'GLOB', 'IT'];
const sectorKey = 'it_consulting';
const context = vm.createContext({
  window: {marketBriefingData: briefing},
  state: {query: '', rsUniverse: 'all', rsBriefingSector: sectorKey,
    trendScoreUniverse: 'all', trendScoreBriefingSector: sectorKey,
    canslimUniverse: 'all', canslimBriefingSector: sectorKey},
  marketRsData: rs, marketTrendScoreData: trend,
  getMarketRsRowByTicker: ticker => rs.rows.find(row => row.ticker === ticker),
  getAsiaScreeningRegion: () => null,
  matchesMarketRsCapRange: () => true, matchesMarketRsScoreRange: () => true,
  matchesTrendScoreCapRange: () => true, matchesTrendScoreScoreRange: () => true,
  matchesTrendScoreClimaxRange: () => true, sortTrendScoreRows: rows => rows,
  normalizeMarketTickerSearch: value => value.toLowerCase(),
  getMarketCanslimProfile: ticker => earnings.profiles[ticker],
  buildMarketCanslimAnalysis: () => ({}), getMarketRsUniverseScore: row => row.rsRatingAll,
});
function include(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
['getBriefingRsTicker', 'getMarketRsBriefingSectorData', 'matchesBriefingSectorKey',
 'matchesMarketRsBriefingSector', 'getMarketRsBaseRows', 'getTrendScoreRows',
 'matchesTrendScoreBriefingSector', 'getVisibleTrendScoreRows', 'getMarketCanslimRows'].forEach(include);
for (const expression of ['getMarketRsBaseRows()', 'getVisibleTrendScoreRows()', 'getMarketCanslimRows()']) {
  const result = vm.runInContext(`${expression}.map(row => row.ticker).sort().join(',')`, context);
  assert.equal(result, expected.join(','), expression);
}
const panel = briefing.sectorPanels.find(s => s.key === sectorKey);
assert.equal(panel.label, 'IT \uCEE8\uC124\uD305');
assert.equal(panel.items.map(r => r.ticker).sort().join(','), expected.join(','));
const sectorKeys = briefing.sectorPanels.map(s => s.key);
assert.equal(new Set(sectorKeys).size, sectorKeys.length);
assert.equal(briefing.rotationSignal.sectors.map(s => s.key).sort().join(','), [...sectorKeys].sort().join(','));
assert.equal(Object.keys(briefing.rotationSignal.history).sort().join(','), [...sectorKeys].sort().join(','));
assert.equal(sectorKeys.indexOf(sectorKey), sectorKeys.indexOf('software') + 1);
assert.ok(briefing.rotationSignal.history[sectorKey].length >= 250);
assert.ok(Number.isFinite(briefing.rotationSignal.sectors.find(s => s.key === sectorKey).score));
for (const ticker of expected) {
  assert.equal(rs.rows.filter(r => r.ticker === ticker).length, 1);
  assert.ok(rs.histories[ticker].price.filter(Number.isFinite).length >= 250, `${ticker} prices`);
  assert.ok(trend.histories.all[ticker].score.some(Number.isFinite), `${ticker} trend`);
  assert.ok(financials.financials[ticker].quarters.length >= 4, `${ticker} financials`);
  assert.ok(Array.isArray(earnings.profiles[ticker].quarters), `${ticker} EPS profile`);
  assert.ok(financials.financials[ticker].quarters.some(row => Number.isFinite(row.epsDiluted)), `${ticker} reported EPS`);
}
console.log('IT consulting: six members selectable in RS, Trend and CANSLIM, with briefing score/history and financials.');
