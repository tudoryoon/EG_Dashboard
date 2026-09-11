const assert = require('node:assert/strict');
const {test} = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {validateModel, readManifest, existingReport} = require('./export.cjs');
const build = () => ({briefingDate: '2026-09-11', rsDate: '2026-09-11', missing: 0,
  indices: Array.from({length: 6}, () => ({asOf: '2026-09-11', price: 100})),
  sectors: [{label: 'Example', week: 2, month: 3}],
  rows: Array.from({length: 10}, (_, i) => ({ticker: `TEST${i}`, marketCap: 20e9, week: i, month: 10 - i}))});

test('weekly validation accepts matching Friday data', () => {
  assert.equal(validateModel(build(), {sessionDate: '2026-09-11'}).week.length, 10);
});
test('stale, mixed, missing, and invalid index data fail closed', () => {
  assert.throws(() => validateModel(build(), {sessionDate: '2026-09-18'}), /stale/);
  assert.throws(() => validateModel({...build(), rsDate: '2026-09-10'}, null, true), /Mixed/);
  assert.throws(() => validateModel({...build(), missing: 1}, null, true), /lack current/);
  const broken = build(); broken.indices[0].asOf = '2026-09-10';
  assert.throws(() => validateModel(broken, null, true), /Index dates/);
});
test('sample mode never bypasses consistency checks', () => {
  assert.equal(validateModel(build(), null, true).month.length, 10);
  const broken = build(); broken.sectors[0].month = null;
  assert.throws(() => validateModel(broken, null, true), /Sector/);
});
test('archive manifests reject unsafe dates and incomplete files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eg-archive-test-'));
  try {
    assert.deepEqual(readManifest(dir), {version: 1, reports: []});
    assert.equal(existingReport(dir, {reports: []}, '2026-09-11'), null);
    assert.throws(() => existingReport(dir, {reports: [{date: '2026-09-11'}]}, '2026-09-11'), /integrity/);
    fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify({version: 1, reports: [{date: '../unsafe'}]}));
    assert.throws(() => readManifest(dir), /Invalid archive/);
  } finally {
    fs.unlinkSync(path.join(dir, 'index.json'));
    fs.rmdirSync(dir);
  }
});
