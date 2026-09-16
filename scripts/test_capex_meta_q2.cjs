const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'data/capex-data.js'), 'utf8'), context);
const data = context.window.capexDashboardData;
const index = data.quarterLabels.indexOf('2026-Q2');
assert.ok(index >= 0);
const value = key => data[key].series.find(series => series.key === 'meta').values[index];
const source = data.quarterlySources.meta['2026-Q2'];
const capex = source.purchasesOfPropertyAndEquipment + source.financeLeasePrincipalPayments;
const priorCapex = source.priorYearPurchasesOfPropertyAndEquipment + source.priorYearFinanceLeasePrincipalPayments;
const cash = source.cashAndCashEquivalents + source.marketableSecurities;

assert.equal(capex, 31078);
assert.equal(source.operatingCashFlow, 31862);
assert.equal(source.reportedFreeCashFlow, 784);
assert.equal(value('quarterlyCapex'), capex / 1000);
assert.equal(value('quarterlyOcf'), source.operatingCashFlow / 1000);
assert.equal(value('quarterlyFcf'), (source.operatingCashFlow - capex) / 1000);
assert.equal(value('quarterlyFcf'), source.reportedFreeCashFlow / 1000);
assert.equal(value('quarterlyYoy'), Math.round((capex / priorCapex - 1) * 100));
assert.equal(value('quarterlyCapexToOcf'), Number((capex / source.operatingCashFlow * 100).toFixed(1)));
assert.equal(value('cashHistory'), cash / 1000);
assert.equal(value('debtHistory'), source.debt / 1000);
assert.equal(value('debtToCash'), Number((source.debt / cash * 100).toFixed(1)));
assert.equal(data.cashLabels[index], '2026-Q2');
assert.ok(data.quarterlyFcf.sourceNote.includes(source.sourceUrl));
for (const [key, panel] of Object.entries(data)) {
  if (!panel.series) continue;
  const expectedLength = key === 'annualCapex' ? data.annualLabels.length : data.quarterLabels.length;
  for (const series of panel.series) {
    assert.equal(series.values.length, expectedLength, `${key}/${series.key} alignment`);
    assert.ok(series.values.every(v => v === null || Number.isFinite(v)), `${key}/${series.key} values`);
  }
}

const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
vm.runInContext('const capexDashboardData = window.capexDashboardData;', context);
for (const name of ['sumTrailingWindow', 'buildTtmCapexToOcfPanel']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
const ttm = vm.runInContext('buildTtmCapexToOcfPanel()', context);
const sum4 = key => data[key].series.find(s => s.key === 'meta').values.slice(index - 3, index + 1).reduce((a, b) => a + b, 0);
assert.equal(ttm.series.find(s => s.key === 'meta').values[index], Number((sum4('quarterlyCapex') / sum4('quarterlyOcf') * 100).toFixed(1)));
console.log('PASS: META Q2 2026 official cash flow, lease principal, ratios, chart alignment and TTM.');
