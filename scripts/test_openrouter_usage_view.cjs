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
for (const name of ['formatOpenrouterCount', 'getOpenrouterUsageSelection', 'renderOpenrouterUsageSection',
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
assert.equal(JSON.stringify(charts[0].config.data.datasets[0].data), '[200,300]');
context.state.openrouterUsageModel = 'openai/test';
context.createOpenrouterUsageChart();
assert.equal(JSON.stringify(charts[1].config.data.datasets[0].data), '[null,200]');
assert.equal(charts[1].config.data.datasets[0].spanGaps, false);
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
assert.ok(source.indexOf('${renderOpenrouterUsageSection()}') < source.indexOf('<h3>Top Models</h3>'));
console.log('OpenRouter company/model aggregation, selection, gaps and layout tests passed');
