const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const moves = [], scrolls = [];
const document = {activeElement: null};
let top = 180;
const box = {parentElement: null, getBoundingClientRect() {return {top};}};
const toolbarRow = {prepend(node) {assert.equal(node, box); box.parentElement = this; document.activeElement = null; moves.push('toolbar');}};
const slot = {appendChild(node) {assert.equal(node, box); box.parentElement = this; document.activeElement = null; moves.push('slot');}};
const input = {
  value: 'AAPL', selectionStart: 1, selectionEnd: 3, selectionDirection: 'backward',
  closest(selector) {assert.equal(selector, '.searchbox'); return box;},
  focus(options) {assert.equal(options.preventScroll, true); document.activeElement = this;},
  setSelectionRange(start, end, direction) {this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction;},
};
box.parentElement = toolbarRow;
const context = vm.createContext({searchInput: input, document, toolbarRow,
  window: {scrollX: 0, scrollY: 900, scrollTo(position) {scrolls.push(position);}},
  usOverviewRoot: {querySelector(selector) {assert.equal(selector, '[data-rs-search-slot]'); return slot;}},
});
const start = source.indexOf('function prepareMarketRsSearchBox(');
const end = source.indexOf('function render()', start);
vm.runInContext('let rsSearchFocusSnapshot = null;\n' + source.slice(start, end), context);
context.prepareMarketRsSearchBox();
context.mountMarketRsSearchBox();
assert.equal(box.parentElement, slot);
assert.deepEqual(moves, ['slot']);
assert.equal(document.activeElement, null, 'Do not steal focus on a normal render');
document.activeElement = input;
context.prepareMarketRsSearchBox();
assert.equal(box.parentElement, toolbarRow, 'Rescue input before clearing the old RS markup');
top = 140;
context.mountMarketRsSearchBox();
assert.equal(box.parentElement, slot);
assert.equal(document.activeElement, input);
assert.equal(input.value, 'AAPL');
assert.deepEqual([input.selectionStart, input.selectionEnd, input.selectionDirection], [1, 3, 'backward']);
assert.equal(scrolls[0].top, 860, 'Keep the input at the same viewport height when results shrink');
assert.equal(scrolls[0].behavior, 'instant');
document.activeElement = {};
context.prepareMarketRsSearchBox();
assert.equal(box.parentElement, toolbarRow, 'Other tabs retain the global search location');
const rs = source.slice(source.indexOf('function renderMarketRsOverview('), source.indexOf('function getVisibleTrendScoreRows('));
assert.ok(rs.indexOf('class="us-panel market-rs-leaders"') < rs.indexOf('data-rs-search-slot'));
assert.ok(rs.indexOf('data-rs-search-slot') < rs.indexOf('class="us-panel market-rs-detail"'));
assert.ok(rs.includes('mountMarketRsSearchBox();'));
const trendStart = source.indexOf('function renderMarketTrendScoreOverview(');
const trend = source.slice(trendStart, source.indexOf('\nfunction ', trendStart + 1));
assert.ok(trend.indexOf('class="us-panel market-rs-leaders"') < trend.indexOf('data-rs-search-slot'));
assert.ok(trend.indexOf('data-rs-search-slot') < trend.indexOf('class="us-panel market-rs-detail"'));
assert.ok(trend.includes('mountMarketRsSearchBox();'));
assert.ok(trend.includes('market-rs-screening-layout trend-score-layout'));
assert.ok(source.includes('["RS", "TrendScore"].includes(state.screeningView)'));
assert.ok(source.includes('(!showRsToolbar || inlineRsSearch)'));
console.log('RS search: one persistent input, Leaders/detail placement, caret/focus/scroll continuity and toolbar restoration passed.');
