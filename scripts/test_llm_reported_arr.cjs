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
for (const [key, amount, reportedAt] of [
  ['openai', 30, '2026-10-08'],
  ['anthropic', 65, '2026-08-17'],
]) {
  const actual = data.revenue.series.find(s => s.key === key && s.mode === 'actual');
  assert.equal(actual.values[july], amount);
  const observation = actual.observations['2026-07'];
  assert.equal(observation.asOf, key === 'openai' ? null : '2026-07-31');
  assert.equal(observation.reportedAt, reportedAt);
  assert.equal(observation.status, 'reported');
  assert.equal(observation.qualifier, key === 'openai' ? 'approximately' : 'more-than');
  assert.ok(data.sources.some(s => s.url === observation.sourceUrl));
  assert.ok(actual.sourceLabels[july]);
  assert.ok(data.revenue.series.find(s => s.key === key && s.mode === 'tracking').values[july] > 0);
  const lastIndex = actual.values.findLastIndex(value => value != null);
  const snapshot = data.snapshots.find(s => s.tone === key && s.kind !== 'tracking');
  assert.ok(snapshot.value.startsWith(`$${actual.values[lastIndex]}B`));
}
const openai = data.revenue.series.find(s => s.key === 'openai' && s.mode === 'actual');
assert.equal(openai.values[data.revenue.labels.indexOf('2026-09')], 50);
assert.ok(openai.observations['2026-07'].revisions.some(r => r.value === 40));
assert.ok(data.arrRefresh.sources.some(s => s.key === 'epoch'));
assert.ok(data.arrRefresh.checkedAt);

vm.runInContext('const llmDashboardData = window.llmDashboardData;', context);
const code = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');
for (const name of ['createLlmRevenueChart']) {
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
  const isReported = dataset.mode === 'actual';
  assert.equal(callbacks.label(ctx).includes('초과'), isReported && dataset.label.startsWith('Anthropic'));
  assert.equal(dataset.borderDash.length > 0, !isReported);
  const source = callbacks.afterLabel(ctx);
  if (isReported) {
    assert.ok(source.some(s => s.includes('공식 공시 아님')));
    assert.ok(!source.some(s => String(s).includes('기준일: null')));
  }
  else assert.ok((Array.isArray(source) ? source.join(' ') : source).includes('TickerTrends'));
}
for (const field of ['scaleSpeed', 'openAiUsers', 'openAiAgentUsers', 'anthropicAdoption']) {
  assert.equal(data[field], undefined);
}
const render = code.slice(code.indexOf('function renderLlmOverview('), code.indexOf('function renderCloudOverview('));
assert.equal((render.match(/<canvas /g) || []).length, 1);
assert.ok(!render.includes('scale-speed'));
assert.ok(render.includes('최근 확인'));
console.log('PASS: reported ARR preserved, tracking separation, source dates and ARR-only UI.');
