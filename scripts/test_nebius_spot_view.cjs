const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'data/nebius-spot-data.js'), 'utf8'), context);
context.nebiusSpotData = context.window.nebiusSpotData;
context.state = {nebiusSpotRange:'max', nebiusSpotSeries:{}};
context.charts = [];
context.Chart = function(canvas, config) {this.config = config;};
context.usOverviewRoot = {querySelector: () => ({})};
context.buildMemoryChartPayload = (labels,datasets,range) => {
  assert.equal(range, context.state.nebiusSpotRange);
  return {labels,datasets};
};
for (const name of ['renderNebiusSpotPanel','createNebiusSpotChart']) {
  const start = source.indexOf(`function ${name}(`);
  vm.runInContext(source.slice(start, source.indexOf('\nfunction ', start + 1)), context);
}
const data = context.nebiusSpotData;
assert.equal(Object.keys(data.series).length, 5);
for (const item of Object.values(data.series)) {
  assert.equal(item.values.length, data.labels.length);
  const index = data.labels.indexOf(item.latestDate);
  assert.equal(item.values[index], item.latestValue);
  for (let i = 0; i < data.labels.length; i++) {
    const parts = item.regions.map(region => item.regionValues[region][i]);
    const expected = parts.every(value => typeof value === 'number') ? parts.reduce((sum,value) => sum+value,0)/parts.length : null;
    if (expected === null) assert.equal(item.values[i], null);
    else assert.ok(Math.abs(item.values[i]-expected) < 1e-7);
  }
}
context.createNebiusSpotChart();
let chart = context.charts.at(-1).config;
assert.equal(chart.data.datasets.length, 5);
assert.ok(chart.data.datasets.every(dataset => !dataset.hidden && !dataset.spanGaps && dataset.tension === 0));
assert.deepEqual(chart.data.labels, data.labels);
assert.equal(chart.options.scales.y.min, undefined, 'Keep selected GPU scales automatic');
context.state.nebiusSpotSeries.b300 = false;
context.createNebiusSpotChart();
chart = context.charts.at(-1).config;
assert.equal(chart.data.datasets[0].hidden, true);
assert.equal(chart.data.datasets[1].hidden, false);
const markup = context.renderNebiusSpotPanel();
assert.ok(markup.includes(data.source.docsUrl));
assert.ok(markup.includes('data-nebius-series="h100"'));
assert.ok(markup.includes('data-nebius-range="max"'));
assert.ok(markup.includes('aria-pressed="false"'));
console.log('Nebius chart: region averages, date alignment, all-GPU defaults, independent toggles, no interpolation, automatic scale and source links passed.');
