/* Company pilot composes the existing RS, Trend and financial renderers. */
const COMPANY_PILOT = [
  { ticker: "AAPL", name: "Apple", color: "#374151" },
  { ticker: "MSFT", name: "Microsoft", color: "#087eb9" },
  { ticker: "NVDA", name: "NVIDIA", color: "#518608" },
  { ticker: "GOOGL", name: "Alphabet", color: "#c53a2e" },
  { ticker: "AMZN", name: "Amazon", color: "#a86700" },
  { ticker: "META", name: "Meta", color: "#1766c5" },
  { ticker: "TSLA", name: "Tesla", color: "#c32640" },
];

const COMPANY_CHART_KEYS = ["rsUniverse", "rsSelectedTicker", "rsHistoryRange", "rsPriceChartType",
  "rsVolumeVisible", "rsChartSeries", "trendScoreUniverse", "trendScoreRange", "canslimUniverse"];
let companySavedChartState = null;
let companyChartPreferences = null;
let companyObserver = null;
let companyModal = null;
let companyListPosition = 0;
let companyReturnTicker = "";
let companyQuery = "";
let companySort = "marketCap";
let companyLazyBuilt = new Set();

function isCompanyPilotTicker(ticker) {
  return COMPANY_PILOT.some((item) => item.ticker === String(ticker ?? "").toUpperCase());
}

function companyIcon(name) {
  return `<img src="./assets/lucide/${name}.svg" width="18" height="18" alt="" aria-hidden="true" />`;
}

function companyIconButton(action, icon, label) {
  return `<button type="button" class="company-icon-button" data-company-action="${action}" title="${label}" aria-label="${label}">${companyIcon(icon)}</button>`;
}

function companyTrend(ticker) {
  return marketTrendScoreData.rows?.all?.find((row) => row.ticker === ticker) ?? null;
}

function companyDailyChange(ticker) {
  const prices = (marketRsData.histories?.[ticker]?.price ?? []).filter((v) => v != null && Number.isFinite(v));
  return prices.length > 1 && prices.at(-2) > 0 ? (prices.at(-1) / prices.at(-2) - 1) * 100 : null;
}

function companySigned(value) {
  return value == null || !Number.isFinite(value) ? "-" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function companyTone(value) {
  return value == null ? "" : value > 0 ? "company-up" : value < 0 ? "company-down" : "";
}

function prepareCompanyViewRender() {
  companyObserver?.disconnect();
  companyObserver = null;
  const remainsOpen = state.tab === "Screening" && state.screeningView === "Company" && isCompanyPilotTicker(state.companyTicker);
  if (companyModal) {
    companyModal.close();
    companyModal = null;
  }
  document.body.classList.remove("company-focus");
  if (!remainsOpen && companySavedChartState) {
    companyChartPreferences = Object.fromEntries(COMPANY_CHART_KEYS.map((key) => [key, structuredClone(state[key])]));
    Object.assign(state, companySavedChartState);
    companySavedChartState = null;
  }
}

function enterCompanyChartContext(ticker) {
  if (!companySavedChartState) {
    companySavedChartState = Object.fromEntries(COMPANY_CHART_KEYS.map((key) => [key, structuredClone(state[key])]));
    Object.assign(state, companyChartPreferences ?? {
      rsHistoryRange: "1y", rsPriceChartType: "candle", rsVolumeVisible: true,
      rsChartSeries: { rs: true, ema10: false, ema20: true, ema50: false, ema100: true, ema200: false },
    });
  }
  state.rsSelectedTicker = ticker;
  state.rsUniverse = "all";
  state.trendScoreUniverse = "all";
  state.trendScoreRange = state.rsHistoryRange;
  state.canslimUniverse = "all";
}

function openCompany(ticker) {
  if (!isCompanyPilotTicker(ticker)) return;
  if (!state.companyTicker) companyListPosition = window.scrollY;
  companyReturnTicker = ticker;
  state.companyTicker = ticker;
  render();
}

function closeCompany() {
  state.companyTicker = "";
  render();
  window.scrollTo({ top: companyListPosition, behavior: "instant" });
  usOverviewRoot.querySelector(`[data-company-open="${companyReturnTicker}"]`)?.focus({ preventScroll: true });
}

function renderCompanyOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");
  const query = companyQuery.trim().toLowerCase();
  const entries = COMPANY_PILOT.map((meta) => ({ ...meta, row: marketRsRowByTicker.get(meta.ticker), trend: companyTrend(meta.ticker) }))
    .filter((entry) => `${entry.ticker} ${entry.name}`.toLowerCase().includes(query))
    .sort((a, b) => (Number(b.row?.[companySort === "rs" ? "rsRatingAll" : "marketCap"]) || 0) - (Number(a.row?.[companySort === "rs" ? "rsRatingAll" : "marketCap"]) || 0));
  usOverviewRoot.innerHTML = `
    <section class="company-overview">
      <header class="company-list-head"><div><span class="company-eyebrow">DAILY BRIEFING / M7</span><h2>Company</h2></div>
        <span class="company-asof">주가·RS ${marketRsData.updatedAt ?? "-"}</span></header>
      <div class="company-list-toolbar">
        <label>기업 검색<input type="search" data-company-search value="${escapeHtml(companyQuery)}" placeholder="기업명 · 티커" /></label>
        <label>정렬<select data-company-sort><option value="marketCap" ${companySort === "marketCap" ? "selected" : ""}>시가총액순</option><option value="rs" ${companySort === "rs" ? "selected" : ""}>RS Rating순</option></select></label>
        <span>${entries.length} / 7 기업</span>
      </div>
      <div class="company-card-grid">${entries.map((entry) => {
        const change = companyDailyChange(entry.ticker);
        return `<button type="button" class="company-card" data-company-open="${entry.ticker}" style="--company-accent:${entry.color}" ${entry.row ? "" : "disabled"}>
          <span class="company-card-top"><span><strong>${entry.name}</strong><small>${entry.ticker} US</small></span>${companyIcon("arrow-up-right")}</span>
          <span class="company-card-price"><b>${formatUsStockPrice(entry.row?.price)}</b><span class="${companyTone(change)}">${companySigned(change)}</span></span>
          <span class="company-spark-wrap"><canvas data-company-spark="${entry.ticker}" aria-label="${entry.name} 최근 3개월 주가"></canvas></span>
          <span class="company-card-cap">시가총액 ${formatMarketCapCompact(entry.row?.marketCap)}</span>
          <span class="company-card-scores"><span>RS <b>${formatRsNumber(entry.row?.rsRatingAll)}</b></span><span>추세 <b>${formatRsNumber(entry.trend?.score)}<small>/10</small></b></span><span>Climax <b>${formatRsNumber(entry.trend?.climaxScore)}<small>/10</small></b></span></span>
        </button>`;
      }).join("") || '<p class="company-empty">일치하는 기업이 없습니다.</p>'}</div>
    </section>`;
  usOverviewRoot.querySelectorAll("[data-company-open]").forEach((button) => button.addEventListener("click", () => openCompany(button.dataset.companyOpen)));
  const search = usOverviewRoot.querySelector("[data-company-search]");
  search.addEventListener("input", () => {
    companyQuery = search.value;
    render();
    usOverviewRoot.querySelector("[data-company-search]")?.focus({ preventScroll: true });
  });
  usOverviewRoot.querySelector("[data-company-sort]").addEventListener("change", (event) => { companySort = event.target.value; render(); });
  if (state.companyTicker && isCompanyPilotTicker(state.companyTicker)) {
    renderCompanyDialog(state.companyTicker);
  } else {
    entries.forEach((entry) => createCompanySpark(entry));
  }
}

function createCompanySpark(entry) {
  const canvas = usOverviewRoot.querySelector(`[data-company-spark="${entry.ticker}"]`);
  const history = marketRsData.histories?.[entry.ticker];
  if (!canvas || !history || typeof Chart === "undefined") return;
  const chart = new Chart(canvas, {
    type: "line", data: { labels: marketRsData.historyDates.slice(-63), datasets: [{data: history.price.slice(-63), borderColor: entry.color, borderWidth: 1.7, pointRadius: 0, tension: 0.15}] },
    options: { responsive: true, maintainAspectRatio: false, animation: false, events: [], plugins: {legend: {display:false}, tooltip: {enabled:false}}, scales: {x: {display:false}, y: {display:false}} },
  });
  charts.push(chart);
}

function renderCompanyChartControls() {
  return `<div class="company-chart-toolbar">
    <div class="company-control-group" role="group" aria-label="차트 기간">${[["1m","1M"],["3m","3M"],["6m","6M"],["1y","1Y"],["max","2025~"],["ytd","YTD"]].map(([key,label]) => `<button type="button" data-company-range="${key}" aria-pressed="${state.rsHistoryRange === key}">${label}</button>`).join("")}</div>
    <div class="company-control-group" role="group" aria-label="가격 차트 유형">${MARKET_RS_PRICE_CHART_TYPES.map((type) => `<button type="button" data-company-price="${type.key}" aria-pressed="${state.rsPriceChartType === type.key}">${type.label}</button>`).join("")}</div>
    <label class="company-volume-toggle"><input type="checkbox" data-company-volume ${state.rsVolumeVisible ? "checked" : ""} />거래량</label>
    <div class="company-zoom">${companyIconButton("zoom-in", "plus", "확대")}${companyIconButton("zoom-out", "minus", "축소")}${companyIconButton("zoom-reset", "rotate-ccw", "차트 초기화")}</div>
  </div><div class="company-series" role="group" aria-label="차트 표시선">${MARKET_RS_CHART_SERIES.map((series) => `<label style="--line-color:${series.color}"><input type="checkbox" data-company-series="${series.key}" ${isMarketRsChartSeriesVisible(series.key) ? "checked" : ""} /><i></i>${series.label}</label>`).join("")}</div>`;
}

function renderCompanyDialog(ticker) {
  const meta = COMPANY_PILOT.find((item) => item.ticker === ticker);
  const row = marketRsRowByTicker.get(ticker);
  if (!row) return;
  enterCompanyChartContext(ticker);
  const trend = companyTrend(ticker);
  const change = companyDailyChange(ticker);
  const financial = marketRsFinancialsData.financials?.[ticker];
  const quarter = financial?.quarters?.[0];
  const analysis = buildMarketCanslimAnalysis(row);
  const dialog = document.createElement("dialog");
  dialog.className = "company-dialog";
  dialog.setAttribute("aria-labelledby", "company-dialog-title");
  dialog.style.setProperty("--company-accent", meta.color);
  dialog.innerHTML = `<header class="company-dialog-head">
    <div class="company-dialog-identity"><span class="company-eyebrow">COMPANY / ${ticker} US</span><h2 id="company-dialog-title">${meta.name}</h2></div>
    <div class="company-dialog-quote"><strong>${formatUsStockPrice(row.price)}</strong><span class="${companyTone(change)}">${companySigned(change)}</span><small>${row.asOfDate ?? marketRsData.updatedAt}</small></div>
    <div class="company-dialog-actions"><label class="company-picker"><span class="company-sr-only">기업 선택</span><select data-company-picker>${COMPANY_PILOT.map((item) => `<option value="${item.ticker}" ${item.ticker === ticker ? "selected" : ""}>${item.ticker}</option>`).join("")}</select></label>
      ${companyIconButton("previous", "chevron-left", "이전 기업")}${companyIconButton("next", "chevron-right", "다음 기업")}${companyIconButton("close", "x", "기업 상세 닫기")}</div>
  </header>
  <div class="company-dialog-body">
    <div class="company-key-metrics">
      ${[["시가총액",formatMarketCapCompact(row.marketCap)],["RS Rating",formatRsNumber(row.rsRatingAll)],["추세스코어",`${formatRsNumber(trend?.score)}<small>/10</small>`],["Climax",`${formatRsNumber(trend?.climaxScore)}<small>/10</small>`],["CANSLIM · proxy",analysis ? formatCanslimScore(analysis.score) : "-"],["21D ATR",formatAtrPercent(row.atr21Pct)]].map(([label,value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("")}
    </div>
    <section class="company-price-section"><div class="company-section-title"><h3>Price & RS</h3><span>RS · All universe</span></div>
      <div data-company-controls>${renderCompanyChartControls()}</div>
      <div class="chart-wrap market-rs-chart-wrap company-price-chart"><div class="market-rs-ema-readout" data-rs-ema-readout></div><canvas data-rs-chart="detail" aria-label="${meta.name} 주가와 RS Rating"></canvas></div>
      <div class="chart-wrap market-rs-volume-chart-wrap company-volume-chart" ${state.rsVolumeVisible ? "" : "hidden"}><canvas data-rs-chart="volume" aria-label="${meta.name} 거래량"></canvas></div>
    </section>
    <section class="company-risk-grid" data-company-lazy="risk">
      <div><div class="company-section-title"><h3>Drawdown</h3><span>선택 구간 고점 대비</span></div><div class="company-small-chart"><canvas data-rs-chart="mdd"></canvas></div></div>
      <div><div class="company-section-title"><h3>21D ATR</h3><span>일별 TR% 평균</span></div><div class="company-small-chart"><canvas data-rs-chart="atr"></canvas></div></div>
    </section>
    <section class="company-trend-section" data-company-lazy="trend"><div class="company-section-title"><h3>추세스코어</h3><span>${trend?.asOfDate ?? "-"} · ${escapeHtml(trend?.state ?? "데이터 없음")}</span></div>
      <div class="company-trend-summary">${[["가격 추세",trend?.absoluteScore,4],["상대강도 추세",trend?.relativeScore,4],["모멘텀",trend?.momentumScore,2]].map(([label,value,max]) => `<div><span>${label}</span><meter min="0" max="${max}" value="${value ?? 0}" aria-label="${label}"></meter><b>${formatRsNumber(value)}/${max}</b></div>`).join("")}</div>
      <div class="company-medium-chart"><canvas data-company-chart="trend"></canvas></div>
    </section>
    <section class="company-financial-section" data-company-lazy="financial"><div class="company-section-title"><h3>분기 재무</h3><span>${quarter?.period ?? "-"} · ${quarter?.periodEnd ?? "-"}</span></div>
      <div class="company-financial-metrics">${[["매출",formatRsFinancialUsd(quarter?.revenue)],["매출 YoY",formatRsFinancialPercent(quarter?.revenueYoyPct)],["GPM",formatRsFinancialMargin(quarter?.grossMarginPct)],["OPM",formatRsFinancialMargin(quarter?.operatingMarginPct)]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
      ${renderMarketRsFinancials(row)}
    </section>
    <section class="company-earnings-section">${renderMarketCanslimEarningsSurprise(row)}</section>
    <section class="company-canslim-section"><div class="company-section-title"><h3>CANSLIM</h3><span>Proxy · ${analysis ? formatCanslimScore(analysis.score) : "-"}</span></div>
      <div class="company-canslim-checks">${(analysis?.checks ?? []).map((check) => `<details class="company-canslim-check"><summary><b>${check.key}</b><span>${escapeHtml(check.title)}</span><em class="company-status-${check.status}">${getCanslimStatusLabel(check.status)}</em></summary><p>${escapeHtml(check.summary)}</p><small>${escapeHtml(check.detail)}</small></details>`).join("")}</div>
      <p class="company-source-note">기존 CANSLIM proxy 기준. Pending은 미확인 항목이며 Fail과 구분합니다. 재무 수치의 조정 여부와 출처는 위 표에 표시됩니다.</p>
    </section>
  </div>`;
  usOverviewRoot.appendChild(dialog);
  companyModal = dialog;
  companyLazyBuilt = new Set();
  document.body.classList.add("company-focus");
  dialog.showModal();
  dialog.querySelector('[data-company-action="close"]').focus({preventScroll:true});
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeCompany(); });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeCompany();
    }
  });
  dialog.querySelector("[data-company-picker]").addEventListener("change", (event) => openCompany(event.target.value));
  dialog.querySelectorAll(".company-dialog-actions [data-company-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.companyAction;
    if (action === "close") return closeCompany();
    if (action === "previous" || action === "next") {
      const index = COMPANY_PILOT.findIndex((item) => item.ticker === ticker);
      return openCompany(COMPANY_PILOT[(index + (action === "next" ? 1 : -1) + COMPANY_PILOT.length) % COMPANY_PILOT.length].ticker);
    }
  }));
  bindCompanyChartControls(row, trend);
  drawCompanyCharts(row, trend);
  if (typeof IntersectionObserver !== "undefined") {
    companyObserver = new IntersectionObserver((entries) => {
      if (companyModal !== dialog || !dialog.open) return;
      for (const entry of entries) if (entry.isIntersecting && !companyLazyBuilt.has(entry.target.dataset.companyLazy)) {
        drawCompanyLazy(entry.target.dataset.companyLazy, row, trend);
        companyObserver.unobserve(entry.target);
      }
    }, {root:dialog.querySelector(".company-dialog-body"), rootMargin:"200px"});
    dialog.querySelectorAll("[data-company-lazy]").forEach((section) => companyObserver.observe(section));
  } else {
    ["risk", "trend", "financial"].forEach((key) => drawCompanyLazy(key, row, trend));
  }
}

function drawCompanyLazy(key, row, trend) {
  if (!companyModal?.open || state.companyTicker !== row.ticker) return;
  companyLazyBuilt.add(key);
  if (key === "risk") {
    createMarketRsMddChart(companyModal.querySelector('[data-rs-chart="mdd"]'), row);
    createMarketRsAtrChart(companyModal.querySelector('[data-rs-chart="atr"]'), row);
  } else if (key === "trend" && trend) {
    createTrendScoreChart(companyModal.querySelector('[data-company-chart="trend"]'), trend);
  } else if (key === "financial") {
    const canvas = companyModal.querySelector('[data-canslim-chart="financials"]');
    createMarketCanslimFinancialChart(canvas, marketRsFinancialsData.financials?.[row.ticker]);
    const chart = typeof Chart !== "undefined" && canvas ? Chart.getChart(canvas) : null;
    if (chart) {
      Object.assign(chart.options.scales.x.ticks, {
        autoSkip: true,
        autoSkipPadding: 12,
        callback(value) { return this.getLabelForValue(value).replace(/^FY20/, "FY").split(" "); },
      });
      chart.update("none");
    }
  }
}

function drawCompanyCharts(row, trend) {
  const built = [...companyLazyBuilt];
  destroyCharts();
  createMarketRsChart(companyModal.querySelector('[data-rs-chart="detail"]'), row);
  const volume = companyModal.querySelector(".company-volume-chart");
  volume.hidden = !state.rsVolumeVisible;
  if (state.rsVolumeVisible) createMarketRsVolumeChart(volume.querySelector("canvas"), row);
  built.forEach((key) => drawCompanyLazy(key, row, trend));
}

function bindCompanyChartControls(row, trend) {
  const controls = companyModal.querySelector("[data-company-controls]");
  const redraw = () => {
    state.trendScoreRange = state.rsHistoryRange;
    controls.innerHTML = renderCompanyChartControls();
    bindCompanyChartControls(row, trend);
    drawCompanyCharts(row, trend);
  };
  controls.querySelectorAll("[data-company-range]").forEach((button) => button.addEventListener("click", () => { state.rsHistoryRange = button.dataset.companyRange; redraw(); }));
  controls.querySelectorAll("[data-company-price]").forEach((button) => button.addEventListener("click", () => { state.rsPriceChartType = button.dataset.companyPrice; redraw(); }));
  controls.querySelectorAll("[data-company-series]").forEach((input) => input.addEventListener("change", () => { state.rsChartSeries = {...state.rsChartSeries, [input.dataset.companySeries]: input.checked}; redraw(); }));
  controls.querySelector("[data-company-volume]").addEventListener("change", (event) => { state.rsVolumeVisible = event.target.checked; redraw(); });
  controls.querySelectorAll("[data-company-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.companyAction;
    if (action === "zoom-reset") {
      marketRsDetailChart?.resetZoom?.();
      fitMarketRsChartYToVisible(marketRsDetailChart);
      syncMarketRsVolumeChartX(marketRsDetailChart);
    } else zoomMarketRsChartToLatest(action === "zoom-in" ? "in" : "out");
  }));
}
