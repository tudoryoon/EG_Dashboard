const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const context = vm.createContext({
  state: { marketVixFixedIncomeRange: '3y', marketVixFixedIncomeCustomStart: '', marketVixFixedIncomeCustomEnd: '' },
  getMarketVixSelectedWindow: (range, labels, fallback, start, end) => ({
    labels: labels.filter(date => (!start || date >= start) && (!end || date <= end)),
  }),
  formatKstDateTime: value => value || '',
  marketVixData: { fixedIncome: {
    move: { dates: ['2026-10-12', '2026-10-15', '2026-10-16'], values: [90, 91, 92], unit: 'index' },
    igSpread: { dates: ['2026-10-12', '2026-10-15'], values: [.83, .84], latestValue: .84,
      latestDate: '2026-10-15', fredId: 'BAMLC0A0CM', unit: '%', fetchStatus: 'ok' },
    hySpread: { dates: ['2026-10-12'], values: [3.11], fredId: 'BAMLH0A0HYM2', unit: '%' },
    cccSpread: { dates: [], values: [], latestValue: null, unit: '%', fetchStatus: 'error' },
  } },
});
for (const name of ['buildMarketVixFixedIncomePayload', 'formatFixedIncomeVixValue', 'renderVixCreditPanel']) {
  vm.runInContext(functionSource(name), context);
}
const original = JSON.stringify(context.marketVixData);
const ig = context.buildMarketVixFixedIncomePayload('igSpread', '3y');
assert.equal(ig.item.unit, 'bp');
assert.equal(JSON.stringify(ig.datasets[0].data), '[83,84,null]');
assert.equal(JSON.stringify(context.buildMarketVixFixedIncomePayload('hySpread', '3y').datasets[0].data), '[311,null,null]');
assert.equal(JSON.stringify(context.buildMarketVixFixedIncomePayload('move', '3y').datasets[0].data), '[90,91,92]');
assert.equal(context.formatFixedIncomeVixValue(null, 'bp'), '-');
assert.equal(context.formatFixedIncomeVixValue(1253, 'bp'), '1253bp');
const html = context.renderVixCreditPanel('igSpread');
assert.ok(html.includes('84bp') && html.includes('2026-10-15'));
assert.ok(html.includes('83bp ~ 84bp'));
assert.ok(html.includes('https://fred.stlouisfed.org/series/BAMLC0A0CM'));
const missing = context.renderVixCreditPanel('cccSpread');
assert.ok(!missing.includes('<canvas') && !missing.includes('0bp'));
context.state.marketVixFixedIncomeCustomStart = '2026-10-15';
context.state.marketVixFixedIncomeCustomEnd = '2026-10-15';
assert.equal(JSON.stringify(context.buildMarketVixFixedIncomePayload('igSpread', '3y').datasets[0].data), '[84]');
assert.equal(JSON.stringify(context.marketVixData), original);
const stored = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'data/market-vix-data.js'), 'utf8'), stored);
for (const key of ['igSpread', 'bbbSpread', 'hySpread', 'cccSpread']) {
  const item = stored.window.marketVixData.fixedIncome[key];
  assert.equal(item.unit, '%');
  assert.equal(item.dates.length, item.values.length);
  assert.ok(item.values.every(Number.isFinite));
}
console.log('VIX credit chart tests passed');
