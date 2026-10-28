const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const charts = [];
const context = vm.createContext({
  window: {}, charts,
  Chart: function (_canvas, config) { Object.assign(this, config); },
});
vm.runInContext(fs.readFileSync(path.join(root, 'data/cloud-data.js'), 'utf8'), context);
vm.runInContext('const cloudDashboardData = window.cloudDashboardData;', context);
const data = context.window.cloudDashboardData;
const series = (panel, key) => data[panel].series.find(item => item.key === key);
const quarter = data.labels.indexOf('2026 Q3');
const azureStart = data.labels.indexOf('2024 Q3');
const round = value => Math.round(value * 100) / 100;

assert.equal(data.labels.filter(label => label === '2026 Q3').length, 1);
assert.equal(data.latestEarnings.calendarQuarter, '2026 Q3');
assert.equal(data.latestEarnings.microsoftFiscalQuarter, 'FY2027 Q1');
assert.equal(data.latestEarnings.periodEnd, '2026-09-30');
assert.equal(data.latestEarnings.releaseDate, '2026-10-28');
assert.ok(data.latestEarnings.sourceLinks.some(source => source.url.includes('FY27ExternalKPIs')));
assert.ok(data.latestEarnings.sourceLinks.some(source => source.url.includes('googexhibit991q32026')));

for (const panel of ['yoyGrowth', 'margin', 'revenue', 'rpo', 'netNewArr']) {
  for (const item of data[panel].series) {
    assert.equal(item.values.length, data.labels.length, `${panel}/${item.key}: CY alignment`);
    assert.ok(data.colors[item.key], `${panel}/${item.key}: color`);
    assert.ok(item.values.every(value => value === null || Number.isFinite(value)));
    if (item.arrValues) assert.equal(item.arrValues.length, data.labels.length);
  }
  assert.equal(series(panel, 'amazon').values[quarter], null, `${panel}: AWS not yet reported`);
}
assert.equal(series('netNewArr', 'amazon').arrValues[quarter], null);
assert.equal(series('yoyGrowth', 'microsoft').values[quarter - 1], 42);
assert.equal(series('yoyGrowth', 'microsoft').values[quarter], 48);
assert.equal(series('rpo', 'microsoft').values[quarter], 677);
assert.equal(series('margin', 'microsoft').values[quarter], null);
assert.equal(series('rpo', 'google').values[quarter], null);
assert.equal(series('rpo', 'google').values[quarter - 1], 514);
assert.equal(series('revenue', 'google').values[quarter], 30709);
assert.equal(series('yoyGrowth', 'google').values[quarter], round((30709 / 15157 - 1) * 100));
assert.equal(series('margin', 'google').values[quarter], round(11121 / 30709 * 100));

assert.deepEqual(Array.from(series('revenue', 'microsoft').values.slice(azureStart, quarter + 1)),
  [16021, 17337, 18540, 20712, 22384, 24129, 26008, 29417, 33165]);
assert.equal(series('revenue', 'microsoftLegacy').values[quarter - 1], 39306);
assert.equal(series('revenue', 'microsoftLegacy').values[quarter], null);
assert.equal(series('revenue', 'microsoftLegacy').hidden, true);
for (const key of ['amazon', 'microsoft', 'google']) {
  const revenue = series('revenue', key).values;
  const arr = series('netNewArr', key);
  for (let i = key === 'microsoft' ? azureStart : 1; i <= quarter; i += 1) {
    assert.equal(arr.arrValues[i], revenue[i] === null ? null : revenue[i] * 4, `${key}: ARR ${i}`);
    const expected = Number.isFinite(revenue[i]) && Number.isFinite(revenue[i - 1])
      ? (revenue[i] - revenue[i - 1]) * 4 : null;
    assert.equal(arr.values[i], expected, `${key}: Net New ARR ${i}`);
  }
}
assert.equal(series('netNewArr', 'microsoft').arrValues[quarter], 132660);
assert.equal(series('netNewArr', 'microsoft').values[quarter], 14992);
assert.equal(series('netNewArr', 'google').arrValues[quarter], 122836);
assert.equal(series('netNewArr', 'google').values[quarter], 23764);

const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
for (const name of ['cloudQuarterTickLabel', 'createCloudRevenueBarChart', 'createCloudLineChart', 'createCloudNetNewArrChart',
  'buildCloudRpoRevenueRatioPanel', 'buildCloudRpoStatsMarkup']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
}
vm.runInContext('createCloudRevenueBarChart({}, cloudDashboardData.revenue);', context);
assert.equal(charts[0].data.datasets.find(item => item.label.includes('구 부문')).hidden, true);
assert.equal(charts[0].data.datasets.find(item => item.label.startsWith('Azure')).data[quarter], 33165);
vm.runInContext('createCloudLineChart({}, cloudDashboardData.yoyGrowth, String, 0);', context);
assert.ok(charts[1].options.scales.y.max > 102.61);
assert.equal(charts[1].options.scales.x.ticks.callback(null, quarter), '2026 Q3');
for (const width of [330, 1358]) {
  const ticks = data.labels.map((_, index) => context.cloudQuarterTickLabel(index, data.labels, width));
  assert.equal(ticks[0], '2022 Q1');
  assert.equal(ticks[quarter], '2026 Q3');
  assert.ok(ticks.filter(Boolean).length <= Math.floor(width / 100));
}
vm.runInContext('createCloudNetNewArrChart({}, cloudDashboardData.netNewArr.series[1]);', context);
assert.equal(charts[2].data.datasets[0].data[quarter], 14992);
assert.equal(charts[2].data.datasets[1].data[quarter], 132660);
assert.ok(charts[2].data.datasets[1].borderDash.length);
const ratio = vm.runInContext('buildCloudRpoRevenueRatioPanel()', context);
assert.equal(ratio.series.find(item => item.key === 'microsoft').values[quarter], Math.round(677 / 33.165 * 10) / 10);
assert.equal(ratio.series.find(item => item.key === 'microsoft').values[azureStart - 1], null);
assert.equal(ratio.series.find(item => item.key === 'google').values[quarter], null);
const stats = vm.runInContext('buildCloudRpoStatsMarkup(cloudDashboardData.rpo)', context);
assert.match(stats, /2026 Q2/);
assert.match(stats, /2026 Q3/);
assert.doesNotMatch(stats, /NaN|undefined/);
console.log('PASS: CY 3Q26 earnings, Azure recast, ARR math, missing disclosures and chart datasets.');
