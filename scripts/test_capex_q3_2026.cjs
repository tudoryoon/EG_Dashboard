const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
vm.runInContext(fs.readFileSync(path.join(root, 'data/capex-data.js'), 'utf8'), context);
const data = context.window.capexDashboardData;
const quarter = data.quarterLabels.indexOf('2026-Q3');
const value = (panel, key) => data[panel].series.find(series => series.key === key).values[quarter];
const oneDecimal = number => Number(number.toFixed(1));
assert.ok(quarter >= 0);
assert.equal(data.quarterLabels.filter(label => label === '2026-Q3').length, 1);
assert.equal(data.cashLabels[quarter], '2026-Q3');

// The user explicitly froze the annual outlook, including both 2026E vintages.
const annualSnapshot = JSON.stringify({ labels: data.annualLabels, panel: data.annualCapex });
assert.equal(createHash('sha256').update(annualSnapshot).digest('hex'),
  '63d6103084fd247e7af0d085dcacdcbb3454a69a9d05e51bba8815d956cab8b6');

for (const key of ['msft', 'googl']) {
  const source = data.quarterlySources[key]['2026-Q3'];
  const capex = source.capexIncludingFinanceLeases ?? source.purchasesOfPropertyAndEquipment;
  const priorCapex = source.priorYearCapexIncludingFinanceLeases ?? source.priorYearPurchasesOfPropertyAndEquipment;
  const cash = source.cashAndCashEquivalents + (source.shortTermInvestments ?? source.marketableSecurities);
  assert.equal(source.periodEnd, '2026-09-30');
  assert.equal(source.releaseDate, '2026-10-28');
  assert.equal(value('quarterlyCapex', key), capex / 1000);
  assert.equal(value('quarterlyOcf', key), source.operatingCashFlow / 1000);
  assert.equal(value('quarterlyFcf', key), source.reportedFreeCashFlow / 1000);
  assert.equal(source.reportedFreeCashFlow, source.operatingCashFlow - source.purchasesOfPropertyAndEquipment);
  assert.equal(value('quarterlyYoy', key), Math.round((capex / priorCapex - 1) * 100));
  assert.equal(value('quarterlyCapexToOcf', key), oneDecimal(capex / source.operatingCashFlow * 100));
  assert.equal(value('cashHistory', key), cash / 1000);
  assert.ok(data.quarterlyCapex.sourceNote.includes(source.slidesUrl ?? source.sourceUrl));
}
assert.equal(data.quarterlySources.msft['2026-Q3'].fiscalQuarter, 'FY2027 Q1');
assert.equal(value('quarterlyCapex', 'msft'), 45.2);
assert.equal(value('quarterlyFcf', 'msft'), 18.633);
assert.notEqual(value('quarterlyFcf', 'msft'), value('quarterlyOcf', 'msft') - value('quarterlyCapex', 'msft'));
assert.equal(value('quarterlyCapex', 'googl'), 51.355);
assert.equal(value('quarterlyFcf', 'googl'), -9.065);

for (const [key, panel] of Object.entries(data)) {
  if (!panel.series) continue;
  for (const series of panel.series) {
    assert.equal(series.values.length, key === 'annualCapex' ? data.annualLabels.length : data.quarterLabels.length,
      `${key}/${series.key}: quarter alignment`);
    assert.ok(series.values.every(item => item === null || Number.isFinite(item)));
    if (key !== 'annualCapex' && !['msft', 'googl'].includes(series.key)) {
      assert.equal(series.values[quarter], null, `${key}/${series.key}: not updated in this request`);
    }
  }
}

const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
vm.runInContext('const capexDashboardData = window.capexDashboardData;', context);
for (const name of ['isCapexEstimateLabel', 'sumTrailingWindow', 'buildTtmCapexToOcfPanel', 'buildAnnualBig5CapexPanel']) {
  const start = code.indexOf(`function ${name}(`);
  const end = code.indexOf('\nfunction ', start + 1);
  assert.ok(start >= 0);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
const ttm = vm.runInContext('buildTtmCapexToOcfPanel()', context);
assert.equal(ttm.series.find(series => series.key === 'msft').values[quarter], 79.4);
assert.equal(ttm.series.find(series => series.key === 'googl').values[quarter], 89.0);
assert.equal(ttm.series.find(series => series.key === 'meta').values[quarter], null);
const annual = vm.runInContext('buildAnnualBig5CapexPanel()', context);
assert.equal(annual.totals.at(-1), 747.5);
console.log('PASS: CY 3Q26 actuals, MSFT lease/cash distinction, FCF, ratios, alignment and frozen annual outlook.');
