const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const root = path.resolve(__dirname, '..');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(root, 'data/capex-data.js'), 'utf8'), context);
const data = context.window.capexDashboardData;
const {annualLabels, annualCapex, ...actuals} = data;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
assert.equal(hash(actuals), '12d4e17bd5dabbc5c77777f8d5ac95fdd8e6160b6dc059fae2ffaffe67c92849');
assert.equal(hash(annualCapex.series.map(s => ({key:s.key,values:s.values.slice(0,9)}))),
  '4114803ae59d11d4a99df6913077102be76817f7059af5f0adeaa6d2786b7b75');
assert.deepEqual(Array.from(annualLabels), ['2017','2018','2019','2020','2021','2022','2023','2024','2025','2026(E)']);
assert.equal(annualCapex.checkedAt, '2026-11-10');
const expected = {msft:170, googl:200, meta:140, amzn:220, orcl:null};
for(const series of annualCapex.series) {
  assert.equal(series.values.length, annualLabels.length);
  assert.equal(series.values.at(-1), expected[series.key]);
  if(series.key === 'orcl') continue;
  const guidance = annualCapex.guidance[series.key];
  assert.equal(guidance.period, 'CY2026');
  assert.equal(guidance.estimate, series.values.at(-1));
  assert.ok(annualCapex.sourceNote.includes(guidance.sourceUrl));
  assert.ok(guidance.releaseDate.startsWith('2026-10-'));
  if(guidance.low) assert.equal(guidance.estimate, (guidance.low + guidance.high) / 2);
}
assert.equal(annualCapex.guidance.msft.officialGuidance, 170);
assert.equal(annualCapex.guidance.msft.estimate, annualCapex.guidance.msft.officialGuidance);
assert.equal(annualCapex.guidance.msft.priorQ2OfficialGuidance, 175);
assert.equal(annualCapex.guidance.msft.priorDashboardEstimate, 190);
assert.deepEqual(Array.from(annualCapex.guidance.msft.revisions, row=>row.estimate), [190,175,170]);
assert.deepEqual(Array.from(annualCapex.guidance.msft.revisions, row=>row.releaseDate), ['2026-04-29','2026-07-29','2026-10-28']);
assert.match(annualCapex.guidance.msft.estimateMethod, /official/);
for(const revision of annualCapex.guidance.msft.revisions) assert.ok(annualCapex.sourceNote.includes(revision.sourceUrl));

const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
vm.runInContext('const capexDashboardData = window.capexDashboardData;', context);
for(const name of ['isCapexEstimateLabel','darkenCapexColor','thinCapexAnnualTicks','buildAnnualBig5CapexPanel']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
for(const label of ['2026(E)','2026E',['2026E','1Q26'],'2027(E)']) {
  assert.equal(context.isCapexEstimateLabel(label), true);
}
for(const label of ['2026','2026-Q3','2026 Earnings','']) {
  assert.equal(context.isCapexEstimateLabel(label), false);
}
assert.notEqual(context.darkenCapexColor('#2563eb'), '#2563eb');
const scale = {width:300,ticks:annualLabels.map((label,value)=>({label,value}))};
context.thinCapexAnnualTicks(scale);
assert.equal(scale.ticks[0].label, '2017');
assert.equal(scale.ticks.at(-1).label, '2026(E)');
assert.equal(scale.ticks.length, 4);
const panel = context.buildAnnualBig5CapexPanel();
assert.equal(panel.totals.at(-1), 730);
assert.equal(panel.totals.at(-2), 447.7);
const comparable2025 = 118 + 91.4 + 72.2 + 130.7;
assert.equal(panel.yoy.at(-1), Number(((730 / comparable2025 - 1) * 100).toFixed(1)));
assert.notEqual(panel.yoy.at(-1), Number(((730 / 447.7 - 1) * 100).toFixed(1)));
assert.equal(panel.yoy[0], null);
assert.doesNotMatch(code, /both 2026E vintages/);
console.log('PASS: single CY2026 estimate, official MSFT 190/175/170 revisions, comparable-company YoY and untouched actuals.');
