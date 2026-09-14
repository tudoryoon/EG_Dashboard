const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const routeSource = source.slice(source.indexOf('const DASHBOARD_ROUTE_META ='), source.indexOf('function handleDashboardRouteChange()'));
const context = vm.createContext({state: {}, window: {location: {hash: ''}}, isCompanyPilotTicker: () => false});
vm.runInContext(routeSource, context);
assert.equal(vm.runInContext('applyDashboardRouteFromHash("#/trade-data")', context), '#/trade-data');
assert.equal(context.state.tab, 'TradeData');
assert.equal(vm.runInContext('buildDashboardRouteHash()', context), '#/trade-data');

// Existing destinations must round-trip without being redirected to the new tab.
const routes = vm.runInContext(`Object.values(DASHBOARD_ROUTE_META).flatMap(route => {
  if (!route.views) return ['#/' + route.slug];
  return Object.entries(route.views).flatMap(([key, slug]) => {
    const base = '#/' + route.slug + '/' + slug;
    return route.nestedViews?.[key]
      ? Object.values(route.nestedViews[key].views).map(nested => base + '/' + nested)
      : [base];
  });
})`, context);
for (const route of routes) {
  context.testHash = route;
  assert.equal(vm.runInContext('applyDashboardRouteFromHash(testHash)', context), route);
}
assert.equal(vm.runInContext('applyDashboardRouteFromHash("#/screening")', context), '#/screening/rs');

const renderer = source.slice(source.indexOf('function renderTradeDataOverview()'), source.indexOf('function renderStudyBriefingPrintOverview()'));
const changes = [];
const usOverviewRoot = {innerHTML: '', classList: {remove: value => changes.push(['overview', value])}};
const companyGrid = {innerHTML: 'old data', classList: {add: value => changes.push(['companies', value])}};
vm.runInNewContext(renderer + '\nrenderTradeDataOverview();', {usOverviewRoot, companyGrid});
assert.equal(companyGrid.innerHTML, '');
assert.deepEqual(changes, [['overview', 'hidden'], ['companies', 'hidden']]);
assert.match(usOverviewRoot.innerHTML, /id="trade-data-title"/);
assert.match(usOverviewRoot.innerHTML, /role="status"/);
assert.doesNotMatch(usOverviewRoot.innerHTML, /<canvas|<table|<iframe/);
assert.doesNotMatch(renderer, /fetch\(|new Chart|ensure.*Loaded/);
assert.match(source, /TradeData: \{ label: "\uC218\uCD9C\uC785\uB370\uC774\uD130" \}/);
assert.match(source, /state\.tab === "TradeData"[\s\S]*?renderSummary\(\[\]\);\s*renderTradeDataOverview\(\);\s*return;/);
console.log(`Trade tab is an empty standalone route; ${routes.length} dashboard routes preserved.`);
