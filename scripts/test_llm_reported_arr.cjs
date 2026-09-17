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
vm.runInContext(fs.readFileSync(path.join(root, 'data/llm-data.js'), 'utf8'), context);
const data = context.window.llmDashboardData;
const july = data.revenue.labels.indexOf('2026-07');
assert.ok(july >= 0);
for (const series of data.revenue.series) {
  assert.equal(series.values.length, data.revenue.labels.length);
  assert.equal(series.sourceLabels.length, data.revenue.labels.length);
}
for (const [key, amount, reportedAt, tracking] of [
  ['openai', 40, '2026-08-13', 41.3],
  ['anthropic', 65, '2026-08-17', 74.1],
]) {
  const actual = data.revenue.series.find(s => s.key === key && s.mode === 'actual');
  assert.equal(actual.values[july], amount);
  const observation = actual.observations['2026-07'];
  assert.equal(observation.asOf, '2026-07-31');
  assert.equal(observation.reportedAt, reportedAt);
  assert.equal(observation.status, 'reported');
  assert.equal(observation.qualifier, 'more-than');
  assert.ok(data.sources.some(s => s.url === observation.sourceUrl));
  assert.ok(actual.sourceLabels[july].includes(amount.toString()));
  assert.equal(data.revenue.series.find(s => s.key === key && s.mode === 'tracking').values[july], tracking);
  assert.equal(data.snapshots.find(s => s.tone === key).value, `$${amount}B+`);
  const company = data.scaleSpeed.companies.find(c => c.name.toLowerCase() === key);
  assert.equal(company.latest.amount, amount);
  assert.equal(company.latest.status, 'reported');
  assert.equal(company.latest.qualifier, 'more-than');
  const years = (Date.parse(company.latest.date) - Date.parse(company.startDate)) / (365.25 * 86400000);
  assert.equal(company.latest.years, Number(years.toFixed(2)));
}

vm.runInContext('const llmDashboardData = window.llmDashboardData;', context);
const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
for (const name of ['createLlmRevenueChart', 'createLlmScaleSpeedChart']) {
  const start = code.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const end = code.indexOf('\nfunction ', start + 1);
  vm.runInContext(code.slice(start, end < 0 ? undefined : end), context);
  vm.runInContext(`${name}({});`, context);
}
const revenue = charts[0];
for (const dataset of revenue.data.datasets) {
  const ctx = { dataset, dataIndex: july, parsed: { y: dataset.data[july] } };
  const callbacks = revenue.options.plugins.tooltip.callbacks;
  const isReported = !!dataset.observations;
  assert.equal(callbacks.label(ctx).includes('초과'), isReported);
  assert.equal(dataset.borderDash.length > 0, !isReported);
  const source = callbacks.afterLabel(ctx);
  if (isReported) assert.ok(source.some(s => s.includes('공식 공시 아님')));
  else assert.ok(source.includes('TickerTrends'));
}
for (const dataset of charts[1].data.datasets.filter(d => d.company.latest)) {
  const ctx = { dataset, raw: dataset.data.find(p => p.kind === 'latest') };
  assert.ok(charts[1].options.plugins.tooltip.callbacks.label(ctx).includes('보도값'));
  assert.ok(charts[1].options.plugins.tooltip.callbacks.afterLabel(ctx).some(s => s.includes('공식 공시 아님')));
}
assert.equal(data.openAiAgentUsers.values.at(-1), 10, 'Do not add unverified 25M to WAU');
console.log('PASS: reported ARR, estimate separation, dates, source links, scale-speed and chart tooltips.');
