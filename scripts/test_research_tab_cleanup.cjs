const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const dashboard = fs.readFileSync(path.join(root, "dashboard.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const routeSource = dashboard.slice(
  dashboard.indexOf("const DASHBOARD_ROUTE_META ="),
  dashboard.indexOf("function handleDashboardRouteChange()"),
);
const context = vm.createContext({
  state: {},
  window: { location: { hash: "" } },
  isCompanyPilotTicker: () => false,
});
vm.runInContext(routeSource, context);

function resolve(hash) {
  context.hash = hash;
  return vm.runInContext("applyDashboardRouteFromHash(hash)", context);
}

assert.equal(resolve("#/research/power-infra"), "#/research/power-infra");
assert.equal(context.state.tab, "Research");
assert.equal(context.state.researchView, "PowerInfra");
assert.equal(resolve("#/tech/power-infra"), "#/research/power-infra");
assert.equal(resolve("#/research/market-regime"), "#/research/data-center");
assert.equal(resolve("#/research/trend-search"), "#/research/data-center");
assert.equal(resolve("#/tech/cloud"), "#/tech/cloud");

assert.doesNotMatch(dashboard, /MarketRegime|TrendSearch|data-study-market-regime/);
assert.match(dashboard, /state\.researchView === "PowerInfra"[\s\S]*?renderInfraOverview\(\)/);
assert.doesNotMatch(html, /trend-search-(?:config|data)\.js/);

const workflow = fs.readFileSync(
  path.join(root, ".github", "workflows", "update-openrouter-rankings.yml"),
  "utf8",
);
assert.doesNotMatch(workflow, /pytrends|update_trend_search|trend-search-data/);
assert.match(workflow, /update_study_calendar\.py/);
console.log("Research tab cleanup and Power Infra routes passed.");
