const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');
const data = { asOf: '2026-10-27', windowStart: '2026-10-21', totalTokens: 400,
  sourceUrl: 'https://openrouter.ai/rankings',
  companies: [
    {key: 'openai', label: 'OpenAI', tokens: 300, modelCount: 2, models: [
      {key: 'openai/test', label: 'GPT Test', tokens: 200},
      {key: 'openai/small', label: 'GPT Small', tokens: 100},
    ]},
    {key: 'anthropic', label: 'Anthropic', tokens: 100, modelCount: 1, models: [
      {key: 'anthropic/test', label: 'Claude Test', tokens: 100},
    ]},
  ],
  companyHistory: {dates: ['2026-10-19', '2026-10-26'], series: {openai: [200, 300], anthropic: [100, 100]}},
  modelHistory: {dates: ['2026-10-19', '2026-10-26'], series: {'openai/test': [null, 200]}},
};
const handlers = {};
const charts = [];
let renders = 0;
const context = vm.createContext({
  state: {openrouterUsageCompany: 'openai', openrouterUsageModel: 'all', openrouterUsageRange: '1y'},
  openrouterRankingsData: {weeklyUsage: data}, charts,
  escapeHtml: value => String(value).replaceAll('<', '&lt;'),
  usOverviewRoot: {
    querySelector: selector => ({addEventListener: (event, fn) => {handlers[selector] = fn;}}),
    querySelectorAll: () => [],
  },
  Chart: function(_, config) { this.config = config; },
  renderOpenrouterOverview: () => {renders++;},
});
for (const name of ['formatOpenrouterCount', 'getOpenrouterUsageSelection', 'getOpenrouterUsageHistory', 'renderOpenrouterUsageSection',
  'createOpenrouterUsageChart', 'bindOpenrouterUsageControls']) {
  const start = source.indexOf(`function ${name}(`);
  vm.runInContext(source.slice(start, source.indexOf('\nfunction ', start + 1)), context);
}
let html = context.renderOpenrouterUsageSection();
assert.ok(html.includes('전체 모델 합산'));
assert.ok(html.includes('75.00%'));
assert.ok(html.includes('GPT Small'));
context.createOpenrouterUsageChart();
assert.equal(charts[0].config.data.datasets[0].label, 'OpenAI');
assert.equal(charts[0].config.data.datasets[0].type, 'bar');
assert.equal(charts[0].config.data.datasets[1].type, 'line');
assert.equal(charts[0].config.data.datasets[1].yAxisID, 'yGrowth');
assert.equal(charts[0].config.options.scales.yGrowth.position, 'right');
assert.equal(JSON.stringify(charts[0].config.data.datasets[0].data), '[200,300]');
assert.equal(JSON.stringify(charts[0].config.data.datasets[1].data), '[null,null]');
context.state.openrouterUsageModel = 'openai/test';
context.createOpenrouterUsageChart();
assert.equal(JSON.stringify(charts[1].config.data.datasets[0].data), '[null,200]');
assert.equal(charts[1].config.data.datasets[1].spanGaps, false);
context.bindOpenrouterUsageControls();
handlers['#openrouter-usage-company']({target: {value: 'anthropic'}});
assert.equal(context.state.openrouterUsageCompany, 'anthropic');
assert.equal(context.state.openrouterUsageModel, 'all');
assert.equal(renders, 1);
context.state.openrouterUsageModel = 'invalid';
assert.equal(context.getOpenrouterUsageSelection().model, undefined);
assert.equal(context.state.openrouterUsageModel, 'all');
html = context.renderOpenrouterUsageSection();
assert.ok(html.includes('Claude Test'));
assert.ok(!html.includes('GPT Small'));
context.state.openrouterUsageCompany = 'openai-anthropic';
let combined = context.getOpenrouterUsageSelection();
assert.equal(combined.company.tokens, 400);
assert.equal(combined.company.modelCount, 3);
assert.equal(combined.company.models.length, 3);
assert.equal(data.companies.length, 2);
assert.equal(data.totalTokens, 400);
assert.equal(JSON.stringify(context.getOpenrouterUsageHistory(data, combined.company).values), '[300,400]');
html = context.renderOpenrouterUsageSection();
assert.ok(html.includes('100.00%'));
assert.ok(html.includes('Claude Test') && html.includes('GPT Small'));
assert.ok(html.includes('data-openrouter-company="openai-anthropic"'));
const dates = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26'];
const sample = {asOf: '2026-10-27', companyHistory: {dates, series: {
  openai: [100, 200, null, 300, 400], anthropic: [100, 50, 100, 100, 100],
}}};
let history = context.getOpenrouterUsageHistory(sample, combined.company);
assert.equal(JSON.stringify(history.values), '[200,250,null,400,500]');
assert.equal(JSON.stringify(history.growth), '[null,25,null,null,null]');
assert.equal(JSON.stringify(history.partial), '[false,false,false,false,true]');
sample.asOf = '2026-11-01';
history = context.getOpenrouterUsageHistory(sample, combined.company);
assert.equal(history.growth[4], 25);
sample.companyHistory.series.openai = [100, 0, 0, 300, 400];
history = context.getOpenrouterUsageHistory(sample, {key: 'openai'});
assert.equal(JSON.stringify(history.growth), '[null,-100,null,null,33.33333333333333]');
sample.companyHistory.dates = ['2026-09-28', '2026-10-12'];
assert.equal(context.getOpenrouterUsageHistory(sample, {key: 'openai'}).growth[1], null);
// Compute growth on full history before limiting the visible chart range.
data.asOf = '2026-11-15';
data.companyHistory.dates = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'];
data.companyHistory.series.openai = [100, 200, 300, 400, 500, 600];
context.state.openrouterUsageCompany = 'openai';
context.state.openrouterUsageRange = '1m';
context.createOpenrouterUsageChart();
const clipped = charts.at(-1).config;
assert.equal(clipped.data.labels.length, 5);
assert.equal(clipped.data.datasets[1].data[0], 100);
assert.ok(clipped.options.plugins.tooltip.callbacks.label({dataset: {yAxisID: 'yGrowth'}, parsed: {y: 25}}).includes('+25.00%'));
assert.ok(source.indexOf('${renderOpenrouterUsageSection()}') < source.indexOf('<h3>Top Models</h3>'));
console.log('OpenRouter combined companies, mixed charts, WoW, partial weeks, gaps and selection tests passed');
