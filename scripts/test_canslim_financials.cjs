const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const context = vm.createContext({});
function include(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  vm.runInContext(source.slice(start, end < 0 ? undefined : end), context);
}
['financialCurrencyPrefix', 'formatRsFinancialEps', 'formatRsFinancialPercent', 'canslimFiniteNumber',
 'buildCanslimC', 'buildAutoMarketCanslimProfile', 'buildCanslimA'].forEach(include);
context.item = { currency: 'EUR', quarters: [
  { periodEnd: '2026-06-30', revenueYoyPct: 20, epsDiluted: 1 },
  { periodEnd: '2026-03-31', revenueYoyPct: null, epsDiluted: 2 },
  { periodEnd: '2025-12-31', revenueYoyPct: null, epsDiluted: 3 },
  { periodEnd: '2025-09-30', revenueYoyPct: null, epsDiluted: 4 },
  { periodEnd: '2025-06-30', revenueYoyPct: null, epsDiluted: 100 },
] };
const run = code => vm.runInContext(code, context);
assert.match(run('buildAutoMarketCanslimProfile({}, item).annualNote'), /average revenue YoY 20.0%/);
assert.match(run('buildCanslimA({ generated: true }, item).summary'), /TTM EPS proxy EUR 10.00/);
assert.match(run('buildCanslimC({}, item).summary'), /EPS EUR 1.00/);
run('item.quarters[0].revenueYoyPct = null');
assert.equal(run('buildCanslimC({}, item).status'), 'pending');
assert.equal(run('buildCanslimA({ generated: true }, item).status'), 'pending');
run('item.quarters[0].revenueYoyPct = 20; item.quarters[1].epsDiluted = null');
assert.match(run('buildCanslimA({ generated: true }, item).summary'), /TTM EPS:/);
run('item.quarters[1].epsDiluted = 2; item.quarters[0].metricSources = { epsDiluted: "IR Non-GAAP" }');
assert.equal(run('buildCanslimA({ generated: true }, item).status'), 'pending');
console.log('CANSLIM: missing YoY excluded, native currency retained, four-quarter comparable TTM only.');
