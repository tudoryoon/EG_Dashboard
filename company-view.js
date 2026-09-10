/* Company pilot composes the existing RS, Trend and financial renderers. */
const COMPANY_PILOT = [
  { ticker: "AAPL", name: "Apple", color: "#c8d1cb" },
  { ticker: "MSFT", name: "Microsoft", color: "#87b7ff" },
  { ticker: "NVDA", name: "NVIDIA", color: "#39d3a1" },
  { ticker: "GOOGL", name: "Alphabet", color: "#ff8c76" },
  { ticker: "AMZN", name: "Amazon", color: "#ffb641" },
  { ticker: "META", name: "Meta", color: "#729dff" },
  { ticker: "TSLA", name: "Tesla", color: "#ff756e" },
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
let companyTrendRange = "max";
let companyTrendMode = "3d";
let companyTrendSeries = { "Rank": true, "Trend Score": true, "Climax Score": true };
let companyFinancialRange = "all";
let companyFinancialMode = "3d";
let companyDepthModule;
const companyFinancialSelected = new Set(["revenue", "revenueYoyPct"]);
const COMPANY_FINANCIAL_METRICS = [
  { key: "revenue", label: "매출", unit: "usd", type: "bar", color: "#39d3a1", column: 2, group: "금액" },
  { key: "ocf", label: "영업현금흐름", unit: "usd", type: "bar", color: "#87b7ff", column: 8, group: "금액" },
  { key: "fcf", label: "FCF", unit: "usd", type: "bar", color: "#b59af6", column: 9, group: "금액" },
  { key: "revenueYoyPct", label: "매출 YoY", unit: "pct", type: "line", color: "#ffb641", column: 3, group: "수익성 · 성장" },
  { key: "grossMarginPct", label: "GPM", unit: "pct", type: "bar", color: "#52c6bb", column: 4, group: "수익성 · 성장" },
  { key: "operatingMarginPct", label: "OPM", unit: "pct", type: "bar", color: "#ff8c76", column: 5, group: "수익성 · 성장" },
  { key: "operatingMarginYoyPp", label: "OPM YoY", unit: "pct", type: "line", color: "#52c6bb", column: 6, group: "수익성 · 성장", suffix: "pp" },
  { key: "epsDiluted", label: "EPS", unit: "eps", type: "line", color: "#e3a4cc", column: 7, group: "주당 ($)" },
];

function companyFinite(value) {
  return value == null || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}

function companyFinancialQuarters(item) {
  const quarters = [...(item?.quarters ?? [])].sort((a, b) => String(b.periodEnd).localeCompare(String(a.periodEnd)));
  return (companyFinancialRange === "all" ? quarters : quarters.slice(0, Number(companyFinancialRange))).reverse();
}

function companyFinancialModel(item) {
  const quarters = companyFinancialQuarters(item);
  const metrics = COMPANY_FINANCIAL_METRICS.filter((metric) => companyFinancialSelected.has(metric.key)
    && quarters.some((quarter) => companyFinite(quarter[metric.key]) !== null));
  const datasets = metrics.map((metric) => ({
    label: metric.label, metricKey: metric.key, type: metric.type, yAxisID: metric.unit,
    data: quarters.map((quarter) => {
      const value = companyFinite(quarter[metric.key]);
      return value === null ? null : metric.unit === "usd" ? value / 1e9 : value;
    }),
    borderColor: metric.color, backgroundColor: metric.type === "bar" ? `${metric.color}aa` : metric.color,
    borderWidth: metric.type === "bar" ? 1 : 2.4, borderRadius: 3,
    pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: metric.color,
    categoryPercentage: .75, barPercentage: .8, tension: .12, spanGaps: false, order: metric.type === "line" ? 0 : 1,
  }));
  const units = [...new Set(metrics.map((metric) => metric.unit))];
  const bounds = Object.fromEntries(units.map((unit) => {
    const values = datasets.filter((dataset) => dataset.yAxisID === unit).flatMap((dataset) => dataset.data).filter(Number.isFinite);
    return [unit, { positive: Math.max(0, ...values), negative: Math.max(0, ...values.map((value) => -value)) }];
  }));
  // Use a common zero position across dollars, percentages and per-share dollars.
  const fraction = Math.max(0, ...Object.values(bounds).map(({positive, negative}) => negative / (positive + negative || 1)));
  const negativeSteps = fraction > 0 ? Math.min(4, Math.max(1, Math.ceil(fraction * 5))) : 0;
  const scales = Object.fromEntries(units.map((unit) => {
    const { positive, negative } = bounds[unit];
    const rawStep = Math.max(positive / (5 - negativeSteps), negativeSteps ? negative / negativeSteps : 0, .001) * 1.12;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep));
    const step = Math.ceil(rawStep / magnitude) * magnitude;
    return [unit, { min: -negativeSteps * step, max: (5 - negativeSteps) * step, step }];
  }));
  return { quarters, metrics, datasets, scales };
}

function applyCompanyChartTheme(canvas) {
  if (typeof Chart === "undefined" || !canvas?.closest?.(".company-dialog, .company-overview")) return;
  const chart = Chart.getChart(canvas);
  if (!chart) return;
  const colors = { "Rank": "#39d3a1", "Trend Score": "#ecf0ed", "Climax Score": "#ffb641",
    "Stock MDD": "#ff756e", "21D ATR%": "#87b7ff", "Selected-period avg": "#a6b1a9",
    "10EMA": "#87b7ff", "20EMA": "#ffb641", "50EMA": "#39d3a1", "100EMA": "#52c6bb", "200EMA": "#b59af6" };
  for (const dataset of chart.data.datasets) {
    if (dataset.isDailyReturn) continue;
    const label = dataset.label ?? "";
    const color = label.startsWith("Stock Price") ? "#ecf0ed" : label.startsWith("RS Rating") ? "#ff756e" : colors[label];
    if (color) {
      dataset.borderColor = color;
      dataset.backgroundColor = dataset.fill ? `${color}20` : color;
      dataset.pointBackgroundColor = color;
      dataset.pointBorderColor = color;
    }
    if (dataset.ohlc) dataset.candleColors = { up: "#39d3a1", down: "#ff756e", unchanged: "#a6b1a9" };
    if (dataset.isEarningsSurprise && Array.isArray(dataset.backgroundColor)) {
      dataset.backgroundColor = dataset.backgroundColor.map((value) => /dc2626|ff756e/i.test(String(value)) ? "#ff756e" : "#39d3a1");
      dataset.borderColor = dataset.backgroundColor;
    }
    if (label === "Volume" && Array.isArray(dataset.backgroundColor)) {
      dataset.backgroundColor = dataset.backgroundColor.map((value) => /242|f23645|ff756e/i.test(String(value)) ? "#ff756e99" : "#39d3a199");
    }
  }
  for (const [key, scale] of Object.entries(chart.options.scales ?? {})) {
    const color = key === "pct" ? "#ffb641" : key === "eps" ? "#e3a4cc" : key === "usd" ? "#c8d1cb"
      : key === "y" && chart.data.datasets.some((dataset) => (dataset.label ?? "").startsWith("RS Rating")) ? "#ff756e"
      : key === "y" && chart.data.datasets.some((dataset) => dataset.label === "Rank") ? "#39d3a1" : "#b4bfb7";
    scale.ticks.color = color;
    scale.grid.color = "rgba(224,238,227,0.08)";
    scale.border.color = "#414b43";
    if (scale.title) scale.title.color = color;
  }
  const plugins = chart.options.plugins;
  if (chart.data.datasets.some((dataset) => (dataset.label ?? "").startsWith("Stock Price"))) {
    plugins.legend.labels.filter = (item, data) => data.datasets[item.datasetIndex]?.isEarningsSurprise
      || (data.datasets[item.datasetIndex]?.label ?? "").startsWith("Stock Price");
  }
  if (plugins.legend?.labels) plugins.legend.labels.color = "#c5d0c8";
  if (plugins.tooltip) Object.assign(plugins.tooltip, {
    backgroundColor: "#111a14", titleColor: "#f0f4f1", bodyColor: "#e2eae4",
    borderColor: "#58645b", borderWidth: 1, padding: 12,
  });
  chart.update("none");
}

function destroyCompanyChart(canvas) {
  const chart = typeof Chart !== "undefined" && canvas ? Chart.getChart(canvas) : null;
  if (!chart) return;
  const index = charts.indexOf(chart);
  chart.destroy();
  if (index >= 0) charts.splice(index, 1);
}

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
  document.body.classList.toggle("company-workspace", state.tab === "Screening" && state.screeningView === "Company");
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
  state.trendScoreRange = companyTrendRange;
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
  </div><div class="company-series" role="group" aria-label="차트 표시선">${MARKET_RS_CHART_SERIES.map((series) => `<label style="--line-color:var(--rs-${series.key}-color,${series.color})"><input type="checkbox" data-company-series="${series.key}" ${isMarketRsChartSeriesVisible(series.key) ? "checked" : ""} /><i></i>${series.label}</label>`).join("")}</div>`;
}

function renderCompanyAnalysisControls(financial) {
  const groups = [...new Set(COMPANY_FINANCIAL_METRICS.map((metric) => metric.group))];
  const count = financial?.quarters?.length ?? 0;
  return `<div class="company-analysis-controls">${groups.map((group) => `<fieldset class="company-metric-group"><legend>${group}</legend><div>${COMPANY_FINANCIAL_METRICS.filter((metric) => metric.group === group).map((metric) => {
    const available = financial?.quarters?.some((quarter) => companyFinite(quarter[metric.key]) !== null);
    return `<label style="--metric-color:${metric.color}" title="${available ? metric.label : "저장된 데이터 없음"}"><input type="checkbox" data-company-financial="${metric.key}" ${companyFinancialSelected.has(metric.key) ? "checked" : ""} ${available ? "" : "disabled"} /><i></i>${metric.label}</label>`;
  }).join("")}</div></fieldset>`).join("")}
  <div class="company-control-group company-financial-mode" role="group" aria-label="재무 차트 표현">${["3d", "2d"].map(mode => `<button type="button" data-company-financial-mode="${mode}" aria-pressed="${companyFinancialMode === mode}">${mode.toUpperCase()}</button>`).join("")}</div>
  <label class="company-analysis-range">분기<select data-company-financial-range>${[4, 8].filter((value) => value < count).map((value) => `<option value="${value}" ${companyFinancialRange === String(value) ? "selected" : ""}>최근 ${value}분기</option>`).join("")}<option value="all" ${companyFinancialRange === "all" || Number(companyFinancialRange) >= count ? "selected" : ""}>전체 ${count}분기</option></select></label></div>`;
}

function renderCompanyTrendControls() {
  return `<div class="company-analysis-controls"><fieldset class="company-metric-group"><legend>추세 지표</legend><div>${[["Rank","순위","#39d3a1"],["Trend Score","Trend Score","#ecf0ed"],["Climax Score","Climax Score","#ffb641"]].map(([key,label,color]) => `<label style="--metric-color:${color}"><input type="checkbox" data-company-trend="${key}" ${companyTrendSeries[key] ? "checked" : ""} /><i></i>${label}</label>`).join("")}</div></fieldset>
  <div class="company-control-group company-financial-mode" role="group" aria-label="추세 차트 표현">${["3d", "2d"].map(mode => `<button type="button" data-company-trend-mode="${mode}" aria-pressed="${companyTrendMode === mode}">${mode.toUpperCase()}</button>`).join("")}</div>
  <label class="company-analysis-range">추세 기간<select data-company-trend-range>${[["1m","1M"],["3m","3M"],["6m","6M"],["1y","1Y"],["ytd","YTD"],["max","2025~"]].map(([key,label]) => `<option value="${key}" ${companyTrendRange === key ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>`;
}

function enableCompanyDepth(canvas, chart, kind) {
  const getMode = () => kind === "financial" ? companyFinancialMode : companyTrendMode;
  if (getMode() !== "3d") return;
  companyDepthModule ??= import("./company-depth-chart.js?v=20260910-1");
  companyDepthModule.then(module => {
    if (getMode() === "3d" && canvas.isConnected && Chart.getChart(canvas) === chart) module.mountCompanyDepthChart(chart);
  }).catch(error => {
    if (!canvas.isConnected || Chart.getChart(canvas) !== chart) return;
    chart.$companyDepth?.destroy();
    chart.update("none");
    console.warn("Company 3D unavailable; using 2D", error);
    if (kind === "financial") companyFinancialMode = "2d";
    else companyTrendMode = "2d";
    companyDepthModule = undefined;
    companyModal.querySelectorAll(`[data-company-${kind}-mode]`).forEach(button => {
      button.setAttribute("aria-pressed", String(button.getAttribute(`data-company-${kind}-mode`) === "2d"));
      if (button.getAttribute(`data-company-${kind}-mode`) === "3d") button.title = "이 브라우저에서는 3D를 사용할 수 없습니다.";
    });
  });
}

function updateCompanyFinancialTable(row) {
  const section = companyModal.querySelector(".company-financial-section");
  const item = marketRsFinancialsData.financials?.[row.ticker];
  const quarters = companyFinancialQuarters(item);
  const allowedPeriods = new Set(quarters.map((quarter) => quarter.period));
  const columns = new Set([0, 1, ...COMPANY_FINANCIAL_METRICS.filter((metric) => companyFinancialSelected.has(metric.key)).map((metric) => metric.column)]);
  section.querySelectorAll(".market-rs-financial-table tr").forEach((tr) => {
    [...tr.children].forEach((cell, index) => { cell.hidden = !columns.has(index); });
    if (tr.parentElement.tagName === "TBODY") tr.hidden = !allowedPeriods.has(tr.firstElementChild.textContent.trim());
  });
  const caption = section.querySelector(".market-rs-financial-head p");
  if (caption) caption.textContent = `${quarters.length}개 분기 · 기업 회계연도 기준`;
}

function createCompanyFinancialChart(canvas, item) {
  if (!canvas || typeof Chart === "undefined") return;
  destroyCompanyChart(canvas);
  const model = companyFinancialModel(item);
  const empty = companyModal.querySelector("[data-company-financial-empty]");
  canvas.parentElement.hidden = model.datasets.length === 0;
  empty.hidden = model.datasets.length > 0;
  empty.textContent = companyFinancialSelected.size ? "선택한 기간에 공시된 데이터가 없습니다." : "선택된 재무 지표 없음";
  if (!model.datasets.length) return;
  const chart = new Chart(canvas, {
    type: "bar", plugins: [], data: { labels: model.quarters.map((quarter) => quarter.period ?? "-"), datasets: model.datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: {
        filter: (item) => companyFinite(item.dataset.data[item.dataIndex]) !== null,
        callbacks: {
        afterTitle: (items) => { const q = model.quarters[items?.[0]?.dataIndex]; return q ? formatRsFinancialPeriodRange(q.periodStart, q.periodEnd) : ""; },
        label: (context) => {
          const metric = model.metrics.find((entry) => entry.key === context.dataset.metricKey);
          const value = context.parsed.y;
          const formatted = metric.unit === "usd" ? formatRsFinancialUsd(value * 1e9) : metric.unit === "eps" ? formatRsFinancialEps(value) : `${value.toFixed(1)}${metric.suffix ?? "%"}`;
          return `${metric.label}: ${formatted}`;
        },
        afterBody: (items) => {
          const q = model.quarters[items?.[0]?.dataIndex];
          return [...new Set(items.map((entry) => q?.metricSources?.[entry.dataset.metricKey]).filter(Boolean))]
            .flatMap((source) => String(source).match(/.{1,38}(?:\s|$)|.{1,38}/g) ?? []);
        },
      } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 16,
          callback(value) { return this.getLabelForValue(value).replace(/^FY20/, "FY").split(" "); } } },
        ...Object.fromEntries(Object.entries(model.scales).map(([unit, bounds], index) => [unit, {
          position: unit === "usd" || (unit === "eps" && !model.scales.usd) ? "left" : "right",
          min: bounds.min, max: bounds.max,
          title: { display: true, text: unit === "usd" ? "금액 ($B)" : unit === "eps" ? "EPS ($/주)" : model.metrics.some((metric) => metric.suffix === "pp") ? "비율 (%) / 변화 (pp)" : "비율 (%)" },
          ticks: { stepSize: bounds.step, maxTicksLimit: 6, callback: (value) => {
            const number = Number(value).toLocaleString("en-US", { maximumFractionDigits: unit === "eps" || bounds.step < 1 ? 2 : 1 });
            return unit === "usd" ? `$${number}B` : unit === "eps" ? `$${number}` : number;
          } },
          grid: { drawOnChartArea: index === 0 },
        }])),
      },
    },
  });
  charts.push(chart);
  applyCompanyChartTheme(canvas);
  enableCompanyDepth(canvas, chart, "financial");
}

function updateCompanyTrendVisibility(canvas) {
  const chart = typeof Chart !== "undefined" && canvas ? Chart.getChart(canvas) : null;
  if (!chart) return;
  chart.options.plugins.legend.display = false;
  chart.data.datasets.forEach((dataset, index) => chart.setDatasetVisibility(index, Boolean(companyTrendSeries[dataset.label])));
  chart.options.scales.y.display = companyTrendSeries.Rank;
  chart.options.scales.y1.display = companyTrendSeries["Trend Score"] || companyTrendSeries["Climax Score"];
  chart.options.scales.y1.grid.drawOnChartArea = !companyTrendSeries.Rank;
  const visible = Object.values(companyTrendSeries).some(Boolean);
  canvas.parentElement.hidden = !visible;
  companyModal.querySelector("[data-company-trend-empty]").hidden = visible;
  chart.update("none");
}

function bindCompanyAnalysisControls(row, trend) {
  companyModal.querySelectorAll("[data-company-trend-mode]").forEach(button => button.addEventListener("click", () => {
    companyTrendMode = button.dataset.companyTrendMode;
    companyModal.querySelectorAll("[data-company-trend-mode]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.companyTrendMode === companyTrendMode)));
    drawCompanyLazy("trend", row, trend);
  }));
  companyModal.querySelectorAll("[data-company-financial-mode]").forEach(button => button.addEventListener("click", () => {
    companyFinancialMode = button.dataset.companyFinancialMode;
    companyModal.querySelectorAll("[data-company-financial-mode]").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.companyFinancialMode === companyFinancialMode)));
    drawCompanyLazy("financial", row, trend);
  }));
  companyModal.querySelectorAll("[data-company-financial]").forEach((input) => input.addEventListener("change", () => {
    if (input.checked) companyFinancialSelected.add(input.dataset.companyFinancial);
    else companyFinancialSelected.delete(input.dataset.companyFinancial);
    updateCompanyFinancialTable(row);
    drawCompanyLazy("financial", row, trend);
  }));
  companyModal.querySelector("[data-company-financial-range]").addEventListener("change", (event) => {
    companyFinancialRange = event.target.value;
    updateCompanyFinancialTable(row);
    drawCompanyLazy("financial", row, trend);
  });
  companyModal.querySelectorAll("[data-company-trend]").forEach((input) => input.addEventListener("change", () => {
    companyTrendSeries = { ...companyTrendSeries, [input.dataset.companyTrend]: input.checked };
    updateCompanyTrendVisibility(companyModal.querySelector('[data-company-chart="trend"]'));
  }));
  companyModal.querySelector("[data-company-trend-range]").addEventListener("change", (event) => {
    companyTrendRange = event.target.value;
    state.trendScoreRange = companyTrendRange;
    drawCompanyLazy("trend", row, trend);
  });
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
      ${renderCompanyTrendControls()}
      <div class="company-medium-chart"><canvas data-company-chart="trend"></canvas></div>
      <p class="company-chart-empty" data-company-trend-empty hidden>선택된 추세 지표 없음</p>
    </section>
    <section class="company-financial-section" data-company-lazy="financial"><div class="company-section-title"><h3>분기 재무</h3><span>${quarter?.period ?? "-"} · ${quarter?.periodEnd ?? "-"}</span></div>
      <div class="company-financial-metrics">${[["매출",formatRsFinancialUsd(quarter?.revenue)],["매출 YoY",formatRsFinancialPercent(quarter?.revenueYoyPct)],["GPM",formatRsFinancialMargin(quarter?.grossMarginPct)],["OPM",formatRsFinancialMargin(quarter?.operatingMarginPct)]].map(([label,value])=>`<div><span>${label}</span><strong>${value}</strong></div>`).join("")}</div>
      ${renderCompanyAnalysisControls(financial)}
      ${renderMarketRsFinancials(row)}
      <p class="company-chart-empty" data-company-financial-empty hidden></p>
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
  bindCompanyAnalysisControls(row, trend);
  updateCompanyFinancialTable(row);
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
    applyCompanyChartTheme(companyModal.querySelector('[data-rs-chart="mdd"]'));
    applyCompanyChartTheme(companyModal.querySelector('[data-rs-chart="atr"]'));
  } else if (key === "trend" && trend) {
    const canvas = companyModal.querySelector('[data-company-chart="trend"]');
    destroyCompanyChart(canvas);
    createTrendScoreChart(canvas, trend);
    applyCompanyChartTheme(canvas);
    updateCompanyTrendVisibility(canvas);
    const chart = typeof Chart !== "undefined" && canvas ? Chart.getChart(canvas) : null;
    if (chart) enableCompanyDepth(canvas, chart, "trend");
  } else if (key === "financial") {
    const canvas = companyModal.querySelector('[data-canslim-chart="financials"]');
    createCompanyFinancialChart(canvas, marketRsFinancialsData.financials?.[row.ticker]);
  }
}

function drawCompanyCharts(row, trend) {
  const built = [...companyLazyBuilt];
  destroyCharts();
  createMarketRsChart(companyModal.querySelector('[data-rs-chart="detail"]'), row);
  applyCompanyChartTheme(companyModal.querySelector('[data-rs-chart="detail"]'));
  const volume = companyModal.querySelector(".company-volume-chart");
  volume.hidden = !state.rsVolumeVisible;
  if (state.rsVolumeVisible) createMarketRsVolumeChart(volume.querySelector("canvas"), row);
  applyCompanyChartTheme(volume.querySelector("canvas"));
  built.forEach((key) => drawCompanyLazy(key, row, trend));
}

function bindCompanyChartControls(row, trend) {
  const controls = companyModal.querySelector("[data-company-controls]");
  const redraw = () => {
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
