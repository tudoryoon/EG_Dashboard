const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const data = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/market-macro-data.js'), 'utf8'), data);
let config;
const context = vm.createContext({
  marketMacroData: data.window.marketMacroData,
  state: {yieldDecompositionRange: '3y', yieldDecompositionMode: 'stacked'},
  charts: [], Date, console,
  Chart: class { constructor(canvas, options) { config = options; } },
});
for (const name of ['toDateKey', 'shiftDateByRange', 'getYieldDecompositionRows', 'buildYieldDecompositionPayload',
  'formatYieldCurveBp', 'renderYieldDecompositionPanel', 'createYieldDecompositionChart']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
const run = code => vm.runInContext(code, context);
const all = run('getYieldDecompositionRows()');
assert.ok(all.length > 10000);
assert.equal(all[0].date, '1983-01-03');
for (const row of all) {
  assert.ok(Math.abs(row.expectedReal + row.expectedInflation + row.termPremium - row.modelYield) < .00001, row.date);
  assert.ok(Math.abs(row.marketYield - row.modelYield - row.residualBp / 100) < .00001);
}
for (const range of ['1m', '3m', '6m', 'ytd', '1y', '3y', '5y', 'max']) {
  const area = run(`buildYieldDecompositionPayload('${range}', 'stacked')`);
  const lines = run(`buildYieldDecompositionPayload('${range}', 'lines')`);
  assert.ok(area.labels.length > 0, range);
  assert.equal(area.labels.at(-1), all.at(-1).date, 'Never extend monthly source to today');
  for (let i = 0; i < area.rows.length; i++) {
    assert.ok(Math.abs(area.datasets[2].data[i] - area.rows[i].modelYield) < .00001);
    for (let k = 0; k < 3; k++) assert.equal(area.datasets[k].rawValues[i], lines.datasets[k].data[i]);
  }
}
context.createYieldDecompositionChart({});
const payload = run(`buildYieldDecompositionPayload('3y')`);
const tooltip = config.options.plugins.tooltip.callbacks;
assert.ok(tooltip.label({dataset: payload.datasets[1], dataIndex: 0}).includes(payload.rows[0].expectedInflation.toFixed(3)));
assert.ok(tooltip.afterBody([{dataIndex: 0}])[1].includes('시장−모형'));
assert.equal(config.options.scales.y.min, undefined, 'Negative components must not be clipped');
const negative = {dates: ['2026-01-01'], series: {expectedReal: [-.5], expectedInflation: [2], realTermPremium: [-.2], inflationRiskPremium: [.1], marketYield: [1.45], modelYield: [1.4]}};
context.marketMacroData = {...context.marketMacroData, yieldDecomposition: negative};
const signed = run(`buildYieldDecompositionPayload('max', 'stacked')`);
assert.equal(signed.datasets[0].data[0], -.5);
assert.equal(signed.datasets[1].data[0], 1.5);
assert.equal(signed.datasets[2].data[0], 1.4);
negative.series.expectedReal[0] = null;
assert.equal(run('getYieldDecompositionRows().length'), 0);
assert.ok(run('renderYieldDecompositionPanel()').includes('아직 없습니다'));
context.marketMacroData = data.window.marketMacroData;
const html = run('renderYieldDecompositionPanel()');
assert.ok(html.includes('DKW_updates.csv') && html.includes('제로쿠폰') && html.includes('월간 공개'));
assert.ok(!html.includes('data-yield-component='), 'Stacked mode has no component toggles');
context.state.yieldDecompositionMode = 'lines';
context.state.yieldDecompositionHidden = ['expectedInflation', 'marketYield'];
const selectable = run('renderYieldDecompositionPanel()');
assert.equal((selectable.match(/data-yield-component=/g) || []).length, 4);
assert.equal((selectable.match(/ checked>/g) || []).length, 2);
for (const range of ['1m', '3y', 'max']) {
  const selected = run(`buildYieldDecompositionPayload('${range}', 'lines')`);
  assert.deepEqual(Array.from(selected.datasets, dataset => dataset.hidden), [false, true, false, true]);
  const stacked = run(`buildYieldDecompositionPayload('${range}', 'stacked')`);
  assert.ok(stacked.datasets.every(dataset => !dataset.hidden), 'Stacked sum always includes all components');
}
context.state.yieldDecompositionHidden = ['expectedReal', 'expectedInflation', 'termPremium', 'marketYield'];
assert.ok(run(`buildYieldDecompositionPayload('3y', 'lines').datasets.every(dataset => dataset.hidden)`));
context.createYieldDecompositionChart({});
assert.equal(config.options.plugins.tooltip.callbacks.afterBody([]).length, 0);
assert.ok(!source.includes('<h2>Market Relative Performance</h2>'));
assert.ok(source.indexOf('${renderYieldDecompositionPanel()}') > source.indexOf('<h3>US 30Y - 10Y Spread</h3>'));
console.log('DKW decomposition: full-history identity, signed areas, raw tooltip, all ranges, no extrapolation, empty state and placement PASS');
