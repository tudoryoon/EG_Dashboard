const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const model = require('../study/briefing-report/model.js');
const dates = ['2025-12-31', '2026-01-02', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'];
const tickers = ['AAA', 'BBB', 'IPO', 'ETF', 'INDEX', 'OLD', 'SMALL', 'NODATA', 'KR'];
const rs = {updatedAt: dates.at(-1), historyDates: dates,
  rows: tickers.map((ticker, i) => ({ticker, name: ticker === 'ETF' ? 'Example ETF' : ticker,
    isIndex: ticker === 'INDEX', marketCap: ticker === 'SMALL' ? 9e9 : 20e9,
    rsPeriods: {'1w': ticker === 'NODATA' ? null : 80 + i}, returns: {'1w': ticker === 'NODATA' ? null : 10 - i, '1m': null}, priceNewHigh1y: i === 0})),
  histories: Object.fromEntries(tickers.map(ticker => [ticker, {price: [ticker === 'IPO' ? null : 100, 110, 115, 118, 120, 122, ticker === 'OLD' ? null : 125]}])),
};
const briefing = {updatedAt: dates.at(-1), sectorPanels: [
  {label: 'Group A', items: tickers.map(ticker => ({ticker, currency: ticker === 'KR' ? 'KRW' : 'USD'}))},
  {label: 'Group B', items: [{ticker: 'AAA', currency: 'USD'}]},
], indexCards: [], rotationSignal: {sectors: []}};
const before = JSON.stringify({rs, briefing});
const built = model.build(briefing, rs);
assert.equal(built.rows.filter(r => r.ticker === 'AAA').length, 1);
assert.deepEqual(built.rows.find(r => r.ticker === 'AAA').sectors, ['Group A', 'Group B']);
assert.equal(built.rows.find(r => r.ticker === 'AAA').ytd, 25);
assert.equal(built.rows.find(r => r.ticker === 'IPO').ytd, null);
assert.equal(built.rows.find(r => r.ticker === 'AAA').newHigh, false, 'A short history cannot establish a 52-week high');
assert.equal(built.missing, 1);
assert.ok(!built.rows.some(r => ['OLD', 'ETF', 'INDEX', 'KR'].includes(r.ticker)));
const selected = model.select(built);
assert.ok(!selected.rs.some(r => ['SMALL', 'NODATA'].includes(r.ticker)));
assert.equal(selected.rs[0].ticker, 'IPO');
assert.equal(selected.returns[0].ticker, 'AAA');
assert.equal(selected.rs[0].rs1w, 82);
assert.equal(model.select(built, false).rs[0].ticker, 'SMALL');
assert.equal(JSON.stringify({rs, briefing}), before);
const fullDates = Array.from({length: 252}, (_, i) => new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10));
const fullHistory = {...rs, updatedAt: fullDates.at(-1), historyDates: fullDates,
  histories: Object.fromEntries(tickers.map(ticker => [ticker, {price: Array(252).fill(100)}]))};
assert.equal(model.build(briefing, fullHistory).rows.find(r => r.ticker === 'AAA').newHigh, true);
const root = path.join(__dirname, '..');
const load = filename => { const s = fs.readFileSync(path.join(root, 'data', filename), 'utf8'); return JSON.parse(s.slice(s.indexOf('=') + 1).trim().replace(/;$/, '')); };
const live = model.build(load('market-briefing-data.js'), load('market-rs-data.js'));
const report = model.select(live);
assert.equal(report.rs.length, 10);
assert.equal(report.returns.length, 10);
assert.equal(new Set(live.rows.map(r => r.ticker)).size, live.rows.length);
assert.ok(report.rs.every(r => Number.isFinite(r.rs1w) && r.marketCap >= 1e10));
assert.ok(report.rs.every((r, i, rows) => !i || rows[i - 1].rs1w >= r.rs1w));
assert.ok(report.returns.every((r, i, rows) => !i || rows[i - 1].week >= r.week));
console.log(JSON.stringify({date: live.rsDate, eligible: report.eligible, sectors: report.sectors.length, rs: report.rs.map(r => [r.ticker, r.rs1w]), returns: report.returns.map(r => [r.ticker, r.week]), highs: report.highCount}));
console.log('Briefing report scope, missing-data handling, sorting, deduplication and YTD tests passed.');
