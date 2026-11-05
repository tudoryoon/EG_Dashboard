const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
function functionSource(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0, name);
  const end = source.indexOf('\nfunction ', start + 1);
  return source.slice(start, end < 0 ? undefined : end);
}
const labels = ['2026-11-02', '2026-11-03', '2026-11-04'];
const moduleRow = day => ({Date: day, Product: 'DDR5 RDIMM 32GB 4800/5600',
  Canonical_Product: 'DDR5 RDIMM', Price_Average: '2165', Price_High: '2370', Price_Low: '2100', Change_Pct: '0'});
const rows = [moduleRow(labels[0]), moduleRow(labels[2]),
  {...moduleRow(labels[2]), Product: 'DDR5 RDIMM 64GB 4800/5600'},
  {...moduleRow(labels[2]), Price_Average: 'NaN'},
  {...moduleRow(labels[2]), Price_Low: '3000'},
  {Date: labels[2], Canonical_Product: 'DDR5 16Gb (2Gx8)', Price_Average: '61.333', Change_Pct: '-0.27'}];
const runtime = {loaded: false, loading: false};
let rendered = 0;
const context = vm.createContext({
  memorySpotRuntime: runtime, fetch: async () => ({ok:true, text:async () => 'fixture'}),
  parseCsvText: () => rows, createDateLabels: () => labels, formatDateKey: () => labels[2],
  render: () => rendered++,
});
vm.runInContext(functionSource('loadMemorySpotHistory'), context);
vm.runInContext(functionSource('buildMemorySpotSeriesDatasets'), context);
(async () => {
  await context.loadMemorySpotHistory();
  assert.equal(runtime.error, '');
  assert.equal(runtime.loaded, true);
  assert.equal(rendered, 1);
  const item = runtime.items.ddr5_rdimm_32gb;
  assert.deepEqual(Array.from(item.history), [2165, null, 2165]);
  assert.deepEqual(Array.from(item.highHistory), [2370, null, 2370]);
  assert.deepEqual(Array.from(item.lowHistory), [2100, null, 2100]);
  assert.equal(item.latestDate, labels[2]);
  assert.equal(item.dateBasis, 'sheet_collection_date');
  assert.equal(item.latestHigh, 2370);
  assert.equal(runtime.items.ddr5_16gb.latestValue, 61.333);
  const datasets = context.buildMemorySpotSeriesDatasets({format:'module_spot',color:'#2563eb'}, item);
  assert.deepEqual(Array.from(datasets, series => series.label), ['High','Average','Low']);
  assert.equal(datasets[1].tension, 0);
  const legacy = context.buildMemorySpotSeriesDatasets({label:'Chip',color:'#000'}, runtime.items.ddr5_16gb);
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].tension, 0.2);
  console.log('Memory spot browser fallback and dataset tests passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
