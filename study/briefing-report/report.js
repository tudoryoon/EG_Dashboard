(function () {
  'use strict';
  const report = document.querySelector('#report');
  const status = document.querySelector('#status');
  let model;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const valid = value => typeof value === 'number' && Number.isFinite(value);
  const fmt = (value, digits = 2) => valid(value) ? value.toLocaleString('en-US', {minimumFractionDigits: digits, maximumFractionDigits: digits}) : '-';
  const pct = value => valid(value) ? `${value > 0 ? '+' : ''}${fmt(value)}` : '-';
  const tone = value => valid(value) ? value > 0 ? 'up' : value < 0 ? 'down' : '' : 'missing';
  const cap = value => valid(value) ? value >= 1e12 ? `$${fmt(value / 1e12)}T` : `$${fmt(value / 1e9, 1)}B` : '-';
  const cell = (value, extra = '') => `<td class="numeric ${tone(value)} ${extra}">${pct(value)}</td>`;
  const sectionHead = (title, meta) => `<header class="section-head"><h2>${title}</h2><span>${meta}</span></header>`;

  function spark(row) {
    const values = row.spark;
    const finite = values.filter(valid);
    if (finite.length < 2) return '<span class="missing">-</span>';
    const low = Math.min(...finite), high = Math.max(...finite), range = high - low || 1;
    let gap = true, path = '', last;
    values.forEach((value, i) => {
      if (!valid(value)) { gap = true; return; }
      const x = 2 + i / Math.max(1, values.length - 1) * 96;
      const y = high === low ? 15 : 27 - (value - low) / range * 24;
      path += `${gap ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
      last = {x, y}; gap = false;
    });
    return `<svg class="spark" viewBox="0 0 100 30" role="img" aria-label="${esc(row.ticker)} 최근 126거래일 가격"><title>${esc(row.ticker)} · ${esc(row.sparkDates[0])} ~ ${esc(row.sparkDates.at(-1))}</title><path d="${path}" fill="none" stroke="currentColor" stroke-width="1.1"/><circle cx="${last.x}" cy="${last.y}" r="1.5"/></svg>`;
  }

  function leaderTable(title, rows, metric) {
    const markup = rows.map((row, index) => `<tr>
      <td class="company" title="${esc(row.name)} · ${esc(row.sectors.join(', '))}"><strong><i>${index + 1}</i>${esc(row.ticker)}</strong><span>${esc(row.name)}</span></td>
      <td class="spark-cell">${spark(row)}</td>
      <td class="numeric ${metric === 'rs' ? 'key-metric' : ''}">${fmt(row.rs1w, 0)}</td>
      ${cell(row.day)}${cell(row.week, metric === 'returns' ? 'key-metric' : '')}${cell(row.month)}
    </tr>`).join('');
    const blanks = Array.from({length: 10 - Math.max(1, rows.length)}, () => '<tr class="blank"><td colspan="6">&nbsp;</td></tr>').join('');
    return `<section class="leaders">${sectionHead(title, `${rows.length}종목 · ${esc(model.rsDate)}`)}
      <table><colgroup><col class="name-col"><col class="spark-col"><col class="rs-col"><col><col><col></colgroup>
      <thead><tr><th>티커 / 기업</th><th>주가 · 6M</th><th>RS 1W</th><th>1D</th><th>1W</th><th>1M</th></tr></thead>
      <tbody>${markup || '<tr class="empty"><td colspan="6">해당 종목 없음</td></tr>'}${blanks}</tbody></table></section>`;
  }

  function sectorTable(rows) {
    return `<table class="sectors-table"><colgroup><col style="width:38%"><col><col><col><col><col></colgroup>
      <thead><tr><th>섹터</th><th>Score</th><th>1D</th><th>1W</th><th>1M</th><th>vs QQQ</th></tr></thead>
      <tbody>${rows.map(row => `<tr><td class="sector-label">${esc(row.label)}</td>${cell(row.score)}${cell(row.day)}${cell(row.week, 'weekly-cell')}${cell(row.month)}${cell(row.excess)}</tr>`).join('')}</tbody></table>`;
  }

  function render() {
    if (!model) return;
    const capFloor = document.querySelector('#cap-floor').checked;
    const selected = window.EgBriefingReport.select(model, capFloor);
    const split = Math.ceil(selected.sectors.length / 2);
    const labels = {dowjones: 'DOW JONES', sp500: 'S&P 500', nasdaq: 'NASDAQ', nasdaq100: 'NASDAQ 100', sox: 'SOX', russell2000: 'RUSSELL 2000'};
    const mismatch = model.briefingDate !== model.rsDate;
    report.innerHTML = `
      <header class="report-title"><div><div class="eyebrow">EG RESEARCH / DAILY MARKET NOTE</div><h1>Daily Briefing<span>US EQUITIES</span></h1></div><div class="report-date"><strong>${esc(model.briefingDate)}</strong><span>미국 종가 기준</span></div></header>
      <div class="scope-line"><span>Daily Briefing · 미국 주식 ${selected.eligible}개${capFloor ? ' · 시총 $10B 이상' : ' · 시총 전체'}</span><span>종목 ${esc(model.rsDate)} · 수익률 % / 초과수익 %p</span></div>
      ${mismatch ? `<p class="date-warning">기준일 차이: 지수·섹터 ${esc(model.briefingDate)} / 종목 ${esc(model.rsDate)}</p>` : ''}
      <section class="indices">${model.indices.slice(0, 6).map(item => `<div class="index"><h2>${esc(labels[item.key] || item.label)}</h2><strong>${fmt(item.price)}</strong><div><span class="${tone(item.day)}">1D ${pct(item.day)}%</span><span class="${tone(item.week)}">1W ${pct(item.week)}%</span></div><small>21D ATR ${valid(item.atr) ? fmt(item.atr) + '%' : '-'}${item.asOf !== model.briefingDate ? ' · ' + esc(item.asOf) : ''}</small></div>`).join('')}</section>
      <div class="leader-grid">${leaderTable('RS 1W 상위', selected.rs, 'rs')}${leaderTable('1주 수익률 상위', selected.returns, 'returns')}</div>
      <section class="sector-section">${sectionHead('섹터별 성과', `1W 내림차순 · QQQ 1W ${pct(model.benchmark.returns?.['1w'])}%`)}<div class="sector-grid">${sectorTable(selected.sectors.slice(0, split))}${sectorTable(selected.sectors.slice(split))}</div></section>
      <section class="highs-section">${sectionHead('52주 신고가', `252거래일 확보 · 시총순 최대 8개 · 전체 ${selected.highCount}개`)}
        <table class="highs-table"><colgroup><col style="width:10%"><col style="width:23%"><col style="width:23%"><col><col><col><col><col></colgroup><thead><tr><th>티커</th><th>기업</th><th>Daily Briefing 섹터</th><th>시총</th><th>RS</th><th>1W</th><th>1M</th><th>YTD</th></tr></thead><tbody>
        ${selected.highs.map(row => `<tr><td><b>${esc(row.ticker)}</b></td><td class="ellipsis">${esc(row.name)}</td><td class="ellipsis" title="${esc(row.sectors.join(', '))}">${esc(row.sectors[0])}</td><td class="numeric">${cap(row.marketCap)}</td><td class="numeric">${fmt(row.rs, 0)}</td>${cell(row.week)}${cell(row.month)}${cell(row.ytd)}</tr>`).join('') || '<tr><td colspan="8" class="no-highs">해당 종목 없음</td></tr>'}
        </tbody></table>
      </section>
      <footer class="report-footer"><p>출처: EG Dashboard 저장 데이터 · Yahoo Finance / yfinance. RS 1W는 ALL 유니버스의 기존 1주 RS(1~99); 필터 내 재산출 없음. 동점은 1W 수익률순.</p><p>섹터 수익률: 시총가중 50% + 동일가중 50%, 기존 Rotation Score 유지. vs QQQ는 1주 초과수익률. 가격 차트: 최대 126거래일, 각 종목별 축. 신규상장 YTD는 전년말 가격 없으면 미표시.${model.missing ? ` 최신 가격 누락 ${model.missing}개 제외.` : ''}</p><div><span>EG DASHBOARD · BRIEFING PRINT / PILOT</span><span>01 / 01</span></div></footer>`;
    document.title = `EG Daily Briefing ${model.briefingDate}`;
    status.hidden = true;
    fit();
    requestAnimationFrame(checkFit);
  }

  function fit() {
    const preview = document.querySelector('.preview');
    const holder = document.querySelector('.sheet-holder');
    const mode = document.querySelector('#preview-scale').value;
    const scale = mode === 'fit' ? Math.min(1, (preview.clientWidth - 24) / report.offsetWidth, (window.innerHeight - document.querySelector('.controls').offsetHeight - 26) / report.offsetHeight) : 1;
    const safeScale = Math.max(.2, scale);
    holder.style.width = `${report.offsetWidth * safeScale}px`;
    holder.style.height = `${report.offsetHeight * safeScale}px`;
    report.style.transform = `scale(${safeScale})`;
  }

  function checkFit() {
    const bounds = report.getBoundingClientRect();
    const scale = bounds.height / report.offsetHeight;
    const padding = parseFloat(getComputedStyle(report).paddingBottom) * scale;
    const bottom = report.lastElementChild?.getBoundingClientRect().bottom ?? bounds.top;
    const overflow = report.scrollHeight > report.clientHeight + 1 || bottom > bounds.bottom - padding + 1;
    document.querySelector('#print').disabled = overflow;
    if (overflow) {
      status.hidden = false;
      status.textContent = '내용이 한 페이지를 초과했습니다. PDF 인쇄 전에 레이아웃 점검이 필요합니다.';
    }
  }

  function accept(payload) {
    if (!payload || !Array.isArray(payload.rows) || !Array.isArray(payload.sectors)) return;
    model = payload;
    render();
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== 'eg-briefing-report') return;
    accept(event.data.model);
  });
  window.addEventListener('resize', fit);
  document.querySelector('#cap-floor').addEventListener('change', render);
  document.querySelector('#preview-scale').addEventListener('change', fit);
  document.querySelector('#print').addEventListener('click', () => { checkFit(); if (!document.querySelector('#print').disabled) window.print(); });

  // Standalone opening uses the same versioned files as the live dashboard.
  async function loadStandalone() {
    try {
      const response = await fetch('../../index.html', {cache: 'no-cache'});
      if (!response.ok) throw new Error('Dashboard manifest unavailable');
      const manifest = new DOMParser().parseFromString(await response.text(), 'text/html');
      for (const filename of ['market-briefing-data.js', 'market-rs-data.js']) {
        const entry = [...manifest.scripts].find(script => script.getAttribute('src')?.split('?')[0].endsWith('/' + filename));
        if (!entry) throw new Error('Missing ' + filename);
        const url = new URL(entry.getAttribute('src'), response.url);
        if (url.origin !== location.origin) throw new Error('Unexpected data origin');
        await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = url.href; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
      }
      accept(window.EgBriefingReport.build(window.marketBriefingData, window.marketRsData));
    } catch (_) {
      status.hidden = false;
      status.textContent = '데이터를 불러오지 못했습니다. 연결 상태를 확인하고 새로고침해 주세요.';
    }
  }
  if (window.parent === window) loadStandalone();
})();
