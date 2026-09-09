const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const helper = source.slice(source.indexOf('function renderMarketRsSelectionPreservingScroll()'), source.indexOf('function renderMarketRsOverview()'));
const nodes = {
  '.market-rs-table-wrap': [{scrollLeft: 150, scrollTop: 600}],
  '.market-rs-new-high-list': [{scrollLeft: 0, scrollTop: 120}, {scrollLeft: 0, scrollTop: 90}],
  '.market-rs-period-list': [{scrollLeft: 0, scrollTop: 220}],
};
const before = structuredClone(nodes);
let renders = 0;
const context = {
  usOverviewRoot: {querySelectorAll: selector => nodes[selector]},
  window: {scrollX: 0, scrollY: 4500, scrollTo(position) {
    assert.deepEqual({...position}, {left: 0, top: 4500, behavior: 'instant'});
  }},
  render() {
    renders += 1;
    for (const selector of Object.keys(nodes)) {
      nodes[selector] = nodes[selector].map(() => ({scrollLeft: 0, scrollTop: 0}));
    }
  },
};
vm.runInNewContext(helper + '\nrenderMarketRsSelectionPreservingScroll();', context);
assert.equal(renders, 1);
assert.deepEqual(nodes, before);
assert.match(source, /state\.rsSelectedTicker = element\.dataset\.rsTicker;\s*renderMarketRsSelectionPreservingScroll\(\);/);
console.log('RS selection preserves page, table and monitor scroll positions.');
