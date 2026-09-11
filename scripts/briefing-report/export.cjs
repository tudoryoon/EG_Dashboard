const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {parseArgs} = require('node:util');
const reportModel = require('../../study/briefing-report/model.js');
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_ARCHIVE = path.join(ROOT, 'study/briefing-report/archive');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function loadData(name, variable, root = ROOT) {
  const source = fs.readFileSync(path.join(root, 'data', name), 'utf8').trim();
  const prefix = `window.${variable}`;
  if (!source.startsWith(prefix) || source.slice(prefix.length).trimStart()[0] !== '=') throw new Error(`Invalid data assignment: ${name}`);
  return JSON.parse(source.slice(source.indexOf('=') + 1).trim().replace(/;$/, ''));
}

function validateModel(model, session, sample = false) {
  const date = model.briefingDate;
  if (!datePattern.test(date) || date !== model.rsDate) throw new Error(`Mixed report dates: briefing=${date}, RS=${model.rsDate}`);
  if (!sample && (!session || date !== session.sessionDate)) throw new Error(`Weekly data is stale: expected ${session?.sessionDate}, received ${date}. Previous archive is preserved.`);
  if (model.missing) throw new Error(`${model.missing} Daily Briefing equities lack current RS prices`);
  if (model.indices.length !== 6 || model.indices.some(row => row.asOf !== date || !Number.isFinite(row.price))) throw new Error('Index dates or prices are incomplete');
  if (!model.sectors.length || model.sectors.some(row => !Number.isFinite(row.week) || !Number.isFinite(row.month))) throw new Error('Sector returns are incomplete');
  const selected = reportModel.select(model);
  if (selected.week.length !== 10 || selected.month.length !== 10) throw new Error('Insufficient weekly/monthly leaders');
  return selected;
}

function readManifest(directory) {
  const filename = path.join(directory, 'index.json');
  const data = fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename, 'utf8')) : {version: 1, reports: []};
  if (data.version !== 1 || !Array.isArray(data.reports) || data.reports.some(row => !datePattern.test(row.date))) throw new Error('Invalid archive manifest');
  return data;
}

function existingReport(directory, manifest, date) {
  const entry = manifest.reports.find(row => row.date === date);
  const folder = path.join(directory, date);
  if (!entry && !fs.existsSync(folder)) return null;
  if (!entry) throw new Error(`Unlisted archive folder: ${date}; refusing to overwrite`);
  for (const name of ['report.pdf', 'preview.png', 'snapshot.json']) {
    const file = path.join(folder, name);
    if (!fs.existsSync(file) || hash(fs.readFileSync(file)) !== entry.files?.[name]) throw new Error(`Archive integrity check failed: ${date}/${name}`);
  }
  return entry;
}

async function renderPdf(model) {
  const {chromium} = require('playwright');
  const {PDFDocument} = require('pdf-lib');
  const allowed = new Set(['index.html', 'report.js', 'report.css', 'model.js', 'printer.svg']);
  const types = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml'};
  const server = http.createServer((req, res) => {
    const file = new URL(req.url, 'http://localhost').pathname.slice(1);
    if (!allowed.has(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', types[path.extname(file)]);
    res.end(fs.readFileSync(path.join(ROOT, 'study/briefing-report', file)));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {})});
    const page = await browser.newPage({viewport: {width: 1000, height: 1300}, deviceScaleFactor: 2});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?export=1`);
    await page.evaluate(payload => window.postMessage({type: 'eg-briefing-report', model: payload}, location.origin), model);
    await page.waitForFunction(() => document.querySelectorAll('.spark').length === 20);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('#preview-scale').selectOption('1');
    await page.locator('#print').click({trial: true, timeout: 10000});
    if (errors.length) throw new Error(errors.join('; '));
    const pdf = await page.pdf({preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false});
    const document = await PDFDocument.load(pdf);
    const first = document.getPages()[0];
    if (document.getPageCount() !== 1 || Math.abs(first.getWidth() - 595.28) > 2 || Math.abs(first.getHeight() - 841.89) > 2) throw new Error('Report must fit exactly one A4 page');
    const png = await page.locator('#report').screenshot();
    return {pdf, png};
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function exportReport({directory = DEFAULT_ARCHIVE, session, sample = false} = {}) {
  const model = reportModel.build(loadData('market-briefing-data.js', 'marketBriefingData'), loadData('market-rs-data.js', 'marketRsData'));
  const selected = validateModel(model, session, sample);
  const date = model.briefingDate;
  const manifest = readManifest(directory);
  if (existingReport(directory, manifest, date)) return {changed: false, date};
  const {pdf, png} = await renderPdf(model);
  const createdAt = new Date().toISOString();
  const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
  const snapshot = JSON.stringify({version: 1, kind: sample ? 'sample' : 'weekly', session: session || null, createdAt, sourceCommit, model});
  const files = {'report.pdf': pdf, 'preview.png': png, 'snapshot.json': Buffer.from(snapshot)};
  fs.mkdirSync(directory, {recursive: true});
  const temporary = fs.mkdtempSync(path.join(directory, '.tmp-'));
  for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(temporary, name), bytes, {flag: 'wx'});
  fs.renameSync(temporary, path.join(directory, date));
  const entry = {date, kind: sample ? 'sample' : 'weekly', issueDate: session?.issueDate || null, createdAt, sourceCommit,
    universeCount: model.universeCount, eligible: selected.eligible,
    files: Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, hash(bytes)]))};
  manifest.reports.push(entry);
  manifest.reports.sort((a, b) => b.date.localeCompare(a.date));
  manifest.updatedAt = createdAt;
  const manifestTemp = path.join(directory, '.index.json.tmp');
  fs.writeFileSync(manifestTemp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(manifestTemp, path.join(directory, 'index.json'));
  return {changed: true, date, directory: path.join(directory, date)};
}

if (require.main === module) {
  const {values} = parseArgs({options: {sample: {type: 'boolean', default: false}, session: {type: 'string'}, output: {type: 'string'}}});
  exportReport({sample: values.sample, session: values.session ? JSON.parse(fs.readFileSync(values.session, 'utf8')) : undefined,
    directory: values.output ? path.resolve(values.output) : DEFAULT_ARCHIVE}).then(result => {
    console.log(JSON.stringify(result));
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result.changed}\ndate=${result.date}\n`);
  }).catch(error => {console.error(error.message); process.exitCode = 1;});
}

module.exports = {validateModel, readManifest, existingReport, exportReport, renderPdf};
