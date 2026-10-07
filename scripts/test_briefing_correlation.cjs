const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf('function calculatePearsonCorrelation('), source.indexOf('function createBriefingCorrelationCharts(')), context);
const build = context.buildBriefingCorrelationModel;
const indexHistory = context.getBriefingCorrelationIndexHistory;
const peerHistory = context.getBriefingCorrelationPeerHistory;
const rank = context.buildBriefingCorrelationRanking;
const stocks = context.getBriefingCorrelationStocks;
const stockHistory = context.getBriefingCorrelationStockHistories;
const riskMetrics = context.buildBriefingRiskMetrics;
const history = (values) => values.map((value, i) => ({
  date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
  returns: { '1d': value },
  score: -999,
  excessReturns: { '1d': 999 },
}));
const values = Array.from({ length: 150 }, (_, i) => Math.sin(i) * 2 + (i % 7) / 10);
const annual = history(Array.from({length: 252}, (_, i) => i % 2 ? 2 : -1));
const cash = {dates: annual.map(row => row.date), dailyReturnPct: Array(252).fill(0.01)};
const annualRisk = riskMetrics(annual, annual, cash);
const expectedSharpe = Math.sqrt(252) * 0.49 / Math.sqrt(252 * 1.5 ** 2 / 251);
assert.ok(Math.abs(annualRisk.sharpe - expectedSharpe) < 1e-12);
assert.equal(annualRisk.downsideCapture, 100);
assert.equal(annualRisk.downDays, 126);
assert.equal(annualRisk.isPartial, false);
const scaled = history(annual.map(row => row.returns['1d'] / 2));
assert.equal(riskMetrics(scaled, annual, cash).downsideCapture, 50);
const hedge = history(annual.map(row => -row.returns['1d']));
assert.equal(riskMetrics(hedge, annual, cash).downsideCapture, -100);
const nonUniform = history(annual.map((row, i) => i % 4 === 0 ? -3 : row.returns['1d']));
assert.equal(riskMetrics(hedge, nonUniform, cash).downsideCapture, -50);
assert.equal(riskMetrics(annual, nonUniform, cash).sharpe, annualRisk.sharpe);
const flatAnnual = history(Array(252).fill(0.01));
assert.equal(riskMetrics(flatAnnual, annual, cash).sharpe, null);
assert.equal(riskMetrics(annual, flatAnnual, cash).downsideCapture, null);
const shortAnnual = history(annual.map((row, i) => i < 173 ? null : row.returns['1d']));
const shortRisk = riskMetrics(shortAnnual, annual, cash, true);
assert.equal(shortRisk.sampleSize, 79);
assert.equal(shortRisk.isPartial, true);
assert.ok(Number.isFinite(shortRisk.sharpe));
assert.equal(shortRisk.downsideCapture, 100);
assert.equal(riskMetrics(shortAnnual, annual, cash).sharpe, null);
const tooShort = history(annual.map((row, i) => i < 200 ? null : row.returns['1d']));
assert.equal(riskMetrics(tooShort, annual, cash, true).sharpe, null);
const gapAnnual = history(annual.map((row, i) => i === 210 ? null : row.returns['1d']));
assert.equal(riskMetrics(gapAnnual, annual, cash, true).sharpe, null);
assert.equal(riskMetrics(gapAnnual, annual, cash, true).downsideCapture, null);
assert.equal(riskMetrics(annual.slice(0, -1), annual, cash, true).sharpe, null);
assert.equal(riskMetrics(annual, gapAnnual, cash).downsideCapture, null);
assert.equal(riskMetrics(annual, gapAnnual, cash).sharpe, annualRisk.sharpe);
assert.equal(riskMetrics(annual, annual, undefined).sharpe, null);
assert.equal(riskMetrics(annual, annual, undefined).downsideCapture, 100);
assert.equal(riskMetrics([], [], cash, true).sharpe, null);
const sparseDown = history(annual.map((row, i) => i < 9 ? -1 : 1));
assert.equal(riskMetrics(annual, sparseDown, cash).downsideCapture, null);
const missingCash = {...cash, dailyReturnPct: cash.dailyReturnPct.map((value, i) => i === 100 ? null : value)};
assert.equal(riskMetrics(annual, annual, missingCash).sharpe, null);
assert.equal(riskMetrics(annual, annual, missingCash).downsideCapture, 100);
const left = history(values);
for (const sessions of [21, 42, 63, 126]) {
  const same = build(left, history(values.map(x => 3 * x + 1)), sessions);
  assert.ok(Math.abs(same.latest.correlation - 1) < 1e-12);
  assert.equal(same.latest.sampleSize, sessions);
  assert.equal(same.rolling.length, 151 - sessions);
  assert.ok(Math.abs(build(left, history(values.map(x => -x)), sessions).latest.correlation + 1) < 1e-12);
}
assert.equal(build(left, history(values.map(() => 1)), 21).latest.correlation, null);
assert.equal(build(left.slice(0, 20), left.slice(0, 20), 21).latest.correlation, null);
assert.equal(build([], [], 63).latest.sampleSize, 0);
const missing = history(values);
missing[149].returns['1d'] = null;
assert.equal(build(left, missing, 21).latest.sampleSize, 20);
assert.equal(build(left, missing, 21).latest.correlation, null);
assert.equal(build(left, left.slice(0, -1), 21).latest.correlation, null);
assert.equal(build(left, [...left].reverse(), 63).latest.correlation, 1);
assert.equal(build(history([0, ...values.slice(1, 21)]), history([0, ...values.slice(1, 21)]), 21).latest.sampleSize, 21);
const gap = history(values);
gap[80].returns['1d'] = NaN;
const rolling = build(left, gap, 21).rolling;
assert.equal(rolling.find(x => x.date === gap[80].date).correlation, null);
assert.equal(rolling.at(-1).correlation, 1);

const sessions = ['2026-10-02', '2026-10-05', '2026-10-06'];
const index = { dates: ['2026-10-01', ...sessions], values: [100, 102, 101, 103] };
const returns = indexHistory(index, sessions);
assert.ok(Math.abs(returns[0].returns['1d'] - 2) < 1e-10);
assert.ok(Math.abs(returns[2].returns['1d'] - (103 / 101 - 1) * 100) < 1e-10);
const missingIndex = indexHistory({ dates: ['2026-10-01', '2026-10-02', '2026-10-06'], values: [100, 102, 103] }, sessions);
assert.equal(missingIndex[1].returns['1d'], null);
assert.equal(missingIndex[2].returns['1d'], null);
assert.equal(indexHistory({ ...index, values: [100, 102, null, 103] }, sessions)[2].returns['1d'], null);
assert.ok(indexHistory(undefined, sessions).every(x => x.returns['1d'] === null));

const sectors = ['reference', 'positive', 'negative', 'missing', 'flat'].map(key => ({ key, label: key }));
const sectorHistory = {
  reference: left,
  positive: history(values.map(x => x * 2)),
  negative: history(values.map(x => -x)),
  missing: missing,
  flat: history(values.map(() => 0)),
};
const peer = { key: 'reference', kind: 'sector' };
const reference = peerHistory(peer, sectorHistory);
const ranked = rank(sectors, sectorHistory, peer, reference, 63);
assert.equal(ranked.length, 4);
assert.equal(ranked[0].key, 'positive');
assert.equal(ranked[1].key, 'negative');
assert.equal(ranked[1].correlation, -1);
assert.ok(ranked.slice(2).every(row => row.correlation === null));
assert.ok(ranked.every(row => row.date === left.at(-1).date));
const stalePeer = peerHistory(peer, { ...sectorHistory, reference: left.slice(0, -1) });
assert.equal(stalePeer.at(-1).returns['1d'], null);
assert.ok(rank(sectors, sectorHistory, peer, stalePeer, 63).every(row => row.correlation === null));

const stockList = stocks([{ items: [
  { ticker: 'NVDA', label: 'NVDA US', name: 'NVIDIA', currency: 'USD' },
  { ticker: '005930.KS' }, { ticker: '000660.KS' }, { ticker: 'DRAM' }, { ticker: 'IPO' },
] }, { items: [{ ticker: 'NVDA' }] }]);
assert.deepEqual(Array.from(stockList, row => row.key), ['DRAM', 'IPO', 'NVDA']);
const stockRows = stockHistory({ dates: left.map(row => row.date), returns: {
  NVDA: values, IPO: values.map((value, i) => i < 71 ? null : value),
} }, stockList);
assert.ok(stockRows.DRAM.every(row => row.returns['1d'] === null));
const short = build(stockRows.IPO, left, 63);
assert.equal(short.latest.correlation, 1);
assert.ok(short.rolling.filter(row => row.date < left[133].date).every(row => row.correlation === null));
assert.equal(short.rolling.find(row => row.date === left[133].date).correlation, 1);
assert.equal(build(stockRows.IPO, left, 126).latest.sampleSize, 79);
assert.equal(build(stockRows.IPO, left, 126).latest.correlation, null);
const partial = build(stockRows.IPO, left, 126, true);
assert.equal(partial.latest.correlation, 1);
assert.equal(partial.latest.sampleSize, 79);
assert.equal(partial.latest.isPartial, true);
assert.equal(partial.latest.start, left[71].date);
const partialEarly = build(stockRows.IPO, left, 21, true);
assert.ok(partialEarly.rolling.filter(row => row.date < left[80].date).every(row => row.correlation === null));
assert.equal(partialEarly.rolling.find(row => row.date === left[80].date).correlation, 1);
assert.equal(build(left, missing, 126, true).latest.correlation, null);
assert.equal(build(stockRows.IPO, missing, 126, true).latest.correlation, null);
const internalGap = stockRows.IPO.map(row => ({ ...row, returns: { ...row.returns } }));
internalGap[100].returns['1d'] = null;
assert.equal(build(internalGap, left, 126, true).latest.correlation, null);
assert.equal(build(stockRows.DRAM, left, 126, true).latest.correlation, null);
const stockRanking = rank(stockList, stockRows, peer, reference, 63);
assert.equal(stockRanking.length, 3);
assert.equal(stockRanking.at(-1).key, 'DRAM');
assert.ok(stockRanking.slice(0, 2).every(row => row.correlation === 1));
const partialRanking = rank(stockList, stockRows, peer, reference, 126, true);
assert.equal(partialRanking.find(row => row.key === 'IPO').correlation, partial.latest.correlation);
assert.equal(partialRanking.find(row => row.key === 'IPO').sampleSize, 79);

const actual = { window: {} };
for (const file of ['market-briefing-data.js', 'market-price-data.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data', file), 'utf8'), actual);
}
const briefing = actual.window.marketBriefingData.rotationSignal;
const memory = briefing.history.memory;
const actualStocks = stocks(actual.window.marketBriefingData.sectorPanels);
const actualStockRows = stockHistory(actual.window.marketBriefingData.stockCorrelation, actualStocks);
assert.ok(actualStocks.length > 200);
assert.equal(new Set(actualStocks.map(row => row.key)).size, actualStocks.length);
assert.ok(actualStocks.every(row => !row.key.endsWith('.KS')));
assert.equal(Object.keys(actual.window.marketBriefingData.stockCorrelation.returns).length, actualStocks.length);
for (const stock of actualStocks) {
  const result = build(actualStockRows[stock.key], memory, 21);
  assert.equal(result.latest.sampleSize, 21, stock.key);
  assert.ok(Number.isFinite(result.latest.correlation), stock.key);
}
for (const ticker of ['SPCX', 'XE']) {
  const available = actualStockRows[ticker].slice(-126).filter(row => Number.isFinite(row.returns['1d'])).length;
  const strict = build(actualStockRows[ticker], memory, 126).latest;
  assert.equal(Number.isFinite(strict.correlation), available === 126);
  const result = build(actualStockRows[ticker], memory, 126, true);
  assert.ok(Number.isFinite(result.latest.correlation));
  assert.equal(result.latest.isPartial, available < 126);
  assert.equal(result.latest.sampleSize, available);
}
for (const sector of briefing.sectors) {
  const result = build(memory, briefing.history[sector.key], 63);
  assert.equal(result.latest.sampleSize, 63, sector.key);
  assert.ok(Number.isFinite(result.latest.correlation), sector.key);
}
for (const key of ['dowjones', 'nasdaq', 'nasdaq100', 'sox', 'sp500', 'russell2000']) {
  const rows = indexHistory(actual.window.marketPriceData.items[key], memory.map(x => x.date));
  const result = build(memory, rows, 63);
  assert.equal(result.latest.sampleSize, 63, key);
  assert.ok(Number.isFinite(result.latest.correlation), key);
  const peer = { key, kind: 'index' };
  const reference = peerHistory(peer, briefing.history, actual.window.marketPriceData.items);
  const ranking = rank(briefing.sectors, briefing.history, peer, reference, 63);
  assert.equal(ranking.length, briefing.sectors.length);
  assert.equal(ranking.find(row => row.key === 'memory').correlation, result.latest.correlation);
  assert.ok(ranking.every((row, i) => i === 0 || ranking[i - 1].correlation >= row.correlation));
  console.log(`${key}: ${result.latest.correlation.toFixed(6)} (${result.latest.date})`);
}
const sox = peerHistory({ key: 'sox', kind: 'index' }, briefing.history, actual.window.marketPriceData.items);
const actualCash = actual.window.marketBriefingData.correlationRiskFree;
assert.equal(actualCash.dates.at(-1), memory.at(-1).date);
assert.equal(actualCash.dailyReturnPct.filter(Number.isFinite).length, 252);
for (const stock of actualStocks) {
  const risk = riskMetrics(actualStockRows[stock.key], sox, actualCash, true);
  assert.ok(Number.isFinite(risk.sharpe), stock.key);
  assert.ok(Number.isFinite(risk.downsideCapture), stock.key);
  const count = actualStockRows[stock.key].filter(row => Number.isFinite(row.returns['1d'])).length;
  assert.equal(risk.sampleSize, count);
  assert.equal(risk.isPartial, count < 252);
}
for (const sector of briefing.sectors) {
  const risk = riskMetrics(briefing.history[sector.key], sox, actualCash);
  assert.ok(Number.isFinite(risk.sharpe), sector.key);
  assert.ok(Number.isFinite(risk.downsideCapture), sector.key);
  assert.equal(risk.sampleSize, 252);
}
assert.equal(actual.window.marketPriceData.items.sox.symbol, '^SOX');
for (const sessions of [21, 42, 63, 126]) {
  assert.equal(build(memory, sox, sessions).latest.sampleSize, sessions);
  for (const ticker of ['NVDA', 'MU', 'SPCX']) {
    assert.ok(Number.isFinite(build(actualStockRows[ticker], sox, sessions, true).latest.correlation), `${ticker} vs SOX ${sessions}`);
  }
}
assert.ok(source.includes('{ key: "sox", label: "필라델피아 반도체(SOX)", symbol: "^SOX" }'));
assert.ok(source.indexOf('${rotationDistributionMarkup}') < source.indexOf('data-briefing-correlation></section>'));
assert.ok(source.includes('briefingRotationChartMode: "rotation"'));
assert.ok(source.includes('briefingCorrelationMode: "sector"'));
assert.ok(source.includes('briefingCorrelationPeer: "index:nasdaq100"'));
console.log(`Correlation: aligned dates, missing/short history, deduplicated ${actualStocks.length} US stocks, daily-only inputs, descending ranking, 35 sectors and 6 indexes passed.`);
