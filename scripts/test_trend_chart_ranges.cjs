const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const start = source.indexOf("  const detailCanvas = usOverviewRoot.querySelector('[data-trend-score-chart=\"detail\"]');");
const end = source.indexOf('  if (detailCanvas && selected)', start);
assert.ok(start > 0 && end > start);
const buttons = ['1m', '3m', '6m', 'ytd', '1y', 'max'].map(key => ({
  dataset: {trendScoreHistoryRange: key}, attributes: {},
  classList: {toggle(name, active) {this[name] = active;}},
  setAttribute(name, value) {this.attributes[name] = value;},
  addEventListener(name, callback) {this[name] = callback;},
}));
const canvas = {};
const unrelated = {};
let destroyed = 0;
let current = {destroy() {destroyed += 1;}};
const registry = [unrelated, current];
const state = {trendScoreRange: 'max'};
const selected = {ticker:'NVDA'};
vm.runInNewContext('const charts = registry;\n' + source.slice(start, end), {
  registry, state, selected,
  Chart: {getChart: node => {assert.equal(node, canvas);return current;}},
  usOverviewRoot: {querySelector: () => canvas, querySelectorAll: () => buttons},
  createTrendScoreChart(node, row) {
    assert.equal(node, canvas);
    assert.equal(row, selected);
    current = {destroy() {destroyed += 1;}};
    registry.push(current);
  },
  render() {throw new Error('Changing chart range must not rebuild the page or reset scrolling.');},
});
for (const button of buttons) {
  button.click();
  assert.equal(state.trendScoreRange, button.dataset.trendScoreHistoryRange);
  assert.equal(button.attributes['aria-pressed'], 'true');
  assert.equal(buttons.filter(item => item.attributes['aria-pressed'] === 'true').length, 1);
  assert.equal(registry.length, 2);
  assert.equal(registry[0], unrelated);
  assert.equal(registry[1], current);
}
assert.equal(destroyed, buttons.length);
assert.match(source, /trendScoreRange: "max"/);
console.log('Trend chart ranges preserve the page and dispose only the previous chart.');
