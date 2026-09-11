(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.EgBriefingReport = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const number = value => finite(value) ? value : null;
  const change = (last, first) => finite(last) && finite(first) && first > 0 ? (last / first - 1) * 100 : null;

  function build(briefing = {}, rs = {}) {
    const dates = rs.historyDates || [];
    const asOf = rs.updatedAt || '';
    const end = dates.lastIndexOf(asOf);
    const members = new Map();
    for (const sector of briefing.sectorPanels || []) {
      for (const item of sector.items || []) {
        if (!members.has(item.ticker)) members.set(item.ticker, {...item, sectors: []});
        members.get(item.ticker).sectors.push(sector.label);
      }
    }
    const rows = [];
    let missing = 0;
    for (const row of rs.rows || []) {
      const item = members.get(row.ticker);
      if (!item || row.isIndex || item.currency !== 'USD' || row.isEtf || row.isETF || /\bETF\b/i.test(row.name || item.name || '')) continue;
      const history = rs.histories?.[row.ticker]?.price || [];
      const last = end >= 0 && history.length === dates.length ? history[end] : null;
      // A report must not rank yesterday's quote under today's date.
      if (!finite(last) || (row.asOfDate && row.asOfDate !== asOf)) { missing += 1; continue; }
      let yearEnd = -1;
      for (let i = end - 1; i >= 0; i -= 1) {
        if (dates[i] < `${asOf.slice(0, 4)}-01-01` && finite(history[i])) { yearEnd = i; break; }
      }
      const sparkStart = Math.max(0, end - 125);
      rows.push({
        ticker: row.ticker, name: item.name || row.name || row.ticker,
        sectors: [...new Set(item.sectors)], marketCap: number(row.marketCap), price: last,
        rs1w: number(row.rsPeriods?.['1w']), rs: number(row.rsRatingAll),
        day: change(last, history[end - 1]), week: number(row.returns?.['1w']),
        month: number(row.returns?.['1m']), ytd: yearEnd >= 0 ? change(last, history[yearEnd]) : null,
        newHigh: row.priceNewHigh1y === true && end >= 251 && history.slice(end - 251, end + 1).every(finite),
        highGap: finite(row.distanceTo52wHighPct) ? -row.distanceTo52wHighPct : null,
        sparkDates: dates.slice(sparkStart, end + 1), spark: history.slice(sparkStart, end + 1).map(number),
      });
    }
    return {
      briefingDate: briefing.updatedAt || '', rsDate: asOf, missing,
      universeCount: [...members.values()].filter(item => item.currency === 'USD').length,
      generatedAt: briefing.generatedAt || '',
      indices: (briefing.indexCards || []).map(item => ({
        key: item.key, label: item.label, asOf: item.updatedAt,
        price: number(item.price), day: number(item.returns?.['1d']),
        week: number(item.returns?.['1w']), atr: number(item.atr21Pct),
      })),
      sectors: (briefing.rotationSignal?.sectors || []).map(item => ({
        key: item.key, label: item.label, score: number(item.score),
        day: number(item.returns?.['1d']), week: number(item.returns?.['1w']),
        month: number(item.returns?.['1m']), excess: number(item.excessReturns?.['1w']),
      })),
      benchmark: briefing.rotationSignal?.benchmark || {}, rows,
    };
  }

  function select(model, capFloor = true) {
    const eligible = model.rows.filter(row => !capFloor || (finite(row.marketCap) && row.marketCap >= 1e10));
    const capTie = (a, b) => (b.marketCap || 0) - (a.marketCap || 0) || a.ticker.localeCompare(b.ticker);
    return {
      eligible: eligible.length,
      week: eligible.filter(row => finite(row.week)).sort((a, b) => b.week - a.week || capTie(a, b)).slice(0, 10),
      month: eligible.filter(row => finite(row.month)).sort((a, b) => b.month - a.month || capTie(a, b)).slice(0, 10),
      highs: eligible.filter(row => row.newHigh).sort(capTie).slice(0, 8),
      highCount: eligible.filter(row => row.newHigh).length,
      sectors: [...model.sectors].sort((a, b) => (b.week ?? -Infinity) - (a.week ?? -Infinity) || a.label.localeCompare(b.label)),
    };
  }
  return {build, select};
});
