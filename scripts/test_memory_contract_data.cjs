const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync(path.join(root, 'data/memory-data.js'), 'utf8'), context);
const {trendforceContractGuide: guide, spotContractChecks: checks} = context.window.memoryData;
assert.equal(guide.updatedAt, '2026-11-13');
assert.equal(checks.updatedAt, guide.updatedAt);
const q3 = guide.quarterlyRows.find(row => row.period === '3Q26');
const q4 = guide.quarterlyRows.find(row => row.period === '4Q26E');
assert.equal(q3.date, '2026-09-30');
for (const [row, expected] of [[q3, [[13,18],[18,23],[8,13]]], [q4, [[10,15],[15,20],[15,20]]]]) {
  for (const [index, key] of ['dram','nand','blendedDram'].entries()) {
    assert.deepEqual([row[key].low, row[key].high], expected[index]);
  }
  assert.ok(row.basis.includes('\uC804\uB9DD'));
  assert.ok(row.sourceUrl.endsWith('20260930-13258.html'));
}
assert.ok(q4.secondarySourceUrl.endsWith('20261111-13303.html'));
assert.ok(guide.hbmContractRows.find(row => row.period.includes('2027')).range.includes('121% YoY'));
assert.ok(guide.monthlyRows.find(row => row.date === '2026-10-30').range.includes('0% MoM'));
assert.ok(guide.monthlyRows.find(row => row.date === '2026-11-11').sourceUrl.endsWith('20261111-13303.html'));

const rows = checks.rows;
for (const [key, price] of [['ddr4_16gb',52],['ddr4_8gb',26]]) {
  const row = rows.find(row => row.spotKey === key);
  assert.equal(row.contractPrice, price);
  assert.equal(row.contractDate, '2026-09-30');
  assert.equal(row.premiumPct, undefined, 'Do not retain obsolete, hard-coded premiums');
  assert.ok(row.contractSourceUrl.endsWith('/dram_contract'));
}
for (const [key, date, price] of [['ddr5_16gb','2026-05',37.5],['wafer_512gb_tlc','2026-04',24.9]]) {
  const row = rows.find(row => row.spotKey === key);
  assert.equal(row.contractDate, date, 'Do not relabel an old estimate as a current quote');
  assert.equal(row.contractPrice, price);
  assert.ok(row.contractBasis.includes('\uCD5C\uC2E0 \uD655\uC815 \uB2E8\uAC00 \uC544\uB2D8'));
}
for (const row of rows) {
  assert.ok(row.contractSourceTitle && row.contractBasis);
  assert.equal(new URL(row.contractSourceUrl).protocol, 'https:');
  assert.ok(row.contractDate <= checks.updatedAt);
}
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
const start = source.indexOf('function getMemorySpotCheckValues(');
const runtime = {items: {ddr4_16gb: {latestDate:'2026-11-13',latestValue:79.5}}};
const calculationContext = vm.createContext({memorySpotRuntime: runtime});
vm.runInContext(source.slice(start, source.indexOf('\nfunction ', start + 1)), calculationContext);
const check = calculationContext.getMemorySpotCheckValues(rows.find(row => row.spotKey === 'ddr4_16gb'));
assert.equal(check.spotDate, '2026-11-13');
assert.equal(check.spotPrice, 79.5);
assert.ok(Math.abs(check.premiumPct - ((79.5 / 52) - 1) * 100) < 1e-10);
assert.ok(source.includes('${row.contractBasis}'));
assert.ok(source.includes('${row.contractSourceUrl}'));
console.log('Memory contract data: verified September quotes, revised Q3/Q4 forecasts, HBM basis, dated legacy references and recalculated premiums passed.');
