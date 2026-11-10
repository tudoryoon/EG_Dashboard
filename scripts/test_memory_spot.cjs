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
  state: {memorySpotSeries:{}},
  memorySpotRuntime: runtime, fetch: async () => ({ok:true, text:async () => 'fixture'}),
  parseCsvText: () => rows, createDateLabels: () => labels, formatDateKey: () => labels[2],
  render: () => rendered++,
});
vm.runInContext(functionSource('loadMemorySpotHistory'), context);
vm.runInContext(functionSource('buildMemorySpotSeriesDatasets'), context);
vm.runInContext(functionSource('buildMemoryPriceChanges'), context);
vm.runInContext(functionSource('syncMemoryChartLayout'), context);
vm.runInContext(functionSource('getMemorySpotRange'), context);
for(const key of ['series:ddr5_rdimm_32gb','series:ddr5_16gb','basket:dram']) {
  assert.equal(context.getMemorySpotRange(key), 'ytd');
}
context.state.memorySpotRanges = {'series:ddr5_rdimm_32gb':'3m'};
assert.equal(context.getMemorySpotRange('series:ddr5_rdimm_32gb'), '3m');
assert.equal(context.getMemorySpotRange('series:ddr5_16gb'), 'ytd');
for(const [priceVisible,changeVisible] of [[true,true],[false,true],[true,false],[false,false]]) {
  const visibility = [priceVisible,changeVisible];
  const chart = {data:{datasets:[{}, {isMemoryDailyChange:true}]},
    options:{scales:{y:{},yChange:{}}},isDatasetVisible:index => visibility[index]};
  context.syncMemoryChartLayout(chart);
  assert.equal(chart.options.scales.y.display, priceVisible);
  assert.equal(chart.options.scales.yChange.display, changeVisible);
  assert.equal(chart.options.scales.y.stackWeight, 1);
  assert.equal(chart.options.scales.yChange.stackWeight, 1);
  assert.equal(chart.options.scales.y.stack, priceVisible && changeVisible ? 'memory' : undefined);
  assert.equal(chart.options.scales.yChange.stack, priceVisible && changeVisible ? 'memory' : undefined);
}
assert.deepEqual(Array.from(context.buildMemoryPriceChanges([null,100,110,null,99,99])), [null,null,10,null,-10,0]);
assert.deepEqual(Array.from(context.buildMemoryPriceChanges([null,0,-2,NaN,Infinity,10,null,12])), [null,null,null,null,null,null,null,20]);
assert.deepEqual(Array.from(context.buildMemoryPriceChanges([])), []);
assert.deepEqual(Array.from(context.buildMemoryPriceChanges([100,100,null,120])).slice(3), [20]);
context.shiftDateByRange = () => labels[2];
vm.runInContext(functionSource('buildMemoryChartPayload'), context);
const sliced = context.buildMemoryChartPayload(labels,
  [{data:context.buildMemoryPriceChanges([100,110,121])}], '1m');
assert.deepEqual(Array.from(sliced.datasets[0].data), [10]);
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
  const metadata = {key:'ddr5_rdimm_32gb',format:'module_spot',color:'#2563eb'};
  const datasets = context.buildMemorySpotSeriesDatasets(metadata, item);
  assert.deepEqual(Array.from(datasets, series => series.label), ['High','Average','Low']);
  assert.equal(datasets[1].tension, 0);
  assert.ok(datasets.every(series => !series.hidden));
  context.state.memorySpotSeries.ddr5_rdimm_32gb = {high:false,low:false};
  const selected = context.buildMemorySpotSeriesDatasets(metadata, item);
  assert.deepEqual(Array.from(selected, series => series.hidden), [true,false,true]);
  context.state.memorySpotSeries.ddr5_rdimm_32gb.price = false;
  assert.ok(context.buildMemorySpotSeriesDatasets(metadata, item).every(series => series.hidden));
  context.state.memorySpotSeries.CHIP = {price:false};
  assert.equal(context.buildMemorySpotSeriesDatasets({key:'CHIP'}, runtime.items.ddr5_16gb)[0].hidden, true);
  const legacy = context.buildMemorySpotSeriesDatasets({label:'Chip',color:'#000'}, runtime.items.ddr5_16gb);
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].tension, 0.2);
  console.log('Memory spot browser fallback and dataset tests passed');
})().catch(error => {console.error(error); process.exitCode = 1;});
