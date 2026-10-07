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
const history = (values) => values.map((value, i) => ({
  date: new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10),
  returns: { '1d': value },
  score: -999,
  excessReturns: { '1d': 999 },
}));
const values = Array.from({ length: 150 }, (_, i) => Math.sin(i) * 2 + (i % 7) / 10);
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

const actual = { window: {} };
for (const file of ['market-briefing-data.js', 'market-price-data.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(root, 'data', file), 'utf8'), actual);
}
const briefing = actual.window.marketBriefingData.rotationSignal;
const memory = briefing.history.memory;
for (const sector of briefing.sectors) {
  const result = build(memory, briefing.history[sector.key], 63);
  assert.equal(result.latest.sampleSize, 63, sector.key);
  assert.ok(Number.isFinite(result.latest.correlation), sector.key);
}
for (const key of ['dowjones', 'nasdaq', 'nasdaq100', 'sp500', 'russell2000']) {
  const rows = indexHistory(actual.window.marketPriceData.items[key], memory.map(x => x.date));
  const result = build(memory, rows, 63);
  assert.equal(result.latest.sampleSize, 63, key);
  assert.ok(Number.isFinite(result.latest.correlation), key);
  console.log(`${key}: ${result.latest.correlation.toFixed(6)} (${result.latest.date})`);
}
assert.ok(source.indexOf('${rotationDistributionMarkup}') < source.indexOf('data-briefing-correlation></section>'));
console.log('Sector correlation: dates, full windows, nulls, zero variance, daily-only data, missing index sessions, 35 sectors and 5 indexes passed.');
