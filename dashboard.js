const companies = window.dashboardCompanies ?? [];
const usOverviewData = window.usOverviewData ?? { quarterLabels: [], m7Quarterly: [] };
const cloudDashboardData = window.cloudDashboardData ?? { labels: [], colors: {}, yoyGrowth: null, margin: null, revenue: null };
const capexDashboardData = window.capexDashboardData ?? {
  quarterLabels: [],
  cashLabels: [],
  annualLabels: [],
  colors: {},
  quarterlyCapex: null,
  quarterlyYoy: null,
  annualCapex: null,
  quarterlyOcf: null,
  quarterlyCapexToOcf: null,
  cashHistory: null,
  debtHistory: null,
  debtToCash: null,
};
const m7PriceData = window.m7PriceData ?? { updatedAt: "", startDate: "2017-01-01", defaultRange: "max", ranges: [], items: {} };
const marketPriceData = window.marketPriceData ?? { updatedAt: "", startDate: "2017-01-01", defaultRange: "max", ranges: [], items: {} };
const marketMacroData = window.marketMacroData ?? { updatedAt: "", startDate: "2017-01-01", defaultRange: "max", ranges: [], panels: {} };
const marketVixData = window.marketVixData ?? {
  updatedAt: "",
  generatedAt: "",
  startDate: "2017-01-01",
  defaultRange: "1y",
  ranges: [],
  source: {},
  family: {},
  curve: {},
  snapshots: [],
};
const macroIndicatorsData = window.macroIndicatorsData ?? { updatedAt: "", commonStartMonth: "2010-04", indicators: [], categories: [] };
const marketRsData = window.marketRsData ?? {
  updatedAt: "",
  benchmark: { symbol: "^GSPC", label: "S&P 500" },
  historyDates: [],
  historyRanges: [],
  universes: {},
  scoring: { label: "", description: "" },
  rows: [],
  histories: {},
};
const memorySpotData = window.memorySpotData ?? { updatedAt: "", source: {}, cadence: {}, groups: [], dashboards: { featuredKeys: [], basketPanels: [] } };
const memorySpotHistoryData = window.memorySpotHistoryData ?? null;
const gpuCloudData = window.gpuCloudData ?? { updatedAt: "", source: {}, items: [], dashboard: {} };
const gpuCloudHistoryData = window.gpuCloudHistoryData ?? null;
const memorySpotRuntime = {
  loading: false,
  loaded: false,
  error: "",
  labels: [],
  updatedAt: "",
  items: {},
};
const GITHUB_REPO_OWNER = "tudoryoon";
const GITHUB_REPO_NAME = "EG_Dashboard";
const gpuCloudRuntime = {
  loading: false,
  loaded: false,
  error: "",
  labels: [],
  updatedAt: "",
  items: {},
};

const primaryTabMeta = {
  DailyBriefing: { label: "Daily Briefing" },
  Market: { label: "Market" },
  BigTech: { label: "Big Tech" },
  Semis: { label: "Semis" },
  Infra: { label: "Infra" },
  Taiwan: { label: "Taiwan", currencies: ["NTD", "USD"], defaultCurrency: "NTD" },
};

const bigTechSubtabMeta = {
  M7: { label: "M7" },
  Cloud: { label: "Cloud" },
  Capex: { label: "Capex & 현금흐름" },
};

const marketSubtabMeta = {
  Overview: { label: "Price" },
  Macro: { label: "Macro" },
  VIX: { label: "VIX" },
  Breadth: { label: "Breadth" },
  RS: { label: "RS" },
};

const semisSubtabMeta = {
  MemorySpot: { label: "Memory Spot" },
  GPUCloud: { label: "GPU Rental Price" },
};
const MARKET_BREADTH_SOURCE_URL = "https://stockbee.blogspot.com/p/mm.html";
const MARKET_BREADTH_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1O6OhS7ciA8zwfycBfGPbP2fWJnR0pn2UUvFZVDP9jpE/pubhtml?widget=true&headers=false";

const marketReferenceItems = [
  {
    name: "S&P 500",
    bucket: "US Large Cap",
    benchmarkTicker: "^GSPC",
    etfTicker: "SPY",
    chartTicker: "SPY",
    description: "Broad US large-cap benchmark with the deepest liquidity and options ecosystem.",
  },
  {
    name: "NASDAQ 100",
    bucket: "US Growth / Tech",
    benchmarkTicker: "^NDX",
    etfTicker: "QQQ",
    chartTicker: "QQQ",
    description: "Mega-cap growth and platform-tech heavy benchmark widely used for AI and software exposure.",
  },
  {
    name: "Dow Jones",
    bucket: "US Blue Chip",
    benchmarkTicker: "^DJI",
    etfTicker: "DIA",
    chartTicker: "DIA",
    description: "Price-weighted blue-chip benchmark representing mature US leaders.",
  },
  {
    name: "Russell 2000",
    bucket: "US Small Cap",
    benchmarkTicker: "^RUT",
    etfTicker: "IWM",
    chartTicker: "IWM",
    description: "Small-cap breadth gauge often used for domestic cyclical and risk-on tracking.",
  },
  {
    name: "M7 Index ETF",
    bucket: "US Mega-cap Theme",
    benchmarkTicker: "MAGS Basket",
    etfTicker: "MAGS",
    chartTicker: "MAGS",
    description: "Concentrated Magnificent 7 ETF for pure mega-cap platform exposure.",
  },
  {
    name: "VanEck Semiconductor ETF",
    bucket: "Semiconductor",
    benchmarkTicker: "MVSMHTR",
    etfTicker: "SMH",
    chartTicker: "SMH",
    description: "Flagship semi ETF covering leading fabless, foundry, memory, and equipment names.",
  },
];

const currencyMeta = {
  NTD: { label: "NT$", decimals: 1, suffix: "B" },
  USD: { label: "$", decimals: 1, suffix: "B" },
};

const yearColors = ["#2563eb", "#7c3aed", "#f59e0b", "#14b8a6", "#d93025", "#0f172a"];
const SERIES_START_YEAR = 2021;
const SERIES_START_MONTH = 1;
const TOTAL_DASHBOARD_COLOR_BY_KEY = {
  "market:sp500": "#111827",
  "market:nasdaq100": "#2563eb",
  "market:dowjones": "#6b7280",
  "market:russell2000": "#8b5cf6",
  "market:smh": "#dc2626",
  "macro:rates:us2y": "#0f766e",
  "macro:rates:us10y": "#14b8a6",
  "macro:rates:us30y": "#06b6d4",
  "macro:rates:jp2y": "#f59e0b",
  "macro:rates:jp10y": "#f97316",
  "macro:rates:jp30y": "#ef4444",
  "macro:dxy:dxy": "#7c3aed",
  "macro:energy:wti": "#16a34a",
  "macro:energy:brent": "#65a30d",
  "macro:metals:gold": "#d4a017",
  "macro:metals:silver": "#94a3b8",
  "macro:metals:copper": "#b45309",
};

const state = {
  tab: "DailyBriefing",
  marketView: "Overview",
  bigTechView: "M7",
  semisView: "MemorySpot",
  currency: "USD",
  sector: "All",
  query: "",
  sort: "marketCapDesc",
  m7PriceRange: m7PriceData.defaultRange ?? "max",
  marketPriceRange: marketPriceData.defaultRange ?? "max",
  marketVixMetricsRange: marketVixData.defaultRange ?? "1y",
  marketVixMetricsCustomStart: "",
  marketVixMetricsCustomEnd: "",
  marketVixFamilyRange: marketVixData.defaultRange ?? "1y",
  marketVixFamilyCustomStart: "",
  marketVixFamilyCustomEnd: "",
  marketMacroRanges: Object.fromEntries(
    Object.keys(marketMacroData?.panels ?? {}).map((key) => [key, marketMacroData.defaultRange ?? "max"]),
  ),
  totalDashboardRange: "3y",
  totalDashboardSelection: [
    "market:sp500",
    "market:smh",
    "macro:rates:us10y",
    "macro:rates:jp10y",
    "macro:dxy:dxy",
    "macro:energy:wti",
    "macro:metals:gold",
  ],
  totalDashboardCustomStart: "",
  totalDashboardCustomEnd: "",
  briefingMapRange: "1d",
  rsUniverse: "all",
  rsHistoryRange: "1y",
  rsSelectedTicker: "",
  rsFilter: "newHigh",
  rsTableSortKey: "rs",
  rsTableSortDirection: "desc",
  macroIndicatorKey: "",
  macroSeriesKey: "",
  macroHistoryMode: "common",
  memorySpotRanges: {},
};

const charts = [];

const searchInput = document.querySelector("#search-input");
const sortSelect = document.querySelector("#sort-select");
const sortBox = document.querySelector(".sortbox");
const countrySwitch = document.querySelector("#country-switch");
const subtabSwitch = document.querySelector("#subtab-switch");
const currencySwitch = document.querySelector("#currency-switch");
const sectorChips = document.querySelector("#sector-chips");
const companyGrid = document.querySelector("#company-grid");
const summaryText = document.querySelector("#summary-text");
const cardTemplate = document.querySelector("#company-card-template");
const usOverviewRoot = document.querySelector("#us-overview");
const toolbarRow = document.querySelector(".toolbar .toolbar-row-filters");
const brandMeta = document.querySelector(".brand-meta");

function formatKstDateTime(dateText) {
  if (!dateText) {
    return "";
  }

  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

async function refreshBrandMeta() {
  if (!brandMeta) {
    return;
  }

  const fallbackDate = [marketPriceData.updatedAt, m7PriceData.updatedAt].filter(Boolean).sort().slice(-1)[0];
  if (fallbackDate) {
    brandMeta.textContent = `Updated ${fallbackDate} KST`;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/commits/main`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    const committedAt = payload?.commit?.committer?.date;
    const formatted = formatKstDateTime(committedAt);
    if (formatted) {
      brandMeta.textContent = `Updated ${formatted} KST`;
    }
  } catch (error) {
    console.warn("Failed to refresh brand meta", error);
  }
}

function formatCompactDollarMillions(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}B`;
  }
  return `$${value.toFixed(0)}M`;
}

function formatShortIsoDate(dateText) {
  if (!dateText) {
    return "-";
  }
  const [year, month] = dateText.split("-");
  return `${year.slice(2)}/${month}`;
}

function formatMonthLabel(monthText) {
  if (!monthText) {
    return "-";
  }
  const [year, month] = monthText.split("-");
  if (!year || !month) {
    return monthText;
  }
  return `${year.slice(2)}/${month}`;
}

function formatRangeAxisDate(dateText, rangeKey) {
  if (!dateText) {
    return "-";
  }
  const [year, month, day] = dateText.split("-");
  if (rangeKey === "1m") {
    return `${month}/${day}`;
  }
  return `${year.slice(2)}/${month}`;
}

function buildMonthlyTickIndexes(labels, maxCount = 10) {
  if (!Array.isArray(labels) || !labels.length) {
    return [];
  }
  const stride = Math.max(1, Math.ceil(labels.length / maxCount));
  const ticks = [];
  for (let index = 0; index < labels.length; index += stride) {
    ticks.push(index);
  }
  const unique = [...new Set(ticks)].sort((a, b) => a - b);
  const deduped = [];
  let lastLabel = "";
  unique.forEach((index) => {
    const label = formatMonthLabel(labels[index]);
    if (label && label !== lastLabel) {
      deduped.push(index);
      lastLabel = label;
    }
  });
  return deduped;
}

function diffUtcDays(startText, endText) {
  const start = new Date(`${startText}T00:00:00Z`);
  const end = new Date(`${endText}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function diffUtcMonths(startText, endText) {
  const start = new Date(`${startText}T00:00:00Z`);
  const end = new Date(`${endText}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  return Math.max(
    0,
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + (end.getUTCMonth() - start.getUTCMonth()),
  );
}

function getRegularTickStep(labels, rangeKey) {
  if (!labels?.length) {
    return { mode: "none", step: 1 };
  }
  if (rangeKey === "1m") {
    return { mode: "days", step: 7 };
  }
  if (rangeKey === "3m" || rangeKey === "6m") {
    return { mode: "months", step: 1 };
  }
  if (rangeKey === "1y") {
    return { mode: "months", step: 2 };
  }
  if (rangeKey === "3y") {
    return { mode: "months", step: 3 };
  }
  if (rangeKey === "5y") {
    return { mode: "months", step: 6 };
  }

  const startLabel = labels[0];
  const endLabel = labels[labels.length - 1];
  const spanDays = diffUtcDays(startLabel, endLabel);
  const spanMonths = diffUtcMonths(startLabel, endLabel);
  if (spanDays <= 45) {
    return { mode: "days", step: 7 };
  }
  if (spanMonths <= 6) {
    return { mode: "months", step: 1 };
  }
  if (spanMonths <= 18) {
    return { mode: "months", step: 2 };
  }
  if (spanMonths <= 48) {
    return { mode: "months", step: 3 };
  }
  if (spanMonths <= 96) {
    return { mode: "months", step: 6 };
  }
  return { mode: "months", step: 12 };
}

function buildRegularDateTickIndexes(labels, rangeKey) {
  if (!labels?.length) {
    return [];
  }

  const config = getRegularTickStep(labels, rangeKey);
  const ticks = [];
  let lastIndex = -1;
  let lastDayTick = null;
  let lastMonthBucket = null;
  const firstDate = new Date(`${labels[0]}T00:00:00Z`);
  const firstMonthBase = firstDate.getUTCFullYear() * 12 + firstDate.getUTCMonth();

  labels.forEach((label, index) => {
    const date = new Date(`${label}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    if (config.mode === "days") {
      if (!lastDayTick || date.getTime() - lastDayTick >= config.step * 86400000) {
        ticks.push(index);
        lastIndex = index;
        lastDayTick = date.getTime();
      }
      return;
    }

    const monthBucket = date.getUTCFullYear() * 12 + date.getUTCMonth();
    const relativeBucket = monthBucket - firstMonthBase;
    if (relativeBucket % config.step !== 0) {
      return;
    }
    if (monthBucket !== lastMonthBucket) {
      ticks.push(index);
      lastIndex = index;
      lastMonthBucket = monthBucket;
    }
  });

  const uniqueTicks = [...new Set(ticks)];
  const dedupedTicks = [];
  let lastLabel = "";
  uniqueTicks.forEach((index) => {
    const label = formatRangeAxisDate(labels[index], rangeKey);
    if (label && label !== lastLabel) {
      dedupedTicks.push(index);
      lastLabel = label;
    }
  });

  return dedupedTicks;
}

function capDateTickIndexes(labels, indexes, rangeKey, maxCount) {
  if (!Array.isArray(indexes) || indexes.length <= maxCount) {
    return indexes;
  }
  if (!Number.isFinite(maxCount) || maxCount < 2) {
    return indexes;
  }

  const stride = Math.max(1, Math.ceil(indexes.length / maxCount));
  const sampled = indexes.filter((_, index) => index % stride === 0);
  const unique = [...new Set(sampled)].sort((a, b) => a - b);
  const deduped = [];
  let lastLabel = "";
  unique.forEach((index) => {
    const label = formatRangeAxisDate(labels[index], rangeKey);
    if (label && label !== lastLabel) {
      deduped.push(index);
      lastLabel = label;
    }
  });
  return deduped;
}

function getMacroTickIndexes(labels, rangeKey, chartWidth = 0) {
  const baseIndexes = buildRegularDateTickIndexes(labels, rangeKey);
  const width = Number(chartWidth) || 0;
  let maxCount = 7;

  if (width && width < 560) {
    maxCount = 4;
  } else if (width && width < 760) {
    maxCount = 5;
  } else if (width && width < 980) {
    maxCount = 6;
  }

  if (rangeKey === "1m") {
    maxCount = Math.min(maxCount, 5);
  } else if (rangeKey === "3m" || rangeKey === "6m") {
    maxCount = Math.min(maxCount, 6);
  }

  return capDateTickIndexes(labels, baseIndexes, rangeKey, maxCount);
}

function shiftDateByRange(dateText, rangeKey, minStartDate = "2017-01-01") {
  if (!dateText || rangeKey === "max") {
    return minStartDate;
  }
  const date = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return minStartDate;
  }

  const rangeMap = {
    "1m": { unit: "month", value: 1 },
    "3m": { unit: "month", value: 3 },
    "6m": { unit: "month", value: 6 },
    "1y": { unit: "year", value: 1 },
    "3y": { unit: "year", value: 3 },
    "5y": { unit: "year", value: 5 },
  };
  const config = rangeMap[rangeKey];
  if (!config) {
    return minStartDate;
  }

  if (config.unit === "month") {
    date.setUTCMonth(date.getUTCMonth() - config.value);
  } else {
    date.setUTCFullYear(date.getUTCFullYear() - config.value);
  }
  return date.toISOString().slice(0, 10);
}

function buildRelativePriceChartPayload(priceData, rangeKey) {
  const items = Object.entries(priceData?.items ?? {});
  const allDates = [...new Set(items.flatMap(([, item]) => item.dates ?? []))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }

  const latestDate = allDates[allDates.length - 1];
  const startDate = shiftDateByRange(latestDate, rangeKey, priceData?.startDate ?? "2017-01-01");
  const selectedLabels = allDates.filter((label) => label >= startDate);

  const datasets = items.map(([key, item]) => {
    const dateIndex = new Map();
    (item.dates ?? []).forEach((date, index) => {
      dateIndex.set(date, index);
    });
    const baseDate = selectedLabels.find((label) => dateIndex.has(label));
    const baseIndex = baseDate ? dateIndex.get(baseDate) : null;
    const baseValue = baseIndex !== null && baseIndex !== undefined ? item.values?.[baseIndex] : null;

    const values = selectedLabels.map((label) => {
      if (!Number.isFinite(baseValue)) {
        return null;
      }
      const pointIndex = dateIndex.get(label);
      if (pointIndex === undefined) {
        return null;
      }
      const pointValue = item.values?.[pointIndex];
      if (!Number.isFinite(pointValue)) {
        return null;
      }
      return Number(((pointValue / baseValue) * 100).toFixed(2));
    });

    return {
      key,
      label: item.label,
      data: values,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: item.isIndex ? 3 : 2.2,
      tension: 0.18,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
    };
  });

  return { labels: selectedLabels, datasets };
}

function createRelativePriceChart(canvas, priceData, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildRelativePriceChartPayload(priceData, rangeKey);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 80;
  const maxValue = allValues.length ? Math.max(...allValues) : 180;
  const yMin = Math.floor((minValue - 5) / 10) * 10;
  const yMax = Math.ceil((maxValue + 5) / 10) * 10;

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: payload.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0).map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => formatRangeAxisDate(payload.labels[value], rangeKey),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}`,
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "Start = 100",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createM7RelativeChart(canvas, rangeKey) {
  createRelativePriceChart(canvas, m7PriceData, rangeKey);
}

function createMarketRelativeChart(canvas, rangeKey) {
  createRelativePriceChart(canvas, marketPriceData, rangeKey);
}

function formatMacroValue(value, formatterKey) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  switch (formatterKey) {
    case "percent2":
      return `${Number(value).toFixed(2)}%`;
    case "dollar1":
      return `$${Number(value).toFixed(1)}`;
    case "number1":
      return Number(value).toFixed(1);
    default:
      return String(value);
  }
}

function formatVixLevel(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(2);
}

function formatVixPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

function getMarketVixUpdatedAt() {
  return [marketVixData.updatedAt, marketPriceData.updatedAt].filter(Boolean).sort().slice(-1)[0] || "-";
}

function getMarketVixBounds(type = "all") {
  const familyDates = Object.values(marketVixData?.family ?? {}).flatMap((item) => item.dates ?? []);
  const metricDates = marketVixData?.curve?.historyDates ?? [];
  const allDates =
    type === "family"
      ? [...new Set(familyDates)].sort()
      : type === "metrics"
        ? [...new Set(metricDates)].sort()
        : [...new Set([...familyDates, ...metricDates])].sort();
  return {
    min: allDates[0] ?? "",
    max: allDates[allDates.length - 1] ?? "",
  };
}

function getMarketVixSelectedWindow(rangeKey, labels, fallbackStartDate, customStart = "", customEnd = "") {
  if (!labels?.length) {
    return { labels: [], startDate: "", endDate: "" };
  }
  const latestDate = labels[labels.length - 1];
  const derivedStartDate = shiftDateByRange(latestDate, rangeKey, fallbackStartDate);
  const startDate = customStart || derivedStartDate;
  const endDate = customEnd || latestDate;
  return {
    labels: labels.filter((label) => label >= startDate && label <= endDate),
    startDate,
    endDate,
  };
}

function buildMarketVixFamilyPayload(rangeKey) {
  const items = Object.entries(marketVixData?.family ?? {});
  const allDates = [...new Set(items.flatMap(([, item]) => item.dates ?? []))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }

  const selectedWindow = getMarketVixSelectedWindow(
    rangeKey,
    allDates,
    marketVixData?.startDate ?? "2018-01-01",
    state.marketVixFamilyCustomStart,
    state.marketVixFamilyCustomEnd,
  );
  const selectedLabels = selectedWindow.labels;

  const datasets = items.map(([key, item]) => {
    const dateIndex = new Map();
    (item.dates ?? []).forEach((date, index) => {
      dateIndex.set(date, index);
    });

    return {
      key,
      label: item.label,
      data: selectedLabels.map((label) => {
        const pointIndex = dateIndex.get(label);
        return pointIndex === undefined ? null : item.values?.[pointIndex] ?? null;
      }),
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: key === "vix" ? 2.8 : 2.2,
      tension: 0.16,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
    };
  });

  return { labels: selectedLabels, datasets };
}

function buildMarketVixMetricsPayload(rangeKey) {
  const curve = marketVixData?.curve ?? {};
  const labels = (curve.historyDates ?? []).filter(Boolean);
  if (!labels.length) {
    return { labels: [], datasets: [] };
  }

  const selectedWindow = getMarketVixSelectedWindow(
    rangeKey,
    labels,
    labels[0],
    state.marketVixMetricsCustomStart,
    state.marketVixMetricsCustomEnd,
  );
  const slicedLabels = selectedWindow.labels;
  const startIndex = labels.findIndex((label) => label === slicedLabels[0]);
  const safeStartIndex = startIndex < 0 ? 0 : startIndex;

  const metrics = curve.metrics ?? {};
  const metricSeries = [
    { key: "spot", label: "VIX Spot", color: "#111827", formatter: "number1", values: metrics.spot ?? [], yAxisID: "y" },
    { key: "m1", label: "M1", color: "#dc2626", formatter: "number1", values: metrics.m1 ?? [], yAxisID: "y" },
    { key: "m2", label: "M2", color: "#2563eb", formatter: "number1", values: metrics.m2 ?? [], yAxisID: "y" },
    {
      key: "m1SpotPremiumPct",
      label: "M1 vs Spot",
      color: "#7c3aed",
      formatter: "percent2",
      values: metrics.m1SpotPremiumPct ?? [],
      yAxisID: "yPremium",
    },
    {
      key: "m2M1PremiumPct",
      label: "M2 vs M1",
      color: "#0f766e",
      formatter: "percent2",
      values: metrics.m2M1PremiumPct ?? [],
      yAxisID: "yPremium",
    },
  ];

  const datasets = metricSeries.map((series) => {
    const data = series.values.slice(safeStartIndex, safeStartIndex + slicedLabels.length);
    return {
      key: series.key,
      label: series.label,
      data,
      rawFormatter: series.formatter,
      borderColor: series.color,
      backgroundColor: series.color,
      borderWidth: series.yAxisID === "y" ? 2.4 : 2.1,
      tension: 0.16,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
      yAxisID: series.yAxisID,
    };
  });

  return { labels: slicedLabels, datasets };
}

function createMarketVixFamilyChart(canvas, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildMarketVixFamilyPayload(rangeKey);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 10;
  const maxValue = allValues.length ? Math.max(...allValues) : 40;
  const spread = Math.max(maxValue - minValue, 2);
  const yMin = Math.max(0, minValue - spread * 0.12);
  const yMax = maxValue + spread * 0.12;

  const selectedTickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const selectedTickSet = new Set(selectedTickIndexes);

  const chart = new Chart(canvas, {
    type: "line",
    data: { labels: payload.labels, datasets: payload.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${formatVixLevel(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = selectedTickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => (selectedTickSet.has(value) ? formatRangeAxisDate(payload.labels[value], rangeKey) : ""),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatVixLevel(value),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "Index level",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createMarketVixMetricsChart(canvas, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildMarketVixMetricsPayload(rangeKey);
  const levelValues = payload.datasets
    .filter((dataset) => dataset.yAxisID === "y")
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const premiumValues = payload.datasets
    .filter((dataset) => dataset.yAxisID === "yPremium")
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));

  const levelMin = levelValues.length ? Math.min(...levelValues) : 10;
  const levelMax = levelValues.length ? Math.max(...levelValues) : 40;
  const levelSpread = Math.max(levelMax - levelMin, 2);
  const premiumMin = premiumValues.length ? Math.min(...premiumValues) : -10;
  const premiumMax = premiumValues.length ? Math.max(...premiumValues) : 15;
  const premiumSpread = Math.max(premiumMax - premiumMin, 4);

  const selectedTickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const selectedTickSet = new Set(selectedTickIndexes);

  const chart = new Chart(canvas, {
    type: "line",
    data: { labels: payload.labels, datasets: payload.datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => {
              const suffix = context.dataset.yAxisID === "yPremium" ? "%" : "";
              return `${context.dataset.label}: ${formatVixLevel(context.parsed.y)}${suffix}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = selectedTickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => (selectedTickSet.has(value) ? formatRangeAxisDate(payload.labels[value], rangeKey) : ""),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: Math.max(0, levelMin - levelSpread * 0.12),
          max: levelMax + levelSpread * 0.12,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatVixLevel(value),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "VIX level",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        yPremium: {
          position: "right",
          min: premiumMin - premiumSpread * 0.12,
          max: premiumMax + premiumSpread * 0.12,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${Number(value).toFixed(1)}%`,
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "Premium / discount",
            color: "#8d8d86",
          },
          grid: { drawOnChartArea: false },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createMarketVixCurveChart(canvas) {
  if (typeof Chart === "undefined") {
    return;
  }

  const curve = marketVixData?.curve ?? {};
  const labels = curve.expiries ?? [];
  const latestCurve = curve.latestCurve ?? [];
  const previousCurve = curve.previousCurve ?? [];
  const allValues = [...latestCurve, ...previousCurve].filter((value) => Number.isFinite(value));
  const minValue = allValues.length ? Math.min(...allValues) : 10;
  const maxValue = allValues.length ? Math.max(...allValues) : 30;
  const spread = Math.max(maxValue - minValue, 2);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `Latest (${curve.latestDate || "-"})`,
          data: latestCurve,
          borderColor: "#111827",
          backgroundColor: "#111827",
          borderWidth: 2.8,
          tension: 0.18,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: `Previous (${curve.previousDate || "-"})`,
          data: previousCurve,
          borderColor: "#9ca3af",
          backgroundColor: "#9ca3af",
          borderWidth: 2.0,
          borderDash: [6, 4],
          tension: 0.18,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatVixLevel(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86", maxRotation: 0, autoSkip: false },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: Math.max(0, minValue - spread * 0.12),
          max: maxValue + spread * 0.12,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatVixLevel(value),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "Settlement",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function getTotalDashboardSeriesItems() {
  const items = [];

  Object.entries(marketPriceData?.items ?? {}).forEach(([key, item]) => {
    items.push({
      key: `market:${key}`,
      group: "Market",
      label: item.label,
      color: item.color,
      dates: item.dates ?? [],
      values: item.values ?? [],
      formatter: "number1",
      rawLabel: item.symbol ?? item.label,
      isRate: false,
    });
  });

  Object.entries(marketMacroData?.panels ?? {}).forEach(([panelKey, panel]) => {
    Object.entries(panel.series ?? {}).forEach(([seriesKey, item]) => {
      items.push({
        key: `macro:${panelKey}:${seriesKey}`,
        group: panel.title,
        label: item.name,
        color: item.color,
        dates: item.dates ?? [],
        values: item.values ?? [],
        formatter: panel.formatter ?? "number1",
        rawLabel: item.name,
        isRate: panelKey === "rates",
      });
    });
  });

  return items.map((item, index) => ({
    ...item,
    color: TOTAL_DASHBOARD_COLOR_BY_KEY[item.key] ?? item.color ?? yearColors[index % yearColors.length],
  }));
}

function getTotalDashboardSelectedItems() {
  const selected = new Set(state.totalDashboardSelection ?? []);
  return getTotalDashboardSeriesItems().filter((item) => selected.has(item.key));
}

function getTotalDashboardBounds() {
  const items = getTotalDashboardSelectedItems();
  const allDates = [...new Set(items.flatMap((item) => item.dates))].sort();
  return {
    min: allDates[0] ?? "",
    max: allDates[allDates.length - 1] ?? "",
    labels: allDates,
  };
}

function buildTotalDashboardPayload(rangeKey) {
  const items = getTotalDashboardSelectedItems();
  const allDates = [...new Set(items.flatMap((item) => item.dates))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }

  const latestDate = allDates[allDates.length - 1];
  const derivedStartDate = shiftDateByRange(latestDate, rangeKey, marketMacroData?.startDate ?? marketPriceData?.startDate ?? "2017-01-01");
  const customStart = state.totalDashboardCustomStart || derivedStartDate;
  const customEnd = state.totalDashboardCustomEnd || latestDate;
  const selectedLabels = allDates.filter((label) => label >= customStart && label <= customEnd);

  const datasets = items.map((item) => {
    const dateIndex = new Map();
    item.dates.forEach((date, index) => {
      dateIndex.set(date, index);
    });

    const baseDate = selectedLabels.find((label) => dateIndex.has(label));
    const baseIndex = baseDate ? dateIndex.get(baseDate) : null;
    const baseValue = baseIndex !== null && baseIndex !== undefined ? item.values[baseIndex] : null;

    const data = selectedLabels.map((label) => {
      const pointIndex = dateIndex.get(label);
      if (pointIndex === undefined) {
        return null;
      }
      const pointValue = item.values[pointIndex];
      if (!Number.isFinite(pointValue)) {
        return null;
      }
      if (item.isRate) {
        return pointValue;
      }
      if (!Number.isFinite(baseValue)) {
        return null;
      }
      return Number(((pointValue / baseValue) * 100).toFixed(2));
    });

    return {
      key: item.key,
      label: item.label,
      data,
      rawDates: item.dates,
      rawValues: item.values,
      rawFormatter: item.formatter,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: item.group === "Market" ? 2.6 : 2.2,
      borderDash: item.isRate ? [7, 5] : [],
      tension: 0.18,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
      yAxisID: item.isRate ? "yYield" : "y",
      isRate: item.isRate,
    };
  });

  return { labels: selectedLabels, datasets };
}

function createTotalDashboardChart(canvas, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildTotalDashboardPayload(rangeKey);
  const leftValues = payload.datasets
    .filter((dataset) => !dataset.isRate)
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const rightValues = payload.datasets
    .filter((dataset) => dataset.isRate)
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const hasRightAxis = rightValues.length > 0;
  const minValue = leftValues.length ? Math.min(...leftValues) : 80;
  const maxValue = leftValues.length ? Math.max(...leftValues) : 180;
  const yMin = Math.floor((minValue - 5) / 10) * 10;
  const yMax = Math.ceil((maxValue + 5) / 10) * 10;

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: payload.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => {
              const dataset = context.dataset;
              const chartIndex = context.dataIndex;
              const rawDate = payload.labels[chartIndex];
              const rawValueIndex = dataset.rawDates?.indexOf(rawDate);
              const rawValue = rawValueIndex >= 0 ? dataset.rawValues?.[rawValueIndex] : null;
              const rawText = Number.isFinite(rawValue) ? formatMacroValue(rawValue, dataset.rawFormatter) : "-";
              if (dataset.isRate) {
                return `${dataset.label}: ${rawText}`;
              }
              const normalized = context.parsed.y;
              return `${dataset.label}: ${normalized.toFixed(1)} | raw ${rawText}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = buildRegularDateTickIndexes(payload.labels, rangeKey).map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => formatRangeAxisDate(payload.labels[value], rangeKey),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}`,
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "Start = 100",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        yYield: {
          display: hasRightAxis,
          position: "right",
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${Number(value).toFixed(2)}%`,
            maxTicksLimit: 6,
          },
          title: {
            display: hasRightAxis,
            text: "Yield (%)",
            color: "#8d8d86",
          },
          grid: { drawOnChartArea: false },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function getMarketMacroPanel(panelKey) {
  return marketMacroData?.panels?.[panelKey] ?? null;
}

function getMarketMacroRange(panelKey) {
  return state.marketMacroRanges?.[panelKey] ?? marketMacroData.defaultRange ?? "max";
}

function buildMarketMacroChartPayload(panel, rangeKey) {
  const seriesEntries = Object.entries(panel?.series ?? {});
  const allDates = [...new Set(seriesEntries.flatMap(([, item]) => item.dates ?? []))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [], mode: panel?.mode ?? "raw" };
  }

  const latestDate = allDates[allDates.length - 1];
  const startDate = shiftDateByRange(latestDate, rangeKey, marketMacroData?.startDate ?? "2017-01-01");
  const selectedLabels = allDates.filter((label) => label >= startDate);

  const datasets = seriesEntries.map(([key, item]) => {
    const dateIndex = new Map();
    (item.dates ?? []).forEach((date, index) => {
      dateIndex.set(date, index);
    });
    const baseDate = selectedLabels.find((label) => dateIndex.has(label));
    const baseIndex = baseDate ? dateIndex.get(baseDate) : null;
    const baseValue = baseIndex !== null && baseIndex !== undefined ? item.values?.[baseIndex] : null;

    const data = selectedLabels.map((label) => {
      const pointIndex = dateIndex.get(label);
      if (pointIndex === undefined) {
        return null;
      }
      const pointValue = item.values?.[pointIndex];
      if (!Number.isFinite(pointValue)) {
        return null;
      }
      if (panel.mode === "normalized") {
        if (!Number.isFinite(baseValue)) {
          return null;
        }
        return Number(((pointValue / baseValue) * 100).toFixed(2));
      }
      return Number(pointValue);
    });

    return {
      key,
      label: item.name,
      data,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: 2.4,
      tension: panel.mode === "normalized" ? 0.18 : 0.12,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: panel.mode === "normalized",
      borderDash: item.dash ?? [],
    };
  });

  return { labels: selectedLabels, datasets, mode: panel.mode ?? "raw" };
}

function createMarketMacroChart(canvas, panelKey, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const panel = getMarketMacroPanel(panelKey);
  if (!panel) {
    return;
  }

  const payload = buildMarketMacroChartPayload(panel, rangeKey);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;

  let yMin;
  let yMax;
  if (panel.mode === "normalized") {
    yMin = Math.floor((minValue - 5) / 10) * 10;
    yMax = Math.ceil((maxValue + 5) / 10) * 10;
  } else {
    const spread = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.15, 1);
    const padding = spread * 0.12;
    yMin = minValue >= 0 ? Math.max(0, minValue - padding) : minValue - padding;
    yMax = maxValue + padding;
  }

  const selectedTickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const selectedTickSet = new Set(selectedTickIndexes);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: payload.datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${formatMacroValue(context.parsed.y, panel.formatter)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = selectedTickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => {
              if (!selectedTickSet.has(value)) {
                return "";
              }
              return formatRangeAxisDate(payload.labels[value], rangeKey);
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatMacroValue(value, panel.formatter),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: panel.yAxisLabel ?? "",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function parseCompanyMonth(monthText) {
  const [yy, mm] = monthText.split("/").map((value) => Number(value));
  return { year: 2000 + yy, month: mm };
}

function latestCompanyMonth() {
  return companies.reduce(
    (latest, company) => {
      const parsed = parseCompanyMonth(company.month);
      if (
        parsed.year > latest.year ||
        (parsed.year === latest.year && parsed.month > latest.month)
      ) {
        return parsed;
      }
      return latest;
    },
    { year: SERIES_START_YEAR, month: SERIES_START_MONTH },
  );
}

function buildMonthlyAxis() {
  const labels = [];
  const latest = latestCompanyMonth();
  let year = SERIES_START_YEAR;
  let month = SERIES_START_MONTH;

  while (year < latest.year || (year === latest.year && month <= latest.month)) {
    labels.push(`${String(year).slice(2)}/${String(month).padStart(2, "0")}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }

  return labels;
}

function buildSeriesForAxis(values, companyMonthText) {
  const labels = buildMonthlyAxis();
  const aligned = new Array(labels.length).fill(null);
  const { year, month } = parseCompanyMonth(companyMonthText);
  const endIndex = (year - SERIES_START_YEAR) * 12 + (month - SERIES_START_MONTH);
  const startIndex = Math.max(0, endIndex - values.length + 1);

  values.forEach((value, index) => {
    const targetIndex = startIndex + index;
    if (targetIndex >= 0 && targetIndex < aligned.length) {
      aligned[targetIndex] = value;
    }
  });

  return { labels, aligned };
}

function formatRevenue(company) {
  const meta = currencyMeta[state.currency];
  const value = company.currency?.[state.currency];
  if (value === undefined || value === null) {
    return "-";
  }
  return `${meta.label}${value.toFixed(meta.decimals)}${meta.suffix}`;
}

function formatMarketCap(company) {
  const meta = currencyMeta[state.currency];
  const value = company.marketCap?.[state.currency];
  if (value === undefined || value === null) {
    return "-";
  }
  return `${meta.label}${value.toFixed(meta.decimals)}${meta.suffix}`;
}

function formatDelta(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function revenueTickLabel(value) {
  const meta = currencyMeta[state.currency];
  return `${meta.label}${Number(value).toFixed(0)}${meta.suffix}`;
}

function companiesByCountry(country) {
  return companies.filter((company) => company.country === country);
}

function activeDashboardKey() {
  if (state.tab === "BigTech") {
    return state.bigTechView;
  }
  if (state.tab === "Taiwan") {
    return "Taiwan";
  }
  return state.tab;
}

function availableSectors() {
  if (state.tab !== "Taiwan") {
    return ["All"];
  }
  return ["All", ...new Set(companiesByCountry("Taiwan").map((company) => company.sector))];
}

function ensureValidSelection() {
  if (state.tab === "Taiwan") {
    const country = primaryTabMeta.Taiwan;
    if (!country.currencies.includes(state.currency)) {
      state.currency = country.defaultCurrency;
    }
  } else {
    state.currency = "USD";
  }
  const sectors = availableSectors();
  if (!sectors.includes(state.sector)) {
    state.sector = "All";
  }
  if (!state.rsSelectedTicker && Array.isArray(marketRsData.rows) && marketRsData.rows.length) {
    state.rsSelectedTicker = marketRsData.rows[0].ticker;
  }
  if (!state.macroIndicatorKey && Array.isArray(macroIndicatorsData.indicators) && macroIndicatorsData.indicators.length) {
    state.macroIndicatorKey = macroIndicatorsData.indicators[0].key;
  }
  const selectedIndicator = macroIndicatorsData.indicators.find((indicator) => indicator.key === state.macroIndicatorKey);
  if (!selectedIndicator && Array.isArray(macroIndicatorsData.indicators) && macroIndicatorsData.indicators.length) {
    state.macroIndicatorKey = macroIndicatorsData.indicators[0].key;
  }
  const safeIndicator = macroIndicatorsData.indicators.find((indicator) => indicator.key === state.macroIndicatorKey);
  if (safeIndicator && !safeIndicator.series.some((series) => series.key === state.macroSeriesKey)) {
    state.macroSeriesKey = safeIndicator.series[0]?.key ?? "";
  }
  if (!["common", "full"].includes(state.macroHistoryMode)) {
    state.macroHistoryMode = "common";
  }
}

function getMacroIndicatorByKey(key) {
  return (macroIndicatorsData.indicators ?? []).find((indicator) => indicator.key === key) ?? null;
}

function getSelectedMacroIndicator() {
  return getMacroIndicatorByKey(state.macroIndicatorKey) ?? (macroIndicatorsData.indicators ?? [])[0] ?? null;
}

function getSelectedMacroSeries(indicator = getSelectedMacroIndicator()) {
  if (!indicator) {
    return null;
  }
  return indicator.series.find((series) => series.key === state.macroSeriesKey) ?? indicator.series[0] ?? null;
}

function formatMacroIndicatorValue(unit, value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (unit === "thousands") {
    if (Math.abs(numeric) >= 1000) {
      return `${(numeric / 1000).toFixed(2)}M`;
    }
    return `${numeric.toFixed(0)}k`;
  }
  if (unit === "usd_millions") {
    return formatCompactDollarMillions(numeric);
  }
  if (unit === "currency") {
    return `$${numeric.toFixed(2)}`;
  }
  if (unit === "percent") {
    return `${numeric.toFixed(2)}%`;
  }
  if (Math.abs(numeric) >= 1000) {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 1 });
  }
  return numeric.toFixed(2);
}

function formatMacroChangePercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
}

function formatMacroDeltaValue(unit, value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric >= 0 ? "+" : "";
  if (unit === "percent") {
    return `${sign}${numeric.toFixed(2)}%p`;
  }
  if (unit === "currency") {
    return `${sign}$${numeric.toFixed(2)}`;
  }
  if (unit === "usd_millions") {
    return `${sign}${formatCompactDollarMillions(Math.abs(numeric)).replace("$", "$")}`;
  }
  return `${sign}${formatMacroIndicatorValue(unit, Math.abs(numeric))}`;
}

function formatMacroReleaseSurpriseText(release) {
  if (!release?.surprise) {
    return "vs cons -";
  }
  return `vs cons ${release.surprise}`;
}

function buildMacroChartPayload(indicator, series, mode) {
  if (!indicator || !series) {
    return { labels: [], values: [] };
  }
  const startMonth = mode === "common" ? macroIndicatorsData.commonStartMonth ?? indicator.commonStartMonth : indicator.availableStartMonth ?? indicator.startMonth;
  const labels = [];
  const values = [];
  (series.dates ?? []).forEach((dateText, index) => {
    if (startMonth && dateText < startMonth) {
      return;
    }
    labels.push(dateText);
    values.push(series.values?.[index] ?? null);
  });
  return { labels, values };
}

function createMacroIndicatorChart(canvas, indicator, series, mode) {
  if (typeof Chart === "undefined" || !canvas || !indicator || !series) {
    return;
  }
  const payload = buildMacroChartPayload(indicator, series, mode);
  const tickIndexes = new Set(buildMonthlyTickIndexes(payload.labels, 9));

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: [
        {
          label: series.label,
          data: payload.values,
          borderColor: series.color ?? "#111827",
          backgroundColor: series.color ?? "#111827",
          borderWidth: 2.5,
          tension: 0.18,
          pointRadius: 0,
          pointHoverRadius: 4,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => formatMonthLabel(items[0]?.label ?? ""),
            label: (context) => `${series.label}: ${formatMacroIndicatorValue(series.unit, context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (_, index) => (tickIndexes.has(index) ? formatMonthLabel(payload.labels[index]) : ""),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatMacroIndicatorValue(series.unit, Number(value)),
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function destroyCharts() {
  charts.splice(0).forEach((chart) => chart.destroy());
}

function parseQuarterLabel(label) {
  const match = /^(\d{2})Q([1-4])$/.exec(label ?? "");
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), quarter: Number(match[2]) };
}

function formatQuarterLabel(year, quarter, prefix = "") {
  return `${prefix}${String(year).padStart(2, "0")}Q${quarter}`;
}

function shiftQuarterLabel(label, quarterOffset, prefix = "") {
  const parsed = parseQuarterLabel(label);
  if (!parsed) {
    return label;
  }

  const absoluteQuarter = parsed.year * 4 + (parsed.quarter - 1) + quarterOffset;
  const year = Math.floor(absoluteQuarter / 4);
  const quarter = (absoluteQuarter % 4) + 1;
  return formatQuarterLabel(year, quarter, prefix);
}

function getCompanyQuarterOffset(company) {
  if (Number.isFinite(company?.quarterOffset)) {
    return company.quarterOffset;
  }
  const companyName = company?.name;
  if (companyName === "Apple") {
    return 1;
  }
  if (companyName === "Microsoft") {
    return 2;
  }
  if (companyName === "NVIDIA") {
    return 3;
  }
  return 0;
}

function getCompanyDisplayQuarterLabels(company, limit = null) {
  const sourceLabels = Array.isArray(company?.labels) ? company.labels : [];
  const selectedLabels = limit ? sourceLabels.slice(-limit) : sourceLabels;
  const quarterOffset = getCompanyQuarterOffset(company);
  const prefix = "FY";
  return selectedLabels.map((label) => shiftQuarterLabel(label, quarterOffset, prefix));
}

function createUsQuarterlyChart(canvas, company) {
  if (typeof Chart === "undefined") {
    return;
  }

  const revenueYoy = company.revenue.map((value, index) => {
    if (Array.isArray(company.revenueYoy) && Number.isFinite(company.revenueYoy[index])) {
      return company.revenueYoy[index];
    }
    if (index < 4) {
      return null;
    }
    return Number((((value - company.revenue[index - 4]) / company.revenue[index - 4]) * 100).toFixed(1));
  });

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: company.displayLabels ?? company.labels,
      datasets: [
        {
          type: "bar",
          label: "Revenue",
          data: company.revenue,
          backgroundColor: "rgba(74, 74, 70, 0.82)",
          borderRadius: 4,
          borderWidth: 0,
          yAxisID: "yRevenue",
        },
        {
          type: "line",
          label: "Revenue YoY%",
          data: revenueYoy,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2.2,
          tension: 0.25,
          pointRadius: 0,
          yAxisID: "yGrowth",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86" },
          border: { color: "#d8d8d2" },
        },
        yRevenue: {
          position: "left",
          ticks: {
            color: "#8d8d86",
            callback: (value) => `$${value}B`,
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        yGrowth: {
          position: "right",
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
          },
          grid: { drawOnChartArea: false },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createCloudLineChart(canvas, panel, formatter, minOverride = null) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    borderColor: cloudDashboardData.colors[series.key],
    backgroundColor: cloudDashboardData.colors[series.key],
    borderWidth: 2.8,
    tension: 0.24,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 10,
    spanGaps: false,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMin = minOverride ?? Math.floor((minValue - 5) / 5) * 5;
  const yMax = Math.ceil((maxValue + 5) / 5) * 5;

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: cloudDashboardData.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatter(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (_, index) => {
              const labels = cloudDashboardData.labels ?? [];
              if (index === 0 || index === labels.length - 1 || index % 2 === 0) {
                return labels[index] ?? "";
              }
              return "";
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatter(value),
            maxTicksLimit: 6,
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createCloudRevenueBarChart(canvas, panel) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    backgroundColor: cloudDashboardData.colors[series.key],
    borderColor: cloudDashboardData.colors[series.key],
    borderWidth: 0,
    borderRadius: 4,
    barPercentage: 0.78,
    categoryPercentage: 0.72,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMax = Math.ceil((maxValue * 1.1) / 5000) * 5000;

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: cloudDashboardData.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatCompactDollarMillions(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: false,
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (_, index) => {
              const labels = cloudDashboardData.labels ?? [];
              if (index === 0 || index === labels.length - 1 || index % 2 === 0) {
                return labels[index] ?? "";
              }
              return "";
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          beginAtZero: true,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatCompactDollarMillions(Number(value)),
            maxTicksLimit: 6,
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createCapexLineChart(canvas, labels, panel, formatter, minOverride = null) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    borderColor: capexDashboardData.colors[series.key],
    backgroundColor: capexDashboardData.colors[series.key],
    borderWidth: 2.6,
    tension: 0.22,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 10,
    spanGaps: false,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMin = minOverride ?? Math.floor((minValue - 5) / 5) * 5;
  const yMax = Math.ceil((maxValue + 5) / 5) * 5;

  const chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          enabled: true,
          callbacks: { label: (context) => `${context.dataset.label}: ${formatter(context.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86", autoSkip: true, maxTicksLimit: 10, maxRotation: 0 },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: "#8d8d86", callback: (value) => formatter(value), maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createCapexBarChart(canvas, labels, panel, formatter) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    backgroundColor: capexDashboardData.colors[series.key],
    borderColor: capexDashboardData.colors[series.key],
    borderWidth: 0,
    borderRadius: 4,
    barPercentage: 0.78,
    categoryPercentage: 0.72,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMin = minValue < 0 ? Math.floor((minValue * 1.1) / 10) * 10 : 0;
  const yMax = Math.ceil((maxValue * 1.1) / 10) * 10;

  const chart = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          enabled: true,
          callbacks: { label: (context) => `${context.dataset.label}: ${formatter(context.parsed.y)}` },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86", autoSkip: true, maxTicksLimit: 10, maxRotation: 0 },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: "#8d8d86", callback: (value) => formatter(value), maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function sumTrailingWindow(values, endIndex, windowSize) {
  let total = 0;
  for (let offset = 0; offset < windowSize; offset += 1) {
    const value = values[endIndex - offset];
    if (!Number.isFinite(value)) {
      return null;
    }
    total += value;
  }
  return total;
}

function buildAnnualBig5CapexPanel() {
  const labels = capexDashboardData.annualLabels ?? [];
  const series = capexDashboardData.annualCapex?.series ?? [];
  const totals = labels.map((_, index) =>
    Number(
      series.reduce((sum, companySeries) => {
        const value = companySeries.values[index];
        return sum + (Number.isFinite(value) ? value : 0);
      }, 0).toFixed(1),
    ),
  );
  const yoy = totals.map((value, index) => {
    if (index === 0 || !Number.isFinite(value) || !Number.isFinite(totals[index - 1]) || totals[index - 1] === 0) {
      return null;
    }
    return Number((((value - totals[index - 1]) / totals[index - 1]) * 100).toFixed(1));
  });

  return {
    labels,
    totals,
    yoy,
  };
}

function buildTtmCapexToOcfPanel() {
  const labels = capexDashboardData.quarterLabels ?? [];
  const capexSeries = capexDashboardData.quarterlyCapex?.series ?? [];
  const ocfSeries = capexDashboardData.quarterlyOcf?.series ?? [];

  const series = capexSeries
    .map((capexCompanySeries) => {
      const ocfCompanySeries = ocfSeries.find((item) => item.key === capexCompanySeries.key);
      if (!ocfCompanySeries) {
        return null;
      }

      const values = labels.map((_, index) => {
        if (index < 3) {
          return null;
        }
        const capexTtm = sumTrailingWindow(capexCompanySeries.values, index, 4);
        const ocfTtm = sumTrailingWindow(ocfCompanySeries.values, index, 4);
        if (!Number.isFinite(capexTtm) || !Number.isFinite(ocfTtm) || ocfTtm === 0) {
          return null;
        }
        return Number(((capexTtm / ocfTtm) * 100).toFixed(1));
      });

      return {
        key: capexCompanySeries.key,
        name: `${capexCompanySeries.name} TTM`,
        values,
      };
    })
    .filter(Boolean);

  return { labels, series };
}

function createCapexAggregateComboChart(canvas, panel) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const maxBarValue = Math.max(...panel.totals.filter((value) => Number.isFinite(value)), 0);
  const yoyValues = panel.yoy.filter((value) => Number.isFinite(value));
  const minYoyValue = yoyValues.length ? Math.min(...yoyValues) : 0;
  const maxYoyValue = yoyValues.length ? Math.max(...yoyValues) : 100;

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: panel.labels,
      datasets: [
        {
          type: "bar",
          label: "BIG5 Capex",
          data: panel.totals,
          backgroundColor: "rgba(74, 74, 70, 0.84)",
          borderColor: "rgba(74, 74, 70, 1)",
          borderWidth: 0,
          borderRadius: 4,
          yAxisID: "yCapex",
        },
        {
          type: "line",
          label: "YoY Growth",
          data: panel.yoy,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2.4,
          tension: 0.22,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 10,
          yAxisID: "yYoy",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              if (context.dataset.yAxisID === "yCapex") {
                return `${context.dataset.label}: $${Number(context.parsed.y).toFixed(1)}B`;
              }
              return `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86", autoSkip: true, maxTicksLimit: 10, maxRotation: 0 },
          border: { color: "#d8d8d2" },
        },
        yCapex: {
          position: "left",
          beginAtZero: true,
          max: Math.ceil((maxBarValue * 1.1) / 25) * 25,
          ticks: { color: "#8d8d86", callback: (value) => `$${Number(value).toFixed(0)}B`, maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        yYoy: {
          position: "right",
          min: Math.floor((minYoyValue - 10) / 10) * 10,
          max: Math.ceil((maxYoyValue + 10) / 10) * 10,
          ticks: { color: "#8d8d86", callback: (value) => `${Number(value).toFixed(0)}%`, maxTicksLimit: 6 },
          grid: { drawOnChartArea: false },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function renderCloudOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  usOverviewRoot.innerHTML = `
    <section class="cloud-overview">
      <div class="us-section-head cloud-section-head">
        <h2>Cloud Dashboard</h2>
        <p>AWS, Microsoft cloud, and Google Cloud trends from the raw Excel sheets</p>
      </div>
      <div class="cloud-panel-grid">
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${cloudDashboardData.yoyGrowth.title}</h3>
              <p>${cloudDashboardData.yoyGrowth.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-cloud-chart="growth"></canvas>
          </div>
        </article>
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${cloudDashboardData.margin.title}</h3>
              <p>${cloudDashboardData.margin.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-cloud-chart="margin"></canvas>
          </div>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${cloudDashboardData.revenue.title}</h3>
              <p>${cloudDashboardData.revenue.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-cloud-chart="revenue"></canvas>
          </div>
        </article>
      </div>
    </section>
  `;

  const growthCanvas = usOverviewRoot.querySelector('[data-cloud-chart="growth"]');
  const marginCanvas = usOverviewRoot.querySelector('[data-cloud-chart="margin"]');
  const revenueCanvas = usOverviewRoot.querySelector('[data-cloud-chart="revenue"]');

  if (growthCanvas) {
    createCloudLineChart(growthCanvas, cloudDashboardData.yoyGrowth, (value) => `${Number(value).toFixed(1)}%`, 0);
  }
  if (marginCanvas) {
    createCloudLineChart(marginCanvas, cloudDashboardData.margin, (value) => `${Number(value).toFixed(1)}%`, -20);
  }
  if (revenueCanvas) {
    createCloudRevenueBarChart(revenueCanvas, cloudDashboardData.revenue);
  }
}

function renderPlaceholderOverview(title, description) {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");
  usOverviewRoot.innerHTML = `
    <section class="placeholder-overview">
      <article class="placeholder-panel">
        <h2>${title}</h2>
        <p>${description}</p>
      </article>
    </section>
  `;
}

function renderMarketBreadthOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");
  usOverviewRoot.innerHTML = `
    <section class="market-breadth-overview">
      <article class="us-panel">
        <div class="us-section-head">
          <div>
            <h2>Market Breadth</h2>
            <p>Stockbee Market Monitor breadth sheet embedded directly so the daily source updates flow through with minimal maintenance.</p>
          </div>
          <div class="market-breadth-actions">
            <a class="market-breadth-link" href="${MARKET_BREADTH_SOURCE_URL}" target="_blank" rel="noreferrer">Open Source Page</a>
            <a class="market-breadth-link" href="${MARKET_BREADTH_SHEET_URL}" target="_blank" rel="noreferrer">Open Sheet</a>
          </div>
        </div>
      </article>
      <article class="us-panel market-breadth-frame-panel">
        <iframe
          class="market-breadth-frame"
          src="${MARKET_BREADTH_SHEET_URL}"
          title="Stockbee Market Breadth"
          loading="lazy"
        ></iframe>
      </article>
    </section>
  `;
}

function formatBriefingTimestamp(value) {
  if (!value) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch (error) {
    return value;
  }
}

function formatBriefingPrice(item) {
  if (!item || !Number.isFinite(Number(item.price))) {
    return "-";
  }
  if (item.currency === "KRW") {
    return `₩${Number(item.price).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}`;
  }
  return formatUsStockPrice(item.price);
}

function formatMoverBriefingKorean(item) {
  if (!item) {
    return "";
  }
  const directionWord = Number(item.dayChangePct) >= 0 ? "상승" : "하락";
  const moveText = formatSignedPercent(item.dayChangePct);
  const sourceText = item.source ? `${item.source} 보도 기준` : "관련 뉴스 기준";
  if (item.headline) {
    return `${item.label}는 오늘 ${moveText} ${directionWord}했습니다. ${sourceText} 주요 재료는 "${item.headline}" 입니다.`;
  }
  return `${item.label}는 오늘 ${moveText} ${directionWord}했습니다. 아직 연결된 핵심 헤드라인을 찾지 못했습니다.`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

function formatBriefingIndexValue(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getBriefingMapRangeMeta(rangeKey) {
  const fallback = { key: "1d", label: "1D" };
  const ranges = window.marketBriefingData?.mapRanges ?? [];
  return ranges.find((range) => range.key === rangeKey) ?? fallback;
}

function getBriefingOverviewReturn(item, rangeKey) {
  if (!item) {
    return null;
  }
  return item.overviewReturns?.[rangeKey] ?? item.dayChangePct ?? null;
}

function getBriefingIndexReturn(item, rangeKey) {
  if (!item) {
    return null;
  }
  const dates = item.dates ?? [];
  const values = item.values ?? [];
  if (!dates.length || !values.length) {
    return null;
  }

  const latestValue = Number(values.at(-1));
  if (!Number.isFinite(latestValue) || latestValue === 0) {
    return null;
  }

  if (rangeKey === "1d") {
    const previousValue = Number(values.at(-2));
    if (!Number.isFinite(previousValue) || previousValue === 0) {
      return null;
    }
    return ((latestValue - previousValue) / previousValue) * 100;
  }

  if (rangeKey === "ytd") {
    const latestDate = dates.at(-1);
    const latestYear = latestDate ? String(latestDate).slice(0, 4) : "";
    const baseIndex = dates.findIndex((date) => String(date).slice(0, 4) === latestYear);
    if (baseIndex < 0) {
      return null;
    }
    const baseValue = Number(values[baseIndex]);
    if (!Number.isFinite(baseValue) || baseValue === 0) {
      return null;
    }
    return ((latestValue - baseValue) / baseValue) * 100;
  }

  const periodMap = {
    "1w": 5,
    "1m": 21,
    "3m": 63,
    "6m": 126,
    "1y": 252,
  };
  const periods = periodMap[rangeKey];
  if (!periods || values.length <= periods) {
    return null;
  }
  const baseValue = Number(values.at(-(periods + 1)));
  if (!Number.isFinite(baseValue) || baseValue === 0) {
    return null;
  }
  return ((latestValue - baseValue) / baseValue) * 100;
}

function getBriefingOverviewColor(item, rangeKey) {
  if (!item) {
    return "#f3f4f6";
  }
  const change = getBriefingOverviewReturn(item, rangeKey);
  if (!Number.isFinite(change)) {
    return "#eef0eb";
  }
  const magnitude = Math.min(Math.abs(change), 25);
  const strength = magnitude / 25;
  if (change > 0) {
    const lightness = 97 - strength * 18;
    const saturation = 48 + strength * 18;
    return `hsl(145, ${saturation}%, ${lightness}%)`;
  }
  if (change < 0) {
    const lightness = 97 - strength * 18;
    const saturation = 56 + strength * 16;
    return `hsl(6, ${saturation}%, ${lightness}%)`;
  }
  return "#eef0eb";
}

function getBriefingOverviewSizeClass(items, item) {
  if (!item) {
    return "cap-sm";
  }
  const maxCap = Math.max(...(items ?? []).map((entry) => Number(entry.marketCapUsd) || 0), 0);
  const itemCap = Number(item.marketCapUsd) || 0;
  if (maxCap <= 0 || itemCap <= 0) {
    return "cap-sm";
  }
  const ratio = itemCap / maxCap;
  if (ratio >= 0.5) {
    return "cap-xl";
  }
  if (ratio >= 0.18) {
    return "cap-lg";
  }
  if (ratio >= 0.06) {
    return "cap-md";
  }
  return "cap-sm";
}

function getBriefingSectorSizeClass(sectors, sector) {
  const totals = (sectors ?? []).map(
    (entry) => (entry.items ?? []).reduce((sum, item) => sum + (Number(item.marketCapUsd) || 0), 0),
  );
  const maxTotal = Math.max(...totals, 0);
  const sectorTotal = (sector?.items ?? []).reduce((sum, item) => sum + (Number(item.marketCapUsd) || 0), 0);
  if (maxTotal <= 0 || sectorTotal <= 0) {
    return "sector-sm";
  }
  const ratio = sectorTotal / maxTotal;
  if (ratio >= 0.7) {
    return "sector-xl";
  }
  if (ratio >= 0.35) {
    return "sector-lg";
  }
  if (ratio >= 0.14) {
    return "sector-md";
  }
  return "sector-sm";
}

function getBriefingOverviewTileSpan(sizeClass) {
  switch (sizeClass) {
    case "cap-xl":
      return { cols: 6, rows: 4, area: 24 };
    case "cap-lg":
      return { cols: 4, rows: 3, area: 12 };
    case "cap-md":
      return { cols: 3, rows: 2, area: 6 };
    default:
      return { cols: 2, rows: 2, area: 4 };
  }
}

function getBriefingSectorLayout(sectors, sector) {
  return { sizeClass: "sector-uniform", cols: 3 };
}

function renderMarketBriefingOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const briefing = window.marketBriefingData ?? null;
  if (!briefing) {
    renderPlaceholderOverview("Daily Market Briefing", "브리핑 데이터가 아직 준비되지 않았습니다.");
    return;
  }

  const selectedBriefingRangeMeta = getBriefingMapRangeMeta(state.briefingMapRange);
  const briefingRangeChips = (briefing.mapRanges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="market-rs-chip briefing-range-chip${state.briefingMapRange === range.key ? " active" : ""}"
          data-briefing-range="${range.key}"
        >${range.label}</button>
      `,
    )
    .join("");

  const sectorPanels = (briefing.sectorPanels ?? [])
    .map((sector) => {
      const tiles = (sector.items ?? [])
        .map((item) => {
          const changeClass = Number(item.dayChangePct) > 0 ? "is-up" : Number(item.dayChangePct) < 0 ? "is-down" : "";
          return `
            <article
              class="briefing-tile ${item.tileClass ?? "sm"} ${changeClass}"
              style="background:${item.mapColor ?? "#f3f4f6"}"
              title="${item.name} / ${formatSignedPercent(item.dayChangePct)}"
            >
              <span class="briefing-tile-ticker">${item.label}</span>
              <strong class="briefing-tile-name">${item.name}</strong>
              <span class="briefing-tile-cap">${formatMarketCapCompact(item.marketCapUsd)}</span>
              <span class="briefing-tile-change">${formatSignedPercent(item.dayChangePct)}</span>
            </article>
          `;
        })
        .join("");

      return `
        <article class="us-panel briefing-sector-panel">
          <div class="us-section-head">
            <div>
              <h3>${sector.label}</h3>
              <p>${(sector.items ?? []).length} names</p>
            </div>
          </div>
          <div class="briefing-heatmap-grid">${tiles}</div>
        </article>
      `;
    })
    .join("");

  const combinedSectorMarkup = (briefing.sectorPanels ?? [])
    .map((sector) => {
      const sectorLayout = getBriefingSectorLayout(briefing.sectorPanels ?? [], sector);
      const sectorTiles = (sector.items ?? [])
        .slice()
        .sort((left, right) => (right.marketCapUsd ?? 0) - (left.marketCapUsd ?? 0))
        .map((item) => {
          const overviewChange = getBriefingOverviewReturn(item, state.briefingMapRange);
          const changeClass = Number(overviewChange) > 0 ? "is-up" : Number(overviewChange) < 0 ? "is-down" : "";
          const sizeClass = getBriefingOverviewSizeClass(sector.items ?? [], item);
          return `
            <article
              class="briefing-tile briefing-tile-overview ${sizeClass} ${changeClass}"
              style="background:${getBriefingOverviewColor(item, state.briefingMapRange)}"
            >
              <span class="briefing-tile-ticker">${item.label}</span>
              <span class="briefing-tile-change">${formatSignedPercent(overviewChange)}</span>
              <span class="briefing-tile-price">${formatBriefingPrice(item)}</span>
              <span class="briefing-tile-cap">${formatMarketCapCompact(item.marketCapUsd)}</span>
              <div class="briefing-tile-tooltip">
                <strong>${item.name}</strong>
                <span>${sector.label}</span>
                <span>${selectedBriefingRangeMeta.label} return ${formatSignedPercent(overviewChange)}</span>
                <span>Price ${formatBriefingPrice(item)}</span>
                <span>Market cap ${formatMarketCapCompact(item.marketCapUsd)}</span>
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section
          class="briefing-total-sector-block ${sectorLayout.sizeClass}"
        >
          <div class="briefing-total-sector-head">
            <strong>${sector.label}</strong>
            <span>${(sector.items ?? []).length} names</span>
          </div>
          <div class="briefing-heatmap-grid briefing-heatmap-grid-total-sector">${sectorTiles}</div>
        </section>
      `;
    })
    .join("");

  const briefingIndexConfigs = [
    { key: "dowjones", label: "Dow Jones" },
    { key: "sp500", label: "S&P 500" },
    { key: "nasdaq100", label: "NASDAQ 100" },
    { key: "russell2000", label: "Russell 2000" },
  ];

  const indexMarkup = briefingIndexConfigs
    .map(({ key, label }) => {
      const item = window.marketPriceData?.items?.[key];
      const dates = item?.dates ?? [];
      const values = item?.values ?? [];
      const latestValue = values.at(-1);
      const latestDate = dates.at(-1);
      const rangeReturn = getBriefingIndexReturn(item, state.briefingMapRange);
      const changeClass =
        Number(rangeReturn) > 0 ? "is-up" : Number(rangeReturn) < 0 ? "is-down" : "";

      return `
        <article class="briefing-index-card ${changeClass}">
          <div class="briefing-index-head">
            <span class="briefing-index-label">${label}</span>
            <span class="briefing-index-date">${formatShortIsoDate(latestDate)}</span>
          </div>
          <strong class="briefing-index-value">${formatBriefingIndexValue(latestValue)}</strong>
          <div class="briefing-index-change-row">
            <span class="briefing-index-change">${formatSignedPercent(rangeReturn)}</span>
            <span class="briefing-index-caption">${selectedBriefingRangeMeta.label} return</span>
          </div>
        </article>
      `;
    })
    .join("");

  const newsMarkup = (briefing.majorNews ?? [])
    .map(
      (item) => `
        <a class="briefing-news-card" href="${item.link}" target="_blank" rel="noreferrer">
          <span class="briefing-news-bucket">${item.bucket}</span>
          <strong>${item.title}</strong>
          <div class="briefing-news-meta">
            <span>${item.source || "Source"}</span>
            <span>${formatBriefingTimestamp(item.publishedAt)}</span>
          </div>
        </a>
      `,
    )
    .join("");

  const moversMarkup = (briefing.movers ?? [])
    .map(
      (item) => `
        <article class="briefing-mover-card ${item.direction === "up" ? "is-up" : "is-down"}">
          <div class="briefing-mover-head">
            <div>
              <h3>${item.label}</h3>
              <p>${item.sectorLabel}</p>
            </div>
            <div class="briefing-mover-stats">
              <strong>${formatSignedPercent(item.dayChangePct)}</strong>
              <span>${formatBriefingPrice(item)}</span>
            </div>
          </div>
          <p class="briefing-mover-cap">Market Cap ${formatMarketCapCompact(item.marketCapUsd)}</p>
          <p class="briefing-mover-brief">${formatMoverBriefingKorean(item)}</p>
          <p class="briefing-mover-headline">${item.headline || "관련 뉴스 헤드라인을 아직 찾지 못했습니다."}</p>
          <div class="briefing-news-meta">
            <span>${item.source || "Source"}</span>
            <span>${formatBriefingTimestamp(item.publishedAt)}</span>
          </div>
          ${item.link ? `<a class="briefing-mover-link" href="${item.link}" target="_blank" rel="noreferrer">Open source news</a>` : ""}
        </article>
      `,
    )
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-briefing-overview">
      <article class="us-panel">
        <div class="us-section-head">
          <div>
            <h2>Daily Market Briefing</h2>
            <p>주요 지수 흐름, 섹터별 종목 맵, 핵심 뉴스, 급등락 종목 브리핑을 한 화면에서 빠르게 확인합니다.</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${briefing.updatedAt ?? "-"}</span>
            <span class="market-rs-pill">${(briefing.majorNews ?? []).length} key stories</span>
            <span class="market-rs-pill">${(briefing.movers ?? []).length} movers</span>
          </div>
        </div>
        <div class="briefing-legend">
          <span>${briefing.mapLegend?.positive ?? ""}</span>
          <span>${briefing.mapLegend?.negative ?? ""}</span>
          <span>${briefing.mapLegend?.size ?? ""}</span>
        </div>
      </article>

      <article class="us-panel briefing-index-panel">
        <div class="us-section-head">
          <div>
            <h2>미국 주요 지수</h2>
            <p>다우, S&amp;P 500, 나스닡 100, 러셀 2000의 최신 레벨과 등락을 바로 확인합니다.</p>
          </div>
        </div>
        <div class="briefing-index-grid">${indexMarkup}</div>
      </article>

      <article class="us-panel briefing-total-map-panel">
        <div class="us-section-head">
          <div>
            <h2>전체 맵</h2>
            <p>Finviz처럼 섹터 경계를 먼저 나누고, 각 섹터 안 종목의 수익률 흐름을 한눈에 비교합니다.</p>
          </div>
          <div class="briefing-range-chip-row">${briefingRangeChips}</div>
        </div>
        <p class="briefing-mini-map-caption">Mini map basis: ${selectedBriefingRangeMeta.label} 수익률</p>
        <div class="briefing-total-sector-grid">${combinedSectorMarkup}</div>
      </article>

      <section class="briefing-sector-stack">
        ${sectorPanels}
      </section>

      <section class="briefing-news-layout">
        <article class="us-panel">
          <div class="us-section-head">
            <div>
              <h2>주요 뉴스</h2>
              <p>오늘 시장 흐름에 영향을 줄 만한 3~5개 핵심 헤드라인입니다.</p>
            </div>
          </div>
          <div class="briefing-news-grid">${newsMarkup || '<p class="market-rs-empty">뉴스를 아직 불러오지 못했습니다.</p>'}</div>
        </article>

        <article class="us-panel">
          <div class="us-section-head">
            <div>
              <h2>종목 브리핑</h2>
              <p>맵 안에서 크게 오른 종목과 많이 빠진 종목을 함께 묶어, 연결된 재료를 한글 문장으로 정리했습니다.</p>
            </div>
          </div>
          <div class="briefing-mover-grid">${moversMarkup || '<p class="market-rs-empty">급등락 종목 브리핑을 아직 불러오지 못했습니다.</p>'}</div>
        </article>
      </section>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-briefing-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.briefingMapRange = button.dataset.briefingRange;
      render();
    });
  });
}

function formatRsNumber(value, digits = 0) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(digits);
}

function formatRsPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

function formatRsGapPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatMarketCapCompact(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (numeric >= 1_000_000_000_000) {
    return `$${(numeric / 1_000_000_000_000).toFixed(2)}T`;
  }
  return `$${(numeric / 1_000_000_000).toFixed(1)}B`;
}

function formatUsStockPrice(value, maximumFractionDigits = 2) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value));
}

function getMarketRsUniverseLabel(key) {
  return marketRsData?.universes?.[key]?.label ?? "All";
}

function getMarketRsUniverseScore(row, universeKey) {
  if (universeKey === "sp500") {
    return row.rsRatingSp500;
  }
  if (universeKey === "nasdaq100") {
    return row.rsRatingNasdaq100;
  }
  if (universeKey === "dowjones") {
    return row.rsRatingDowjones;
  }
  if (universeKey === "russell2000") {
    return row.rsRatingRussell2000;
  }
  return row.rsRatingAll;
}

function getMarketRsUniverseNewHigh(row, universeKey) {
  if (universeKey === "sp500") {
    return Boolean(row.rsNewHighSp500);
  }
  if (universeKey === "nasdaq100") {
    return Boolean(row.rsNewHighNasdaq100);
  }
  if (universeKey === "dowjones") {
    return Boolean(row.rsNewHighDowjones);
  }
  if (universeKey === "russell2000") {
    return Boolean(row.rsNewHighRussell2000);
  }
  return Boolean(row.rsNewHighAll ?? row.rsNewHigh);
}

function getMarketRsHistoryRatings(history, universeKey) {
  if (!history) {
    return [];
  }
  if (universeKey === "sp500") {
    return history.rsRatingSp500 ?? history.rsRating ?? [];
  }
  if (universeKey === "nasdaq100") {
    return history.rsRatingNasdaq100 ?? history.rsRating ?? [];
  }
  if (universeKey === "dowjones") {
    return history.rsRatingDowjones ?? history.rsRating ?? [];
  }
  if (universeKey === "russell2000") {
    return history.rsRatingRussell2000 ?? history.rsRating ?? [];
  }
  return history.rsRatingAll ?? history.rsRating ?? [];
}

function getVisibleMarketRsRows() {
  const query = (state.query ?? "").trim().toLowerCase();
  return (marketRsData.rows ?? [])
    .filter((row) => {
      if (state.rsUniverse === "sp500" && !row.memberships?.sp500) {
        return false;
      }
      if (state.rsUniverse === "nasdaq100" && !row.memberships?.nasdaq100) {
        return false;
      }
      if (state.rsUniverse === "dowjones" && !row.memberships?.dowjones) {
        return false;
      }
      if (state.rsUniverse === "russell2000" && !row.memberships?.russell2000) {
        return false;
      }
      if (!query) {
        return state.rsFilter !== "newHigh" || getMarketRsUniverseNewHigh(row, state.rsUniverse);
      }
      const ticker = row.ticker?.toLowerCase?.() ?? "";
      const matchesQuery = ticker.includes(query);
      if (!matchesQuery) {
        return false;
      }
      return state.rsFilter !== "newHigh" || getMarketRsUniverseNewHigh(row, state.rsUniverse);
    })
    .sort((left, right) => {
      if (query) {
        const leftTicker = String(left.ticker ?? "").toLowerCase();
        const rightTicker = String(right.ticker ?? "").toLowerCase();
        const scoreMatch = (ticker) => {
          if (ticker === query) {
            return 3;
          }
          if (ticker.startsWith(query)) {
            return 2;
          }
          if (ticker.includes(query)) {
            return 1;
          }
          return 0;
        };
        const leftMatchScore = scoreMatch(leftTicker);
        const rightMatchScore = scoreMatch(rightTicker);
        if (rightMatchScore !== leftMatchScore) {
          return rightMatchScore - leftMatchScore;
        }
      }
      const leftScore = getMarketRsUniverseScore(left, state.rsUniverse) ?? -Infinity;
      const rightScore = getMarketRsUniverseScore(right, state.rsUniverse) ?? -Infinity;
      if (rightScore !== leftScore) {
        return rightScore - leftScore;
      }
      return String(left.ticker).localeCompare(String(right.ticker));
    });
}

function getSelectedMarketRsRow(rows) {
  return rows.find((row) => row.ticker === state.rsSelectedTicker) ?? rows[0] ?? null;
}

function getMarketRsTableSortValue(row, sortKey) {
  switch (sortKey) {
    case "ticker":
      return row.ticker ?? "";
    case "name":
      return row.name ?? "";
    case "marketCap":
      return row.marketCap ?? Number.NEGATIVE_INFINITY;
    case "rs":
      return getMarketRsUniverseScore(row, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
    case "1m":
      return row.returns?.["1m"] ?? Number.NEGATIVE_INFINITY;
    case "3m":
      return row.returns?.["3m"] ?? Number.NEGATIVE_INFINITY;
    case "6m":
      return row.returns?.["6m"] ?? Number.NEGATIVE_INFINITY;
    case "12m":
      return row.returns?.["12m"] ?? Number.NEGATIVE_INFINITY;
    case "gap52w":
      return row.distanceTo52wHighPct ?? Number.POSITIVE_INFINITY;
    case "rsNewHigh":
      return getMarketRsUniverseNewHigh(row, state.rsUniverse) ? 1 : 0;
    default:
      return getMarketRsUniverseScore(row, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
  }
}

function sortMarketRsTableRows(rows) {
  const direction = state.rsTableSortDirection === "asc" ? 1 : -1;
  const sortKey = state.rsTableSortKey ?? "rs";
  return [...rows].sort((left, right) => {
    const leftValue = getMarketRsTableSortValue(left, sortKey);
    const rightValue = getMarketRsTableSortValue(right, sortKey);

    if (typeof leftValue === "string" || typeof rightValue === "string") {
      const comparison = String(leftValue).localeCompare(String(rightValue));
      if (comparison !== 0) {
        return comparison * direction;
      }
    } else if (rightValue !== leftValue) {
      return (leftValue < rightValue ? -1 : 1) * direction;
    }

    const leftScore = getMarketRsUniverseScore(left, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
    const rightScore = getMarketRsUniverseScore(right, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    return (left.ticker ?? "").localeCompare(right.ticker ?? "");
  });
}

function renderMarketRsSortHeader(label, sortKey) {
  const active = state.rsTableSortKey === sortKey;
  const arrow = !active ? "" : state.rsTableSortDirection === "asc" ? " ↑" : " ↓";
  return `<button type="button" class="market-rs-sort${active ? " active" : ""}" data-rs-sort="${sortKey}">${label}${arrow}</button>`;
}

function createMarketRsChart(canvas, row) {
  if (typeof Chart === "undefined" || !row) {
    return;
  }
  const history = marketRsData.histories?.[row.ticker];
  const labels = marketRsData.historyDates ?? [];
  if (!history || !labels.length) {
    return;
  }

  const minStart = labels[0];
  const latestDate = labels[labels.length - 1];
  const startDate = shiftDateByRange(latestDate, state.rsHistoryRange, minStart);
  const startIndex = Math.max(0, labels.findIndex((label) => label >= startDate));
  const selectedLabels = labels.slice(startIndex);
  const selectedRatings = getMarketRsHistoryRatings(history, state.rsUniverse).slice(startIndex);
  const selectedPrice = (history.price ?? []).slice(startIndex);
  const ratingValues = selectedRatings.filter((value) => Number.isFinite(value));
  const priceValues = selectedPrice.filter((value) => Number.isFinite(value));
  let ratingMin = ratingValues.length ? Math.floor((Math.min(...ratingValues) - 3) / 5) * 5 : 1;
  let ratingMax = ratingValues.length ? Math.ceil((Math.max(...ratingValues) + 3) / 5) * 5 : 99;
  if (ratingMax - ratingMin < 12) {
    const mid = (ratingMax + ratingMin) / 2;
    ratingMin = Math.floor((mid - 6) / 5) * 5;
    ratingMax = Math.ceil((mid + 6) / 5) * 5;
  }
  ratingMin = Math.max(1, ratingMin);
  ratingMax = Math.min(99, ratingMax);
  let priceMin = priceValues.length ? Math.min(...priceValues) : (row.price ?? 0);
  let priceMax = priceValues.length ? Math.max(...priceValues) : (row.price ?? 0);
  if (Number.isFinite(priceMin) && Number.isFinite(priceMax)) {
    if (priceMin === priceMax) {
      const pad = Math.max(1, priceMax * 0.05);
      priceMin -= pad;
      priceMax += pad;
    } else {
      const pad = (priceMax - priceMin) * 0.08;
      priceMin = Math.max(0, priceMin - pad);
      priceMax += pad;
    }
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: selectedLabels,
      datasets: [
        {
          label: `RS Rating (${getMarketRsUniverseLabel(state.rsUniverse)})`,
          data: selectedRatings,
          borderColor: "#111827",
          backgroundColor: "#111827",
          borderWidth: 2.6,
          tension: 0.18,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: "y",
        },
        {
          label: "Stock Price",
          data: selectedPrice,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2,
          tension: 0.18,
          pointRadius: 0,
          pointHoverRadius: 4,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.label ?? "",
            label: (context) => {
              if (context.dataset.yAxisID === "y") {
                return `${context.dataset.label}: ${Number(context.parsed.y).toFixed(0)}`;
              }
              return `${context.dataset.label}: ${formatUsStockPrice(Number(context.parsed.y))}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            const indexes = buildRegularDateTickIndexes(selectedLabels, state.rsHistoryRange);
            axis.ticks = indexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8a8a83",
            autoSkip: false,
            maxRotation: 0,
            callback: (_, index, ticks) => {
              const labelIndex = ticks?.[index]?.value;
              return formatRangeAxisDate(selectedLabels[labelIndex], state.rsHistoryRange);
            },
          },
        },
        y: {
          position: "left",
          min: ratingMin,
          max: ratingMax,
          grid: { color: "rgba(28,28,26,0.08)" },
          ticks: {
            color: "#66665f",
            stepSize: ratingMax - ratingMin <= 20 ? 5 : 10,
            callback: (value) => value,
          },
        },
        y1: {
          position: "right",
          min: priceMin,
          max: priceMax,
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#a12620",
            callback: (value) => formatUsStockPrice(Number(value), value >= 100 ? 0 : 2),
          },
        },
      },
    },
  });

  charts.push(chart);
}

function renderMarketRsOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  const rows = getVisibleMarketRsRows();
  const selected = getSelectedMarketRsRow(rows);
  if (selected) {
    state.rsSelectedTicker = selected.ticker;
  }

  const universeChips = Object.entries(marketRsData.universes ?? {})
    .map(
      ([key, meta]) => `
        <button
          type="button"
          class="market-rs-chip${state.rsUniverse === key ? " active" : ""}"
          data-rs-universe="${key}"
        >${meta.label}</button>
      `,
    )
    .join("");
  const rangeChips = (marketRsData.historyRanges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="market-rs-chip${state.rsHistoryRange === range.key ? " active" : ""}"
          data-rs-range="${range.key}"
        >${range.label}</button>
      `,
    )
    .join("");
  const filterChips = `
    <button type="button" class="market-rs-chip${state.rsFilter === "all" ? " active" : ""}" data-rs-filter="all">All</button>
    <button type="button" class="market-rs-chip${state.rsFilter === "newHigh" ? " active" : ""}" data-rs-filter="newHigh">RS New High</button>
  `;
  const tableSortRows = sortMarketRsTableRows(rows);
  const leaderCards = rows
    .slice(0, 12)
    .map((row) => {
      const score = getMarketRsUniverseScore(row, state.rsUniverse);
      return `
        <button
          type="button"
          class="market-rs-card${state.rsSelectedTicker === row.ticker ? " active" : ""}"
          data-rs-ticker="${row.ticker}"
        >
          <div class="market-rs-card-top">
            <span class="market-rs-card-ticker">${row.ticker}</span>
            <span class="market-rs-card-score">${formatRsNumber(score)}</span>
          </div>
          <p class="market-rs-card-name">${row.name}</p>
          <p class="market-rs-card-cap">${formatMarketCapCompact(row.marketCap)}</p>
          <div class="market-rs-card-meta">
            <span>1M</span>
            <strong>${formatRsPercent(row.returns?.["1m"])}</strong>
          </div>
          <div class="market-rs-card-meta">
            <span>12M</span>
            <strong>${formatRsPercent(row.returns?.["12m"])}</strong>
          </div>
          ${getMarketRsUniverseNewHigh(row, state.rsUniverse) ? '<div class="market-rs-flag">RS New High</div>' : ""}
        </button>
      `;
    })
    .join("");
  const tableRows = tableSortRows
    .map((row) => {
      const score = getMarketRsUniverseScore(row, state.rsUniverse);
      return `
        <tr data-rs-ticker="${row.ticker}">
          <td>${row.ticker}</td>
          <td>${row.name}</td>
          <td>${formatMarketCapCompact(row.marketCap)}</td>
          <td>${formatRsNumber(score)}</td>
          <td>${formatRsPercent(row.returns?.["1m"])}</td>
          <td>${formatRsPercent(row.returns?.["3m"])}</td>
          <td>${formatRsPercent(row.returns?.["6m"])}</td>
          <td>${formatRsPercent(row.returns?.["12m"])}</td>
          <td>${formatRsGapPercent(row.distanceTo52wHighPct)}</td>
          <td>${getMarketRsUniverseNewHigh(row, state.rsUniverse) ? "Yes" : "-"}</td>
        </tr>
      `;
    })
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-rs-overview">
      <article class="us-panel">
        <div class="us-section-head market-rs-head">
          <div>
            <h2>Relative Strength</h2>
            <p>${marketRsData.scoring?.description ?? ""}</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${marketRsData.updatedAt ?? "-"}</span>
            <span class="market-rs-pill">${rows.length} names</span>
            <span class="market-rs-pill">${rows.filter((row) => getMarketRsUniverseNewHigh(row, state.rsUniverse)).length} RS highs</span>
            <span class="market-rs-pill">Sorted 99 → 1</span>
          </div>
        </div>
        <div class="market-rs-controls">
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Universe</span>
            <div class="market-rs-chip-row">${universeChips}</div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Detail Range</span>
            <div class="market-rs-chip-row">${rangeChips}</div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Filter</span>
            <div class="market-rs-chip-row">${filterChips}</div>
          </div>
        </div>
      </article>

      <section class="market-rs-layout">
        <article class="us-panel market-rs-leaders">
          <div class="us-section-head">
            <div>
              <h2>RS Leaders</h2>
              <p>${getMarketRsUniverseLabel(state.rsUniverse)} universe leaders by RS Rating.</p>
            </div>
          </div>
          <div class="market-rs-card-grid">${leaderCards || '<p class="market-rs-empty">검색 결과가 없습니다.</p>'}</div>
        </article>

        <article class="us-panel market-rs-detail">
          <div class="us-section-head">
            <div>
              <h2>${selected?.ticker ?? "-"}</h2>
              <p>${selected?.name ?? "Select a ticker from the table or search box."}</p>
            </div>
            <span class="market-rs-detail-score">${formatRsNumber(getMarketRsUniverseScore(selected ?? {}, state.rsUniverse))}</span>
          </div>
          <div class="market-rs-metrics">
            <div class="market-rs-metric">
              <span>RS Rating</span>
              <strong>${formatRsNumber(getMarketRsUniverseScore(selected ?? {}, state.rsUniverse))}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Market Cap</span>
              <strong>${formatMarketCapCompact(selected?.marketCap)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>1M</span>
              <strong>${formatRsPercent(selected?.returns?.["1m"])}</strong>
            </div>
            <div class="market-rs-metric">
              <span>3M</span>
              <strong>${formatRsPercent(selected?.returns?.["3m"])}</strong>
            </div>
            <div class="market-rs-metric">
              <span>12M</span>
              <strong>${formatRsPercent(selected?.returns?.["12m"])}</strong>
            </div>
          </div>
          <div class="chart-wrap market-rs-chart-wrap">
            <canvas data-rs-chart="detail"></canvas>
          </div>
          <p class="market-rs-chart-caption">Left axis: current-universe RS Rating 1-99. Right axis: stock price.</p>
        </article>
      </section>

      <article class="us-panel market-rs-table-panel">
        <div class="us-section-head">
          <div>
            <h2>Full RS Table</h2>
            <p>Search from the top bar, then click any row to inspect the stock-level daily RS trend.</p>
          </div>
        </div>
        <div class="market-rs-table-wrap">
          <table class="market-rs-table">
            <thead>
              <tr>
                <th>${renderMarketRsSortHeader("Ticker", "ticker")}</th>
                <th>${renderMarketRsSortHeader("Name", "name")}</th>
                <th>${renderMarketRsSortHeader("Market Cap", "marketCap")}</th>
                <th>${renderMarketRsSortHeader("RS", "rs")}</th>
                <th>${renderMarketRsSortHeader("1M", "1m")}</th>
                <th>${renderMarketRsSortHeader("3M", "3m")}</th>
                <th>${renderMarketRsSortHeader("6M", "6m")}</th>
                <th>${renderMarketRsSortHeader("12M", "12m")}</th>
                <th>${renderMarketRsSortHeader("52W Gap", "gap52w")}</th>
                <th>${renderMarketRsSortHeader("RS NH", "rsNewHigh")}</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="10">검색 결과가 없습니다.</td></tr>'}</tbody>
          </table>
        </div>
      </article>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-rs-universe]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsUniverse = button.dataset.rsUniverse;
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsHistoryRange = button.dataset.rsRange;
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsFilter = button.dataset.rsFilter;
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSortKey = button.dataset.rsSort;
      if (state.rsTableSortKey === nextSortKey) {
        state.rsTableSortDirection = state.rsTableSortDirection === "asc" ? "desc" : "asc";
      } else {
        state.rsTableSortKey = nextSortKey;
        state.rsTableSortDirection = nextSortKey === "ticker" || nextSortKey === "name" ? "asc" : "desc";
      }
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-ticker]").forEach((element) => {
    element.addEventListener("click", () => {
      state.rsSelectedTicker = element.dataset.rsTicker;
      render();
    });
  });

  const detailCanvas = usOverviewRoot.querySelector('[data-rs-chart="detail"]');
  if (detailCanvas && selected) {
    createMarketRsChart(detailCanvas, selected);
  }
}

function getMemorySpotItems() {
  return (memorySpotData.groups ?? []).flatMap((group) => group.items ?? []);
}

function getMemorySpotItemByKey(key) {
  return getMemorySpotItems().find((item) => item.key === key) ?? null;
}

function formatMemorySpotValue(value) {
  return Number.isFinite(value) ? `$${Number(value).toFixed(3)}` : "N/A";
}

function formatMemorySpotChange(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}%`;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsvText(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return headers.reduce((record, header, index) => {
      record[header] = cells[index] ?? "";
      return record;
    }, {});
  });
}

function createDateLabels(startDate, endDate) {
  const labels = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    labels.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return labels;
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMemoryPeriodLabel(dateKey) {
  if (!dateKey) {
    return "-";
  }

  const [year] = dateKey.split("-");
  return year.slice(2);
}

function formatYearMonthPeriodLabel(dateKey) {
  if (!dateKey) {
    return "-";
  }
  const [year, month] = dateKey.split("-");
  return `${year.slice(2)}/${month}`;
}

const MEMORY_SPOT_RANGE_OPTIONS = [
  { key: "1m", label: "1M" },
  { key: "3m", label: "3M" },
  { key: "6m", label: "6M" },
  { key: "1y", label: "1Y" },
  { key: "max", label: "Max" },
];

function getMemorySpotRange(targetKey) {
  return state.memorySpotRanges?.[targetKey] ?? "1y";
}

function buildMemoryChartPayload(labels, datasets, rangeKey) {
  if (!Array.isArray(labels) || !labels.length) {
    return { labels: [], datasets: [] };
  }

  const latestDate = labels[labels.length - 1];
  const startDate = shiftDateByRange(latestDate, rangeKey, labels[0]);
  const startIndex = Math.max(
    0,
    labels.findIndex((label) => label >= startDate),
  );

  return {
    labels: labels.slice(startIndex),
    datasets: datasets.map((dataset) => ({
      ...dataset,
      data: (dataset.data ?? []).slice(startIndex),
    })),
  };
}

function hydrateMemorySpotRuntimeFromLocal() {
  if (!memorySpotHistoryData || !Array.isArray(memorySpotHistoryData.labels) || typeof memorySpotHistoryData.items !== "object") {
    return false;
  }

  memorySpotRuntime.labels = memorySpotHistoryData.labels;
  memorySpotRuntime.items = memorySpotHistoryData.items ?? {};
  memorySpotRuntime.updatedAt = memorySpotHistoryData.updatedAt ?? memorySpotHistoryData.generatedAt ?? "";
  memorySpotRuntime.loaded = true;
  memorySpotRuntime.loading = false;
  memorySpotRuntime.error = "";
  return true;
}

function hydrateGpuCloudRuntimeFromLocal() {
  if (!gpuCloudHistoryData || !Array.isArray(gpuCloudHistoryData.labels) || typeof gpuCloudHistoryData.items !== "object") {
    return false;
  }

  gpuCloudRuntime.labels = gpuCloudHistoryData.labels;
  gpuCloudRuntime.items = gpuCloudHistoryData.items ?? {};
  gpuCloudRuntime.updatedAt = gpuCloudHistoryData.updatedAt ?? gpuCloudHistoryData.generatedAt ?? "";
  gpuCloudRuntime.loaded = true;
  gpuCloudRuntime.loading = false;
  gpuCloudRuntime.error = "";
  return true;
}

async function loadMemorySpotHistory() {
  if (memorySpotRuntime.loading || memorySpotRuntime.loaded) {
    return;
  }

  memorySpotRuntime.loading = true;
  memorySpotRuntime.error = "";

  try {
    const dramSheetId = "1BsfqsQ3fXN1JGXJlR8mbs2r-lXWt0S3Dcl5OVw1kPXs";
    const nandSheetId = "1fPRlsHibMUg8ZwRXWkeQ3hAZHoGMK2O4J98KfliMT4s";
    const urls = [
      `https://docs.google.com/spreadsheets/d/${dramSheetId}/gviz/tq?tqx=out:csv&sheet=Historical`,
      `https://docs.google.com/spreadsheets/d/${nandSheetId}/gviz/tq?tqx=out:csv&sheet=Historical`,
    ];

    const [dramCsv, nandCsv] = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Memory spot fetch failed: ${response.status}`);
        }
        return response.text();
      }),
    );

    const allRows = [...parseCsvText(dramCsv), ...parseCsvText(nandCsv)];
      const targetMap = {
        ddr5_16gb: "DDR5 16Gb (2Gx8)",
        ddr4_16gb: "DDR4 16Gb (2Gx8)",
        ddr4_8gb: "DDR4 8Gb (1Gx8)",
        gddr6_8gb: "GDDR6 8Gb",
        wafer_512gb_tlc: "TLC 512Gb",
        wafer_256gb_tlc: "TLC 256Gb",
      };

    const labels = createDateLabels("2022-01-01", formatDateKey(new Date()));
    const labelIndex = Object.fromEntries(labels.map((label, index) => [label, index]));
    const itemStore = Object.fromEntries(
      Object.keys(targetMap).map((key) => [
        key,
        {
          history: new Array(labels.length).fill(null),
          latestValue: null,
          latestChangePct: null,
          latestDate: null,
        },
      ]),
    );

    allRows.forEach((row) => {
      const key = Object.keys(targetMap).find((candidate) => targetMap[candidate] === row.Canonical_Product);
      if (!key || !(row.Date in labelIndex)) {
        return;
      }

      const value = row.Price_Average ? Number(row.Price_Average) : null;
      const change = row.Change_Pct ? Number(row.Change_Pct) : null;
      const target = itemStore[key];
      target.history[labelIndex[row.Date]] = Number.isFinite(value) ? Number(value.toFixed(3)) : null;

      if (!target.latestDate || row.Date > target.latestDate) {
        target.latestDate = row.Date;
        target.latestValue = Number.isFinite(value) ? Number(value.toFixed(3)) : null;
        target.latestChangePct = Number.isFinite(change) ? Number(change.toFixed(2)) : null;
      }
    });

    memorySpotRuntime.labels = labels;
    memorySpotRuntime.items = itemStore;
    memorySpotRuntime.updatedAt = allRows.reduce((latest, row) => (row.Date > latest ? row.Date : latest), "");
    memorySpotRuntime.loaded = true;
  } catch (error) {
    memorySpotRuntime.error = error instanceof Error ? error.message : String(error);
  } finally {
    memorySpotRuntime.loading = false;
    render();
  }
}

function createMemoryLineChart(canvas, labels, datasets, formatter, rangeKey = "1y") {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildMemoryChartPayload(labels, datasets, rangeKey);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMin = minValue > 0 ? Math.floor(minValue * 0.9) : Math.floor(minValue * 1.1);
  const yMax = Math.ceil(maxValue * 1.1);
  const selectedTickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const selectedTickSet = new Set(selectedTickIndexes);

  const chart = new Chart(canvas, {
    type: "line",
    data: payload,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => {
              const pointLabel = tooltipItems?.[0]?.label;
              return pointLabel ? pointLabel : "";
            },
            label: (context) => `${context.dataset.label}: ${formatter(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = selectedTickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => {
              if (!selectedTickSet.has(value)) {
                return "";
              }
              const label = payload.labels[value];
              return label ? formatRangeAxisDate(label, rangeKey) : "";
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: "#8d8d86", callback: (value) => formatter(value), maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createGpuLineChart(canvas, labels, datasets, formatter) {
  if (typeof Chart === "undefined") {
    return;
  }

  const allValues = datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 5;
  const yMin = Math.max(0, Math.floor(minValue * 0.85 * 10) / 10);
  const yMax = Math.ceil(maxValue * 1.15 * 10) / 10;

  const chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${formatter(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = axis.ticks.filter((tick) => {
              const label = labels[tick.value];
              if (!label || !label.endsWith("-01")) {
                return false;
              }
              const [, month] = label.split("-");
              return Number(month) % 2 === 1;
            });
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => {
              const label = labels[value];
              if (!label) {
                return "";
              }
              return formatYearMonthPeriodLabel(label);
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: "#8d8d86", callback: (value) => formatter(value), maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function getGpuCloudItems() {
  return gpuCloudData.items ?? [];
}

function isGpuStepChange(data, index) {
  const current = data[index];
  if (!Number.isFinite(current)) {
    return false;
  }
  const prev = index > 0 ? data[index - 1] : null;
  const next = index < data.length - 1 ? data[index + 1] : null;
  if (!Number.isFinite(prev) || prev !== current) {
    return true;
  }
  if (!Number.isFinite(next) || next !== current) {
    return true;
  }
  return false;
}

function buildGpuStepDataset(label, data, color) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2.4,
    tension: 0,
    stepped: true,
    pointRadius: (context) => (isGpuStepChange(context.dataset.data, context.dataIndex) ? 3 : 0),
    pointHoverRadius: 5,
    pointHitRadius: 10,
    spanGaps: true,
  };
}

function getGpuCloudItemByKey(key) {
  return getGpuCloudItems().find((item) => item.key === key) ?? null;
}

function formatGpuCloudValue(value) {
  return Number.isFinite(value) ? `$${Number(value).toFixed(2)}/hr` : "N/A";
}

function formatGpuCloudChange(value) {
  if (!Number.isFinite(value)) {
    return "N/A";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(2)}%`;
}

function getGpuTermBenchmarks() {
  return gpuCloudData.termBenchmarks ?? [];
}

function getGpuSemiAnalysisSeries() {
  return gpuCloudData.semiAnalysisH100 ?? null;
}

function renderGpuCloudOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  if (!gpuCloudRuntime.loaded) {
    hydrateGpuCloudRuntimeFromLocal();
  }

  const featuredItems = (gpuCloudData.dashboard?.featuredKeys ?? [])
    .map((key) => {
      const item = getGpuCloudItemByKey(key);
      const runtime = gpuCloudRuntime.items[key] ?? {};
      return item
        ? {
            ...item,
            latestValue: runtime.latestValue ?? item.latestValue,
            latestChangePct: runtime.latestChangePct ?? item.latestChangePct,
            latestDate: runtime.latestDate ?? null,
            history: runtime.history ?? item.history ?? [],
            events: runtime.events ?? [],
          }
        : null;
    })
    .filter(Boolean);

  const availableDates = Object.values(gpuCloudRuntime.items)
    .flatMap((item) => (item?.latestDate ? [item.latestDate] : []))
    .sort();
  const periodStart = gpuCloudRuntime.labels[0] || "2024-07-11";
  const periodEnd = gpuCloudRuntime.labels[gpuCloudRuntime.labels.length - 1] || gpuCloudRuntime.updatedAt || periodStart;
  const semiSeries = getGpuSemiAnalysisSeries();

  usOverviewRoot.innerHTML = `
    <section class="memory-overview">
      <div class="us-section-head cloud-section-head">
        <h2>${gpuCloudData.dashboard?.title ?? "GPU Cloud Rental Dashboard"}</h2>
        <p>${gpuCloudData.dashboard?.subtitle ?? "Daily benchmark series with monthly timeline labels"}</p>
      </div>
      <section class="memory-banner">
        <div>
          <strong>Contract benchmark</strong>
          <span>${gpuCloudData.source?.semiAnalysisName ?? "SemiAnalysis H100 1Y contract index"}</span>
        </div>
        <div>
          <strong>Update</strong>
          <span>${semiSeries?.updatedAt ?? "-"}</span>
        </div>
        <div>
          <strong>Series</strong>
          <span>H100 1Y midpoint</span>
        </div>
        <div>
          <strong>Source</strong>
          <span>${semiSeries?.sourceLabel ?? "SemiAnalysis / ClusterMAX research"}</span>
        </div>
        <div>
          <strong>Method</strong>
          <span>Public chart approximation</span>
        </div>
      </section>
      <section class="memory-panel-grid memory-panel-grid-wide">
        <article class="memory-panel">
          <div class="us-panel-head">
            <div>
              <h3>${semiSeries?.title ?? "SemiAnalysis H100 1Y Contract Index"}</h3>
              <p>${semiSeries?.subtitle ?? ""}</p>
            </div>
          </div>
          <div class="memory-card-meta gpu-term-meta">
            <span>${semiSeries?.sourceLabel ?? "SemiAnalysis / ClusterMAX research"}</span>
            <span>${semiSeries?.latestLabel ?? "-"} ${Number.isFinite(semiSeries?.latestValue) ? `· ${formatGpuCloudValue(semiSeries.latestValue)}` : ""}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Cycle low</span>
            <span class="memory-stat-value">${Number.isFinite(semiSeries?.floor) ? `${formatGpuCloudValue(semiSeries.floor)} · ${semiSeries.floorLabel}` : "N/A"}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Method</span>
            <span class="memory-stat-value">${semiSeries?.method ?? ""}</span>
          </div>
          <div class="memory-chart-wrap">
            <canvas data-gpu-basket="semi-h100-1y"></canvas>
          </div>
        </article>
      </section>
    </section>
  `;

  const semiCanvas = usOverviewRoot.querySelector('[data-gpu-basket="semi-h100-1y"]');
  if (semiCanvas && semiSeries) {
    createGpuLineChart(
      semiCanvas,
      semiSeries.labels ?? [],
      [
        {
          label: "H100 1Y",
          data: semiSeries.values ?? [],
          borderColor: "#111827",
          backgroundColor: "#111827",
          borderWidth: 2.6,
          tension: 0.22,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointHitRadius: 10,
          spanGaps: false,
        },
      ],
      (value) => `$${Number(value).toFixed(2)}`,
    );
  }

}

function renderMemorySpotOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  if (!memorySpotRuntime.loaded) {
    hydrateMemorySpotRuntimeFromLocal();
  }

  if (!memorySpotRuntime.loaded && !memorySpotRuntime.loading && !memorySpotRuntime.error) {
    loadMemorySpotHistory();
  }

  const featuredItems = (memorySpotData.dashboards?.featuredKeys ?? [])
    .map((key) => {
      const item = getMemorySpotItemByKey(key);
      const runtime = memorySpotRuntime.items[key] ?? {};
      return item
        ? {
            ...item,
            latestValue: runtime.latestValue ?? item.latestValue,
            latestChangePct: runtime.latestChangePct ?? item.latestChangePct,
            latestDate: runtime.latestDate ?? null,
            history: runtime.history ?? item.history ?? [],
          }
        : null;
    })
    .filter(Boolean);
  const availableDates = Object.values(memorySpotRuntime.items)
    .flatMap((item) => (item?.latestDate ? [item.latestDate] : []))
    .sort();
  const periodStart = memorySpotRuntime.labels[0] || "2022-01-01";
  const periodEnd = memorySpotRuntime.labels[memorySpotRuntime.labels.length - 1] || memorySpotRuntime.updatedAt || periodStart;
  const firstObservedDate = availableDates[0] || null;

  const featuredMarkup = featuredItems
    .map(
      (item) => `
        <article class="memory-card">
          <div class="memory-card-head">
            <span class="memory-dot" style="background:${item.color}"></span>
            <div>
              <h3>${item.label}</h3>
              <p>${item.benchmarkName}</p>
            </div>
          </div>
          <div class="memory-card-value">${formatMemorySpotValue(item.latestValue)}</div>
          <div class="memory-card-meta">
            <span>${item.category}</span>
            <span>${item.cadence}</span>
            <span>${formatMemorySpotChange(item.latestChangePct)}</span>
            <span>${item.latestDate || "No data"}</span>
          </div>
        </article>`,
    )
    .join("");

  const basketMarkup = (memorySpotData.dashboards?.basketPanels ?? [])
    .map((panel) => {
      const panelItems = (panel.itemKeys ?? [])
        .map((key) => {
          const item = getMemorySpotItemByKey(key);
          const runtime = memorySpotRuntime.items[key] ?? {};
          return item
            ? {
                ...item,
                latestValue: runtime.latestValue ?? item.latestValue,
                latestChangePct: runtime.latestChangePct ?? item.latestChangePct,
                latestDate: runtime.latestDate ?? null,
                history: runtime.history ?? item.history ?? [],
              }
            : null;
        })
        .filter(Boolean);
      const lines = panelItems
        .map(
          (item) => `
            <div class="memory-list-row">
              <span><span class="memory-dot" style="background:${item.color}"></span>${item.label}</span>
              <span>${formatMemorySpotValue(item.latestValue)}</span>
              <span>${formatMemorySpotChange(item.latestChangePct)}</span>
            </div>`,
        )
        .join("");

      return `
        <article class="memory-panel">
          <div class="us-panel-head">
            <div>
              <h3>${panel.title}</h3>
              <p>${panel.description}</p>
            </div>
            <div class="m7-range-row">
              ${MEMORY_SPOT_RANGE_OPTIONS.map(
                (range) => `
                  <button
                    type="button"
                    class="m7-range-chip${getMemorySpotRange(`basket:${panel.key}`) === range.key ? " active" : ""}"
                    data-memory-range="${range.key}"
                    data-memory-target="basket:${panel.key}"
                  >
                    ${range.label}
                  </button>`,
              ).join("")}
            </div>
          </div>
          <div class="memory-list">
            <div class="memory-list-head">
              <span>Series</span>
              <span>Last</span>
              <span>Change</span>
            </div>
            ${lines}
          </div>
          <div class="memory-chart-wrap">
            <canvas data-memory-basket="${panel.key}"></canvas>
          </div>
        </article>
      `;
    })
    .join("");

  const detailMarkup = getMemorySpotItems()
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
    .map((rawItem) => {
      const runtime = memorySpotRuntime.items[rawItem.key] ?? {};
      const item = {
        ...rawItem,
        latestValue: runtime.latestValue ?? rawItem.latestValue,
        latestChangePct: runtime.latestChangePct ?? rawItem.latestChangePct,
        latestDate: runtime.latestDate ?? null,
        history: runtime.history ?? rawItem.history ?? [],
      };
      return `
        <article class="memory-panel">
          <div class="us-panel-head">
            <div>
              <h3>${item.label}</h3>
              <p>${item.benchmarkName}</p>
            </div>
            <div class="m7-range-row">
              ${MEMORY_SPOT_RANGE_OPTIONS.map(
                (range) => `
                  <button
                    type="button"
                    class="m7-range-chip${getMemorySpotRange(`series:${item.key}`) === range.key ? " active" : ""}"
                    data-memory-range="${range.key}"
                    data-memory-target="series:${item.key}"
                  >
                    ${range.label}
                  </button>`,
              ).join("")}
            </div>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Latest</span>
            <span class="memory-stat-value">${formatMemorySpotValue(item.latestValue)}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Session Change</span>
            <span class="memory-stat-value">${formatMemorySpotChange(item.latestChangePct)}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Cadence</span>
            <span class="memory-stat-value">${item.cadence}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Last Date</span>
            <span class="memory-stat-value">${item.latestDate || "No data"}</span>
          </div>
          <div class="memory-chart-wrap">
            <canvas data-memory-series="${item.key}"></canvas>
          </div>
        </article>`;
    })
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="memory-overview">
      <div class="us-section-head cloud-section-head">
        <h2>Memory Spot Dashboard</h2>
        <p>Representative DRAM and NAND spot benchmarks based on public TrendForce pages</p>
      </div>
      <section class="memory-banner">
        <div>
          <strong>Source</strong>
          <span>${memorySpotData.source?.name ?? "TrendForce"}</span>
        </div>
        <div>
          <strong>Updated</strong>
          <span>${memorySpotRuntime.updatedAt || memorySpotData.updatedAt || (memorySpotRuntime.loading ? "Loading..." : "Awaiting first scrape")}</span>
        </div>
        <div>
          <strong>Coverage</strong>
          <span>${featuredItems.length} featured spot benchmarks</span>
        </div>
        <div>
          <strong>Period</strong>
          <span>${periodStart} -> ${periodEnd}</span>
        </div>
        <div>
          <strong>First Data</strong>
          <span>${firstObservedDate || (memorySpotRuntime.loading ? "Loading..." : "No data")}</span>
        </div>
      </section>
      ${memorySpotRuntime.error ? `<section class="memory-error">${memorySpotRuntime.error}</section>` : ""}
      <section class="memory-card-grid">
        ${featuredMarkup}
      </section>
      <section class="memory-panel-grid memory-panel-grid-wide">
        ${basketMarkup}
      </section>
      <section class="memory-panel-grid">
        ${detailMarkup}
      </section>
    </section>
  `;

  if (!memorySpotRuntime.loaded) {
    return;
  }

  usOverviewRoot.querySelectorAll("[data-memory-range]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetKey = button.dataset.memoryTarget;
      const rangeKey = button.dataset.memoryRange;
      if (!targetKey || !rangeKey) {
        return;
      }

      state.memorySpotRanges = {
        ...(state.memorySpotRanges ?? {}),
        [targetKey]: rangeKey,
      };
      renderMemorySpotOverview();
    });
  });

  (memorySpotData.dashboards?.basketPanels ?? []).forEach((panel) => {
    const canvas = usOverviewRoot.querySelector(`[data-memory-basket="${panel.key}"]`);
    if (!canvas) {
      return;
    }

    const datasets = (panel.itemKeys ?? [])
      .map((key) => {
        const item = getMemorySpotItemByKey(key);
        const runtime = memorySpotRuntime.items[key];
        if (!item || !runtime) {
          return null;
        }
        return {
          label: item.label,
          data: runtime.history,
          borderColor: item.color,
          backgroundColor: item.color,
          borderWidth: 2.2,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 10,
          spanGaps: true,
        };
      })
      .filter(Boolean);

    createMemoryLineChart(
      canvas,
      memorySpotRuntime.labels,
      datasets,
      (value) => `$${Number(value).toFixed(2)}`,
      getMemorySpotRange(`basket:${panel.key}`),
    );
  });

  getMemorySpotItems().forEach((item) => {
    const canvas = usOverviewRoot.querySelector(`[data-memory-series="${item.key}"]`);
    const runtime = memorySpotRuntime.items[item.key];
    if (!canvas || !runtime) {
      return;
    }

    createMemoryLineChart(
      canvas,
      memorySpotRuntime.labels,
      [
        {
          label: item.label,
          data: runtime.history,
          borderColor: item.color,
          backgroundColor: item.color,
          borderWidth: 2.2,
          tension: 0.2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 10,
          spanGaps: true,
        },
      ],
      (value) => `$${Number(value).toFixed(2)}`,
      getMemorySpotRange(`series:${item.key}`),
    );
  });
}

function renderCapexOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");
  const annualBig5Panel = buildAnnualBig5CapexPanel();
  const ttmCapexToOcfPanel = buildTtmCapexToOcfPanel();

  usOverviewRoot.innerHTML = `
    <section class="cloud-overview">
      <div class="us-section-head cloud-section-head">
        <h2>Big Tech Capex & Cash Flow Dashboard</h2>
        <p>Quarterly capex and operating cash flow trends from the raw Excel sheet</p>
      </div>
      <div class="cloud-panel-grid">
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>Annual BIG5 Capex Total (리스 포함, CY기준)</h3>
              <p>Annual big tech capex sum with YoY growth rate</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-capex-chart="annual-big5-capex"></canvas>
          </div>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>TTM Capex / OCF</h3>
              <p>Trailing 4-quarter capex over trailing 4-quarter operating cash flow</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-capex-chart="ttm-capex-to-ocf"></canvas>
          </div>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.quarterlyCapex.title}</h3>
              <p>${capexDashboardData.quarterlyCapex.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-capex-chart="quarterly-capex"></canvas>
          </div>
        </article>
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.quarterlyYoy.title}</h3>
              <p>${capexDashboardData.quarterlyYoy.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-capex-chart="quarterly-yoy"></canvas>
          </div>
        </article>
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.annualCapex.title}</h3>
              <p>${capexDashboardData.annualCapex.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-capex-chart="annual-capex"></canvas>
          </div>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.quarterlyOcf.title}</h3>
              <p>${capexDashboardData.quarterlyOcf.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-capex-chart="quarterly-ocf"></canvas>
          </div>
        </article>
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.quarterlyCapexToOcf.title}</h3>
              <p>${capexDashboardData.quarterlyCapexToOcf.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-capex-chart="capex-to-ocf"></canvas>
          </div>
        </article>
        <article class="cloud-panel">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.cashHistory.title}</h3>
              <p>${capexDashboardData.cashHistory.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap">
            <canvas data-capex-chart="cash-history"></canvas>
          </div>
        </article>
      </div>
    </section>
  `;

  const annualBig5CapexCanvas = usOverviewRoot.querySelector('[data-capex-chart="annual-big5-capex"]');
  const ttmCapexToOcfCanvas = usOverviewRoot.querySelector('[data-capex-chart="ttm-capex-to-ocf"]');
  const quarterlyCapexCanvas = usOverviewRoot.querySelector('[data-capex-chart="quarterly-capex"]');
  const quarterlyYoyCanvas = usOverviewRoot.querySelector('[data-capex-chart="quarterly-yoy"]');
  const annualCapexCanvas = usOverviewRoot.querySelector('[data-capex-chart="annual-capex"]');
  const quarterlyOcfCanvas = usOverviewRoot.querySelector('[data-capex-chart="quarterly-ocf"]');
  const capexToOcfCanvas = usOverviewRoot.querySelector('[data-capex-chart="capex-to-ocf"]');
  const cashHistoryCanvas = usOverviewRoot.querySelector('[data-capex-chart="cash-history"]');

  if (annualBig5CapexCanvas) {
    createCapexAggregateComboChart(annualBig5CapexCanvas, annualBig5Panel);
  }
  if (ttmCapexToOcfCanvas) {
    createCapexLineChart(ttmCapexToOcfCanvas, ttmCapexToOcfPanel.labels, ttmCapexToOcfPanel, (value) => `${Number(value).toFixed(0)}%`);
  }
  if (quarterlyCapexCanvas) {
    createCapexBarChart(quarterlyCapexCanvas, capexDashboardData.quarterLabels, capexDashboardData.quarterlyCapex, (value) => `$${Number(value).toFixed(1)}B`);
  }
  if (quarterlyYoyCanvas) {
    createCapexLineChart(quarterlyYoyCanvas, capexDashboardData.quarterLabels, capexDashboardData.quarterlyYoy, (value) => `${Number(value).toFixed(0)}%`, -60);
  }
  if (annualCapexCanvas) {
    createCapexBarChart(annualCapexCanvas, capexDashboardData.annualLabels, capexDashboardData.annualCapex, (value) => `$${Number(value).toFixed(1)}B`);
  }
  if (quarterlyOcfCanvas) {
    createCapexBarChart(quarterlyOcfCanvas, capexDashboardData.quarterLabels, capexDashboardData.quarterlyOcf, (value) => `$${Number(value).toFixed(1)}B`);
  }
  if (capexToOcfCanvas) {
    createCapexLineChart(capexToOcfCanvas, capexDashboardData.quarterLabels, capexDashboardData.quarterlyCapexToOcf, (value) => `${Number(value).toFixed(0)}%`, -100);
  }
  if (cashHistoryCanvas) {
    createCapexLineChart(cashHistoryCanvas, capexDashboardData.cashLabels, capexDashboardData.cashHistory, (value) => `$${Number(value).toFixed(0)}B`, 0);
  }
}

function renderMarketOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const rangeSource = (marketMacroData.ranges ?? []).length ? marketMacroData.ranges : marketPriceData.ranges ?? [];
  const rangeMarkup = rangeSource
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketPriceRange === range.key ? " active" : ""}"
          data-market-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");

  const marketUpdatedAt = [marketPriceData.updatedAt, marketMacroData.updatedAt].filter(Boolean).sort().slice(-1)[0] || "-";
  const totalBounds = getTotalDashboardBounds();
  const totalStartValue = state.totalDashboardCustomStart || "";
  const totalEndValue = state.totalDashboardCustomEnd || "";
  const totalSeriesItems = getTotalDashboardSeriesItems();
  const totalSeriesMarkup = totalSeriesItems
    .map(
      (item) => `
        <button
          type="button"
          class="total-series-chip${(state.totalDashboardSelection ?? []).includes(item.key) ? " active" : ""}"
          data-total-series="${item.key}"
        >
          <span class="total-series-dot" style="background:${item.color}"></span>
          ${item.label}
        </button>`,
    )
    .join("");
  const totalRangeMarkup = (marketMacroData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.totalDashboardRange === range.key ? " active" : ""}"
          data-total-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");
  const macroPanels = [
    { key: "rates", canvas: "rates", className: "macro-panel-wide" },
    { key: "dxy", canvas: "dxy", className: "" },
    { key: "energy", canvas: "energy", className: "" },
    { key: "metals", canvas: "metals", className: "" },
  ]
    .map(({ key, canvas, className }) => {
      const panel = getMarketMacroPanel(key);
      if (!panel) {
        return "";
      }
      return `
        <article class="cloud-panel macro-panel ${className}">
          <div class="us-panel-head">
            <div>
              <h3>${panel.title}</h3>
              <p>${panel.subtitle}</p>
            </div>
            <div class="m7-range-row">
              ${rangeSource
                .map(
                  (range) => `
                    <button
                      type="button"
                      class="m7-range-chip${getMarketMacroRange(key) === range.key ? " active" : ""}"
                      data-market-macro-range="${range.key}"
                      data-market-macro-panel="${key}"
                    >
                      ${range.label}
                    </button>`,
                )
                .join("")}
            </div>
          </div>
          <div class="macro-panel-meta">
            <span>${panel.source ?? ""}</span>
            <span>${panel.mode === "normalized" ? "Normalized view" : "Raw level"}</span>
          </div>
          <div class="macro-chart-wrap">
            <canvas data-market-macro="${canvas}"></canvas>
          </div>
        </article>
      `;
    })
    .join("");
  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Total Dashboard</h2>
            <p>Market series use Start = 100 normalized performance, while US and Japan yields stay on the right axis in raw percent terms.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${totalRangeMarkup}</div>
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-total-start
              min="${totalBounds.min}"
              max="${totalBounds.max}"
              value="${totalStartValue}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-total-end
              min="${totalBounds.min}"
              max="${totalBounds.max}"
              value="${totalEndValue}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-total-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-total-reset>Reset</button>
          </div>
        </div>
        <div class="total-series-row">
          ${totalSeriesMarkup}
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-total="overview"></canvas>
        </div>
      </section>
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Macro Dashboard</h2>
            <p>Daily macro dashboard for US and Japan rates, dollar, energy, and metals. Metals are normalized for cleaner cross-asset comparison.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="macro-panel-grid">
          ${macroPanels}
        </div>
      </section>
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Market Relative Performance</h2>
            <p>Daily close normalized to 100 at the selected start date. Max begins ${marketPriceData.startDate ?? "2017-01-01"}.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${rangeMarkup}</div>
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-relative="performance"></canvas>
        </div>
      </section>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-market-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketPriceRange = button.dataset.marketRange || marketPriceData.defaultRange || "max";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-range]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroPanel;
      const rangeKey = button.dataset.marketMacroRange || marketMacroData.defaultRange || "max";
      if (!panelKey) {
        return;
      }
      state.marketMacroRanges = {
        ...state.marketMacroRanges,
        [panelKey]: rangeKey,
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-total-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.totalDashboardRange = button.dataset.totalRange || "3y";
      state.totalDashboardCustomStart = "";
      state.totalDashboardCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-total-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.totalSeries;
      if (!key) {
        return;
      }
      const current = new Set(state.totalDashboardSelection ?? []);
      if (current.has(key)) {
        if (current.size === 1) {
          return;
        }
        current.delete(key);
      } else {
        current.add(key);
      }
      state.totalDashboardSelection = [...current];
      render();
    });
  });

  const totalStartInput = usOverviewRoot.querySelector("[data-total-start]");
  const totalEndInput = usOverviewRoot.querySelector("[data-total-end]");
  const totalApplyButton = usOverviewRoot.querySelector("[data-total-apply]");
  const totalResetButton = usOverviewRoot.querySelector("[data-total-reset]");

  if (totalApplyButton && totalStartInput && totalEndInput) {
    totalApplyButton.addEventListener("click", () => {
      const startValue = totalStartInput.value || "";
      const endValue = totalEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.totalDashboardCustomStart = startValue;
      state.totalDashboardCustomEnd = endValue;
      render();
    });
  }

  if (totalResetButton) {
    totalResetButton.addEventListener("click", () => {
      state.totalDashboardCustomStart = "";
      state.totalDashboardCustomEnd = "";
      render();
    });
  }

  const totalCanvas = usOverviewRoot.querySelector('[data-market-total="overview"]');
  if (totalCanvas) {
    createTotalDashboardChart(totalCanvas, state.totalDashboardRange);
  }

  const relativeCanvas = usOverviewRoot.querySelector('[data-market-relative="performance"]');
  if (relativeCanvas) {
    createMarketRelativeChart(relativeCanvas, state.marketPriceRange);
  }
  ["rates", "dxy", "energy", "metals"].forEach((panelKey) => {
    const canvas = usOverviewRoot.querySelector(`[data-market-macro="${panelKey}"]`);
    if (canvas) {
      createMarketMacroChart(canvas, panelKey, getMarketMacroRange(panelKey));
    }
  });
}

function renderMarketMacroOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const indicator = getSelectedMacroIndicator();
  const series = getSelectedMacroSeries(indicator);
  const indicators = macroIndicatorsData.indicators ?? [];
  const categories = macroIndicatorsData.categories ?? [];

  const snapshotMarkup = indicators
    .map((entry) => {
      const latestLabel = entry.latestMonth ? formatMonthLabel(entry.latestMonth) : entry.statusNote ?? "manual/source pending";
      const seriesMarkup = (entry.series ?? [])
        .map((item) => {
          const latestRelease = item.latestRelease ?? null;
          if (!item.latestDate || !Number.isFinite(Number(item.latestValue))) {
            return `
              <div class="macro-snapshot-stat">
                <span>${item.label}</span>
                <strong>Pending</strong>
                <small>${entry.statusNote ?? "manual/source pending"}</small>
              </div>
            `;
          }
          return `
            <div class="macro-snapshot-stat">
              <span>${item.label}</span>
              <strong>${formatMacroIndicatorValue(item.unit, item.latestValue)}</strong>
              <small>MoM ${formatMacroChangePercent(item.momPct)} | YoY ${formatMacroChangePercent(item.yoyPct)}</small>
              <small>${latestRelease ? `${formatMonthLabel(latestRelease.releaseDate.slice(0, 7))} ${formatMacroReleaseSurpriseText(latestRelease)}` : "consensus pending"}</small>
            </div>
          `;
        })
        .join("");
      return `
        <article class="macro-snapshot-card">
          <div class="macro-snapshot-head">
            <div>
              <h3>${entry.title}</h3>
              <p>${entry.category}</p>
            </div>
            <span class="macro-status-pill ${entry.status === "manual" ? "manual" : "auto"}">${entry.status === "manual" ? "Manual" : "Auto"}</span>
          </div>
          <p class="macro-snapshot-date">Latest ${latestLabel}</p>
          <div class="macro-snapshot-stats">${seriesMarkup}</div>
        </article>
      `;
    })
    .join("");

  const coverageRows = indicators
    .map(
      (entry) => `
        <tr>
          <td>${entry.title}</td>
          <td>${entry.availableStartMonth ?? entry.startMonth ?? "-"}</td>
          <td>${entry.sourceLabel ?? "-"}</td>
          <td>${entry.status === "manual" ? (entry.statusNote ?? "manual/source pending") : "ready"}</td>
        </tr>
      `,
    )
    .join("");

  const categoryMarkup = categories
    .map(
      (entry) => `
        <article class="macro-category-card">
          <h3>${entry.label}</h3>
          <div class="macro-category-list">
            ${(entry.items ?? []).map((item) => `<span class="market-rs-chip">${item}</span>`).join("")}
          </div>
        </article>
      `,
    )
    .join("");

  const indicatorOptions = indicators
    .map((entry) => `<option value="${entry.key}"${entry.key === indicator?.key ? " selected" : ""}>${entry.title}</option>`)
    .join("");

  const seriesChips = (indicator?.series ?? [])
    .map(
      (item) => `
        <button
          type="button"
          class="market-rs-chip${item.key === series?.key ? " active" : ""}"
          data-macro-series="${item.key}"
        >${item.label}</button>
      `,
    )
    .join("");

  const chartMetaMarkup =
    indicator && series
      ? `
        <div class="macro-chart-metrics">
          <div class="market-rs-metric">
            <span>Latest</span>
            <strong>${formatMacroIndicatorValue(series.unit, series.latestValue)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Previous</span>
            <strong>${formatMacroIndicatorValue(series.unit, series.previousValue)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Delta</span>
            <strong>${formatMacroDeltaValue(series.unit, series.deltaValue)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>MoM</span>
            <strong>${formatMacroChangePercent(series.momPct)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>YoY</span>
            <strong>${formatMacroChangePercent(series.yoyPct)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Coverage</span>
            <strong>${state.macroHistoryMode === "common" ? "2010-04+" : indicator.availableStartMonth ?? indicator.startMonth ?? "-"}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Latest Surprise</span>
            <strong>${series.latestRelease?.surprise ?? "-"}</strong>
          </div>
        </div>
      `
      : "";

  const releaseRows = (series?.releaseHistory ?? [])
    .slice()
    .reverse()
    .map(
      (row) => `
        <tr>
          <td>${row.releaseDate}</td>
          <td>${row.reference ?? "-"}</td>
          <td>${row.actual ?? "-"}</td>
          <td>${row.consensus ?? "-"}</td>
          <td>${row.previous ?? "-"}</td>
          <td>${row.surprise ?? "-"}</td>
        </tr>
      `,
    )
    .join("");

  const chartBodyMarkup =
    indicator?.status === "manual" || !series?.dates?.length
      ? `
        <div class="market-rs-empty macro-pending-state">
          <strong>${indicator?.title ?? "Selected indicator"}</strong>
          <span>${indicator?.statusNote ?? "manual/source pending"}</span>
          <a href="${indicator?.sourceUrl ?? "#"}" target="_blank" rel="noreferrer">Open source page</a>
        </div>
      `
      : `
        <div class="chart-wrap macro-chart-wrap">
          <canvas data-macro-indicator-chart></canvas>
        </div>
        <p class="market-rs-chart-caption">
          ${indicator?.title ?? "-"} / ${series?.label ?? "-"} / ${state.macroHistoryMode === "common" ? "2010-04+ common view" : "full history"}
        </p>
        <div class="macro-release-table-wrap">
          <div class="us-section-head macro-release-head">
            <div>
              <h3>Release Surprise History</h3>
              <p>2025-01 이후 actual / consensus / previous / surprise 기록입니다.</p>
            </div>
          </div>
          <table class="macro-coverage-table macro-release-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Ref</th>
                <th>Actual</th>
                <th>Cons</th>
                <th>Prev</th>
                <th>Surprise</th>
              </tr>
            </thead>
            <tbody>${releaseRows || '<tr><td colspan="6">Release history pending.</td></tr>'}</tbody>
          </table>
        </div>
      `;

  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel macro-panel">
        <div class="us-section-head">
          <div>
            <h2>Historical Chart</h2>
            <p>개별 지표는 각 지표별 전체 기간 또는 공통 시작월 2010-04 이후 구간으로 볼 수 있습니다.</p>
          </div>
        </div>
        <div class="market-rs-controls macro-chart-controls">
          <label class="macro-control-field">
            <span class="market-rs-control-label">Indicator</span>
            <select id="macro-indicator-select" class="macro-select">${indicatorOptions}</select>
          </label>
          <div>
            <span class="market-rs-control-label">History</span>
            <div class="market-rs-chip-row">
              <button type="button" class="market-rs-chip${state.macroHistoryMode === "common" ? " active" : ""}" data-macro-mode="common">2010-04+</button>
              <button type="button" class="market-rs-chip${state.macroHistoryMode === "full" ? " active" : ""}" data-macro-mode="full">Full History</button>
            </div>
          </div>
          <div>
            <span class="market-rs-control-label">Series</span>
            <div class="market-rs-chip-row">${seriesChips}</div>
          </div>
        </div>
        ${chartMetaMarkup}
        ${chartBodyMarkup}
      </section>

      <section class="us-panel macro-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Latest Macro Snapshot</h2>
            <p>미국 투자자들이 매달 확인하는 핵심 매크로 지표 10개를 최신 발표월 기준으로 빠르게 확인합니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Updated ${macroIndicatorsData.updatedAt ? formatKstDateTime(macroIndicatorsData.updatedAt) : "-"}</div>
          </div>
        </div>
        <div class="macro-snapshot-grid">${snapshotMarkup}</div>
      </section>

      <section class="macro-panel-grid macro-indicator-grid">
        <article class="us-panel">
          <div class="us-section-head">
            <div>
              <h2>Release Coverage</h2>
              <p>사용 가능 시작월, 데이터 소스, 자동/수동 업데이트 상태를 한 번에 확인합니다.</p>
            </div>
          </div>
          <div class="macro-coverage-table-wrap">
            <table class="macro-coverage-table">
              <thead>
                <tr>
                  <th>Indicator</th>
                  <th>Start</th>
                  <th>Source</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${coverageRows}</tbody>
            </table>
          </div>
        </article>

        <article class="us-panel">
          <div class="us-section-head">
            <div>
              <h2>Category Grouping</h2>
              <p>인플레이션, 노동, 수요, 경기순환, 금리민감도로 매크로 지표를 묶었습니다.</p>
            </div>
          </div>
          <div class="macro-category-grid">${categoryMarkup}</div>
        </article>
      </section>
    </section>
  `;

  usOverviewRoot.querySelector("#macro-indicator-select")?.addEventListener("change", (event) => {
    state.macroIndicatorKey = event.target.value;
    const nextIndicator = getSelectedMacroIndicator();
    state.macroSeriesKey = nextIndicator?.series?.[0]?.key ?? "";
    render();
  });

  usOverviewRoot.querySelectorAll("[data-macro-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.macroHistoryMode = button.dataset.macroMode;
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-macro-series]").forEach((button) => {
    button.addEventListener("click", () => {
      state.macroSeriesKey = button.dataset.macroSeries;
      render();
    });
  });

  if (indicator?.status !== "manual" && series?.dates?.length) {
    const canvas = usOverviewRoot.querySelector("[data-macro-indicator-chart]");
    if (canvas) {
      createMacroIndicatorChart(canvas, indicator, series, state.macroHistoryMode);
    }
  }
}

function renderMarketVixOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const vixUpdatedAt = getMarketVixUpdatedAt();
  const familyBounds = getMarketVixBounds("family");
  const metricsBounds = getMarketVixBounds("metrics");
  const metricsRangeMarkup = (marketVixData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketVixMetricsRange === range.key ? " active" : ""}"
          data-market-vix-metrics-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");
  const familyRangeMarkup = (marketVixData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketVixFamilyRange === range.key ? " active" : ""}"
          data-market-vix-family-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");

  const snapshotMarkup = (marketVixData.snapshots ?? [])
    .map((item) => {
      if (item.key === "term-regime") {
        return `
          <article class="vix-snapshot-card vix-regime-card">
            <span class="vix-snapshot-label">${item.label}</span>
            <strong class="vix-snapshot-value">${item.value ?? "-"}</strong>
            <span class="vix-snapshot-note">M1 vs Spot ${formatVixPercent(item.change)} | M2 vs M1 ${formatVixPercent(item.changePct)}</span>
            <span class="vix-snapshot-date">${item.date || "-"}</span>
          </article>
        `;
      }
      const deltaClass = Number(item.changePct) >= 0 ? "positive" : "negative";
      return `
        <article class="vix-snapshot-card">
          <span class="vix-snapshot-label">${item.label}</span>
          <strong class="vix-snapshot-value">${formatVixLevel(item.value)}</strong>
          <span class="vix-snapshot-change ${deltaClass}">${formatVixPercent(item.changePct)}</span>
          <span class="vix-snapshot-date">${item.date || "-"}</span>
        </article>
      `;
    })
    .join("");

  const latestContractsMarkup = ((marketVixData.curve?.latestContracts ?? []) || [])
    .map(
      (contract) => `
        <tr>
          <td>${contract.label}</td>
          <td>${contract.symbol}</td>
          <td>${contract.expiration}</td>
          <td>${formatVixLevel(contract.price)}</td>
        </tr>
      `,
    )
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>VIX Dashboard</h2>
            <p>2018-01-01 이후 안정적으로 수집 가능한 VIX family history와 최신 CBOE settlement curve만 반영했습니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Updated ${vixUpdatedAt}</div>
          </div>
        </div>
        <div class="vix-snapshot-grid">
          ${snapshotMarkup}
        </div>
      </section>

      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>VIX Futures Term Structure</h2>
            <p>Front monthly VX settlement curve with previous trading day overlay.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Curve ${marketVixData.curve?.latestDate || "-"}</div>
          </div>
        </div>
        <div class="vix-curve-layout">
          <div class="us-price-chart-wrap">
            <canvas data-market-vix="curve"></canvas>
          </div>
          <div class="vix-contract-table-wrap">
            <table class="macro-release-table vix-contract-table">
              <thead>
                <tr>
                  <th>Expiry</th>
                  <th>Symbol</th>
                  <th>Date</th>
                  <th>Settlement</th>
                </tr>
              </thead>
              <tbody>
                ${latestContractsMarkup}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Term Structure Metrics</h2>
            <p>누적된 curve history 안에서만 spot, M1, M2와 premium 흐름을 보여줍니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${metricsRangeMarkup}</div>
            <div class="us-price-updated">${marketVixData.source?.futures ?? ""}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-vix-metrics-start
              min="${metricsBounds.min}"
              max="${metricsBounds.max}"
              value="${state.marketVixMetricsCustomStart || ""}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-vix-metrics-end
              min="${metricsBounds.min}"
              max="${metricsBounds.max}"
              value="${state.marketVixMetricsCustomEnd || ""}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-vix-metrics-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-vix-metrics-reset>Reset</button>
          </div>
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-vix="metrics"></canvas>
        </div>
      </section>

      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>VIX Family History</h2>
            <p>2018-01-01 이후 수집 가능한 VIX spot 및 term index history입니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${familyRangeMarkup}</div>
            <div class="us-price-updated">${marketVixData.source?.family ?? ""}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-vix-family-start
              min="${familyBounds.min}"
              max="${familyBounds.max}"
              value="${state.marketVixFamilyCustomStart || ""}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-vix-family-end
              min="${familyBounds.min}"
              max="${familyBounds.max}"
              value="${state.marketVixFamilyCustomEnd || ""}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-vix-family-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-vix-family-reset>Reset</button>
          </div>
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-vix="family"></canvas>
        </div>
      </section>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-market-vix-metrics-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketVixMetricsRange = button.dataset.marketVixMetricsRange || marketVixData.defaultRange || "1y";
      state.marketVixMetricsCustomStart = "";
      state.marketVixMetricsCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-vix-family-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketVixFamilyRange = button.dataset.marketVixFamilyRange || marketVixData.defaultRange || "1y";
      state.marketVixFamilyCustomStart = "";
      state.marketVixFamilyCustomEnd = "";
      render();
    });
  });

  const vixMetricsStartInput = usOverviewRoot.querySelector("[data-vix-metrics-start]");
  const vixMetricsEndInput = usOverviewRoot.querySelector("[data-vix-metrics-end]");
  const vixMetricsApplyButton = usOverviewRoot.querySelector("[data-vix-metrics-apply]");
  const vixMetricsResetButton = usOverviewRoot.querySelector("[data-vix-metrics-reset]");
  const vixFamilyStartInput = usOverviewRoot.querySelector("[data-vix-family-start]");
  const vixFamilyEndInput = usOverviewRoot.querySelector("[data-vix-family-end]");
  const vixFamilyApplyButton = usOverviewRoot.querySelector("[data-vix-family-apply]");
  const vixFamilyResetButton = usOverviewRoot.querySelector("[data-vix-family-reset]");

  if (vixMetricsApplyButton && vixMetricsStartInput && vixMetricsEndInput) {
    vixMetricsApplyButton.addEventListener("click", () => {
      const startValue = vixMetricsStartInput.value || "";
      const endValue = vixMetricsEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.marketVixMetricsCustomStart = startValue;
      state.marketVixMetricsCustomEnd = endValue;
      render();
    });
  }

  if (vixMetricsResetButton) {
    vixMetricsResetButton.addEventListener("click", () => {
      state.marketVixMetricsCustomStart = "";
      state.marketVixMetricsCustomEnd = "";
      render();
    });
  }

  if (vixFamilyApplyButton && vixFamilyStartInput && vixFamilyEndInput) {
    vixFamilyApplyButton.addEventListener("click", () => {
      const startValue = vixFamilyStartInput.value || "";
      const endValue = vixFamilyEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.marketVixFamilyCustomStart = startValue;
      state.marketVixFamilyCustomEnd = endValue;
      render();
    });
  }

  if (vixFamilyResetButton) {
    vixFamilyResetButton.addEventListener("click", () => {
      state.marketVixFamilyCustomStart = "";
      state.marketVixFamilyCustomEnd = "";
      render();
    });
  }

  const curveCanvas = usOverviewRoot.querySelector('[data-market-vix="curve"]');
  if (curveCanvas) {
    createMarketVixCurveChart(curveCanvas);
  }

  const metricsCanvas = usOverviewRoot.querySelector('[data-market-vix="metrics"]');
  if (metricsCanvas) {
    createMarketVixMetricsChart(metricsCanvas, state.marketVixMetricsRange);
  }

  const familyCanvas = usOverviewRoot.querySelector('[data-market-vix="family"]');
  if (familyCanvas) {
    createMarketVixFamilyChart(familyCanvas, state.marketVixFamilyRange);
  }
}

function createUsMarginChart(canvas, company) {
  if (typeof Chart === "undefined") {
    return;
  }

  const marginLabel = company.marginLabel ?? "OPM";

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: company.displayLabels ?? company.labels,
      datasets: [
        {
          label: marginLabel,
          data: company.opm,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          borderWidth: 2.2,
          tension: 0.25,
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86" },
          border: { color: "#d8d8d2" },
        },
        y: {
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function formatUsBillions(value) {
  return Number.isFinite(value) ? `$${value.toFixed(1)}B` : "-";
}

function formatUsPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "-";
}

function buildUsSegmentHistoryMap(segment, company, quarterLabels) {
  const historyMap = new Map();

  if (Array.isArray(segment.history)) {
    segment.history.forEach((entry) => {
      historyMap.set(entry.quarter, {
        revenue: Number.isFinite(entry.revenue) ? entry.revenue : null,
        yoy: Number.isFinite(entry.yoy) ? entry.yoy : null,
        opm: Number.isFinite(entry.opm) ? entry.opm : null,
      });
      });

    const allQuarterLabels = Array.isArray(company?.labels) ? company.labels : quarterLabels;
    quarterLabels.forEach((label) => {
      if (!historyMap.has(label)) {
        historyMap.set(label, { revenue: null, yoy: null, opm: null });
      }
      const point = historyMap.get(label);
      if (!Number.isFinite(point?.yoy)) {
        const labelIndex = allQuarterLabels.indexOf(label);
        if (labelIndex >= 4) {
          const priorLabel = allQuarterLabels[labelIndex - 4];
          const priorPoint = historyMap.get(priorLabel);
          if (Number.isFinite(point?.revenue) && Number.isFinite(priorPoint?.revenue) && priorPoint.revenue !== 0) {
            point.yoy = Number((((point.revenue - priorPoint.revenue) / priorPoint.revenue) * 100).toFixed(1));
          }
        }
      }
    });
    return historyMap;
  }

  quarterLabels.forEach((label) => {
    historyMap.set(label, { revenue: null, yoy: null, opm: null });
  });

  const latestLabel = quarterLabels[quarterLabels.length - 1];
  const priorYearLabel = quarterLabels[quarterLabels.length - 5];
  const latestYoy = Number.isFinite(segment.latestRevenue) && Number.isFinite(segment.priorRevenue) && segment.priorRevenue !== 0
    ? Number((((segment.latestRevenue - segment.priorRevenue) / segment.priorRevenue) * 100).toFixed(1))
    : null;

  if (priorYearLabel && historyMap.has(priorYearLabel)) {
    historyMap.set(priorYearLabel, {
      revenue: Number.isFinite(segment.priorRevenue) ? segment.priorRevenue : null,
      yoy: null,
      opm: null,
    });
  }

  if (latestLabel && historyMap.has(latestLabel)) {
    historyMap.set(latestLabel, {
      revenue: Number.isFinite(segment.latestRevenue) ? segment.latestRevenue : null,
      yoy: latestYoy,
      opm: Number.isFinite(segment.opm) ? segment.opm : null,
    });
  }

  return historyMap;
}

function buildUsSegmentTable(company) {
  const marginLabel = company.segmentMarginLabel ?? company.marginLabel ?? "OPM";
  const recentQuarterLabels = (company.labels ?? []).slice(-8).reverse();
  const displayQuarterLabels = getCompanyDisplayQuarterLabels(company, 8).reverse();

  const superHead = displayQuarterLabels
    .map((label) => `<span class="us-quarter-group">${label}</span>`)
    .join("");

  const subHead = recentQuarterLabels
    .map(() => `<span>Rev</span><span>YoY</span><span>${marginLabel}</span>`)
    .join("");

  const rows = company.segments
    .map((segment) => {
      const historyMap = buildUsSegmentHistoryMap(segment, company, recentQuarterLabels);
      const metrics = recentQuarterLabels
        .map((label) => {
          const point = historyMap.get(label) ?? { revenue: null, yoy: null, opm: null };
          const yoyClass = Number.isFinite(point.yoy)
            ? point.yoy > 0
              ? "is-positive"
              : point.yoy < 0
                ? "is-negative"
                : ""
            : "";
          const opmClass = Number.isFinite(point.opm)
            ? point.opm > 0
              ? "is-positive"
              : point.opm < 0
                ? "is-negative"
                : ""
            : "";

          return `
            <span>${formatUsBillions(point.revenue)}</span>
            <span class="${yoyClass}">${formatUsPercent(point.yoy)}</span>
            <span class="us-opm-value">${formatUsPercent(point.opm)}</span>`;
        })
        .join("");

      return `
        <div class="us-segment-row us-segment-grid">
          <span class="us-segment-name">${segment.name}</span>
          ${metrics}
        </div>`;
    })
    .join("");

  return `
    <div class="us-segment-block">
      <div class="us-segment-title">Segment 8Q Snapshot</div>
      <div class="us-segment-scroll">
        <div class="us-segment-table">
          <div class="us-segment-superhead us-segment-grid">
            <span class="us-sticky-cell">Segment</span>
            ${superHead}
          </div>
          <div class="us-segment-head us-segment-grid">
            <span class="us-sticky-cell">Metric</span>
            ${subHead}
          </div>
          ${rows}
        </div>
      </div>
      <p class="us-segment-note">${marginLabel} is shown only when a company officially discloses the relevant segment margin or segment profit detail. If not disclosed, it remains N/A.</p>
    </div>
  `;
}

function renderUSOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  const m7Markup = usOverviewData.m7Quarterly
    .map(
      (company) => `
        <article class="us-mini-card">
          <div class="us-panel-head">
            <div>
              <h3>${company.name}</h3>
              <p>Last 12 reported fiscal quarters with revenue, revenue YoY, and ${company.marginLabel ?? "OPM"}</p>
            </div>
          </div>
          <div class="us-mini-chart-wrap">
            <canvas data-us-quarterly="${company.name}"></canvas>
          </div>
          <div class="us-mini-chart-wrap us-mini-chart-wrap-secondary">
            <canvas data-us-margin="${company.name}"></canvas>
          </div>
          ${buildUsSegmentTable(company)}
        </article>`,
    )
    .join("");

  const rangeMarkup = (m7PriceData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.m7PriceRange === range.key ? " active" : ""}"
          data-m7-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="us-panel us-price-panel">
      <div class="us-section-head us-price-head">
        <div>
          <h2>M7 Relative Performance</h2>
          <p>Daily close normalized to 100 at the selected start date. Max begins ${m7PriceData.startDate ?? "2017-01-01"}.</p>
        </div>
        <div class="us-price-controls">
          <div class="m7-range-row">${rangeMarkup}</div>
          <div class="us-price-updated">Updated ${m7PriceData.updatedAt || "-"}</div>
        </div>
      </div>
      <div class="us-price-chart-wrap">
        <canvas data-m7-relative="performance"></canvas>
      </div>
    </section>
    <section class="us-m7-section">
      <div class="us-section-head">
        <div>
          <h2>M7 Quarterly Earnings</h2>
          <p>Company-reported fiscal quarter view. Charts show the latest 12 quarters, and segment tables show the latest 8 quarters.</p>
        </div>
      </div>
      <div class="us-mini-grid">${m7Markup}</div>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-m7-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.m7PriceRange = button.dataset.m7Range || m7PriceData.defaultRange || "max";
      render();
    });
  });

  const relativeCanvas = usOverviewRoot.querySelector('[data-m7-relative="performance"]');
  if (relativeCanvas) {
    createM7RelativeChart(relativeCanvas, state.m7PriceRange);
  }

  usOverviewData.m7Quarterly.forEach((company) => {
    const canvas = usOverviewRoot.querySelector(`[data-us-quarterly="${company.name}"]`);
    const latestTwelveLabels = (company.labels ?? []).slice(-12);
    const displayLabels = getCompanyDisplayQuarterLabels(company, 12);
    const chartCompany = {
      ...company,
      labels: latestTwelveLabels,
      displayLabels,
      revenue: (company.revenue ?? []).slice(-12),
      revenueYoy: (company.revenueYoy ?? []).slice(-12),
      opm: (company.opm ?? []).slice(-12),
    };
    if (canvas) {
      createUsQuarterlyChart(canvas, chartCompany);
    }
    const marginCanvas = usOverviewRoot.querySelector(`[data-us-margin="${company.name}"]`);
    if (marginCanvas) {
      createUsMarginChart(marginCanvas, chartCompany);
    }
  });
}

function createRevenueChart(canvas, company) {
  if (typeof Chart === "undefined") {
    return;
  }

  const axisSeries = buildSeriesForAxis(company.bars, company.month);
  const yoySeries = buildSeriesForAxis(company.yoyLine, company.month);
  const momSeries = buildSeriesForAxis(company.momLine, company.month);

  const grayBars = axisSeries.aligned.map((value, index) => {
    if (value === null) {
      return "rgba(0,0,0,0)";
    }
    const lightness = 26 + index * 2;
    return `hsl(0, 0%, ${Math.min(lightness, 48)}%)`;
  });

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: axisSeries.labels,
      datasets: [
        {
          type: "bar",
          label: "Revenue",
          data: axisSeries.aligned,
          backgroundColor: grayBars,
          borderWidth: 0,
          borderRadius: 3,
          yAxisID: "yRevenue",
          order: 3,
        },
        {
          type: "line",
          label: "YoY%",
          data: yoySeries.aligned,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2.4,
          tension: 0.32,
          pointRadius: 0,
          spanGaps: false,
          yAxisID: "yPercent",
          order: 1,
        },
        {
          type: "line",
          label: "MoM%",
          data: momSeries.aligned,
          borderColor: "#2563eb",
          backgroundColor: "#2563eb",
          borderWidth: 2.4,
          tension: 0.32,
          pointRadius: 0,
          spanGaps: false,
          yAxisID: "yPercent",
          order: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            autoSkip: true,
            maxTicksLimit: 8,
            maxRotation: 0,
            callback: (value, index) => {
              const label = axisSeries.labels[index];
              if (!label) {
                return "";
              }
              const [, month] = label.split("/");
              return month === "01" ? label : "";
            },
          },
          border: { color: "#d8d8d2" },
          title: {
            display: true,
            text: "Monthly timeline from 2021/01",
            color: "#8d8d86",
          },
        },
        yRevenue: {
          position: "left",
          beginAtZero: true,
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          ticks: {
            color: "#8d8d86",
            callback: (value) => revenueTickLabel(value),
            maxTicksLimit: 4,
          },
          border: { color: "#d8d8d2" },
        },
        yPercent: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
            maxTicksLimit: 4,
          },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createYearlyChart(canvas, company) {
  if (typeof Chart === "undefined") {
    return;
  }

  const yearlyValues = company.yearly.series.flatMap((series) =>
    series.values.filter((value) => value !== null && value !== undefined),
  );
  const minValue = yearlyValues.length ? Math.min(...yearlyValues) : -20;
  const maxValue = yearlyValues.length ? Math.max(...yearlyValues) : 100;
  const yMin = Math.min(-50, Math.floor(minValue / 50) * 50);
  const yMax = Math.max(100, Math.ceil(maxValue / 50) * 50);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: company.yearly.labels,
      datasets: company.yearly.series.map((series, index) => ({
        label: series.year,
        data: series.values,
        borderColor: yearColors[index % yearColors.length],
        backgroundColor: yearColors[index % yearColors.length],
        borderWidth: index === company.yearly.series.length - 1 ? 2.4 : 2,
        tension: 0.28,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "center",
          labels: {
            color: "#66665f",
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
          },
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}%`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            callback: (value, index) => {
              const label = company.yearly.labels[index];
              return label ? `${Number.parseInt(label, 10)}M` : "";
            },
          },
          border: { color: "#d8d8d2" },
          title: {
            display: true,
            text: "Monthly YoY checkpoints",
            color: "#8d8d86",
          },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
            maxTicksLimit: 5,
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function filteredCompanies() {
  const filtered = companies.filter((company) => {
    const matchesCountry = company.country === "Taiwan";
    const matchesSector = state.sector === "All" ? true : company.sector === state.sector;
    const matchesQuery = company.name.toLowerCase().includes(state.query.toLowerCase().trim());
    return matchesCountry && matchesSector && matchesQuery;
  });

  const sorted = [...filtered];
  if (state.sort === "marketCapDesc") {
    sorted.sort((a, b) => (b.marketCap?.[state.currency] ?? -Infinity) - (a.marketCap?.[state.currency] ?? -Infinity));
  } else if (state.sort === "marketCapAsc") {
    sorted.sort((a, b) => (a.marketCap?.[state.currency] ?? Infinity) - (b.marketCap?.[state.currency] ?? Infinity));
  } else if (state.sort === "nameAsc") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  return sorted;
}

function renderCountries() {
  countrySwitch.innerHTML = "";
  Object.entries(primaryTabMeta).forEach(([tabKey, meta]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `country-button${state.tab === tabKey ? " active" : ""}${tabKey === "Taiwan" ? " is-taiwan" : ""}${tabKey === "DailyBriefing" ? " is-daily-briefing" : ""}`;
    button.textContent = meta.label;
    button.addEventListener("click", () => {
      state.tab = tabKey;
      if (tabKey === "Taiwan") {
        state.currency = meta.defaultCurrency;
      } else {
        state.currency = "USD";
      }
      state.sector = "All";
      render();
    });
    countrySwitch.appendChild(button);
  });
}

function renderSubtabs() {
  subtabSwitch.innerHTML = "";
  let entries = [];
  let activeKey = "";

  if (state.tab === "Market") {
    entries = Object.entries(marketSubtabMeta);
    activeKey = state.marketView;
  } else if (state.tab === "BigTech") {
    entries = Object.entries(bigTechSubtabMeta);
    activeKey = state.bigTechView;
  } else if (state.tab === "Semis") {
    entries = Object.entries(semisSubtabMeta);
    activeKey = state.semisView;
  } else {
    subtabSwitch.classList.add("hidden");
    return;
  }

  subtabSwitch.classList.remove("hidden");
  subtabSwitch.classList.add("subtab-switch");
  entries.forEach(([viewKey, meta]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `subtab-chip${activeKey === viewKey ? " active" : ""}`;
    button.textContent = meta.label;
    button.addEventListener("click", () => {
      if (state.tab === "Market") {
        state.marketView = viewKey;
        if (viewKey === "RS") {
          state.query = "";
          if (searchInput) {
            searchInput.value = "";
          }
        }
      } else if (state.tab === "BigTech") {
        state.bigTechView = viewKey;
      } else if (state.tab === "Semis") {
        state.semisView = viewKey;
      }
      render();
    });
    subtabSwitch.appendChild(button);
  });
}

function renderCurrencies() {
  currencySwitch.innerHTML = "";
  if (state.tab !== "Taiwan") {
    return;
  }
  primaryTabMeta.Taiwan.currencies.forEach((currency) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `currency-button${state.currency === currency ? " active" : ""}`;
    button.textContent = currency === "NTD" ? "NT$" : currency;
    button.addEventListener("click", () => {
      state.currency = currency;
      render();
    });
    currencySwitch.appendChild(button);
  });
}

function renderSectors() {
  sectorChips.innerHTML = "";
  if (state.tab !== "Taiwan") {
    sectorChips.classList.add("hidden");
    return;
  }
  sectorChips.classList.remove("hidden");
  availableSectors().forEach((sector) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `chip${state.sector === sector ? " active" : ""}`;
    button.textContent = sector;
    button.addEventListener("click", () => {
      state.sector = sector;
      render();
    });
    sectorChips.appendChild(button);
  });
}

function renderSummary(list) {
  if (state.tab === "Market") {
    if (state.marketView === "Overview") {
      summaryText.textContent = "Price dashboard for major indexes, rates, dollar, energy, and metals";
      return;
    }
    if (state.marketView === "Macro") {
      summaryText.textContent = "US monthly macro dashboard with snapshot, coverage, categories, and history";
      return;
    }
    if (state.marketView === "VIX") {
      summaryText.textContent = "2018-01-01 이후 수집 가능한 VIX family history와 최신 CBOE settlement curve";
      return;
    }
    if (state.marketView === "Breadth") {
      summaryText.textContent = "Daily market breadth dashboard workspace";
      return;
    }
    if (state.marketView === "RS") {
      summaryText.textContent = "IBD-style RS rating leaderboard and searchable stock-level daily RS trend";
      return;
    }
    return;
  }

  if (state.tab === "BigTech" && state.bigTechView === "M7") {
    summaryText.textContent = "";
    return;
  }

  if (state.tab === "BigTech" && state.bigTechView === "Cloud") {
    summaryText.textContent = "Cloud raw data dashboard";
    return;
  }

  if (state.tab === "BigTech" && state.bigTechView === "Capex") {
    summaryText.textContent = "Big tech capex & cash flow dashboard";
    return;
  }

  if (state.tab === "Semis") {
    summaryText.textContent = state.semisView === "MemorySpot" ? "Memory spot dashboard workspace" : "GPU rental price dashboard workspace";
    return;
  }

  if (state.tab === "DailyBriefing") {
    summaryText.textContent = "Daily market briefing with curated heatmap, key headlines, and Korean mover notes";
    return;
  }

  if (state.tab === "Infra") {
    summaryText.textContent = "Infra dashboard workspace";
    return;
  }

  summaryText.textContent = `${primaryTabMeta.Taiwan.label} ${list.length} companies`;

  const avgYoY =
    list.length > 0
      ? (list.reduce((sum, company) => sum + company.yoy, 0) / list.length).toFixed(1)
      : "0.0";
  const avgMoM =
    list.length > 0
      ? (list.reduce((sum, company) => sum + company.mom, 0) / list.length).toFixed(1)
      : "0.0";
  summaryText.textContent = `${primaryTabMeta.Taiwan.label} ${list.length} companies · Avg YoY ${avgYoY}% · Avg MoM ${avgMoM}% · ${currencyMeta[state.currency].label.trim()} · ${state.sector}`;
}

function renderCards(list) {
  destroyCharts();
  companyGrid.innerHTML = "";

  if (list.length === 0) {
    companyGrid.innerHTML = `<div class="empty-state">No companies match the current country, sector, or search filter.</div>`;
    return;
  }

  list.forEach((company) => {
    const fragment = cardTemplate.content.cloneNode(true);
    fragment.querySelector(".company-name").textContent = company.name;
    fragment.querySelector(".revenue-value").textContent = formatMarketCap(company);

    const momNode = fragment.querySelector(".mom-value");
    momNode.textContent = formatDelta(company.mom);
    if (company.mom < 0) {
      momNode.classList.add("negative");
    }

    const yoyNode = fragment.querySelector(".yoy-value");
    yoyNode.textContent = formatDelta(company.yoy);
    if (company.yoy < 0) {
      yoyNode.classList.add("negative");
    }

    fragment.querySelector(".reporting-month").textContent = company.month;
    const metricCaptions = fragment.querySelectorAll(".metric-caption span");
    if (metricCaptions.length >= 4) {
      metricCaptions[1].textContent = "Market Cap";
      metricCaptions[2].textContent = "MoM";
      metricCaptions[3].textContent = "YoY";
    }
    fragment.querySelector(".sector-pill").textContent = company.sector;
    fragment.querySelector(".chart-panel .axis-caption").textContent = "Monthly revenue and growth trend";
    fragment.querySelector(".trend-panel .axis-caption").textContent = "Compare the same months across years";

    companyGrid.appendChild(fragment);
    const card = companyGrid.lastElementChild;

    try {
      createRevenueChart(card.querySelector(".revenue-chart"), company);
      createYearlyChart(card.querySelector(".yearly-chart"), company);
    } catch (error) {
      card.querySelector(".chart-panel").insertAdjacentHTML(
        "beforeend",
        `<p class="axis-caption">Chart render error</p>`,
      );
      card.querySelector(".trend-panel").insertAdjacentHTML(
        "beforeend",
        `<p class="axis-caption">Chart render error</p>`,
      );
      console.error("Chart render failed:", company.name, error);
    }
  });
}

function render() {
  destroyCharts();
  ensureValidSelection();
  const showRsToolbar = state.tab === "Market" && state.marketView === "RS";
  if (toolbarRow) {
    toolbarRow.classList.toggle("hidden", state.tab !== "Taiwan" && !showRsToolbar);
  }
  if (sortBox) {
    sortBox.classList.toggle("hidden", state.tab !== "Taiwan");
  }
  if (searchInput) {
    if (showRsToolbar) {
      searchInput.placeholder = "Search ticker or company...";
    } else {
      searchInput.placeholder = "Search company...";
    }
  }
  renderCountries();
  renderSubtabs();
  renderCurrencies();
  renderSectors();

  if (state.tab === "BigTech" && state.bigTechView === "M7") {
    renderSummary([]);
    renderUSOverview();
    return;
  }

  if (state.tab === "BigTech" && state.bigTechView === "Cloud") {
    renderSummary([]);
    renderCloudOverview();
    return;
  }

  if (state.tab === "BigTech" && state.bigTechView === "Capex") {
    renderSummary([]);
    renderCapexOverview();
    return;
  }

  if (state.tab === "DailyBriefing") {
    renderSummary([]);
    renderMarketBriefingOverview();
    return;
  }

  if (state.tab === "Semis") {
    renderSummary([]);
    if (state.semisView === "MemorySpot") {
      renderMemorySpotOverview();
      return;
    }
    if (state.semisView === "GPUCloud") {
      renderGpuCloudOverview();
      return;
    }
    renderPlaceholderOverview("Semis Dashboard", "CPU, ASIC, 광통신 같은 주제를 여기에 모아두면 확장성이 좋아집니다. 다음 데이터가 들어오면 이 영역부터 붙이면 됩니다.");
    return;
  }

  if (state.tab === "Infra") {
    renderSummary([]);
    renderPlaceholderOverview("Infra Dashboard", "전력기기와 인프라 관련 기업/지표를 여기에 모아두는 구조입니다. 이후 전력기기 탭을 이 안에서 세부 주제로 확장하면 됩니다.");
    return;
  }

  if (state.tab === "Market") {
    renderSummary([]);
    if (state.marketView === "Overview") {
      renderMarketOverview();
      return;
    }
    if (state.marketView === "Macro") {
      renderMarketMacroOverview();
      return;
    }
    if (state.marketView === "VIX") {
      renderMarketVixOverview();
      return;
    }
    if (state.marketView === "Breadth") {
      renderMarketBreadthOverview();
      return;
    }
    if (state.marketView === "RS") {
      renderMarketRsOverview();
      return;
    }
    return;
  }

  usOverviewRoot.classList.add("hidden");
  usOverviewRoot.innerHTML = "";
  companyGrid.classList.remove("hidden");
  const list = filteredCompanies();
  renderSummary(list);
  renderCards(list);
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

render();
refreshBrandMeta();
