const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const state = {memoryContractGuideOpen: false};
const runtime = {loaded: true};
const canvas = {};
let handler, chart = null, created = 0, resized = 0;
const rows = [{period: '1Q26'}];
const panel = {open: false, isConnected: true,
  querySelector(selector) {assert.equal(selector, '[data-memory-contract-guide="trendforce"]'); return canvas;},
  addEventListener(event, callback) {assert.equal(event, 'toggle'); handler = callback;},
};
const context = vm.createContext({state, memorySpotRuntime: runtime,
  usOverviewRoot: {querySelector(selector) {assert.equal(selector, '[data-memory-contract-panel]'); return panel;}},
  Chart: {getChart(node) {assert.equal(node, canvas); return chart;}},
  createMemoryContractGuideChart(node, data) {
    assert.equal(node, canvas); assert.equal(data, rows); created++;
    chart = {resize() {resized++;}};
  },
});
const start = source.indexOf('function bindMemoryContractGuideToggle(');
vm.runInContext(source.slice(start, source.indexOf('\nfunction ', start + 1)), context);
context.bindMemoryContractGuideToggle(rows);
assert.equal(created, 0, 'Do not create a chart while the panel is collapsed');
panel.open = true; handler();
assert.equal(state.memoryContractGuideOpen, true);
assert.equal(created, 1);
panel.open = false; handler();
assert.equal(state.memoryContractGuideOpen, false);
assert.equal(created, 1);
panel.open = true; handler();
assert.equal(created, 1, 'Reuse the existing chart when reopening');
assert.equal(resized, 1);
chart = null; runtime.loaded = false;
context.bindMemoryContractGuideToggle(rows);
assert.equal(created, 1, 'Wait for spot runtime to finish loading');
runtime.loaded = true;
context.bindMemoryContractGuideToggle(rows);
assert.equal(created, 2, 'An already-open panel draws after a loading render');
panel.isConnected = false; panel.open = false; handler();
assert.equal(state.memoryContractGuideOpen, true, 'Ignore delayed events from replaced markup');
assert.ok(source.includes('memoryContractGuideOpen: false'));
const markup = source.slice(source.indexOf('<details class="memory-panel memory-contract-panel"'), source.indexOf('<section class="memory-panel memory-spot-contract-panel"'));
assert.ok(markup.includes('${state.memoryContractGuideOpen ? "open" : ""}'));
for (const key of ['contractTableRows', 'hbmContractRows', 'monthlyWatchRows']) assert.ok(markup.includes(key));
assert.ok(markup.includes('</details>'));
assert.ok(!markup.includes('spotContractRows'), 'Keep the separate Spot/Contract check outside the fold');
console.log('Memory guide toggle: closed default, lazy chart, resize/reuse, loading state, stale events and folded source scope passed.');
