const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { defaults, calculate } = require('../study/muse-ai/model.js');
const near = (a, b) => assert(Math.abs(a - b) <= Math.max(1, Math.abs(b)) * 1e-10, `${a} != ${b}`);
const base = calculate();
near(base.gpuYear, 201101928374.65564);
assert.equal(base.binding.key, 'ram');
assert.equal(base.density, 1278);
near(base.gpuYear, base.gpuYearByFleet);
near(base.total, base.gpuYear + base.cpuYear);
near(base.preserveMargin, base.perUser / (1 - base.margin));
near(calculate({ prefill: 0 }).total, base.total);
near(calculate({ prefill: 100 }).total, base.total);
near(calculate({ tco: 3.46 }).gpuYear, base.gpuYear);
near(calculate({ tco: 3.46 }).gpus, base.gpus / 2);
near(calculate({ util: 30 }).gpuYear, base.gpuYear * 2);
assert.equal(calculate({ oram: 1 }).density, 750);
assert.equal(calculate({ oram: 1 }).binding.key, 'gram');
assert.equal(calculate({ dau: 0 }).perUser, 0);
assert.equal(calculate({ dau: 0 }).total, defaults.stor * 1e6);
assert.equal(calculate({ exp: 0 }).preserveMargin, null);
assert.throws(() => calculate({ tco: 0 }), RangeError);
assert.throws(() => calculate({ tpd: NaN }), RangeError);
assert.throws(() => calculate({ util: 101 }), RangeError);
assert.throws(() => calculate({ dau: -1 }), RangeError);

const dashboard = fs.readFileSync(path.join(__dirname, '../dashboard.js'), 'utf8');
assert(dashboard.includes('MuseAI: { label: "Muse AI 스터디" }'));
assert(dashboard.includes('MuseAI: "muse-ai"'));
assert(dashboard.includes('renderStudyMuseAIOverview();'));
console.log('PASS: baseline, cost identities, presets, boundary inputs and Research route');

// Optional parity check against the downloaded public page; no upstream source is shipped.
if (process.argv[2]) {
  const html = fs.readFileSync(process.argv[2], 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const DEF='));
  assert(script, 'Upstream calculator script not found');
  const marker = '// KPIs';
  assert(script.includes(marker));
  const oracle = script.replace(marker, `globalThis.captured = {gpuYear,gpus,gpuGW,perGW,vmMin,avgVM,peakVM,slots,dens,servers,cores,cpuYear,cpuGW,total,gw,perUser,gpuU,cpuU,prof,m,beExtra,mgExtra}; ${marker}`);
  const scenarios = [{}, ...[191, 121, 60, 33].map(tpd => ({ tpd })), { dau: 0 }, { tok: 0 }, { oram: 1 }, { prefill: 0 }, { tco: 3.46 }, { rev: 0 }, { exp: 0 }, { mins: 40, vcpu: 4, cdram: 3, util: 45 }, { maxcpu: 1 }, { cnvme: .001 }];
  const mapping = { vmMin: 'vmMinutes', dens: 'density', prof: 'profit', m: 'margin', beExtra: 'preserveProfit', mgExtra: 'preserveMargin' };
  for (const input of scenarios) {
    const nodes = new Map();
    const getNode = id => {
      if (!nodes.has(id)) nodes.set(id, { value: '', textContent: '', innerHTML: '', outerHTML: '', addEventListener() {} });
      return nodes.get(id);
    };
    const context = { document: { getElementById: getNode }, localStorage: { getItem: () => JSON.stringify(input), setItem() {} } };
    vm.runInNewContext(oracle, context, { timeout: 3000 });
    if (!Object.keys(input).length) {
      for (const [key, value] of Object.entries(defaults)) assert.equal(String(getNode(key).value), String(value), key);
    }
    const ours = calculate(input);
    for (const [key, expected] of Object.entries(context.captured)) {
      const actual = ours[mapping[key] || key];
      if (!Number.isFinite(expected)) assert.equal(actual, null);
      else near(actual, expected);
    }
  }
  console.log(`PASS: ${scenarios.length} upstream scenarios, 22 metrics each, all default inputs`);
}
