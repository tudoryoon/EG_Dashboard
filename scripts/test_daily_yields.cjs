const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const data = {window: {}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/market-macro-data.js'), 'utf8'), data);
let config;
const context = vm.createContext({marketMacroData: data.window.marketMacroData,
  state: {dailyYieldRange: '3y', dailyYieldMode: 'stacked', dailyYieldHidden: [], acmYieldHidden: ['expectedRate', 'modelYield']},
  charts: [], Date, Chart: class {constructor(canvas, options) {config = options;}}});
for (const name of ['toDateKey', 'shiftDateByRange', 'buildDailyYieldPayload', 'renderDailyYieldPanels', 'createDailyYieldChart']) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
const run = code => vm.runInContext(code, context);
for (const range of ['1m', '3m', '6m', 'ytd', '1y', '3y', '5y', 'max']) {
  context.state.dailyYieldRange = range;
  for (const kind of ['daily', 'acm']) {
    const p = run(`buildDailyYieldPayload('${kind}')`);
    assert.ok(p.rows.length > 10);
    assert.equal(p.labels.at(-1), p.data.updatedAt, 'Do not extend to the other source date');
    for (const [i, row] of p.rows.entries()) {
      if (kind === 'daily') {
        assert.equal(p.datasets.length, 3, 'ACM must not be stacked on TIPS + BEI');
        assert.equal(p.datasets[1].data[i], row.real + row.bei);
        assert.ok(Math.abs(row.nominal - row.real - row.bei) < .025);
      } else assert.ok(Math.abs(row.termPremium + row.expectedRate - row.modelYield) < .00001);
    }
  }
}
const acm = run("buildDailyYieldPayload('acm')");
assert.deepEqual(Array.from(acm.datasets, d => d.hidden), [false, true, true]);
context.state.dailyYieldMode = 'lines';
context.state.dailyYieldHidden = ['real'];
const p = run("buildDailyYieldPayload('daily')");
assert.deepEqual(Array.from(p.datasets, d => d.hidden), [true, false, false]);
assert.equal(p.datasets[1].data[0], p.rows[0].bei);
context.createDailyYieldChart({dataset: {dailyYield: 'daily'}});
assert.ok(config.options.plugins.tooltip.callbacks.label({dataset: p.datasets[1], dataIndex: 0}).includes(p.rows[0].bei.toFixed(3)));
assert.equal(config.options.scales.y.min, undefined);
const html = run('renderDailyYieldPanels()');
assert.ok(html.includes('FRED') && html.includes('ACM Daily') && html.includes('다시 더하지'));
assert.equal((html.match(/data-daily-yield-component=/g) || []).length, 6);
context.marketMacroData = {dailyYieldDecomposition: {dates: ['2026-01-02'], series: {real: [-.5], bei: [2], nominal: [1.5]}}};
context.state.dailyYieldMode = 'stacked';
assert.equal(run("buildDailyYieldPayload('daily').datasets[0].data[0]"), -.5);
context.marketMacroData.dailyYieldDecomposition.series.real[0] = null;
assert.equal(run("buildDailyYieldPayload('daily').rows.length"), 0);
assert.ok(run('renderDailyYieldPanels()').includes('수신 대기'));
console.log('Daily yields: identities, independent dates, ranges, signed areas, toggles, tooltip and empty states PASS');
