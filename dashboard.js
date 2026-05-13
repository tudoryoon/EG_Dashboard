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
  DataTrend: { label: "Data Trend" },
};

const bigTechSubtabMeta = {
  M7: { label: "M7" },
  Cloud: { label: "Cloud" },
  Capex: { label: "Capex & 현금흐름" },
};

const marketSubtabMeta = {
  Overview: { label: "Price" },
  Macro: { label: "Macro" },
  FxCommodities: { label: "FX & Commodities" },
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
  "macro:policy:fed_funds": "#e11d48",
  "macro:policy:inflation_5y": "#f97316",
  "macro:policy:real_5y": "#dc2626",
  "macro:rates:us2y": "#0f766e",
  "macro:rates:us5y": "#22c55e",
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
  "macro:strategic:uranium": "#16a34a",
  "macro:strategic:iron_ore": "#b45309",
  "macro:strategic:lng_jkm": "#2563eb",
};
const MARKET_PRICE_EMA_OPTIONS = [10, 20, 60, 120, 200];
const MARKET_PRICE_TREND_INDEX_OPTIONS = [
  { key: "sp500", label: "S&P 500" },
  { key: "nasdaq100", label: "NASDAQ 100" },
];
const MARKET_RS_CAP_RANGES = [
  { key: "all", label: "All", min: 0, max: Number.POSITIVE_INFINITY },
  { key: "200m-1b", label: "$200M-$1B", min: 200_000_000, max: 1_000_000_000 },
  { key: "1b-10b", label: "$1B-$10B", min: 1_000_000_000, max: 10_000_000_000 },
  { key: "10b-100b", label: "$10B-$100B", min: 10_000_000_000, max: 100_000_000_000 },
  { key: "100b-plus", label: "$100B+", min: 100_000_000_000, max: Number.POSITIVE_INFINITY },
];

const state = {
  tab: "Market",
  marketView: "Overview",
  bigTechView: "M7",
  semisView: "MemorySpot",
  currency: "USD",
  sector: "All",
  query: "",
  sort: "marketCapDesc",
  m7PriceRange: m7PriceData.defaultRange ?? "max",
  marketPriceRange: marketPriceData.defaultRange ?? "max",
  marketTrendRange: "3y",
  marketTrendIndex: "sp500",
  marketTrendEmas: [10, 60, 120],
  marketTrendCustomStart: "",
  marketTrendCustomEnd: "",
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
  rsMarketCapRange: "all",
  rsCustomMarketCapMin: "",
  rsCustomMarketCapMax: "",
  rsLeaderSort: "rs",
  rsTableSortKey: "rs",
  rsTableSortDirection: "desc",
  macroIndicatorKey: "",
  macroSeriesKey: "",
  macroHistoryMode: "common",
  macroDashboardRange: "5y",
  macroDashboardCustomStart: "",
  macroDashboardCustomEnd: "",
  macroDashboardSelection: [
    "policy:fed_funds",
    "market:sp500",
  ],
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

function toDateKey(dateText) {
  if (!dateText) {
    return "";
  }
  return dateText.length === 7 ? `${dateText}-01` : dateText;
}

function toDateInputValue(dateText) {
  return toDateKey(dateText);
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

function calculateEmaSeries(values, period) {
  if (!Array.isArray(values) || !values.length || !Number.isFinite(period) || period <= 1) {
    return values?.slice?.() ?? [];
  }
  const multiplier = 2 / (period + 1);
  const result = [];
  let ema = null;
  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      result.push(null);
      return;
    }
    if (ema === null) {
      const seedWindow = values.slice(Math.max(0, index - period + 1), index + 1).filter((item) => Number.isFinite(item));
      if (seedWindow.length < Math.min(period, index + 1)) {
        result.push(null);
        return;
      }
      ema = seedWindow.reduce((sum, item) => sum + item, 0) / seedWindow.length;
      result.push(Number(ema.toFixed(2)));
      return;
    }
    ema = value * multiplier + ema * (1 - multiplier);
    result.push(Number(ema.toFixed(2)));
  });
  return result;
}

function getMarketTrendBounds() {
  const trendStart = marketPriceData?.startDate ?? "1980-01-01";
  const items = ["sp500", "nasdaq100"].map((key) => marketPriceData?.items?.[key]).filter(Boolean);
  const dates = [...new Set(items.flatMap((item) => item.dates ?? []).filter((date) => date >= trendStart))].sort();
  return {
    min: dates[0] ?? trendStart,
    max: dates[dates.length - 1] ?? "",
  };
}

function buildMarketTrendChartPayload(rangeKey, indexKey, customStart = "", customEnd = "") {
  const trendStart = marketPriceData?.startDate ?? "1980-01-01";
  const item = marketPriceData?.items?.[indexKey];
  if (!item?.dates?.length || !item?.values?.length) {
    return { labels: [], datasets: [], item: null };
  }

  const firstUsableIndex = Math.max(
    0,
    (item.dates ?? []).findIndex((label) => label >= trendStart),
  );
  const fullLabels = (item.dates ?? []).slice(firstUsableIndex);
  const fullValues = (item.values ?? []).slice(firstUsableIndex);
  if (!fullLabels.length || !fullValues.length) {
    return { labels: [], datasets: [], item };
  }

  const latestDate = fullLabels[fullLabels.length - 1];
  const derivedStartDate = shiftDateByRange(latestDate, rangeKey, trendStart);
  const startDate = customStart || derivedStartDate;
  const endDate = customEnd || latestDate;
  const startIndex = Math.max(0, fullLabels.findIndex((label) => label >= startDate));
  const endIndex = fullLabels.findIndex((label) => label > endDate);
  const sliceEnd = endIndex === -1 ? fullLabels.length : Math.max(startIndex + 1, endIndex);
  const labels = fullLabels.slice(startIndex, sliceEnd);
  const priceValues = fullValues.slice(startIndex, sliceEnd);
  const emaReferenceSeries = Object.fromEntries(
    MARKET_PRICE_EMA_OPTIONS.map((period) => [period, calculateEmaSeries(fullValues, period).slice(startIndex, sliceEnd)]),
  );
  const emaDatasets = (state.marketTrendEmas ?? [])
    .filter((period) => MARKET_PRICE_EMA_OPTIONS.includes(period))
    .map((period) => {
      const emaFull = calculateEmaSeries(fullValues, period);
      return {
        label: `EMA ${period}`,
        data: emaFull.slice(startIndex, sliceEnd),
        borderColor:
          period === 10
            ? "#dc2626"
            : period === 20
              ? "#d4a017"
              : period === 60
                ? "#2563eb"
                : period === 120
                  ? "#16a34a"
                  : "#7c3aed",
        backgroundColor:
          period === 10
            ? "#dc2626"
            : period === 20
              ? "#d4a017"
              : period === 60
                ? "#2563eb"
                : period === 120
                  ? "#16a34a"
                  : "#7c3aed",
        borderWidth: period >= 120 ? 2.6 : 2.1,
        tension: 0.12,
        pointRadius: 0,
        pointHoverRadius: 3,
        spanGaps: false,
      };
    });

  return {
    labels,
    datasets: [
      {
        label: item.label,
        data: priceValues,
        borderColor: "#111827",
        backgroundColor: "#111827",
        borderWidth: 3,
        tension: 0.08,
        pointRadius: 0,
        pointHoverRadius: 4,
        spanGaps: false,
      },
      ...emaDatasets,
    ],
    item,
    emaReferenceSeries,
  };
}

function calculateMarketTrendGap(indexValue, emaValue) {
  if (!Number.isFinite(indexValue) || !Number.isFinite(emaValue) || emaValue === 0) {
    return null;
  }
  return (indexValue / emaValue - 1) * 100;
}

function formatMarketTrendGap(value) {
  if (value === null || !Number.isFinite(Number(value))) {
    return "-";
  }
  return formatSignedPercent(Number(value));
}

function buildMarketTrendGapSummary() {
  const payload = buildMarketTrendChartPayload(
    state.marketTrendRange,
    state.marketTrendIndex,
    state.marketTrendCustomStart,
    state.marketTrendCustomEnd,
  );
  const indexValues = payload.datasets?.[0]?.data ?? [];
  let latestIndex = -1;
  for (let index = indexValues.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(indexValues[index])) {
      latestIndex = index;
      break;
    }
  }
  if (latestIndex === -1) {
    return [];
  }
  const latestIndexValue = Number(indexValues[latestIndex]);
  return MARKET_PRICE_EMA_OPTIONS.map((period) => {
    const emaValue = Number(payload.emaReferenceSeries?.[period]?.[latestIndex]);
    const gap = calculateMarketTrendGap(latestIndexValue, emaValue);
    return {
      period,
      gap,
      emaValue,
      indexValue: latestIndexValue,
      date: payload.labels?.[latestIndex] ?? "",
    };
  });
}

function createMarketTrendChart(canvas, rangeKey, indexKey, customStart = "", customEnd = "") {
  if (typeof Chart === "undefined" || !canvas) {
    return;
  }

  const payload = buildMarketTrendChartPayload(rangeKey, indexKey, customStart, customEnd);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const yMin = Math.floor(minValue * 0.97);
  const yMax = Math.ceil(maxValue * 1.03);
  const bearBackgroundPlugin = {
    id: "marketTrendBearBackground",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      if (!ctx || !chartArea || !xScale) {
        return;
      }
      const ema10 = payload.emaReferenceSeries?.[10] ?? [];
      const ema60 = payload.emaReferenceSeries?.[60] ?? [];
      const ema120 = payload.emaReferenceSeries?.[120] ?? [];
      const ema200 = payload.emaReferenceSeries?.[200] ?? [];
      if (!ema10.length || !ema60.length || !ema120.length || !ema200.length) {
        return;
      }
      let segmentStart = null;

      const drawSegment = (startIndex, endIndex, fillStyle) => {
        if (startIndex === null || endIndex < startIndex) {
          return;
        }
        const startX = startIndex <= 0 ? chartArea.left : (xScale.getPixelForValue(startIndex - 1) + xScale.getPixelForValue(startIndex)) / 2;
        const endX =
          endIndex >= payload.labels.length - 1
            ? chartArea.right
            : (xScale.getPixelForValue(endIndex) + xScale.getPixelForValue(endIndex + 1)) / 2;
        ctx.save();
        ctx.fillStyle = fillStyle;
        ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
        ctx.restore();
      };

      let weakBearStart = null;
      let fullBullStart = null;
      for (let index = 0; index < payload.labels.length; index += 1) {
        const isFullBearish =
          Number.isFinite(ema10[index]) &&
          Number.isFinite(ema60[index]) &&
          Number.isFinite(ema120[index]) &&
          Number(ema10[index]) < Number(ema60[index]) &&
          Number(ema60[index]) < Number(ema120[index]);
        const isWeakBearish =
          Number.isFinite(ema10[index]) &&
          Number.isFinite(ema60[index]) &&
          Number(ema10[index]) < Number(ema60[index]);
        const isFullBullish =
          Number.isFinite(ema10[index]) &&
          Number.isFinite(ema60[index]) &&
          Number.isFinite(ema120[index]) &&
          Number.isFinite(ema200[index]) &&
          Number(ema10[index]) > Number(ema60[index]) &&
          Number(ema60[index]) > Number(ema120[index]) &&
          Number(ema120[index]) > Number(ema200[index]);

        if (isFullBullish && fullBullStart === null) {
          fullBullStart = index;
        } else if (!isFullBullish && fullBullStart !== null) {
          drawSegment(fullBullStart, index - 1, "rgba(107, 114, 128, 0.10)");
          fullBullStart = null;
        }

        if (isFullBearish && segmentStart === null) {
          segmentStart = index;
        } else if (!isFullBearish && segmentStart !== null) {
          drawSegment(segmentStart, index - 1, "rgba(239, 68, 68, 0.11)");
          segmentStart = null;
        }

        const weakOnly = isWeakBearish && !isFullBearish;
        if (weakOnly && weakBearStart === null) {
          weakBearStart = index;
        } else if (!weakOnly && weakBearStart !== null) {
          drawSegment(weakBearStart, index - 1, "rgba(96, 165, 250, 0.11)");
          weakBearStart = null;
        }
      }

      if (segmentStart !== null) {
        drawSegment(segmentStart, payload.labels.length - 1, "rgba(239, 68, 68, 0.16)");
      }

      if (weakBearStart !== null) {
        drawSegment(weakBearStart, payload.labels.length - 1, "rgba(96, 165, 250, 0.11)");
      }

      if (fullBullStart !== null) {
        drawSegment(fullBullStart, payload.labels.length - 1, "rgba(107, 114, 128, 0.10)");
      }
    },
  };

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: payload.datasets,
    },
    plugins: [bearBackgroundPlugin],
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
            title: (items) => items?.[0]?.label ?? "",
            label: (context) => {
              const value = Number(context.parsed.y);
              const baseText = `${context.dataset.label}: ${formatUsStockPrice(value, 2)}`;
              const emaMatch = String(context.dataset.label ?? "").match(/^EMA\s+(\d+)/);
              if (!emaMatch) {
                return baseText;
              }
              const indexValue = Number(payload.datasets?.[0]?.data?.[context.dataIndex]);
              const gap = calculateMarketTrendGap(indexValue, value);
              return `${baseText} / ${formatMarketTrendGap(gap)}`;
            },
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
            callback: (value) => formatUsStockPrice(Number(value), Number(value) >= 1000 ? 0 : 2),
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

function buildMarketVixNasdaqSeries(labels) {
  const nasdaqItem = marketPriceData?.items?.nasdaq100;
  if (!nasdaqItem?.dates?.length || !labels?.length) {
    return [];
  }

  const dateIndex = new Map();
  (nasdaqItem.dates ?? []).forEach((date, index) => {
    dateIndex.set(date, index);
  });

  let lastKnownIndex = -1;
  return labels.map((label) => {
    const exactIndex = dateIndex.get(label);
    if (exactIndex !== undefined) {
      lastKnownIndex = exactIndex;
      return nasdaqItem.values?.[exactIndex] ?? null;
    }

    while (
      lastKnownIndex + 1 < (nasdaqItem.dates?.length ?? 0) &&
      nasdaqItem.dates[lastKnownIndex + 1] <= label
    ) {
      lastKnownIndex += 1;
    }

    return lastKnownIndex >= 0 ? nasdaqItem.values?.[lastKnownIndex] ?? null : null;
  });
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
  const nasdaqData = buildMarketVixNasdaqSeries(payload.labels);
  const vixValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const nasdaqValues = nasdaqData.filter((value) => Number.isFinite(value));

  const minValue = vixValues.length ? Math.min(...vixValues) : 10;
  const maxValue = vixValues.length ? Math.max(...vixValues) : 40;
  const spread = Math.max(maxValue - minValue, 2);
  const yMin = Math.max(0, minValue - spread * 0.12);
  const yMax = maxValue + spread * 0.12;

  const nasdaqMin = nasdaqValues.length ? Math.min(...nasdaqValues) : 15000;
  const nasdaqMax = nasdaqValues.length ? Math.max(...nasdaqValues) : 25000;
  const nasdaqSpread = Math.max(nasdaqMax - nasdaqMin, 250);
  const yNasdaqMin = Math.max(0, nasdaqMin - nasdaqSpread * 0.08);
  const yNasdaqMax = nasdaqMax + nasdaqSpread * 0.08;

  const selectedTickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const selectedTickSet = new Set(selectedTickIndexes);
  const chartDatasets = [
    ...payload.datasets.map((dataset) => ({
      ...dataset,
      yAxisID: "y",
    })),
    {
      key: "nasdaq100",
      label: "NASDAQ 100",
      data: nasdaqData,
      borderColor: "#f59e0b",
      backgroundColor: "#f59e0b",
      borderWidth: 3.6,
      borderDash: [10, 5],
      tension: 0.16,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
      yAxisID: "yNasdaq",
    },
  ];

  const chart = new Chart(canvas, {
    type: "line",
    data: { labels: payload.labels, datasets: chartDatasets },
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
            label: (context) =>
              context.dataset.yAxisID === "yNasdaq"
                ? `${context.dataset.label}: ${Number(context.parsed.y).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                : `${context.dataset.label}: ${formatVixLevel(context.parsed.y)}`,
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
        yNasdaq: {
          position: "right",
          min: yNasdaqMin,
          max: yNasdaqMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 }),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "NASDAQ 100",
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
      const isPercentSeries = panelKey === "rates" || panelKey === "policy";
      items.push({
        key: `macro:${panelKey}:${seriesKey}`,
        group: panel.title,
        label: item.name,
        color: item.color,
        dates: item.dates ?? [],
        values: item.values ?? [],
        formatter: panel.formatter ?? "number1",
        rawLabel: item.name,
        isRate: isPercentSeries,
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
            text: "Rate / Inflation (%)",
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

const macroKoreanLabels = {
  employment: "고용보고서",
  payems: "비농업 고용",
  unrate: "실업률",
  ahe: "평균 시간당 임금",
  cpi: "소비자물가",
  headline_cpi: "헤드라인 CPI",
  core_cpi: "근원 CPI",
  food_cpi: "식품",
  energy_cpi: "에너지",
  shelter_cpi: "주거비",
  rent_cpi: "임대료",
  oer_cpi: "자가주거비",
  transport_services_cpi: "운송서비스",
  medical_services_cpi: "의료서비스",
  new_vehicles_cpi: "신차",
  used_cars_cpi: "중고차",
  apparel_cpi: "의류",
  pce: "PCE 물가",
  headline_pce: "헤드라인 PCE",
  core_pce: "근원 PCE",
  ppi: "생산자물가",
  final_demand_ppi: "최종수요 PPI",
  core_ppi: "근원 PPI",
  retail_sales: "소매판매",
  retail_sales_total: "소매판매",
  ism_services: "ISM 서비스업",
  services_pmi: "서비스업 PMI",
  services_prices: "서비스업 가격",
  services_employment: "서비스업 고용",
  services_new_orders: "서비스업 신규주문",
  ism_manufacturing: "ISM 제조업",
  manufacturing_pmi: "제조업 PMI",
  manufacturing_new_orders: "제조업 신규주문",
  manufacturing_prices: "제조업 지불가격",
  jolts: "구인·이직",
  job_openings: "구인건수",
  quits_rate: "자발적 퇴사율",
  hires: "채용건수",
  durable_goods: "내구재 주문",
  durable_orders: "내구재 주문",
  core_capital_goods: "핵심 자본재 주문",
  housing: "주택",
  housing_starts: "주택착공",
  building_permits: "건축허가",
};

const macroKoreanNotes = {
  payems: "월간 고용 증가폭입니다. 노동시장 체력과 소비 여력을 같이 봅니다.",
  unrate: "경제활동인구 중 일자리를 찾는 실업자 비율입니다.",
  ahe: "임금 상승 압력입니다. 서비스 물가와 연준 정책에 중요합니다.",
  headline_cpi: "가계가 체감하는 전체 소비자물가 상승률입니다.",
  core_cpi: "에너지와 식품을 제외한 기조 물가 압력입니다.",
  food_cpi: "식료품 가격 압력을 따로 봅니다.",
  energy_cpi: "유가와 전기·가스 등 에너지 가격 변동을 따로 봅니다.",
  shelter_cpi: "CPI에서 비중이 큰 주거비 물가입니다.",
  rent_cpi: "실제 임차인이 내는 임대료 항목입니다.",
  oer_cpi: "자가 거주자가 집을 임대했다면 낼 것으로 추정되는 주거비입니다.",
  transport_services_cpi: "항공료, 보험, 수리 등 운송서비스 물가입니다.",
  medical_services_cpi: "의료서비스 가격 압력입니다.",
  new_vehicles_cpi: "신차 가격 흐름입니다.",
  used_cars_cpi: "중고차와 트럭 가격 흐름입니다.",
  apparel_cpi: "의류 가격 흐름입니다.",
  headline_pce: "연준이 선호하는 개인소비지출 물가입니다.",
  core_pce: "연준이 가장 중요하게 보는 기조 인플레이션입니다.",
  final_demand_ppi: "기업 판매가격 압력입니다. CPI보다 앞서 움직일 때가 많습니다.",
  core_ppi: "변동성이 큰 항목을 제외한 생산자물가 압력입니다.",
  retail_sales_total: "미국 소비 강도를 보여주는 월간 소매판매입니다.",
  services_pmi: "서비스업 경기 확장·수축을 보여주는 지수입니다.",
  services_prices: "서비스업 기업들이 느끼는 가격 압력입니다.",
  services_employment: "서비스업 고용 분위기입니다.",
  services_new_orders: "서비스업 신규 수요의 선행 신호입니다.",
  manufacturing_pmi: "제조업 경기 확장·수축을 보여주는 지수입니다.",
  manufacturing_new_orders: "제조업 신규 수요의 선행 신호입니다.",
  manufacturing_prices: "제조업 원가·가격 압력입니다.",
  job_openings: "기업의 구인 수요입니다. 노동시장 과열 여부를 봅니다.",
  quits_rate: "근로자가 자발적으로 이직·퇴사하는 비율입니다.",
  hires: "기업의 실제 채용 규모입니다.",
  durable_orders: "내구재 신규 주문으로 기업투자와 수요를 봅니다.",
  core_capital_goods: "방산·항공 제외 설비투자 선행지표입니다.",
  housing_starts: "실제 착공된 주택 수로 금리 민감 수요를 봅니다.",
  building_permits: "향후 착공 가능성을 보여주는 선행 주택지표입니다.",
};

function getMacroKoreanLabel(entry) {
  return macroKoreanLabels[entry?.key] ?? "";
}

function getMacroKoreanNote(entry) {
  return macroKoreanNotes[entry?.key] ?? "";
}

function getMacroSeriesChartKind(series) {
  if (!series) {
    return "level";
  }
  if (series.key === "payems") {
    return "mom_change";
  }
  if (["unrate", "quits_rate"].includes(series.key)) {
    return "level";
  }
  if (
    series.key.includes("pmi") ||
    series.key.includes("services_") ||
    series.key.includes("manufacturing_")
  ) {
    return "level";
  }
  return "yoy";
}

function getMacroChartKindLabel(kind) {
  if (kind === "yoy") {
    return "YoY %";
  }
  if (kind === "mom_change") {
    return "MoM change";
  }
  return "Level";
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

function formatMacroChartValue(kind, unit, value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  if (kind === "yoy") {
    return formatMacroChangePercent(value);
  }
  if (kind === "mom_change") {
    return formatMacroDeltaValue(unit, value);
  }
  return formatMacroIndicatorValue(unit, value);
}

function formatMacroReleaseNumber(unit, value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (unit === "percent") {
    return `${numeric.toFixed(2)}%`;
  }
  if (unit === "thousands") {
    return `${(numeric / 1000).toFixed(0)}K`;
  }
  if (unit === "millions") {
    return `${(numeric / 1000000).toFixed(2)}M`;
  }
  return formatMacroIndicatorValue(unit, numeric);
}

function getMacroReleaseConsensusValue(row) {
  const actual = Number(row?.actualValue);
  const surprise = Number(row?.surpriseValue);
  if (!Number.isFinite(actual) || !Number.isFinite(surprise)) {
    return null;
  }
  return actual - surprise;
}

function getMacroReleaseBasis(series, release = series?.latestRelease) {
  const reference = String(release?.reference ?? "").toLowerCase();
  if (reference.includes("yoy") || reference.includes("year")) {
    return "YoY";
  }
  if (reference.includes("mom") || reference.includes("month")) {
    return "MoM";
  }
  if (
    [
      "ahe",
      "headline_cpi",
      "core_cpi",
      "headline_pce",
      "core_pce",
      "final_demand_ppi",
      "core_ppi",
      "retail_sales",
      "durable_goods_orders",
      "core_capex_orders",
    ].includes(series?.key)
  ) {
    return "MoM";
  }
  if (series?.key === "payems") {
    return "Monthly change";
  }
  return "Level";
}

function getMacroDerivedValues(series, kind) {
  const values = series?.values ?? [];
  return values.map((value, index) => {
    const current = Number(value);
    if (!Number.isFinite(current)) {
      return null;
    }
    if (kind === "yoy") {
      const base = Number(values[index - 12]);
      if (!Number.isFinite(base) || base === 0) {
        return null;
      }
      return Number((((current / base) - 1) * 100).toFixed(2));
    }
    if (kind === "mom_change") {
      const previous = Number(values[index - 1]);
      if (!Number.isFinite(previous)) {
        return null;
      }
      return Number((current - previous).toFixed(2));
    }
    return current;
  });
}

function buildMacroChartPayload(indicator, series, mode) {
  if (!indicator || !series) {
    return { labels: [], values: [], kind: "level", viewLabel: "Level" };
  }
  const startMonth = mode === "common" ? macroIndicatorsData.commonStartMonth ?? indicator.commonStartMonth : indicator.availableStartMonth ?? indicator.startMonth;
  const kind = getMacroSeriesChartKind(series);
  const derivedValues = getMacroDerivedValues(series, kind);
  const labels = [];
  const values = [];
  (series.dates ?? []).forEach((dateText, index) => {
    if (startMonth && dateText < startMonth) {
      return;
    }
    labels.push(dateText);
    values.push(derivedValues[index] ?? null);
  });
  return { labels, values, kind, viewLabel: getMacroChartKindLabel(kind) };
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
          label: `${series.label} ${payload.viewLabel}`,
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
            label: (context) => `${series.label}: ${formatMacroChartValue(payload.kind, series.unit, context.parsed.y)}`,
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
            callback: (value) => formatMacroChartValue(payload.kind, series.unit, Number(value)),
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function createMacroReleaseChart(canvas, series) {
  if (typeof Chart === "undefined" || !canvas || !series) {
    return;
  }
  const rows = (series.releaseHistory ?? [])
    .filter((row) => Number.isFinite(Number(row.actualValue)) && Number.isFinite(Number(getMacroReleaseConsensusValue(row))))
    .slice(-12);
  if (!rows.length) {
    return;
  }
  const labels = rows.map((row) => row.reference ?? row.releaseDate ?? "-");
  const unit = rows.at(-1)?.unit ?? series.unit;
  const basis = getMacroReleaseBasis(series, rows.at(-1));
  const actualValues = rows.map((row) => Number(row.actualValue));
  const consensusValues = rows.map((row) => getMacroReleaseConsensusValue(row));
  const surpriseValues = rows.map((row) => Number(row.surpriseValue));

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: `Actual (${basis})`,
          data: actualValues,
          backgroundColor: "rgba(36, 36, 33, 0.82)",
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          type: "bar",
          label: `Consensus (${basis})`,
          data: consensusValues,
          backgroundColor: "rgba(37, 99, 235, 0.42)",
          borderRadius: 4,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Surprise",
          data: surpriseValues,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2.4,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.18,
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
            label: (context) => `${context.dataset.label}: ${formatMacroReleaseNumber(unit, context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#8d8d86",
            maxRotation: 35,
            minRotation: 0,
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          position: "left",
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatMacroReleaseNumber(unit, value),
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        y1: {
          position: "right",
          ticks: {
            color: "#d93025",
            callback: (value) => formatMacroReleaseNumber(unit, value),
          },
          grid: { drawOnChartArea: false },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function getMacroDashboardSeriesByKey(seriesKey) {
  for (const indicator of macroIndicatorsData.indicators ?? []) {
    const found = (indicator.series ?? []).find((series) => series.key === seriesKey);
    if (found) {
      return found;
    }
  }
  return null;
}

function buildMacroIndicatorDashboardItem({ key, label, seriesKey, kind, color }) {
  const series = getMacroDashboardSeriesByKey(seriesKey);
  if (!series?.dates?.length) {
    return null;
  }
  const values = getMacroDerivedValues(series, kind);
  const dates = [];
  const cleanValues = [];
  (series.dates ?? []).forEach((dateText, index) => {
    const value = values[index];
    if (!Number.isFinite(Number(value))) {
      return;
    }
    dates.push(dateText.length === 7 ? `${dateText}-01` : dateText);
    cleanValues.push(Number(value));
  });
  return {
    key,
    label,
    dates,
    values: cleanValues,
    color,
    axis: "percent",
    formatter: kind === "mom_change" ? "number1" : "percent2",
    normalize: false,
    dash: [4, 4],
  };
}

function getMacroDashboardItems() {
  const policySeries = marketMacroData?.panels?.policy?.series ?? {};
  const rateSeries = marketMacroData?.panels?.rates?.series ?? {};
  const marketItems = marketPriceData?.items ?? {};
  const metalSeries = marketMacroData?.panels?.metals?.series ?? {};
  const energySeries = marketMacroData?.panels?.energy?.series ?? {};
  const longCommoditySeries = marketMacroData?.longCommodities?.series ?? {};

  const maybeItems = [
    marketItems.sp500 && {
      key: "market:sp500",
      label: "S&P 500",
      dates: marketItems.sp500.dates ?? [],
      values: marketItems.sp500.values ?? [],
      color: "#111827",
      axis: "index",
      formatter: "number1",
      normalize: true,
    },
    policySeries.fed_funds && {
      key: "policy:fed_funds",
      label: "Fed Funds",
      dates: policySeries.fed_funds.dates ?? [],
      values: policySeries.fed_funds.values ?? [],
      color: "#e11d48",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
    },
    rateSeries.us2y && {
      key: "rates:us2y",
      label: "US 2Y",
      dates: rateSeries.us2y.dates ?? [],
      values: rateSeries.us2y.values ?? [],
      color: "#0f766e",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
    },
    rateSeries.us5y && {
      key: "rates:us5y",
      label: "US 5Y",
      dates: rateSeries.us5y.dates ?? [],
      values: rateSeries.us5y.values ?? [],
      color: "#22c55e",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
    },
    rateSeries.us10y && {
      key: "rates:us10y",
      label: "US 10Y",
      dates: rateSeries.us10y.dates ?? [],
      values: rateSeries.us10y.values ?? [],
      color: "#14b8a6",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
    },
    rateSeries.us30y && {
      key: "rates:us30y",
      label: "US 30Y",
      dates: rateSeries.us30y.dates ?? [],
      values: rateSeries.us30y.values ?? [],
      color: "#06b6d4",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
    },
    policySeries.real_5y && {
      key: "policy:real_5y",
      label: "Real 5Y",
      dates: policySeries.real_5y.dates ?? [],
      values: policySeries.real_5y.values ?? [],
      color: "#dc2626",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
      dash: [6, 4],
    },
    (longCommoditySeries.wti || energySeries.wti) && {
      key: "commodity:wti",
      label: "WTI",
      dates: (longCommoditySeries.wti || energySeries.wti).dates ?? [],
      values: (longCommoditySeries.wti || energySeries.wti).values ?? [],
      color: "#16a34a",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (longCommoditySeries.gold || metalSeries.gold) && {
      key: "commodity:gold",
      label: "Gold",
      dates: (longCommoditySeries.gold || metalSeries.gold).dates ?? [],
      values: (longCommoditySeries.gold || metalSeries.gold).values ?? [],
      color: "#d4a017",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (longCommoditySeries.silver || metalSeries.silver) && {
      key: "commodity:silver",
      label: "Silver",
      dates: (longCommoditySeries.silver || metalSeries.silver).dates ?? [],
      values: (longCommoditySeries.silver || metalSeries.silver).values ?? [],
      color: "#64748b",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (longCommoditySeries.copper || metalSeries.copper) && {
      key: "commodity:copper",
      label: "Copper",
      dates: (longCommoditySeries.copper || metalSeries.copper).dates ?? [],
      values: (longCommoditySeries.copper || metalSeries.copper).values ?? [],
      color: "#b45309",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    buildMacroIndicatorDashboardItem({
      key: "indicator:headline_cpi_yoy",
      label: "CPI YoY",
      seriesKey: "headline_cpi",
      kind: "yoy",
      color: "#7c3aed",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:final_demand_ppi_yoy",
      label: "PPI YoY",
      seriesKey: "final_demand_ppi",
      kind: "yoy",
      color: "#f97316",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:unrate",
      label: "Unemployment",
      seriesKey: "unrate",
      kind: "level",
      color: "#2563eb",
    }),
  ];

  return maybeItems.filter(Boolean);
}

function getMacroDashboardBounds() {
  const selectedKeys = new Set(state.macroDashboardSelection ?? []);
  const items = getMacroDashboardItems().filter((item) => selectedKeys.has(item.key));
  const allDates = [...new Set(items.flatMap((item) => item.dates))].sort((a, b) => toDateKey(a).localeCompare(toDateKey(b)));
  return {
    min: toDateInputValue(allDates[0] ?? ""),
    max: toDateInputValue(allDates[allDates.length - 1] ?? ""),
  };
}

function buildMacroDashboardChartPayload(rangeKey) {
  const selectedKeys = new Set(state.macroDashboardSelection ?? []);
  const items = getMacroDashboardItems().filter((item) => selectedKeys.has(item.key));
  const allDates = [...new Set(items.flatMap((item) => item.dates))].sort((a, b) => toDateKey(a).localeCompare(toDateKey(b)));
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }
  const latestDate = toDateKey(allDates[allDates.length - 1]);
  const startDate = shiftDateByRange(
    latestDate,
    rangeKey,
    marketMacroData?.startDate ?? marketPriceData?.startDate ?? "1965-01-01",
  );
  const customStart = state.macroDashboardCustomStart || startDate;
  const customEnd = state.macroDashboardCustomEnd || latestDate;
  const labels = allDates.filter((date) => toDateKey(date) >= toDateKey(customStart) && toDateKey(date) <= toDateKey(customEnd));
  const datasets = items.map((item) => {
    const dateIndex = new Map();
    item.dates.forEach((date, index) => dateIndex.set(date, index));
    const baseDate = labels.find((date) => dateIndex.has(date) && Number.isFinite(Number(item.values[dateIndex.get(date)])));
    const baseValue = baseDate ? Number(item.values[dateIndex.get(baseDate)]) : null;
    const data = labels.map((date) => {
      const index = dateIndex.get(date);
      if (index === undefined) {
        return null;
      }
      const value = Number(item.values[index]);
      if (!Number.isFinite(value)) {
        return null;
      }
      if (!item.normalize) {
        return value;
      }
      if (!Number.isFinite(baseValue) || baseValue === 0) {
        return null;
      }
      return Number(((value / baseValue) * 100).toFixed(2));
    });
    return {
      label: item.label,
      data,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: item.axis === "index" ? 2.6 : 2.2,
      borderDash: item.dash ?? [],
      tension: 0.18,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
      yAxisID: item.axis === "percent" ? "yPercent" : "y",
      formatter: item.formatter,
      normalize: item.normalize,
    };
  });
  return { labels, datasets };
}

function createMacroDashboardChart(canvas, rangeKey) {
  if (typeof Chart === "undefined" || !canvas) {
    return;
  }
  const payload = buildMacroDashboardChartPayload(rangeKey);
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
          callbacks: {
            title: (items) => items?.[0]?.label ?? "",
            label: (context) => {
              const dataset = context.dataset;
              const suffix = dataset.normalize ? " (Start=100)" : "";
              return `${dataset.label}: ${formatMacroValue(context.parsed.y, dataset.normalize ? "number1" : dataset.formatter)}${suffix}`;
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
          position: "left",
          ticks: {
            color: "#8d8d86",
            callback: (value) => Number(value).toFixed(0),
          },
          title: {
            display: true,
            text: "Price / Commodity Start = 100",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        yPercent: {
          position: "right",
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${Number(value).toFixed(1)}%`,
          },
          title: {
            display: true,
            text: "Rates / Inflation / Labor",
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
    { key: "dowjones", label: "Dow Jones (DIA)" },
    { key: "sp500", label: "S&P 500 (SPY)" },
    { key: "nasdaq100", label: "나스닥 100 (QQQ)" },
    { key: "russell2000", label: "Russell 2000 (IWM)" },
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
      (item) => {
        const summaryMarkup = (item.summaryLines ?? [])
          .map((line) => `<span>${line}</span>`)
          .join("");
        return `
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
          <div class="briefing-mover-summary">
            ${summaryMarkup || `<span>${item.headline || "관련 뉴스 핵심 내용을 아직 찾지 못했습니다."}</span>`}
          </div>
          <div class="briefing-news-meta">
            <span>${item.source || "Source"}</span>
            <span>${formatBriefingTimestamp(item.publishedAt)}</span>
          </div>
          ${item.link ? `<a class="briefing-mover-link" href="${item.link}" target="_blank" rel="noreferrer">Open source news</a>` : ""}
        </article>
      `;
      },
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
            <p>다우 (DIA), S&amp;P 500 (SPY), 나스닥 100 (QQQ), 러셀 2000 (IWM)의 최신 레벨과 등락을 바로 확인합니다.</p>
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

function getMarketRsCapRangeMeta(key) {
  return MARKET_RS_CAP_RANGES.find((range) => range.key === key) ?? MARKET_RS_CAP_RANGES[0];
}

function parseMarketCapInput(value) {
  const text = String(value ?? "").trim().replace(/[$,\s]/g, "").toLowerCase();
  if (!text) {
    return null;
  }
  const match = text.match(/^(\d+(?:\.\d+)?)([mbt])?$/);
  if (!match) {
    return null;
  }
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  const multiplier = match[2] === "t" ? 1_000_000_000_000 : match[2] === "b" ? 1_000_000_000 : match[2] === "m" ? 1_000_000 : 1;
  return numeric * multiplier;
}

function matchesMarketRsCapRange(row) {
  const marketCap = Number(row.marketCap);
  if (!Number.isFinite(marketCap)) {
    return false;
  }
  const customMin = parseMarketCapInput(state.rsCustomMarketCapMin);
  const customMax = parseMarketCapInput(state.rsCustomMarketCapMax);
  if (customMin !== null && marketCap < customMin) {
    return false;
  }
  if (customMax !== null && marketCap > customMax) {
    return false;
  }
  if (customMin !== null || customMax !== null) {
    return true;
  }
  const range = getMarketRsCapRangeMeta(state.rsMarketCapRange);
  return marketCap >= range.min && marketCap < range.max;
}

function getVisibleMarketRsRows() {
  const query = (state.query ?? "").trim().toLowerCase();
  return (marketRsData.rows ?? [])
    .filter((row) => {
      if (!matchesMarketRsCapRange(row)) {
        return false;
      }
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
    case "rs1m":
      return row.rsPeriods?.["1m"] ?? Number.NEGATIVE_INFINITY;
    case "rs3m":
      return row.rsPeriods?.["3m"] ?? Number.NEGATIVE_INFINITY;
    case "rs6m":
      return row.rsPeriods?.["6m"] ?? Number.NEGATIVE_INFINITY;
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

function sortMarketRsLeaderRows(rows) {
  const sortKey = state.rsLeaderSort ?? "rs";
  return [...rows].sort((left, right) => {
    if (sortKey === "marketCapDesc" || sortKey === "marketCapAsc") {
      const leftCap = Number(left.marketCap);
      const rightCap = Number(right.marketCap);
      if (Number.isFinite(leftCap) && Number.isFinite(rightCap) && leftCap !== rightCap) {
        return sortKey === "marketCapAsc" ? leftCap - rightCap : rightCap - leftCap;
      }
    }

    const leftScore = getMarketRsUniverseScore(left, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
    const rightScore = getMarketRsUniverseScore(right, state.rsUniverse) ?? Number.NEGATIVE_INFINITY;
    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }
    return String(left.ticker ?? "").localeCompare(String(right.ticker ?? ""));
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
  const marketCapChips = MARKET_RS_CAP_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.rsMarketCapRange === range.key ? " active" : ""}"
        data-rs-market-cap="${range.key}"
      >${range.label}</button>
    `,
  ).join("");
  const leaderSortChips = [
    { key: "rs", label: "RS" },
    { key: "marketCapDesc", label: "Market Cap ↓" },
    { key: "marketCapAsc", label: "Market Cap ↑" },
  ]
    .map(
      (item) => `
        <button
          type="button"
          class="market-rs-chip${state.rsLeaderSort === item.key ? " active" : ""}"
          data-rs-leader-sort="${item.key}"
        >${item.label}</button>
      `,
    )
    .join("");
  const tableSortRows = sortMarketRsTableRows(rows);
  const sortedLeaderRows = sortMarketRsLeaderRows(rows);
  const leaderRows = state.rsFilter === "newHigh" ? sortedLeaderRows : sortedLeaderRows.slice(0, 12);
  const leaderCards = leaderRows
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
            <span>RS_1M</span>
            <strong>${formatRsNumber(row.rsPeriods?.["1m"])}</strong>
          </div>
          <div class="market-rs-card-meta">
            <span>RS_3M</span>
            <strong>${formatRsNumber(row.rsPeriods?.["3m"])}</strong>
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
          <td>${formatRsNumber(row.rsPeriods?.["1m"])}</td>
          <td>${formatRsNumber(row.rsPeriods?.["3m"])}</td>
          <td>${formatRsNumber(row.rsPeriods?.["6m"])}</td>
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
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Market Cap</span>
            <div class="market-rs-chip-row">${marketCapChips}</div>
            <div class="market-rs-cap-custom">
              <label>
                <span>Min</span>
                <input type="text" inputmode="decimal" placeholder="ex. 5B" value="${state.rsCustomMarketCapMin}" data-rs-market-cap-min />
              </label>
              <label>
                <span>Max</span>
                <input type="text" inputmode="decimal" placeholder="optional" value="${state.rsCustomMarketCapMax}" data-rs-market-cap-max />
              </label>
              <button type="button" class="total-date-button" data-rs-market-cap-apply>Apply</button>
              <button type="button" class="total-date-button total-date-button-secondary" data-rs-market-cap-clear>Clear</button>
            </div>
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
            <div class="market-rs-chip-row">${leaderSortChips}</div>
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
              <span>RS_1M</span>
              <strong>${formatRsNumber(selected?.rsPeriods?.["1m"])}</strong>
            </div>
            <div class="market-rs-metric">
              <span>RS_3M</span>
              <strong>${formatRsNumber(selected?.rsPeriods?.["3m"])}</strong>
            </div>
            <div class="market-rs-metric">
              <span>RS_6M</span>
              <strong>${formatRsNumber(selected?.rsPeriods?.["6m"])}</strong>
            </div>
            <div class="market-rs-metric">
              <span>RS_12M</span>
              <strong>${formatRsNumber(selected?.rsPeriods?.["12m"])}</strong>
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
            <p>Search from the top bar, filter by market-cap range, then click any row to inspect the stock-level daily RS trend.</p>
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
                <th>${renderMarketRsSortHeader("RS_1M", "rs1m")}</th>
                <th>${renderMarketRsSortHeader("RS_3M", "rs3m")}</th>
                <th>${renderMarketRsSortHeader("RS_6M", "rs6m")}</th>
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
  usOverviewRoot.querySelectorAll("[data-rs-market-cap]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsMarketCapRange = button.dataset.rsMarketCap || "all";
      state.rsCustomMarketCapMin = "";
      state.rsCustomMarketCapMax = "";
      render();
    });
  });
  const rsMarketCapMinInput = usOverviewRoot.querySelector("[data-rs-market-cap-min]");
  const rsMarketCapMaxInput = usOverviewRoot.querySelector("[data-rs-market-cap-max]");
  const rsMarketCapApplyButton = usOverviewRoot.querySelector("[data-rs-market-cap-apply]");
  const rsMarketCapClearButton = usOverviewRoot.querySelector("[data-rs-market-cap-clear]");
  if (rsMarketCapApplyButton && rsMarketCapMinInput && rsMarketCapMaxInput) {
    rsMarketCapApplyButton.addEventListener("click", () => {
      state.rsCustomMarketCapMin = rsMarketCapMinInput.value.trim();
      state.rsCustomMarketCapMax = rsMarketCapMaxInput.value.trim();
      render();
    });
  }
  if (rsMarketCapClearButton) {
    rsMarketCapClearButton.addEventListener("click", () => {
      state.rsCustomMarketCapMin = "";
      state.rsCustomMarketCapMax = "";
      state.rsMarketCapRange = "all";
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-rs-leader-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsLeaderSort = button.dataset.rsLeaderSort || "rs";
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

function getGpuSemiAnalysisSpotSeries() {
  return gpuCloudData.semiAnalysisH100Spot ?? null;
}

function buildGpuMergedLabels(seriesList) {
  return [...new Set(seriesList.flatMap((series) => series?.labels ?? []))];
}

function buildGpuAlignedSeriesData(labels, sourceLabels, sourceValues) {
  const labelIndex = new Map();
  (sourceLabels ?? []).forEach((label, index) => {
    labelIndex.set(label, index);
  });
  return labels.map((label) => {
    const index = labelIndex.get(label);
    return index === undefined ? null : sourceValues?.[index] ?? null;
  });
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
  const semiSpotSeries = getGpuSemiAnalysisSpotSeries();
  const mergedLabels = buildGpuMergedLabels([semiSeries, semiSpotSeries]);

  usOverviewRoot.innerHTML = `
    <section class="memory-overview">
      <div class="us-section-head cloud-section-head">
        <h2>${gpuCloudData.dashboard?.title ?? "GPU Rental Price Dashboard"}</h2>
        <p>${gpuCloudData.dashboard?.subtitle ?? "SemiAnalysis H100 1Y monthly contract benchmark"}</p>
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
            <span>${semiSeries?.latestLabel ?? "-"} ${Number.isFinite(semiSeries?.latestValue) ? `| ${formatGpuCloudValue(semiSeries.latestValue)}` : ""}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Cycle low</span>
            <span class="memory-stat-value">${Number.isFinite(semiSeries?.floor) ? `${formatGpuCloudValue(semiSeries.floor)} | ${semiSeries.floorLabel}` : "N/A"}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Method</span>
            <span class="memory-stat-value">${semiSeries?.method ?? ""}</span>
          </div>
          <div class="memory-chart-wrap">
            <canvas data-gpu-basket="semi-h100-1y"></canvas>
          </div>
        </article>
        <article class="memory-panel">
          <div class="us-panel-head">
            <div>
              <h3>${semiSpotSeries?.title ?? "SemiAnalysis H100 Spot Index (Preview)"}</h3>
              <p>${semiSpotSeries?.subtitle ?? ""}</p>
            </div>
          </div>
          <div class="memory-card-meta gpu-term-meta">
            <span>${semiSpotSeries?.sourceLabel ?? "SemiAnalysis GPU Pricing Index preview"}</span>
            <span>${semiSpotSeries?.latestLabel ?? "-"} ${Number.isFinite(semiSpotSeries?.latestValue) ? `· ${formatGpuCloudValue(semiSpotSeries.latestValue)}` : ""}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Preview low</span>
            <span class="memory-stat-value">${Number.isFinite(semiSpotSeries?.floor) ? `${formatGpuCloudValue(semiSpotSeries.floor)} · ${semiSpotSeries.floorLabel}` : "N/A"}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Method</span>
            <span class="memory-stat-value">${semiSpotSeries?.method ?? ""}</span>
          </div>
          <div class="memory-chart-wrap">
            <canvas data-gpu-basket="semi-h100-spot"></canvas>
          </div>
        </article>
      </section>
    </section>
  `;

  const semiCanvas = usOverviewRoot.querySelector('[data-gpu-basket="semi-h100-1y"]');
  const legacySpotPanel = usOverviewRoot.querySelector('[data-gpu-basket="semi-h100-spot"]')?.closest(".memory-panel");
  if (legacySpotPanel) {
    legacySpotPanel.style.display = "none";
  }

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
        <p>Representative DRAM and NAND spot benchmarks for tracking memory pricing trends</p>
      </div>
      <section class="memory-banner">
        <div>
          <strong>Source</strong>
          <span>${memorySpotData.source?.name ?? "Public memory benchmark dashboard"}</span>
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

  const rangeMarkup = ((marketMacroData.ranges ?? []).length ? marketMacroData.ranges : marketPriceData.ranges ?? [])
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
  const marketTrendBounds = getMarketTrendBounds();
  const marketTrendStartValue = state.marketTrendCustomStart || "";
  const marketTrendEndValue = state.marketTrendCustomEnd || "";
  const marketTrendRangeMarkup = (marketPriceData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketTrendRange === range.key ? " active" : ""}"
          data-market-trend-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");
  const marketTrendIndexMarkup = MARKET_PRICE_TREND_INDEX_OPTIONS.map(
    (item) => `
      <button
        type="button"
        class="total-series-chip${state.marketTrendIndex === item.key ? " active" : ""}"
        data-market-trend-index="${item.key}"
      >
        ${item.label}
      </button>`,
  ).join("");
  const marketTrendEmaMarkup = MARKET_PRICE_EMA_OPTIONS.map(
    (period) => `
      <button
        type="button"
        class="total-series-chip${(state.marketTrendEmas ?? []).includes(period) ? " active" : ""}"
        data-market-trend-ema="${period}"
      >
        EMA ${period}
      </button>`,
  ).join("");
  const marketTrendGapMarkup = buildMarketTrendGapSummary()
    .map((item) => {
      const gapClass = item.gap === null ? "neutral" : Number(item.gap) >= 0 ? "positive" : "negative";
      return `
        <span class="market-trend-gap-pill ${gapClass}" title="${item.date} index ${formatUsStockPrice(item.indexValue, 2)} / EMA ${item.period} ${formatUsStockPrice(item.emaValue, 2)}">
          <span>EMA ${item.period}</span>
          <strong>${formatMarketTrendGap(item.gap)}</strong>
        </span>`;
    })
    .join("");
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
  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Index Trend & EMA</h2>
            <p>S&P 500와 NASDAQ 100의 일별 지수와 EMA(10, 20, 60, 120, 200)를 1980-01-01 이후 기준으로 확인합니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${marketTrendRangeMarkup}</div>
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-market-trend-start
              min="${marketTrendBounds.min}"
              max="${marketTrendBounds.max}"
              value="${marketTrendStartValue}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-market-trend-end
              min="${marketTrendBounds.min}"
              max="${marketTrendBounds.max}"
              value="${marketTrendEndValue}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-market-trend-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-market-trend-reset>Reset</button>
          </div>
        </div>
        <div class="total-series-row total-series-row-left">
          ${marketTrendIndexMarkup}
        </div>
        <div class="total-series-row total-series-row-left">
          ${marketTrendEmaMarkup}
        </div>
        <div class="market-trend-meta">
          <span>Coverage from ${marketTrendBounds.min || "2000-01-01"}</span>
          <span>Gap = Index / EMA - 1</span>
        </div>
        <div class="market-trend-gap-row">
          ${marketTrendGapMarkup}
        </div>
        <div class="market-trend-legend">
          <span class="market-trend-legend-item">
            <span class="market-trend-legend-swatch market-trend-legend-swatch-weak"></span>
            EMA 10 &lt; EMA 60
          </span>
          <span class="market-trend-legend-item">
            <span class="market-trend-legend-swatch market-trend-legend-swatch-full"></span>
            EMA 10 &lt; EMA 60 &lt; EMA 120
          </span>
          <span class="market-trend-legend-item">
            <span class="market-trend-legend-swatch market-trend-legend-swatch-bull"></span>
            EMA 10 &gt; EMA 60 &gt; EMA 120 &gt; EMA 200
          </span>
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-trend="ema"></canvas>
        </div>
      </section>
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

  usOverviewRoot.querySelectorAll("[data-market-trend-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketTrendRange = button.dataset.marketTrendRange || "3y";
      state.marketTrendCustomStart = "";
      state.marketTrendCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-trend-index]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketTrendIndex = button.dataset.marketTrendIndex || "sp500";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-trend-ema]").forEach((button) => {
    button.addEventListener("click", () => {
      const period = Number(button.dataset.marketTrendEma);
      if (!Number.isFinite(period)) {
        return;
      }
      const current = new Set(state.marketTrendEmas ?? []);
      if (current.has(period)) {
        if (current.size === 1) {
          return;
        }
        current.delete(period);
      } else {
        current.add(period);
      }
      state.marketTrendEmas = [...current].sort((a, b) => a - b);
      render();
    });
  });

  const marketTrendStartInput = usOverviewRoot.querySelector("[data-market-trend-start]");
  const marketTrendEndInput = usOverviewRoot.querySelector("[data-market-trend-end]");
  const marketTrendApplyButton = usOverviewRoot.querySelector("[data-market-trend-apply]");
  const marketTrendResetButton = usOverviewRoot.querySelector("[data-market-trend-reset]");

  if (marketTrendApplyButton && marketTrendStartInput && marketTrendEndInput) {
    marketTrendApplyButton.addEventListener("click", () => {
      const startValue = marketTrendStartInput.value || "";
      const endValue = marketTrendEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.marketTrendCustomStart = startValue;
      state.marketTrendCustomEnd = endValue;
      render();
    });
  }

  if (marketTrendResetButton) {
    marketTrendResetButton.addEventListener("click", () => {
      state.marketTrendCustomStart = "";
      state.marketTrendCustomEnd = "";
      render();
    });
  }

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

  const trendCanvas = usOverviewRoot.querySelector('[data-market-trend="ema"]');
  if (trendCanvas) {
    createMarketTrendChart(
      trendCanvas,
      state.marketTrendRange,
      state.marketTrendIndex,
      state.marketTrendCustomStart,
      state.marketTrendCustomEnd,
    );
  }

  const relativeCanvas = usOverviewRoot.querySelector('[data-market-relative="performance"]');
  if (relativeCanvas) {
    createMarketRelativeChart(relativeCanvas, state.marketPriceRange);
  }
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
      const entryKoLabel = getMacroKoreanLabel(entry);
      const seriesMarkup = (entry.series ?? [])
        .map((item) => {
          const latestRelease = item.latestRelease ?? null;
          const itemKoLabel = getMacroKoreanLabel(item);
          const itemKoNote = getMacroKoreanNote(item);
          const chartKind = getMacroSeriesChartKind(item);
          const primaryValue =
            chartKind === "yoy"
              ? formatMacroChangePercent(item.yoyPct)
              : chartKind === "mom_change"
                ? formatMacroDeltaValue(item.unit, item.deltaValue)
                : formatMacroIndicatorValue(item.unit, item.latestValue);
          const primaryLabel = getMacroChartKindLabel(chartKind);
          if (!item.latestDate || !Number.isFinite(Number(item.latestValue))) {
            return `
              <div class="macro-snapshot-stat">
                <span>${item.label}${itemKoLabel ? `<em class="macro-ko-label">${itemKoLabel}</em>` : ""}</span>
                <strong>Pending</strong>
                <small>${entry.statusNote ?? "manual/source pending"}</small>
              </div>
            `;
          }
          return `
            <div class="macro-snapshot-stat">
              <span>${item.label}${itemKoLabel ? `<em class="macro-ko-label">${itemKoLabel}</em>` : ""}</span>
              <strong>${primaryValue}</strong>
              <small>${primaryLabel} focus | raw ${formatMacroIndicatorValue(item.unit, item.latestValue)}</small>
              <small>MoM ${formatMacroChangePercent(item.momPct)} | YoY ${formatMacroChangePercent(item.yoyPct)}</small>
              <small>${latestRelease ? `Released ${latestRelease.releaseDate ?? "-"} | ${getMacroReleaseBasis(item, latestRelease)}` : "release date pending"}</small>
              <small>${latestRelease ? `Actual ${latestRelease.actual ?? "-"} / Cons ${latestRelease.consensus ?? "-"} / Surprise ${latestRelease.surprise ?? "-"}` : "consensus pending"}</small>
              ${itemKoNote ? `<small class="macro-ko-note">${itemKoNote}</small>` : ""}
            </div>
          `;
        })
        .join("");
      return `
        <article class="macro-snapshot-card">
          <div class="macro-snapshot-head">
            <div>
              <h3>${entry.title}${entryKoLabel ? `<em class="macro-ko-label macro-ko-label-title">${entryKoLabel}</em>` : ""}</h3>
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
    .map((entry) => {
      const koLabel = getMacroKoreanLabel(entry);
      return `<option value="${entry.key}"${entry.key === indicator?.key ? " selected" : ""}>${entry.title}${koLabel ? ` (${koLabel})` : ""}</option>`;
    })
    .join("");

  const seriesChips = (indicator?.series ?? [])
    .map(
      (item) => {
        const koLabel = getMacroKoreanLabel(item);
        return `
          <button
            type="button"
            class="market-rs-chip macro-series-chip${item.key === series?.key ? " active" : ""}"
            data-macro-series="${item.key}"
          >${item.label}${koLabel ? `<span>${koLabel}</span>` : ""}</button>
        `;
      },
    )
    .join("");

  const selectedChartKind = getMacroSeriesChartKind(series);
  const selectedKoLabel = getMacroKoreanLabel(series);
  const selectedKoNote = getMacroKoreanNote(series);
  const selectedReleaseBasis = getMacroReleaseBasis(series);

  const chartMetaMarkup =
    indicator && series
      ? `
        <div class="macro-chart-metrics">
          <div class="market-rs-metric">
            <span>Chart View</span>
            <strong>${getMacroChartKindLabel(selectedChartKind)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>YoY</span>
            <strong>${formatMacroChangePercent(series.yoyPct)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>MoM</span>
            <strong>${formatMacroChangePercent(series.momPct)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Actual</span>
            <strong>${series.latestRelease?.actual ?? formatMacroIndicatorValue(series.unit, series.latestValue)}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Consensus</span>
            <strong>${series.latestRelease?.consensus ?? "-"}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Surprise</span>
            <strong>${series.latestRelease?.surprise ?? "-"}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Release Date</span>
            <strong>${series.latestRelease?.releaseDate ?? "-"}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Release Basis</span>
            <strong>${selectedReleaseBasis}</strong>
          </div>
          <div class="market-rs-metric">
            <span>Coverage</span>
            <strong>${state.macroHistoryMode === "common" ? "2010-04+" : indicator.availableStartMonth ?? indicator.startMonth ?? "-"}</strong>
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
          <td>${getMacroReleaseBasis(series, row)}</td>
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
          ${indicator?.title ?? "-"} / ${series?.label ?? "-"}${selectedKoLabel ? ` (${selectedKoLabel})` : ""} / ${getMacroChartKindLabel(selectedChartKind)} / ${state.macroHistoryMode === "common" ? "2010-04+ common view" : "full history"}
        </p>
        ${selectedKoNote ? `<p class="macro-ko-chart-note">${selectedKoNote}</p>` : ""}
        <div class="macro-release-table-wrap">
          <div class="us-section-head macro-release-head">
            <div>
              <h3>Actual vs Consensus</h3>
              <p>Release basis: ${selectedReleaseBasis}. CPI/PCE/PPI 같은 물가지표 발표 서프라이즈는 시장에서 MoM 컨센서스를 특히 크게 봅니다.</p>
            </div>
          </div>
          <div class="macro-release-chart-wrap">
            <canvas data-macro-release-chart></canvas>
          </div>
          <table class="macro-coverage-table macro-release-table">
            <thead>
              <tr>
                <th>Release</th>
                <th>Ref</th>
                <th>Actual</th>
                <th>Cons</th>
                <th>Prev</th>
                <th>Basis</th>
                <th>Surprise</th>
              </tr>
            </thead>
            <tbody>${releaseRows || '<tr><td colspan="7">Release history pending.</td></tr>'}</tbody>
          </table>
        </div>
      `;
  const macroDashboardItems = getMacroDashboardItems();
  const macroDashboardRangeSource = (marketMacroData.ranges ?? []).length ? marketMacroData.ranges : marketPriceData.ranges ?? [];
  const macroDashboardBounds = getMacroDashboardBounds();
  const macroDashboardStartValue = state.macroDashboardCustomStart || "";
  const macroDashboardEndValue = state.macroDashboardCustomEnd || "";
  const macroDashboardRangeMarkup = macroDashboardRangeSource
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.macroDashboardRange === range.key ? " active" : ""}"
          data-macro-dashboard-range="${range.key}"
        >${range.label}</button>
      `,
    )
    .join("");
  const macroDashboardSelectorMarkup = macroDashboardItems
    .map(
      (item) => `
        <button
          type="button"
          class="market-rs-chip macro-dashboard-chip${state.macroDashboardSelection.includes(item.key) ? " active" : ""}"
          data-macro-dashboard-series="${item.key}"
        >
          <span class="macro-series-dot" style="background:${item.color}"></span>
          ${item.label}
        </button>
      `,
    )
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel macro-panel macro-dashboard-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Macro Total Dashboard</h2>
            <p class="macro-clean-copy">미국 기준금리, 명목금리, 실질금리, S&P500, 인플레, 고용, 원자재를 한 그래프에서 비교합니다.</p>
            <p>Rates and macro indicators use the right axis; S&P500 and commodities are normalized to 100 on the left axis.</p>
          </div>
          <div class="m7-range-row">${macroDashboardRangeMarkup}</div>
        </div>
        <div class="macro-dashboard-note">
          <span>실질금리 = US 5Y - 5Y 기대 인플레이션(T5YIE)</span>
          <span>좌측축: 주식/원자재 Start=100</span>
          <span>우측축: 금리/인플레/고용률 %</span>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-macro-dashboard-start
              min="${macroDashboardBounds.min}"
              max="${macroDashboardBounds.max}"
              value="${macroDashboardStartValue}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-macro-dashboard-end
              min="${macroDashboardBounds.min}"
              max="${macroDashboardBounds.max}"
              value="${macroDashboardEndValue}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-macro-dashboard-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-macro-dashboard-reset>Reset</button>
          </div>
        </div>
        <div class="total-series-row total-series-row-left macro-dashboard-series-row">${macroDashboardSelectorMarkup}</div>
        <div class="macro-dashboard-chart-wrap">
          <canvas data-macro-dashboard-chart></canvas>
        </div>
      </section>

      <section class="us-panel macro-panel">
        <div class="us-section-head">
          <div>
            <h2>Historical Chart</h2>
            <p class="macro-clean-copy">CPI, PCE, PPI처럼 추세가 중요한 지표는 YoY 중심으로 보고, 실업률과 PMI처럼 레벨이 중요한 지표는 레벨로 봅니다.</p>
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
            <p class="macro-clean-copy">최신 발표월 기준 YoY/MoM, 실제치, 컨센서스, 서프라이즈를 빠르게 확인합니다.</p>
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
              <p class="macro-clean-copy">사용 가능 시작월, 데이터 소스, 자동/수동 업데이트 상태를 확인합니다.</p>
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
              <p class="macro-clean-copy">인플레이션, 노동, 수요, 경기순환, 금리민감 지표로 묶었습니다.</p>
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

  usOverviewRoot.querySelectorAll("[data-macro-dashboard-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.macroDashboardRange = button.dataset.macroDashboardRange || "5y";
      state.macroDashboardCustomStart = "";
      state.macroDashboardCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-macro-dashboard-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.macroDashboardSeries;
      if (!key) {
        return;
      }
      const selected = new Set(state.macroDashboardSelection);
      if (selected.has(key)) {
        selected.delete(key);
      } else {
        selected.add(key);
      }
      state.macroDashboardSelection = [...selected];
      render();
    });
  });

  const macroDashboardStartInput = usOverviewRoot.querySelector("[data-macro-dashboard-start]");
  const macroDashboardEndInput = usOverviewRoot.querySelector("[data-macro-dashboard-end]");
  const macroDashboardApplyButton = usOverviewRoot.querySelector("[data-macro-dashboard-apply]");
  const macroDashboardResetButton = usOverviewRoot.querySelector("[data-macro-dashboard-reset]");

  if (macroDashboardApplyButton && macroDashboardStartInput && macroDashboardEndInput) {
    macroDashboardApplyButton.addEventListener("click", () => {
      const startValue = macroDashboardStartInput.value || "";
      const endValue = macroDashboardEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.macroDashboardCustomStart = startValue;
      state.macroDashboardCustomEnd = endValue;
      render();
    });
  }

  if (macroDashboardResetButton) {
    macroDashboardResetButton.addEventListener("click", () => {
      state.macroDashboardCustomStart = "";
      state.macroDashboardCustomEnd = "";
      render();
    });
  }

  const macroDashboardCanvas = usOverviewRoot.querySelector("[data-macro-dashboard-chart]");
  if (macroDashboardCanvas) {
    createMacroDashboardChart(macroDashboardCanvas, state.macroDashboardRange);
  }

  if (indicator?.status !== "manual" && series?.dates?.length) {
    const canvas = usOverviewRoot.querySelector("[data-macro-indicator-chart]");
    if (canvas) {
      createMacroIndicatorChart(canvas, indicator, series, state.macroHistoryMode);
    }
    const releaseCanvas = usOverviewRoot.querySelector("[data-macro-release-chart]");
    if (releaseCanvas) {
      createMacroReleaseChart(releaseCanvas, series);
    }
  }
}

function renderMarketFxCommoditiesOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const rangeSource = (marketMacroData.ranges ?? []).length ? marketMacroData.ranges : marketPriceData.ranges ?? [];
  const marketUpdatedAt = marketMacroData.updatedAt || marketPriceData.updatedAt || "-";
  const macroPanels = [
    { key: "dxy", canvas: "dxy", className: "" },
    { key: "energy", canvas: "energy", className: "" },
    { key: "metals", canvas: "metals", className: "" },
    { key: "strategic", canvas: "strategic", className: "macro-panel-wide" },
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
            <h2>FX & Commodities</h2>
            <p>Dollar index, crude oil, metals, and strategic commodity prices. Normalized panels compare cross-asset momentum cleanly.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="macro-panel-grid">
          ${macroPanels}
        </div>
      </section>
    </section>
  `;

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

  ["dxy", "energy", "metals", "strategic"].forEach((panelKey) => {
    const canvas = usOverviewRoot.querySelector(`[data-market-macro="${panelKey}"]`);
    if (canvas) {
      createMarketMacroChart(canvas, panelKey, getMarketMacroRange(panelKey));
    }
  });
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
    button.className = `country-button${state.tab === tabKey ? " active" : ""}${tabKey === "Taiwan" ? " is-taiwan" : ""}${tabKey === "DailyBriefing" ? " is-daily-briefing" : ""}${tabKey === "DataTrend" ? " is-data-trend" : ""}`;
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

  if (state.tab === "DataTrend") {
    subtabSwitch.classList.add("hidden");
    return;
  }

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
      summaryText.textContent = "Price dashboard for major indexes and cross-asset total dashboard";
      return;
    }
    if (state.marketView === "FxCommodities") {
      summaryText.textContent = "FX & Commodities dashboard for dollar, energy, metals, uranium spot, iron ore, and LNG futures";
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
      summaryText.textContent = "StockEasy-style RS leaderboard with RS_1M, RS_3M, RS_6M and searchable daily trend";
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

  if (state.tab === "DataTrend") {
    summaryText.textContent = "X and Reddit keyword mention trend dashboard workspace";
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

  if (state.tab === "DataTrend") {
    renderSummary([]);
    renderPlaceholderOverview(
      "Data Trend Dashboard",
      "X와 Reddit에서 특정 키워드가 얼마나 자주 언급되는지 추적하는 영역입니다. 다음 단계에서 키워드 목록, 수집 소스, 일별/주별 집계 방식, 감성/급증률 지표를 붙이면 됩니다.",
    );
    return;
  }

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
    if (state.marketView === "FxCommodities") {
      renderMarketFxCommoditiesOverview();
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
