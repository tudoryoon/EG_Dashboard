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
const marketValuationData = window.marketValuationData ?? { updatedAt: "", startDate: "1981-01-01", defaultRange: "max", ranges: [], series: {} };
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
const marketBreadthData = window.marketBreadthData ?? {
  updatedAt: "",
  startDate: "2004-01-01",
  defaultRange: "3y",
  ranges: [],
  source: {},
  panels: {},
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
const marketCanslimData = window.marketCanslimData ?? { updatedAt: "", scope: {}, profiles: {} };
const marketCanslimEarningsData = window.marketCanslimEarningsData ?? { updatedAt: "", scope: {}, profiles: {} };
const marketTrendScoreData = window.marketTrendScoreData ?? {
  updatedAt: "",
  historyDates: [],
  ranges: [],
  universes: {},
  scoring: { label: "", description: "" },
  rows: {},
  histories: {},
};
const marketRsFinancialsData = window.marketRsFinancialsData ?? {
  updatedAt: "",
  scope: {},
  metrics: [],
  financials: {},
};
const memorySpotData = window.memoryData ?? window.memorySpotData ?? { updatedAt: "", source: {}, cadence: {}, groups: [], dashboards: { featuredKeys: [], basketPanels: [] } };
const memorySpotHistoryData = window.memoryDataHistoryData ?? window.memorySpotHistoryData ?? null;
const gpuCloudData = window.gpuCloudData ?? { updatedAt: "", source: {}, items: [], dashboard: {} };
const gpuCloudHistoryData = window.gpuCloudHistoryData ?? null;
const ornnGpuIndexData = window.ornnGpuIndexData ?? { updatedAt: "", source: {}, defaultGpu: "h100_sxm", defaultRange: "3m", ranges: [], series: {} };
const infraGridData = window.infraGridData ?? { updatedAt: "", source: {}, items: [], fuelColors: {} };
const openrouterRankingsData = window.openrouterRankingsData ?? {
  updatedAt: "",
  generatedAt: "",
  source: {},
  defaultLeaderboard: "week",
  leaderboardViews: [],
  charts: {},
  leaderboards: {},
};
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
  VIX: { label: "VIX" },
  Breadth: { label: "Breadth" },
  RS: { label: "RS" },
  TrendScore: { label: "추세스코어" },
  Canslim: { label: "CANSLIM" },
  Overview: { label: "Price" },
  Macro: { label: "Macro" },
  Liquidity: { label: "Liquidity" },
  Valuation: { label: "Valuation" },
  FxCommodities: { label: "FX & Commodities" },
};

const accentMarketSubtabs = new Set(["VIX", "Breadth", "RS", "TrendScore", "Canslim"]);

const semisSubtabMeta = {
  MemorySpot: { label: "Memory Data" },
  GPUCloud: { label: "GPU Rental Price" },
};

const dataTrendSubtabMeta = {
  Openrouter: { label: "Openrouter" },
  Mentions: { label: "Mentions" },
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
  "market:sox": "#dc2626",
  "market:smh": "#dc2626",
  "macro:policy:fed_funds": "#e11d48",
  "macro:policy:inflation_5y": "#f97316",
  "macro:policy:real_5y": "#dc2626",
  "macro:gdp:real_gdp_annualized": "#8b5cf6",
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
  "macro:energy:dubai": "#f97316",
  "macro:natural_gas:henry_hub": "#0f766e",
  "macro:natural_gas:lng_jkm": "#2563eb",
  "macro:metals:gold": "#d4a017",
  "macro:metals:silver": "#94a3b8",
  "macro:metals:copper": "#b45309",
  "macro:strategic:uranium": "#16a34a",
  "macro:strategic:iron_ore": "#b45309",
  "macro:strategic:nickel": "#64748b",
  "macro:strategic:zinc": "#0ea5e9",
  "indicator:headline_cpi_yoy": "#7c3aed",
  "indicator:core_cpi_yoy": "#db2777",
  "indicator:headline_pce_yoy": "#0f766e",
  "indicator:core_pce_yoy": "#14b8a6",
  "indicator:final_demand_ppi_yoy": "#f97316",
  "indicator:core_ppi_yoy": "#dc2626",
};
const MARKET_PRICE_EMA_OPTIONS = [10, 20, 60, 120, 200];
const MARKET_PRICE_TREND_INDEX_OPTIONS = [
  { key: "sp500", label: "S&P 500" },
  { key: "nasdaq100", label: "NASDAQ 100" },
  { key: "sox", label: "SOX" },
];
const BRIEFING_ROTATION_DISTRIBUTION_BENCHMARKS = [
  {
    key: "qqq",
    label: "QQQ",
    itemKey: "nasdaq100",
    couplingLabel: "high QQQ",
    description: "NASDAQ 100 기준입니다. 빅테크/성장주와 같이 움직이는지 보기에 좋습니다.",
  },
  {
    key: "sox",
    label: "SOX",
    itemKey: "sox",
    couplingLabel: "high SOX",
    description: "필라델피아 반도체지수 기준입니다. 반도체 사이클과의 연동성을 봅니다.",
  },
];
const BRIEFING_ROTATION_DISTRIBUTION_X_AXES = [
  { key: "score", label: "Score", title: "Rotation Score", kind: "score", description: "1D/1W/2W/1M 초과수익률을 가중한 기존 Rotation Score입니다." },
  { key: "1w", label: "1W", title: "1W relative return", kind: "return", description: "최근 1주 섹터 혼합수익률에서 선택 지수 수익률을 뺀 값입니다." },
  { key: "2w", label: "2W", title: "2W relative return", kind: "return", description: "최근 2주 섹터 혼합수익률에서 선택 지수 수익률을 뺀 값입니다." },
  { key: "1m", label: "1M", title: "1M relative return", kind: "return", description: "최근 1개월 섹터 혼합수익률에서 선택 지수 수익률을 뺀 값입니다." },
  { key: "3m", label: "3M", title: "3M relative return", kind: "return", description: "최근 3개월 섹터 혼합수익률에서 선택 지수 수익률을 뺀 값입니다." },
  { key: "6m", label: "6M", title: "6M relative return", kind: "return", description: "최근 6개월 섹터 혼합수익률에서 선택 지수 수익률을 뺀 값입니다." },
];
const BRIEFING_ROTATION_DISTRIBUTION_PERIODS = {
  "1w": 5,
  "2w": 10,
  "1m": 21,
  "3m": 63,
  "6m": 126,
};
const BRIEFING_ROTATION_DISTRIBUTION_CORR_WINDOWS = [
  { key: "1m", label: "1M", sessions: 21, description: "최근 21거래일 기준입니다. 짧은 국면 변화를 민감하게 봅니다." },
  { key: "2m", label: "2M", sessions: 42, description: "최근 42거래일 기준입니다. 단기 노이즈와 추세의 균형을 봅니다." },
  { key: "3m", label: "3M", sessions: 63, description: "최근 63거래일 기준입니다. 기본값이며 3개월 동행성을 봅니다." },
];
const MARKET_RS_CAP_RANGES = [
  { key: "all", label: "All", min: 0, max: Number.POSITIVE_INFINITY },
  { key: "200m-1b", label: "$200M-$1B", min: 200_000_000, max: 1_000_000_000 },
  { key: "1b-10b", label: "$1B-$10B", min: 1_000_000_000, max: 10_000_000_000 },
  { key: "10b-100b", label: "$10B-$100B", min: 10_000_000_000, max: 100_000_000_000 },
  { key: "100b-plus", label: "$100B+", min: 100_000_000_000, max: Number.POSITIVE_INFINITY },
];

const ENABLE_TREND_SCORE_LIMITED_CARDS = true;
const TREND_SCORE_CARD_BATCH_SIZE = 100;
const ENABLE_RS_LIMITED_CARDS = true;
const RS_CARD_BATCH_SIZE = 100;
const ENABLE_CANSLIM_LIMITED_CARDS = true;
const CANSLIM_CARD_BATCH_SIZE = 100;

const state = {
  tab: "DailyBriefing",
  marketView: "Overview",
  bigTechView: "M7",
  semisView: "MemorySpot",
  currency: "USD",
  sector: "All",
  query: "",
  sort: "marketCapDesc",
  m7PriceRange: "3y",
  marketPriceRange: "3y",
  marketTrendRange: "3y",
  marketTrendIndex: "sp500",
  marketTrendEmas: [20],
  marketTrendCustomStart: "",
  marketTrendCustomEnd: "",
  marketVixMetricsRange: "3y",
  marketVixMetricsCustomStart: "",
  marketVixMetricsCustomEnd: "",
  marketVixFamilyRange: "3y",
  marketVixFamilyCustomStart: "",
  marketVixFamilyCustomEnd: "",
  marketVixFixedIncomeRange: "3y",
  marketVixFixedIncomeCustomStart: "",
  marketVixFixedIncomeCustomEnd: "",
  marketBreadthRange: marketBreadthData.defaultRange ?? "3y",
  marketBreadthSeriesSelection: [],
  marketBreadthIndexSelection: [],
  marketMacroRanges: Object.fromEntries(
    Object.keys(marketMacroData?.panels ?? {}).map((key) => [key, key === "liquidity_net" ? "max" : "3y"]),
  ),
  marketMacroCustomRanges: {},
  marketMacroSelections: Object.fromEntries(
    Object.entries(marketMacroData?.panels ?? {}).map(([panelKey, panel]) => [
      panelKey,
      panelKey === "liquidity_net" && panel?.series?.fed_assets
        ? ["fed_assets"]
        : Object.keys(panel?.series ?? {}),
    ]),
  ),
  marketValuationRange: "3y",
  marketValuationCustomStart: "",
  marketValuationCustomEnd: "",
  marketValuationSelection: ["cape", "dailyCapeProxy", "sp500"],
  totalDashboardRange: "3y",
  totalDashboardSelection: [
    "market:sp500",
    "market:smh",
    "macro:gdp:real_gdp_annualized",
    "macro:rates:us10y",
    "macro:rates:jp10y",
    "macro:dxy:dxy",
    "macro:energy:wti",
    "macro:metals:gold",
  ],
  totalDashboardCustomStart: "",
  totalDashboardCustomEnd: "",
  briefingMapRange: "1d",
  briefingRotationSectorKey: "",
  briefingRotationDistributionBenchmark: "qqq",
  briefingRotationDistributionXAxis: "score",
  briefingRotationDistributionCorrWindow: "3m",
  rsUniverse: "all",
  rsHistoryRange: "3y",
  rsSelectedTicker: "",
  rsFilter: "all",
  rsBriefingSector: "all",
  rsMarketCapRange: "all",
  rsCustomMarketCapMin: "",
  rsCustomMarketCapMax: "",
  rsScoreRange: "all",
  rsCustomScoreMin: "",
  rsCustomScoreMax: "",
  rsLeaderSort: "rs",
  rsTableSortKey: "rs",
  rsTableSortDirection: "desc",
  rsVisibleCardCount: RS_CARD_BATCH_SIZE,
  rsChartSeries: {
    rs: true,
    ema10: false,
    ema20: true,
    ema50: false,
    ema100: true,
    ema200: false,
  },
  trendScoreUniverse: "all",
  trendScoreRange: "1y",
  trendScoreSelectedTicker: "",
  trendScoreMarketCapRange: "all",
  trendScoreCustomMarketCapMin: "",
  trendScoreCustomMarketCapMax: "",
  trendScoreScoreRange: "all",
  trendScoreCustomScoreMin: "",
  trendScoreCustomScoreMax: "",
  trendScoreClimaxRange: "all",
  trendScoreCustomClimaxMin: "",
  trendScoreCustomClimaxMax: "",
  trendScoreBriefingSector: "all",
  trendScoreTableSortKey: "rank",
  trendScoreTableSortDirection: "asc",
  trendScoreVisibleCardCount: TREND_SCORE_CARD_BATCH_SIZE,
  canslimSelectedTicker: "",
  canslimUniverse: "all",
  canslimBriefingSector: "all",
  canslimSort: "canslimDesc",
  canslimVisibleCardCount: CANSLIM_CARD_BATCH_SIZE,
  macroIndicatorKey: "",
  macroSeriesKey: "",
  macroHistoryMode: "common",
  macroDashboardRange: "3y",
  macroDashboardCustomStart: "",
  macroDashboardCustomEnd: "",
  macroDashboardSelection: [
    "policy:fed_funds",
    "gdp:real_gdp_annualized",
    "market:sp500",
  ],
  memorySpotRanges: {},
  infraRanges: Object.fromEntries(
    Object.keys(infraGridData?.panels ?? {}).map((key) => [key, infraGridData.defaultRange ?? "3y"]),
  ),
  infraSelections: Object.fromEntries(
    Object.entries(infraGridData?.panels ?? {}).map(([panelKey, panel]) => [
      panelKey,
      Object.keys(panel?.series ?? {}),
    ]),
  ),
  ornnGpuKey: ornnGpuIndexData.defaultGpu ?? "h100_sxm",
  ornnGpuRange: "3y",
  dataTrendView: "Openrouter",
  openrouterLeaderboardView: openrouterRankingsData.defaultLeaderboard ?? "week",
  openrouterScale: "linear",
};
const marketCanslimAnalysisCache = new Map();
let marketCanslimDirectionCache = null;
const marketRsRowByTicker = new Map((marketRsData.rows ?? []).map((row) => [row.ticker, row]));

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
let searchRenderTimer = null;

function resetTrendScoreCardLimit() {
  state.trendScoreVisibleCardCount = TREND_SCORE_CARD_BATCH_SIZE;
}

function resetRsCardLimit() {
  state.rsVisibleCardCount = RS_CARD_BATCH_SIZE;
}

function resetCanslimCardLimit() {
  state.canslimVisibleCardCount = CANSLIM_CARD_BATCH_SIZE;
}

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

function normalizeMarketTickerSearch(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.(us|uw|uq|un|n|o)$/i, "")
    .replace(/\s+(us|equity)$/i, "");
}

function marketTickerSearchTerms(ticker, name = "") {
  const normalizedTicker = normalizeMarketTickerSearch(ticker);
  const terms = [
    normalizedTicker,
    `${normalizedTicker} us`,
    String(ticker ?? "").trim().toLowerCase(),
    String(name ?? "").trim().toLowerCase(),
  ];
  return [...new Set(terms.filter(Boolean))];
}

function formatFullIsoDate(dateText) {
  if (!dateText) {
    return "-";
  }
  const [year, month, day] = dateText.split("-");
  if (!year || !month || !day) {
    return dateText;
  }
  return `${year}-${month}-${day}`;
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
  if (rangeKey === "ytd") {
    return { mode: "months", step: 1 };
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
  if (rangeKey === "ytd") {
    return `${date.getUTCFullYear()}-01-01`;
  }

  const rangeMap = {
    "1m": { unit: "month", value: 1 },
    "3m": { unit: "month", value: 3 },
    "6m": { unit: "month", value: 6 },
    "1y": { unit: "year", value: 1 },
    "3y": { unit: "year", value: 3 },
    "5y": { unit: "year", value: 5 },
    "10y": { unit: "year", value: 10 },
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

function calculateAtrPercentSeries(values, highs, lows, period = 21) {
  if (!Array.isArray(values) || !Array.isArray(highs) || !Array.isArray(lows) || !values.length) {
    return [];
  }
  const trueRanges = values.map((close, index) => {
    const high = Number(highs[index]);
    const low = Number(lows[index]);
    const previousClose = index > 0 ? Number(values[index - 1]) : Number(close);
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(previousClose)) {
      return null;
    }
    return Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
  });
  return values.map((close, index) => {
    if (index < period - 1 || !Number.isFinite(Number(close))) {
      return null;
    }
    const window = trueRanges.slice(index - period + 1, index + 1).filter((value) => Number.isFinite(value));
    if (window.length < period) {
      return null;
    }
    const atr = window.reduce((sum, value) => sum + Number(value), 0) / period;
    return Number(((atr / Number(close)) * 100).toFixed(2));
  });
}

function calculateDrawdownPercentSeries(values) {
  let peak = null;
  return (values ?? []).map((value) => {
    const close = Number(value);
    if (!Number.isFinite(close) || close <= 0) {
      return null;
    }
    peak = peak === null ? close : Math.max(peak, close);
    if (!Number.isFinite(peak) || peak <= 0) {
      return null;
    }
    return Number(((close / peak - 1) * 100).toFixed(2));
  });
}

function calculateRollingDrawdownPercentSeries(values, window = 60) {
  return (values ?? []).map((value, index) => {
    const close = Number(value);
    if (!Number.isFinite(close) || close <= 0) {
      return null;
    }
    const windowValues = (values ?? [])
      .slice(Math.max(0, index - window + 1), index + 1)
      .map(Number)
      .filter((item) => Number.isFinite(item) && item > 0);
    if (!windowValues.length) {
      return null;
    }
    const rollingPeak = Math.max(...windowValues);
    if (!Number.isFinite(rollingPeak) || rollingPeak <= 0) {
      return null;
    }
    return Number(((close / rollingPeak - 1) * 100).toFixed(2));
  });
}

function calculateAtrDrawdownMultipleSeries(drawdowns, atrPercents) {
  return (drawdowns ?? []).map((drawdown, index) => {
    const atrPercent = Number(atrPercents?.[index]);
    if (!Number.isFinite(Number(drawdown)) || !Number.isFinite(atrPercent) || atrPercent <= 0) {
      return null;
    }
    return Number((Number(drawdown) / atrPercent).toFixed(2));
  });
}

function getMarketTrendBounds() {
  const trendStart = marketPriceData?.startDate ?? "1980-01-01";
  const items = MARKET_PRICE_TREND_INDEX_OPTIONS.map((option) => marketPriceData?.items?.[option.key]).filter(Boolean);
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
  const fullHighs = (item.highs ?? item.values ?? []).slice(firstUsableIndex);
  const fullLows = (item.lows ?? item.values ?? []).slice(firstUsableIndex);
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
  const atrPctFull = calculateAtrPercentSeries(fullValues, fullHighs, fullLows, 21);
  const drawdownPctFull = calculateDrawdownPercentSeries(fullValues);
  const rollingDrawdown60PctFull = calculateRollingDrawdownPercentSeries(fullValues, 60);
  const drawdownAtrFull = calculateAtrDrawdownMultipleSeries(drawdownPctFull, atrPctFull);
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
    riskSeries: {
      atrPct: atrPctFull.slice(startIndex, sliceEnd),
      drawdownPct: drawdownPctFull.slice(startIndex, sliceEnd),
      rollingDrawdown60Pct: rollingDrawdown60PctFull.slice(startIndex, sliceEnd),
      drawdownAtr: drawdownAtrFull.slice(startIndex, sliceEnd),
    },
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

function buildMarketTrendRiskSummary() {
  const payload = buildMarketTrendChartPayload(
    state.marketTrendRange,
    state.marketTrendIndex,
    state.marketTrendCustomStart,
    state.marketTrendCustomEnd,
  );
  const series = payload.riskSeries ?? {};
  let latestIndex = -1;
  for (let index = (payload.labels ?? []).length - 1; index >= 0; index -= 1) {
    if (
      Number.isFinite(Number(series.atrPct?.[index])) ||
      Number.isFinite(Number(series.drawdownPct?.[index])) ||
      Number.isFinite(Number(series.rollingDrawdown60Pct?.[index])) ||
      Number.isFinite(Number(series.drawdownAtr?.[index]))
    ) {
      latestIndex = index;
      break;
    }
  }
  if (latestIndex === -1) {
    return [];
  }
  const items = [
    { label: "21D ATR", value: series.atrPct?.[latestIndex], formatter: (value) => `${Number(value).toFixed(2)}%`, tone: "neutral" },
    { label: "From High", value: series.drawdownPct?.[latestIndex], formatter: formatSignedPercent, tone: "negative" },
    { label: "60D MDD", value: series.rollingDrawdown60Pct?.[latestIndex], formatter: formatSignedPercent, tone: "negative" },
    { label: "Drawdown / ATR", value: series.drawdownAtr?.[latestIndex], formatter: (value) => `${Number(value).toFixed(2)}x`, tone: "negative" },
  ];
  return items.map((item) => ({
    ...item,
    date: payload.labels?.[latestIndex] ?? "",
    text: Number.isFinite(Number(item.value)) ? item.formatter(Number(item.value)) : "-",
  }));
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

function createMarketTrendRiskChart(canvas, rangeKey, indexKey, customStart = "", customEnd = "") {
  if (typeof Chart === "undefined" || !canvas) {
    return;
  }

  const payload = buildMarketTrendChartPayload(rangeKey, indexKey, customStart, customEnd);
  const riskSeries = payload.riskSeries ?? {};
  const riskType = canvas.dataset.marketTrendRisk || "drawdown";
  const riskConfig = {
    atr: {
      label: "21D ATR (%)",
      data: riskSeries.atrPct ?? [],
      color: "#2563eb",
      fillColor: "rgba(37, 99, 235, 0.16)",
      tickSuffix: "%",
      tooltipFormatter: (value) => `${value.toFixed(2)}%`,
      suggestedMin: 0,
    },
    drawdown: {
      label: "MDD from high (%)",
      data: riskSeries.drawdownPct ?? [],
      color: "#dc2626",
      fillColor: "rgba(220, 38, 38, 0.18)",
      tickSuffix: "%",
      tooltipFormatter: formatSignedPercent,
      suggestedMax: 0,
    },
    rollingDrawdown60: {
      label: "60D Rolling MDD (%)",
      data: riskSeries.rollingDrawdown60Pct ?? [],
      color: "#b45309",
      fillColor: "rgba(180, 83, 9, 0.16)",
      tickSuffix: "%",
      tooltipFormatter: formatSignedPercent,
      suggestedMax: 0,
    },
    multiple: {
      label: "Drawdown / ATR (x)",
      data: riskSeries.drawdownAtr ?? [],
      color: "#111827",
      fillColor: "rgba(17, 24, 39, 0.14)",
      tickSuffix: "x",
      tooltipFormatter: (value) => `${value.toFixed(2)}x`,
      suggestedMax: 0,
    },
  }[riskType] ?? null;
  if (!riskConfig) {
    return;
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
      datasets: [
        {
          label: riskConfig.label,
          data: riskConfig.data,
          borderColor: riskConfig.color,
          backgroundColor: riskConfig.fillColor,
          borderWidth: 2.2,
          tension: 0.12,
          pointRadius: 0,
          pointHoverRadius: 3,
          fill: { target: "origin" },
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
          display: false,
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
              const value = Number(context.parsed.y);
              if (!Number.isFinite(value)) {
                return `${context.dataset.label}: -`;
              }
              return `${context.dataset.label}: ${riskConfig.tooltipFormatter(value)}`;
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
          position: "left",
          suggestedMin: riskConfig.suggestedMin,
          suggestedMax: riskConfig.suggestedMax,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${Number(value).toFixed(0)}${riskConfig.tickSuffix}`,
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
    case "trillion1":
      return `${Number(value).toFixed(1)}T`;
    case "dollar2":
      return `$${Number(value).toFixed(2)}`;
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
  const fixedIncomeDates = Object.values(marketVixData?.fixedIncome ?? {}).flatMap((item) => item.dates ?? []);
  const metricDates = marketVixData?.curve?.historyDates ?? [];
  const allDates =
    type === "family"
      ? [...new Set(familyDates)].sort()
      : type === "fixedIncome"
        ? [...new Set(fixedIncomeDates)].sort()
      : type === "metrics"
        ? [...new Set(metricDates)].sort()
        : [...new Set([...familyDates, ...fixedIncomeDates, ...metricDates])].sort();
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

function buildMarketVixFixedIncomePayload(seriesKey, rangeKey) {
  const item = marketVixData?.fixedIncome?.[seriesKey];
  const labels = (item?.dates ?? []).filter(Boolean);
  if (!labels.length) {
    return { item, labels: [], datasets: [] };
  }

  const selectedWindow = getMarketVixSelectedWindow(
    rangeKey,
    labels,
    labels[0],
    state.marketVixFixedIncomeCustomStart,
    state.marketVixFixedIncomeCustomEnd,
  );
  const selectedLabels = selectedWindow.labels;
  const dateIndex = new Map();
  labels.forEach((date, index) => {
    dateIndex.set(date, index);
  });

  return {
    item,
    labels: selectedLabels,
    datasets: [
      {
        key: seriesKey,
        label: item.label,
        data: selectedLabels.map((label) => {
          const pointIndex = dateIndex.get(label);
          return pointIndex === undefined ? null : item.values?.[pointIndex] ?? null;
        }),
        borderColor: item.color ?? "#111827",
        backgroundColor: item.color ?? "#111827",
        borderWidth: 2.6,
        tension: 0.16,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        spanGaps: true,
      },
    ],
  };
}

function formatFixedIncomeVixValue(value, unit) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (unit === "%") {
    return `${numeric.toFixed(2)}%`;
  }
  return numeric.toFixed(2);
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

function createMarketVixFixedIncomeChart(canvas, seriesKey, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildMarketVixFixedIncomePayload(seriesKey, rangeKey);
  const values = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = values.length ? Math.min(...values) : 0;
  const maxValue = values.length ? Math.max(...values) : payload.item?.unit === "%" ? 5 : 100;
  const minSpread = payload.item?.unit === "%" ? 0.5 : 5;
  const spread = Math.max(maxValue - minValue, minSpread);
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
            label: (context) =>
              `${context.dataset.label}: ${formatFixedIncomeVixValue(context.parsed.y, payload.item?.unit)}`,
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
            callback: (value) => formatFixedIncomeVixValue(value, payload.item?.unit),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: payload.item?.unit === "%" ? "Spread (%)" : "Index level",
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
    if (key === "dxy") {
      return;
    }
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
    if (panelKey.startsWith("liquidity_")) {
      return;
    }
    Object.entries(panel.series ?? {}).forEach(([seriesKey, item]) => {
      if (panelKey === "fx_dashboard" && seriesKey === "dxy") {
        return;
      }
      const isPercentSeries = panelKey === "rates" || panelKey === "policy" || panelKey === "gdp";
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
        fillForward: item.fillForward === true || panel.fillMissing === "forward",
      });
    });
  });

  [
    buildMacroIndicatorDashboardItem({
      key: "indicator:headline_cpi_yoy",
      label: "CPI YoY",
      seriesKey: "headline_cpi",
      kind: "yoy",
      color: "#7c3aed",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:core_cpi_yoy",
      label: "Core CPI YoY",
      seriesKey: "core_cpi",
      kind: "yoy",
      color: "#db2777",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:headline_pce_yoy",
      label: "PCE YoY",
      seriesKey: "headline_pce",
      kind: "yoy",
      color: "#0f766e",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:core_pce_yoy",
      label: "Core PCE YoY",
      seriesKey: "core_pce",
      kind: "yoy",
      color: "#14b8a6",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:final_demand_ppi_yoy",
      label: "PPI YoY",
      seriesKey: "final_demand_ppi",
      kind: "yoy",
      color: "#f97316",
    }),
    buildMacroIndicatorDashboardItem({
      key: "indicator:core_ppi_yoy",
      label: "Core PPI YoY",
      seriesKey: "core_ppi",
      kind: "yoy",
      color: "#dc2626",
    }),
  ].filter(Boolean).forEach((item) => {
    items.push({
      key: item.key,
      group: "Macro Indicators",
      label: item.label,
      color: item.color,
      dates: item.dates,
      values: item.values,
      formatter: item.formatter,
      rawLabel: item.label,
      isRate: true,
      fillForward: item.fillForward === true,
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
    let carriedRawValue = null;

    const data = selectedLabels.map((label) => {
      const pointIndex = dateIndex.get(label);
      const pointValue = pointIndex === undefined ? null : item.values[pointIndex];
      if (Number.isFinite(pointValue) && item.fillForward) {
        carriedRawValue = pointValue;
      }
      if (!Number.isFinite(pointValue)) {
        if (item.fillForward && Number.isFinite(carriedRawValue)) {
          if (item.isRate) {
            return carriedRawValue;
          }
          if (Number.isFinite(baseValue)) {
            return Number(((carriedRawValue / baseValue) * 100).toFixed(2));
          }
        }
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
    carriedRawValue = null;
    const rawDisplayValues = selectedLabels.map((label) => {
      const pointIndex = dateIndex.get(label);
      const pointValue = pointIndex === undefined ? null : item.values[pointIndex];
      if (Number.isFinite(pointValue)) {
        if (item.fillForward) {
          carriedRawValue = pointValue;
        }
        return pointValue;
      }
      return item.fillForward && Number.isFinite(carriedRawValue) ? carriedRawValue : null;
    });

    return {
      key: item.key,
      label: item.label,
      data,
      rawDates: item.dates,
      rawValues: item.values,
      rawDisplayValues,
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
              const rawValue = dataset.rawDisplayValues?.[chartIndex] ?? null;
              const rawText = Number.isFinite(rawValue) ? formatMacroValue(rawValue, dataset.rawFormatter) : "-";
              if (dataset.isRate) {
                return `${dataset.label}: ${rawText}`;
              }
              const normalized = context.parsed.y;
              return Number.isFinite(normalized)
                ? `${dataset.label}: ${normalized.toFixed(1)} | raw ${rawText}`
                : `${dataset.label}: - | raw ${rawText}`;
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

function getMarketMacroSelection(panelKey) {
  const selected = state.marketMacroSelections?.[panelKey];
  if (Array.isArray(selected) && selected.length) {
    return selected;
  }
  return Object.keys(getMarketMacroPanel(panelKey)?.series ?? {});
}

function getMarketMacroCustomRange(panelKey) {
  return state.marketMacroCustomRanges?.[panelKey] ?? { start: "", end: "" };
}

function buildMarketMacroPanelCard({ key, canvas = key, className = "" }, rangeSource) {
  const panel = getMarketMacroPanel(key);
  if (!panel) {
    return "";
  }
  const selectedSeries = new Set(getMarketMacroSelection(key));
  const customRange = getMarketMacroCustomRange(key);
  const seriesChips = Object.entries(panel.series ?? {})
    .map(
      ([seriesKey, item]) => `
        <button
          type="button"
          class="m7-range-chip macro-dashboard-chip${selectedSeries.has(seriesKey) ? " active" : ""}"
          data-market-macro-series="${seriesKey}"
          data-market-macro-panel="${key}"
        >
          <i class="macro-series-dot" style="background:${item.color}"></i>
          ${item.name}
        </button>`,
    )
    .join("");
  const customDateMarkup = `
        <div class="total-date-row market-macro-date-row">
          <label class="total-date-field">
            Start
            <input type="date" value="${customRange.start || ""}" data-market-macro-custom-start="${key}">
          </label>
          <label class="total-date-field">
            End
            <input type="date" value="${customRange.end || ""}" data-market-macro-custom-end="${key}">
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-market-macro-custom-apply="${key}">Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-market-macro-custom-reset="${key}">Reset</button>
          </div>
        </div>
      `;
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
        <span>${panel.yAxisLabel ?? (panel.mode === "normalized" ? "Start = 100" : "Raw level")}</span>
      </div>
      <div class="market-macro-series-row">
        ${seriesChips}
      </div>
      ${customDateMarkup}
      <div class="macro-chart-wrap">
        <canvas data-market-macro="${canvas}"></canvas>
      </div>
    </article>
  `;
}

function buildDailyDateLabels(startDate, endDate) {
  const labels = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) {
    return labels;
  }
  while (cursor <= end) {
    labels.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return labels;
}

function buildMarketMacroChartPayload(panel, rangeKey, selectedKeys = null, customRange = null) {
  const selectedSet = selectedKeys?.length ? new Set(selectedKeys) : null;
  const seriesEntries = Object.entries(panel?.series ?? {}).filter(([key]) => !selectedSet || selectedSet.has(key));
  const rawAllDates = [
    ...new Set(
      seriesEntries.flatMap(([, item]) =>
        (item.dates ?? []).filter((date, index) => Number.isFinite(Number(item.values?.[index]))),
      ),
    ),
  ].sort();
  if (!rawAllDates.length) {
    return { labels: [], datasets: [], mode: panel?.mode ?? "raw" };
  }

  const allDates = panel?.fillMissing === "forward"
    ? buildDailyDateLabels(rawAllDates[0], rawAllDates[rawAllDates.length - 1])
    : rawAllDates;
  const latestDate = allDates[allDates.length - 1];
  const customStart = customRange?.start || "";
  const customEnd = customRange?.end || "";
  const startDate = customStart || shiftDateByRange(latestDate, rangeKey, marketMacroData?.startDate ?? "2017-01-01");
  const selectedLabels = allDates.filter((label) => label >= startDate && (!customEnd || label <= customEnd));

  const datasets = seriesEntries.map(([key, item]) => {
    if (panel?.fillMissing === "forward") {
      const sourceDates = item.dates ?? [];
      const sourceValues = item.values ?? [];
      let sourceIndex = 0;
      let carriedValue = null;
      const rawData = selectedLabels.map((label) => {
        while (sourceIndex < sourceDates.length && sourceDates[sourceIndex] <= label) {
          const nextValue = sourceValues[sourceIndex];
          if (Number.isFinite(nextValue)) {
            carriedValue = nextValue;
          }
          sourceIndex += 1;
        }
        return Number.isFinite(carriedValue) ? Number(carriedValue) : null;
      });
      const baseValue = rawData.find((value) => Number.isFinite(value));
      const data = rawData.map((pointValue) => {
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
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        spanGaps: false,
        borderDash: item.dash ?? [],
      };
    }

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
      spanGaps: panel.mode === "normalized" || panel.connectGaps === true,
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

  const payload = buildMarketMacroChartPayload(
    panel,
    rangeKey,
    getMarketMacroSelection(panelKey),
    getMarketMacroCustomRange(panelKey),
  );
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

function getMarketValuationSelection() {
  const selected = state.marketValuationSelection;
  if (Array.isArray(selected) && selected.length) {
    return selected.filter((key) => marketValuationData?.series?.[key]);
  }
  return Object.keys(marketValuationData?.series ?? {});
}

function getMarketValuationBounds() {
  const dates = Object.values(marketValuationData?.series ?? {})
    .flatMap((item) => item?.dates ?? [])
    .filter(Boolean)
    .sort();
  return {
    min: dates[0] ?? marketValuationData?.startDate ?? "1981-01-01",
    max: dates[dates.length - 1] ?? marketValuationData?.updatedAt ?? "",
  };
}

function formatValuationValue(value, formatter = "number1") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  if (formatter === "index") {
    return numeric.toFixed(1);
  }
  return numeric.toFixed(1);
}

function buildMarketValuationChartPayload(rangeKey) {
  const selectedSet = new Set(getMarketValuationSelection());
  const entries = Object.entries(marketValuationData?.series ?? {}).filter(([key]) => selectedSet.has(key));
  const allDates = [...new Set(entries.flatMap(([, item]) => item?.dates ?? []))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }

  const latestDate = allDates[allDates.length - 1];
  const customStart = state.marketValuationCustomStart || "";
  const customEnd = state.marketValuationCustomEnd || "";
  const startDate = customStart || shiftDateByRange(latestDate, rangeKey, marketValuationData?.startDate ?? "1981-01-01");
  const endDate = customEnd || latestDate;
  const selectedLabels = allDates.filter((label) => label >= startDate && label <= endDate);

  const datasets = entries.map(([key, item]) => {
    const dateIndex = new Map();
    (item.dates ?? []).forEach((date, index) => {
      dateIndex.set(date, index);
    });
    const baseDate = selectedLabels.find((label) => dateIndex.has(label) && Number.isFinite(Number(item.values?.[dateIndex.get(label)])));
    const baseValue = baseDate ? Number(item.values?.[dateIndex.get(baseDate)]) : null;
    const normalize = item.normalize === true;
    const data = selectedLabels.map((label) => {
      const pointIndex = dateIndex.get(label);
      if (pointIndex === undefined) {
        return null;
      }
      const pointValue = Number(item.values?.[pointIndex]);
      if (!Number.isFinite(pointValue)) {
        return null;
      }
      if (normalize) {
        if (!Number.isFinite(baseValue) || baseValue === 0) {
          return null;
        }
        return Number(((pointValue / baseValue) * 100).toFixed(2));
      }
      return Number(pointValue.toFixed(4));
    });

    return {
      key,
      label: item.label,
      data,
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: item.axis === "right" ? 2.6 : 2.8,
      tension: 0.18,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: true,
      yAxisID: item.axis === "right" ? "y1" : "y",
      formatter: item.formatter ?? "number1",
      normalize,
    };
  });

  return { labels: selectedLabels, datasets };
}

function createMarketValuationChart(canvas, rangeKey) {
  if (typeof Chart === "undefined") {
    return;
  }

  const payload = buildMarketValuationChartPayload(rangeKey);
  const leftValues = payload.datasets
    .filter((dataset) => dataset.yAxisID !== "y1")
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const rightValues = payload.datasets
    .filter((dataset) => dataset.yAxisID === "y1")
    .flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const leftMin = leftValues.length ? Math.min(...leftValues) : 0;
  const leftMax = leftValues.length ? Math.max(...leftValues) : 50;
  const leftPadding = Math.max((leftMax - leftMin) * 0.12, 1);
  const rightMin = rightValues.length ? Math.min(...rightValues) : 80;
  const rightMax = rightValues.length ? Math.max(...rightValues) : 140;
  const rightPadding = Math.max((rightMax - rightMin) * 0.12, 5);
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
            label: (context) => {
              const suffix = context.dataset.normalize ? " (Start=100)" : "";
              return `${context.dataset.label}: ${formatValuationValue(context.parsed.y, context.dataset.formatter)}${suffix}`;
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
          min: Math.max(0, leftMin - leftPadding),
          max: leftMax + leftPadding,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatValuationValue(value, "number1"),
            maxTicksLimit: 6,
          },
          title: {
            display: true,
            text: "CAPE ratio",
            color: "#8d8d86",
          },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
        y1: {
          position: "right",
          min: Math.max(0, rightMin - rightPadding),
          max: rightMax + rightPadding,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatValuationValue(value, "index"),
            maxTicksLimit: 6,
          },
          title: {
            display: rightValues.length > 0,
            text: "Index Start = 100",
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

function revenueCurrencyRatio(company) {
  if (state.currency === "NTD") {
    return 1;
  }
  const ntdValue = Number(company.currency?.NTD);
  const selectedValue = Number(company.currency?.[state.currency]);
  if (!Number.isFinite(ntdValue) || !Number.isFinite(selectedValue) || ntdValue === 0) {
    return 1;
  }
  return selectedValue / ntdValue;
}

function convertRevenueSeries(company, values) {
  const ratio = revenueCurrencyRatio(company);
  return (values ?? []).map((value) => (value === null || value === undefined ? null : Number((Number(value) * ratio).toFixed(6))));
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
  const valuesByDate = kind === "yoy"
    ? new Map((series?.dates ?? []).map((dateText, index) => [dateText, Number(values[index])]))
    : null;
  return values.map((value, index) => {
    const current = Number(value);
    if (!Number.isFinite(current)) {
      return null;
    }
    if (kind === "yoy") {
      const officialYoy = Number(series?.yoyValues?.[index]);
      if (Number.isFinite(officialYoy)) {
        return Number(officialYoy.toFixed(2));
      }
      const dateText = series?.dates?.[index] ?? "";
      const baseDate = dateText ? `${Number(dateText.slice(0, 4)) - 1}-${dateText.slice(5, 7)}` : "";
      const base = Number(valuesByDate?.get(baseDate));
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
    fillForward: true,
  };
}

function mergeSeriesPreferRecent(primarySeries, fallbackSeries) {
  const merged = new Map();
  (fallbackSeries?.dates ?? []).forEach((date, index) => {
    const value = Number(fallbackSeries?.values?.[index]);
    if (date && Number.isFinite(value)) {
      merged.set(toDateKey(date), value);
    }
  });
  (primarySeries?.dates ?? []).forEach((date, index) => {
    const value = Number(primarySeries?.values?.[index]);
    if (date && Number.isFinite(value)) {
      merged.set(toDateKey(date), value);
    }
  });
  const dates = [...merged.keys()].sort((a, b) => a.localeCompare(b));
  return {
    dates,
    values: dates.map((date) => merged.get(date)),
  };
}

function scaleSeriesValues(series, multiplier) {
  return {
    dates: series?.dates ?? [],
    values: (series?.values ?? []).map((value) => {
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? Number((numberValue * multiplier).toFixed(4)) : null;
    }),
  };
}

function getMacroDashboardItems() {
  const policySeries = marketMacroData?.panels?.policy?.series ?? {};
  const gdpSeries = marketMacroData?.panels?.gdp?.series ?? {};
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
    gdpSeries.real_gdp_annualized && {
      key: "gdp:real_gdp_annualized",
      label: "Real GDP QoQ SAAR",
      dates: gdpSeries.real_gdp_annualized.dates ?? [],
      values: gdpSeries.real_gdp_annualized.values ?? [],
      color: "#8b5cf6",
      axis: "percent",
      formatter: "percent2",
      normalize: false,
      fillForward: true,
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
    (energySeries.wti || longCommoditySeries.wti) && {
      key: "commodity:wti",
      label: "WTI",
      dates: mergeSeriesPreferRecent(energySeries.wti, longCommoditySeries.wti).dates,
      values: mergeSeriesPreferRecent(energySeries.wti, longCommoditySeries.wti).values,
      color: "#16a34a",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (metalSeries.gold || longCommoditySeries.gold) && {
      key: "commodity:gold",
      label: "Gold",
      dates: mergeSeriesPreferRecent(metalSeries.gold, longCommoditySeries.gold).dates,
      values: mergeSeriesPreferRecent(metalSeries.gold, longCommoditySeries.gold).values,
      color: "#d4a017",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (metalSeries.silver || longCommoditySeries.silver) && {
      key: "commodity:silver",
      label: "Silver",
      dates: mergeSeriesPreferRecent(metalSeries.silver, longCommoditySeries.silver).dates,
      values: mergeSeriesPreferRecent(metalSeries.silver, longCommoditySeries.silver).values,
      color: "#64748b",
      axis: "index",
      formatter: "dollar1",
      normalize: true,
    },
    (metalSeries.copper || longCommoditySeries.copper) && {
      key: "commodity:copper",
      label: "Copper",
      dates: mergeSeriesPreferRecent(scaleSeriesValues(metalSeries.copper, 2204.6226), longCommoditySeries.copper).dates,
      values: mergeSeriesPreferRecent(scaleSeriesValues(metalSeries.copper, 2204.6226), longCommoditySeries.copper).values,
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
    let lastForwardValue = null;
    const data = labels.map((date) => {
      const index = dateIndex.get(date);
      if (index === undefined) {
        if (item.fillForward && Number.isFinite(lastForwardValue)) {
          return lastForwardValue;
        }
        return null;
      }
      const rawValue = Number(item.values[index]);
      const value = Number.isFinite(rawValue) ? rawValue : null;
      if (item.fillForward && Number.isFinite(value)) {
        lastForwardValue = value;
      }
      if (!Number.isFinite(value)) {
        if (item.fillForward && Number.isFinite(lastForwardValue)) {
          return lastForwardValue;
        }
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
    pointRadius: 3,
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

function createCloudBarChart(canvas, panel, formatter, options = {}) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const labels = options.labels ?? cloudDashboardData.labels ?? [];
  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    backgroundColor: cloudDashboardData.colors[series.key],
    borderColor: cloudDashboardData.colors[series.key],
    borderWidth: 0,
    borderRadius: 4,
    barPercentage: options.barPercentage ?? 0.78,
    categoryPercentage: options.categoryPercentage ?? 0.72,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const step = options.step ?? 10;
  const yMax = Math.ceil((maxValue * 1.1) / step) * step;

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
            callback: (value) => formatter(Number(value)),
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

function createCloudPointLineChart(canvas, panel, formatter, options = {}) {
  if (typeof Chart === "undefined" || !panel) {
    return;
  }

  const labels = options.labels ?? cloudDashboardData.labels ?? [];
  const datasets = panel.series.map((series) => ({
    label: series.name,
    data: series.values,
    borderColor: cloudDashboardData.colors[series.key],
    backgroundColor: cloudDashboardData.colors[series.key],
    borderWidth: 2.6,
    tension: 0.24,
    pointRadius: 3,
    pointHoverRadius: 5,
    pointHitRadius: 10,
    spanGaps: options.spanGaps === true,
  }));

  const allValues = panel.series.flatMap((series) => series.values.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const step = options.step ?? 5;
  const yMin = options.min ?? Math.floor((minValue - step) / step) * step;
  const yMax = options.max ?? Math.ceil((maxValue + step) / step) * step;

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
            callback: (value) => formatter(Number(value)),
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

function buildCloudRpoStatsMarkup(panel) {
  const labels = cloudDashboardData.labels ?? [];
  const latestIndex = labels.length - 1;
  return (panel?.series ?? [])
    .map((series) => {
      const latestValue = series.values?.[latestIndex];
      const yearAgoValue = series.values?.[latestIndex - 4];
      const yoy =
        Number.isFinite(latestValue) && Number.isFinite(yearAgoValue) && yearAgoValue !== 0
          ? ((latestValue - yearAgoValue) / yearAgoValue) * 100
          : null;
      return `
        <div class="cloud-rpo-stat">
          <span>${series.name}</span>
          <strong>${Number.isFinite(latestValue) ? `$${Number(latestValue).toFixed(1)}B` : "-"}</strong>
          <small>${Number.isFinite(yoy) ? `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}% YoY` : "YoY N/A"}</small>
        </div>`;
    })
    .join("");
}

function buildCloudRpoRevenueRatioPanel() {
  const revenueSeries = cloudDashboardData.revenue?.series ?? [];
  const rpoSeries = cloudDashboardData.rpo?.series ?? [];
  const series = rpoSeries.map((rpoItem) => {
    const revenueItem = revenueSeries.find((item) => item.key === rpoItem.key);
    const values = (rpoItem.values ?? []).map((rpoValue, index) => {
      const revenueMillions = revenueItem?.values?.[index];
      if (!Number.isFinite(rpoValue) || !Number.isFinite(revenueMillions) || revenueMillions === 0) {
        return null;
      }
      return Number((rpoValue / (revenueMillions / 1000)).toFixed(1));
    });
    return {
      key: rpoItem.key,
      name: `${rpoItem.name} / Revenue`,
      values,
    };
  });

  return {
    title: "RPO / Cloud Revenue Ratio",
    subtitle: "RPO backlog divided by quarterly cloud revenue. Higher means contracted backlog is larger versus the current quarterly revenue base.",
    series,
  };
}

function buildMicrosoftAiStatsMarkup(panel) {
  const labels = cloudDashboardData.labels ?? [];
  const series = panel?.series?.[0] ?? null;
  const values = series?.values ?? [];
  const latestIndex = values.map((value, index) => (Number.isFinite(value) ? index : -1)).filter((index) => index >= 0).slice(-1)[0];
  if (latestIndex === undefined) {
    return "";
  }
  const latestValue = values[latestIndex];
  const previousIndex = values
    .map((value, index) => (Number.isFinite(value) && index < latestIndex ? index : -1))
    .filter((index) => index >= 0)
    .slice(-1)[0];
  const previousValue = previousIndex !== undefined ? values[previousIndex] : null;
  const sequentialGrowth =
    Number.isFinite(latestValue) && Number.isFinite(previousValue) && previousValue !== 0
      ? ((latestValue - previousValue) / previousValue) * 100
      : null;
  const microsoftRevenueSeries = cloudDashboardData.revenue?.series?.find((item) => item.key === "microsoft");
  const cloudRevenueMillions = microsoftRevenueSeries?.values?.[latestIndex];
  const aiToCloudRunRate =
    Number.isFinite(latestValue) && Number.isFinite(cloudRevenueMillions) && cloudRevenueMillions > 0
      ? (latestValue / ((cloudRevenueMillions / 1000) * 4)) * 100
      : null;

  return `
    <div class="cloud-rpo-stat">
      <span>Latest AI ARR</span>
      <strong>$${Number(latestValue).toFixed(1)}B</strong>
      <small>${labels[latestIndex] ?? "-"}</small>
    </div>
    <div class="cloud-rpo-stat">
      <span>Growth vs Prior Disclosure</span>
      <strong>${Number.isFinite(sequentialGrowth) ? `+${sequentialGrowth.toFixed(1)}%` : "-"}</strong>
      <small>${previousIndex !== undefined ? `${labels[previousIndex]} to ${labels[latestIndex]}` : "N/A"}</small>
    </div>
    <div class="cloud-rpo-stat">
      <span>AI ARR / MS Cloud Run-Rate</span>
      <strong>${Number.isFinite(aiToCloudRunRate) ? `${aiToCloudRunRate.toFixed(1)}%` : "-"}</strong>
      <small>vs Intelligent Cloud revenue run-rate</small>
    </div>`;
}

function buildMicrosoftAiRatioPanel() {
  const aiSeries = cloudDashboardData.microsoftAi?.series?.[0];
  const microsoftRevenueSeries = cloudDashboardData.revenue?.series?.find((item) => item.key === "microsoft");
  const values = (aiSeries?.values ?? []).map((aiArr, index) => {
    const revenueMillions = microsoftRevenueSeries?.values?.[index];
    if (!Number.isFinite(aiArr) || !Number.isFinite(revenueMillions) || revenueMillions === 0) {
      return null;
    }
    return Number(((aiArr / ((revenueMillions / 1000) * 4)) * 100).toFixed(1));
  });

  return {
    title: "AI ARR / MS Intelligent Cloud Run-Rate",
    subtitle: "AI ARR divided by annualized Microsoft Intelligent Cloud quarterly revenue. Use as a rough scale check, not a pure segment margin metric.",
    series: [
      {
        key: "microsoft",
        name: "AI ARR / Intelligent Cloud",
        values,
      },
    ],
  };
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
  const rpoRatioPanel = buildCloudRpoRevenueRatioPanel();
  const microsoftAiRatioPanel = buildMicrosoftAiRatioPanel();

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
        <article class="cloud-panel cloud-panel-wide cloud-rpo-panel">
          <div class="us-panel-head">
            <div>
              <h3>${cloudDashboardData.rpo.title}</h3>
              <p>${cloudDashboardData.rpo.subtitle}</p>
            </div>
          </div>
          <div class="cloud-rpo-stats">
            ${buildCloudRpoStatsMarkup(cloudDashboardData.rpo)}
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-cloud-chart="rpo"></canvas>
          </div>
          <p class="cloud-rpo-note">RPO는 이미 계약됐지만 아직 매출로 인식되지 않은 잔고입니다. 다만 기준은 완전히 동일하지 않습니다. AWS는 주로 AWS 장기계약, Microsoft는 Azure-only가 아닌 Commercial RPO, Google은 최신 공시상 대부분 Google Cloud 관련 RPO로 봐야 합니다.</p>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${rpoRatioPanel.title}</h3>
              <p>${rpoRatioPanel.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-cloud-chart="rpo-ratio"></canvas>
          </div>
        </article>
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${cloudDashboardData.microsoftAi.title}</h3>
              <p>${cloudDashboardData.microsoftAi.subtitle}</p>
            </div>
          </div>
          <div class="cloud-rpo-stats">
            ${buildMicrosoftAiStatsMarkup(cloudDashboardData.microsoftAi)}
          </div>
          <div class="cloud-ai-chart-grid">
            <div class="cloud-chart-wrap cloud-chart-wrap-tall">
              <canvas data-cloud-chart="msft-ai-arr"></canvas>
            </div>
            <div class="cloud-chart-wrap cloud-chart-wrap-tall">
              <canvas data-cloud-chart="msft-ai-ratio"></canvas>
            </div>
          </div>
          <p class="cloud-rpo-note">Microsoft는 AI 관련 RPO를 따로 공개하지 않습니다. 따라서 이 패널은 RPO가 아니라 공개된 AI business annual revenue run rate를 추적합니다. 값은 모두 “surpassed/exceeded” 기준이라 실제치는 표시값보다 약간 높을 수 있습니다.</p>
        </article>
      </div>
    </section>
  `;

  const growthCanvas = usOverviewRoot.querySelector('[data-cloud-chart="growth"]');
  const marginCanvas = usOverviewRoot.querySelector('[data-cloud-chart="margin"]');
  const revenueCanvas = usOverviewRoot.querySelector('[data-cloud-chart="revenue"]');
  const rpoCanvas = usOverviewRoot.querySelector('[data-cloud-chart="rpo"]');
  const rpoRatioCanvas = usOverviewRoot.querySelector('[data-cloud-chart="rpo-ratio"]');
  const microsoftAiCanvas = usOverviewRoot.querySelector('[data-cloud-chart="msft-ai-arr"]');
  const microsoftAiRatioCanvas = usOverviewRoot.querySelector('[data-cloud-chart="msft-ai-ratio"]');

  if (growthCanvas) {
    createCloudLineChart(growthCanvas, cloudDashboardData.yoyGrowth, (value) => `${Number(value).toFixed(1)}%`, 0);
  }
  if (marginCanvas) {
    createCloudLineChart(marginCanvas, cloudDashboardData.margin, (value) => `${Number(value).toFixed(1)}%`, -20);
  }
  if (revenueCanvas) {
    createCloudRevenueBarChart(revenueCanvas, cloudDashboardData.revenue);
  }
  if (rpoCanvas) {
    createCloudBarChart(rpoCanvas, cloudDashboardData.rpo, (value) => `$${Number(value).toFixed(0)}B`, { step: 100 });
  }
  if (rpoRatioCanvas) {
    createCloudPointLineChart(rpoRatioCanvas, rpoRatioPanel, (value) => `${Number(value).toFixed(1)}x`, { step: 5, min: 0 });
  }
  if (microsoftAiCanvas) {
    createCloudPointLineChart(microsoftAiCanvas, cloudDashboardData.microsoftAi, (value) => `$${Number(value).toFixed(1)}B`, { step: 10, min: 0, spanGaps: true });
  }
  if (microsoftAiRatioCanvas) {
    createCloudPointLineChart(microsoftAiRatioCanvas, microsoftAiRatioPanel, (value) => `${Number(value).toFixed(1)}%`, { step: 10, min: 0, spanGaps: true });
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

function formatInfraPrice(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  return `$${numeric.toFixed(1)}/MWh`;
}

function formatInfraDate(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function formatInfraStatusLabel(status) {
  if (status === "stressed") return "스트레스";
  if (status === "elevated") return "주의";
  return "정상";
}

function getInfraPanel(panelKey) {
  return infraGridData?.panels?.[panelKey] ?? null;
}

function getInfraRange(panelKey) {
  return state.infraRanges?.[panelKey] ?? infraGridData.defaultRange ?? "3y";
}

function getInfraSelection(panelKey) {
  const selected = state.infraSelections?.[panelKey];
  if (Array.isArray(selected) && selected.length) {
    return selected;
  }
  return Object.keys(getInfraPanel(panelKey)?.series ?? {});
}

function buildInfraChartPayload(panel, rangeKey, selectedKeys) {
  const selectedSet = new Set(selectedKeys?.length ? selectedKeys : Object.keys(panel?.series ?? {}));
  const entries = Object.entries(panel?.series ?? {}).filter(([key]) => selectedSet.has(key));
  const allDates = [...new Set(entries.flatMap(([, item]) => item?.dates ?? []))].sort();
  if (!allDates.length) {
    return { labels: [], datasets: [] };
  }

  const latestDate = allDates[allDates.length - 1];
  const startDate = shiftDateByRange(latestDate, rangeKey, infraGridData?.startDate ?? "2001-01-01");
  const selectedLabels = allDates.filter((label) => label >= startDate);

  const datasets = entries.map(([key, item]) => {
    const dateIndex = new Map();
    (item.dates ?? []).forEach((date, index) => dateIndex.set(date, index));
    return {
      key,
      label: item.name,
      data: selectedLabels.map((label) => {
        const index = dateIndex.get(label);
        if (index === undefined) {
          return null;
        }
        const value = Number(item.values?.[index]);
        return Number.isFinite(value) ? value : null;
      }),
      borderColor: item.color,
      backgroundColor: item.color,
      borderWidth: 2.2,
      tension: 0.14,
      pointRadius: 0,
      pointHoverRadius: 4,
      pointHitRadius: 10,
      spanGaps: panel.connectGaps === true,
    };
  });

  return { labels: selectedLabels, datasets };
}

function createInfraChart(canvas, panelKey) {
  if (typeof Chart === "undefined") {
    return;
  }
  const panel = getInfraPanel(panelKey);
  if (!panel) {
    return;
  }
  const rangeKey = getInfraRange(panelKey);
  const payload = buildInfraChartPayload(panel, rangeKey, getInfraSelection(panelKey));
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 100;
  const spread = Math.max(maxValue - minValue, Math.abs(maxValue) * 0.18, 1);
  const yMin = minValue >= 0 ? Math.max(0, minValue - spread * 0.1) : minValue - spread * 0.1;
  const yMax = maxValue + spread * 0.12;
  const tickIndexes = getMacroTickIndexes(payload.labels, rangeKey, canvas?.clientWidth ?? 0);
  const tickSet = new Set(tickIndexes);

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
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${formatMacroValue(context.parsed.y, panel.formatter)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = tickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => (tickSet.has(value) ? formatRangeAxisDate(payload.labels[value], rangeKey) : ""),
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
          title: { display: true, text: panel.yAxisLabel ?? "", color: "#8d8d86" },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });
  charts.push(chart);
}

function buildInfraPanelCard(panelConfig, rangeSource) {
  const panel = getInfraPanel(panelConfig.key);
  if (!panel) {
    return "";
  }
  const selected = new Set(getInfraSelection(panelConfig.key));
  const seriesChips = Object.entries(panel.series ?? {})
    .map(
      ([seriesKey, item]) => `
        <button
          type="button"
          class="m7-range-chip macro-dashboard-chip${selected.has(seriesKey) ? " active" : ""}"
          data-infra-series="${seriesKey}"
          data-infra-panel="${panelConfig.key}"
        >
          <i class="macro-series-dot" style="background:${item.color}"></i>
          ${item.name}
        </button>`,
    )
    .join("");

  return `
    <article class="cloud-panel macro-panel ${panelConfig.className ?? ""}">
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
                  class="m7-range-chip${getInfraRange(panelConfig.key) === range.key ? " active" : ""}"
                  data-infra-range="${range.key}"
                  data-infra-panel="${panelConfig.key}"
                >
                  ${range.label}
                </button>`,
            )
            .join("")}
        </div>
      </div>
      <div class="macro-panel-meta">
        <span>${panel.source ?? ""}</span>
        <span>${panel.yAxisLabel ?? ""}</span>
      </div>
      <div class="market-macro-series-row">${seriesChips}</div>
      <div class="macro-chart-wrap"><canvas data-infra-panel="${panelConfig.key}"></canvas></div>
    </article>`;
}

function bindInfraControls(panelKeys) {
  usOverviewRoot.querySelectorAll("[data-infra-range]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.infraPanel;
      state.infraRanges = { ...state.infraRanges, [panelKey]: button.dataset.infraRange || infraGridData.defaultRange || "3y" };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-infra-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.infraPanel;
      const seriesKey = button.dataset.infraSeries;
      if (!panelKey || !seriesKey) {
        return;
      }
      const selected = new Set(getInfraSelection(panelKey));
      if (selected.has(seriesKey) && selected.size > 1) {
        selected.delete(seriesKey);
      } else {
        selected.add(seriesKey);
      }
      state.infraSelections = { ...state.infraSelections, [panelKey]: [...selected] };
      render();
    });
  });

  panelKeys.forEach((panelKey) => {
    const canvas = usOverviewRoot.querySelector(`canvas[data-infra-panel="${panelKey}"]`);
    if (canvas) {
      createInfraChart(canvas, panelKey);
    }
  });
}

const INFRA_HUB_MAP_META = {
  pjm_west: { x: 70, y: 44, label: "PJM West", note: "Mid-Atlantic / NoVA proxy" },
  indiana: { x: 57, y: 42, label: "Indiana", note: "Midwest / MISO" },
  mass_hub: { x: 82, y: 31, label: "Mass Hub", note: "New England" },
  np15: { x: 16, y: 43, label: "NP15", note: "Northern CA" },
  sp15: { x: 20, y: 59, label: "SP15", note: "Southern CA" },
  palo_verde: { x: 28, y: 59, label: "Palo Verde", note: "Arizona / Southwest" },
  mid_c: { x: 20, y: 25, label: "Mid-C", note: "Pacific Northwest" },
  ercot_north: { x: 50, y: 67, label: "ERCOT North", note: "Texas historical" },
};

function buildInfraMapMarkup(snapshots) {
  const markers = snapshots
    .map((item) => {
      const meta = INFRA_HUB_MAP_META[item.key];
      if (!meta) {
        return "";
      }
      return `
        <button
          type="button"
          class="infra-map-marker ${item.status}"
          style="left:${meta.x}%; top:${meta.y}%"
          title="${meta.label} / ${meta.note} / ${formatInfraPrice(item.price)}"
        >
          <span class="infra-map-dot"></span>
          <span class="infra-map-label">${meta.label}</span>
        </button>`;
    })
    .join("");

  return `
    <article class="infra-explain-panel infra-map-panel">
      <div>
        <h3>전력 허브 지도</h3>
        <p>표시된 지점은 실제 데이터센터 주소가 아니라 공개 전력가격 허브입니다. 어느 지역 전력망에서 가격 압력이 나타나는지 위치감을 잡기 위한 지도입니다.</p>
      </div>
      <div class="infra-map-canvas" aria-label="US power hub map">
        <div class="infra-map-region west">서부</div>
        <div class="infra-map-region midwest">중부</div>
        <div class="infra-map-region east">동부</div>
        ${markers}
      </div>
      <div class="infra-map-legend">
        <span><i class="normal"></i>정상</span>
        <span><i class="elevated"></i>주의</span>
        <span><i class="stressed"></i>스트레스</span>
      </div>
    </article>`;
}

function buildInfraGuideMarkup() {
  return `
    <article class="infra-explain-panel">
      <div>
        <h3>어떻게 볼까</h3>
        <p>AI와 데이터센터 수요가 특정 전력망 지역에서 반복적인 전력가격 스트레스로 나타나는지 보는 대시보드입니다.</p>
      </div>
      <div class="infra-guide-grid">
        <div>
          <strong>최근값</strong>
          <span>EIA가 공개한 최신 ICE 피크 전력가격입니다. 단위는 $/MWh입니다.</span>
        </div>
        <div>
          <strong>1년 평균</strong>
          <span>최근 가격이 높은지 낮은지 비교하기 위한 1년 평균 기준선입니다.</span>
        </div>
        <div>
          <strong>90일 급등</strong>
          <span>최근 90개 관측치 중 전력가격이 $100/MWh 이상이었던 날의 개수입니다.</span>
        </div>
        <div>
          <strong>상태</strong>
          <span>스트레스는 급등일 10일 이상, 주의는 4일 이상을 의미합니다.</span>
        </div>
      </div>
    </article>`;
}

function buildInfraInvestmentGuideMarkup() {
  return `
    <article class="infra-investment-guide">
      <div class="infra-investment-head">
        <h3>투자 관점에서 보는 법</h3>
        <p>이 대시보드는 단독 매매 신호가 아닙니다. AI 인프라 사이클이 GPU 부족에서 지역 전력망 부족으로 번지고 있는지 판단하기 위한 보조 지표입니다.</p>
      </div>
      <div class="infra-investment-grid">
        <div>
          <strong>전력가격 급등이 반복될 때</strong>
          <span>$100/MWh 이상인 날이 반복되면 지역 전력 공급 부족, 송전 병목, 수요 압박을 의심할 수 있습니다. 전력 장비, 발전, 전기 인프라 투자 테마에 우호적인 배경이 될 수 있습니다.</span>
        </div>
        <div>
          <strong>여러 지역이 같이 오르는지</strong>
          <span>PJM West, Mass Hub, Indiana가 동시에 오르면 단일 지역 이벤트보다 넓은 전력 압력으로 볼 수 있습니다. 한 지역만 튀면 우선 지역 이슈로 해석하는 편이 낫습니다.</span>
        </div>
        <div>
          <strong>PJM West가 중요한 이유</strong>
          <span>PJM West는 미드애틀랜틱과 북버지니아 전력 압력을 보는 공개 대용 지표입니다. 북버지니아는 데이터센터 전력 수요 논쟁의 핵심 지역입니다.</span>
        </div>
        <div>
          <strong>30일 최고값과 최근값 비교</strong>
          <span>30일 최고값은 높지만 최근값이 낮으면 일회성 이벤트였을 수 있습니다. 반대로 90일 급등 횟수가 많으면 반복적인 스트레스라 구조적 설비투자 테마와 더 관련이 큽니다.</span>
        </div>
        <div>
          <strong>GPU/클라우드 지표와 같이 보기</strong>
          <span>전력가격 스트레스와 GPU 임대료 상승이 같이 나타나면 컴퓨팅 공급이 여전히 타이트하다는 신호일 수 있습니다. 전력 스트레스가 있는데 하이퍼스케일러 주가가 약하면 투자자들이 CAPEX와 마진 부담을 더 크게 보는 국면일 수 있습니다.</span>
        </div>
        <div>
          <strong>주의할 점</strong>
          <span>날씨, 발전소/송전망 고장, 연료비, 송전 혼잡만으로도 전력가격은 움직입니다. 중요한 것은 하루짜리 급등이 아니라 반복성과 지역 패턴입니다.</span>
        </div>
      </div>
    </article>`;
}

function renderInfraOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  const rangeSource = (infraGridData.ranges ?? []).length ? infraGridData.ranges : marketPriceData.ranges ?? [];
  const snapshots = infraGridData.snapshots ?? [];
  const panelKeys = (infraGridData.dashboards ?? []).map((item) => item.key).filter((key) => infraGridData.panels?.[key]);
  const stressedCount = snapshots.filter((item) => item.status === "stressed").length;
  const elevatedCount = snapshots.filter((item) => item.status === "elevated").length;
  const highest = snapshots.reduce((winner, item) => (Number(item.price) > Number(winner?.price ?? -Infinity) ? item : winner), null);
  const cardsMarkup = snapshots
    .map(
      (item) => `
        <article class="infra-grid-card ${item.status}">
          <div class="infra-grid-card-head">
            <div>
              <h3>${item.label}</h3>
              <p>${item.region}</p>
            </div>
            <span class="infra-status-pill">${formatInfraStatusLabel(item.status)}</span>
          </div>
          <div class="infra-grid-metrics">
            <div>
              <span>최근값</span>
              <strong>${formatInfraPrice(item.price)}</strong>
            </div>
            <div>
              <span>1년 평균</span>
              <strong>${formatInfraPrice(item.avg1y)}</strong>
            </div>
            <div>
              <span>90일 급등</span>
              <strong>${Number(item.spikeDays90 ?? 0).toFixed(0)}일</strong>
            </div>
          </div>
          <p class="infra-card-foot">${formatInfraDate(item.date)} / ${Number.isFinite(Number(item.premiumTo1yPct)) ? `1년 평균 대비 ${Number(item.premiumTo1yPct).toFixed(1)}%` : "1년 평균 비교 불가"}</p>
        </article>`,
    )
    .join("");
  const panelMarkup = (infraGridData.dashboards ?? [])
    .map((config, index) => buildInfraPanelCard({ key: config.key, className: index < 2 ? "macro-panel-wide" : "" }, rangeSource))
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-overview infra-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>데이터센터 전력 스트레스</h2>
            <p>데이터센터 전력 수요가 지역 전력망에 부담을 주는지 보기 위한 일별 전력 허브 가격과 급등 지표입니다.</p>
          </div>
          <div class="us-price-controls">
            <a class="market-breadth-link" href="${infraGridData.source?.url ?? "https://www.eia.gov/electricity/wholesale/"}" target="_blank" rel="noreferrer">EIA 원천 열기</a>
            <div class="us-price-updated">업데이트 ${infraGridData.updatedAt || "-"}</div>
          </div>
        </div>
        <div class="market-trend-meta">
          <span>출처: ${infraGridData.source?.name ?? "EIA Wholesale Electricity"}</span>
          <span>EIA는 ICE 일별 전력 허브 가격을 보통 격주 단위로 다시 공개합니다</span>
          <span>PJM West는 북버지니아 전력가격 압력을 보는 공개 대용 지표로 사용합니다</span>
        </div>
        <div class="infra-explain-grid">
          ${buildInfraGuideMarkup()}
          ${buildInfraMapMarkup(snapshots)}
        </div>
        <div class="infra-grid-summary">
          <div>
            <strong>${snapshots.length}</strong>
            <span>추적 허브</span>
          </div>
          <div>
            <strong>${stressedCount}</strong>
            <span>스트레스</span>
          </div>
          <div>
            <strong>${elevatedCount}</strong>
            <span>주의</span>
          </div>
          <div>
            <strong>${highest ? formatInfraPrice(highest.price) : "-"}</strong>
            <span>${highest?.label ?? "최고가 허브"}</span>
          </div>
        </div>
        <div class="infra-card-grid">${cardsMarkup}</div>
        <div class="macro-panel-grid infra-chart-grid">${panelMarkup}</div>
        ${buildInfraInvestmentGuideMarkup()}
      </section>
    </section>
  `;

  bindInfraControls(panelKeys);
}

function getMarketBreadthSpreadPanel() {
  return marketBreadthData.panels?.primaryQuarter25
    ?? marketBreadthData.panels?.breadthSpread52w
    ?? marketBreadthData.panels?.sp500EqualWeightSpread52w
    ?? null;
}

function getMarketBreadthSpreadSeriesEntries(panel = getMarketBreadthSpreadPanel()) {
  return panel?.series
    ? Object.entries(panel.series)
    : panel
      ? [["sp500", panel]]
      : [];
}

function getSelectedMarketBreadthSeriesKeys(seriesEntries = getMarketBreadthSpreadSeriesEntries()) {
  const allKeys = seriesEntries.map(([key]) => key);
  const selected = (state.marketBreadthSeriesSelection ?? []).filter((key) => allKeys.includes(key));
  return selected.length ? selected : allKeys;
}

function getMarketBreadthIndexEntries(panel = getMarketBreadthSpreadPanel()) {
  return panel?.indices ? Object.entries(panel.indices) : [];
}

function getSelectedMarketBreadthIndexKeys(indexEntries = getMarketBreadthIndexEntries()) {
  const allKeys = indexEntries.map(([key]) => key);
  const selected = (state.marketBreadthIndexSelection ?? []).filter((key) => allKeys.includes(key));
  return selected.length ? selected : allKeys;
}

function getMarketBreadthSignalColor(item, currentValue, previousValue) {
  if (
    currentValue === null
    || previousValue === null
    || currentValue === undefined
    || previousValue === undefined
    || !Number.isFinite(Number(currentValue))
    || !Number.isFinite(Number(previousValue))
  ) {
    return item?.neutralColor ?? "#4b5563";
  }
  const current = Number(currentValue);
  const previous = Number(previousValue);
  if (current === previous) {
    return item?.neutralColor ?? "#6b7280";
  }
  const isImproving = item?.isBearish ? current < previous : current > previous;
  return isImproving ? "#15803d" : "#b91c1c";
}

function getMarketBreadthLatestSignalClass(item) {
  return getMarketBreadthSignalColor(item, item?.latest, item?.previous) === "#15803d" ? "is-positive" : "is-negative";
}

function buildMarketBreadthSpreadPayload(rangeKey, selectedKeys, selectedIndexKeys) {
  const panel = getMarketBreadthSpreadPanel();
  const selectedSet = new Set(selectedKeys ?? getSelectedMarketBreadthSeriesKeys(getMarketBreadthSpreadSeriesEntries(panel)));
  const selectedIndexSet = new Set(selectedIndexKeys ?? getSelectedMarketBreadthIndexKeys(getMarketBreadthIndexEntries(panel)));
  const rawSeries = getMarketBreadthSpreadSeriesEntries(panel).filter(([key]) => selectedSet.has(key));
  const allLabels = [
    ...new Set(rawSeries.flatMap(([, item]) => (Array.isArray(item?.dates) ? item.dates : []))),
  ].sort();
  if (!allLabels.length) {
    return { labels: [], series: [], thresholds: [] };
  }
  const latestDate = allLabels[allLabels.length - 1];
  const startDate = shiftDateByRange(latestDate, rangeKey, allLabels[0]);
  const labels = allLabels.filter((label) => rangeKey === "max" || label >= startDate);
  const series = rawSeries.map(([key, item]) => {
    const itemDates = item?.dates ?? [];
    const valueMap = new Map(itemDates.map((label, index) => [label, item.values?.[index] ?? null]));
    const equalMap = new Map(itemDates.map((label, index) => [label, item.equalWeightedReturns?.[index] ?? null]));
    const capMap = new Map(itemDates.map((label, index) => [label, item.capWeightedReturns?.[index] ?? null]));
    return {
      key,
      label: item?.label ?? key,
      description: item?.description ?? "",
      color: item?.color ?? "#344255",
      isBearish: Boolean(item?.isBearish),
      borderDash: item?.borderDash ?? (item?.isBearish ? [10, 5] : []),
      neutralColor: item?.neutralColor ?? "#6b7280",
      equalWeighted: item?.equalWeighted ?? null,
      capWeighted: item?.capWeighted ?? null,
      latest: item?.latest ?? null,
      latestState: item?.latestState ?? "-",
      values: labels.map((label) => valueMap.get(label) ?? null),
      equalReturns: labels.map((label) => equalMap.get(label) ?? null),
      capReturns: labels.map((label) => capMap.get(label) ?? null),
    };
  });
  const indexSeries = Object.entries(panel?.indices ?? {}).filter(([key]) => selectedIndexSet.has(key)).map(([key, item]) => {
    const itemDates = item?.dates ?? [];
    const valueMap = new Map(itemDates.map((label, index) => [label, item.values?.[index] ?? null]));
    const rawValues = labels.map((label) => valueMap.get(label) ?? null);
    const base = rawValues.find((value) => Number.isFinite(Number(value)));
    return {
      key,
      label: item?.label ?? key,
      symbol: item?.symbol ?? "",
      color: item?.color ?? "#6b7280",
      rawValues,
      values: rawValues.map((value) => (
        Number.isFinite(Number(value)) && Number.isFinite(Number(base)) && Number(base) !== 0
          ? (Number(value) / Number(base)) * 100
          : null
      )),
    };
  });
  return {
    labels,
    series,
    indexSeries,
    thresholds: panel?.thresholds ?? [],
    unit: panel?.unit ?? "percentagePoint",
  };
}

function formatBreadthValue(value, unit = "count") {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (unit === "count") {
    return numeric.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%p`;
}

function formatBreadthDelta(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatBreadthIndexLevel(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function createMarketBreadthSpreadChart(canvas, rangeKey, selectedKeys, selectedIndexKeys) {
  if (typeof Chart === "undefined" || !canvas) {
    return;
  }
  const payload = buildMarketBreadthSpreadPayload(rangeKey, selectedKeys, selectedIndexKeys);
  if (!payload.labels.length) {
    return;
  }
  const finiteValues = payload.series
    .flatMap((item) => item.values)
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);
  const minValue = finiteValues.length ? Math.min(...finiteValues) : 0;
  const maxValue = finiteValues.length ? Math.max(...finiteValues) : 100;
  const padding = Math.max((maxValue - minValue) * 0.12, payload.unit === "count" ? 100 : 2);
  const yStep = payload.unit === "count" ? 250 : 5;
  const yMin = Math.max(0, Math.floor((minValue - padding) / yStep) * yStep);
  const yMax = Math.ceil((maxValue + padding) / yStep) * yStep;
  const tickIndexes = buildRegularDateTickIndexes(payload.labels, rangeKey);
  const tickSet = new Set(tickIndexes);

  const lineDatasets = payload.series.map((item) => ({
    label: item.label,
    data: item.values,
    borderColor: item.neutralColor,
    backgroundColor: item.isBearish ? "rgba(185, 28, 28, 0.05)" : "rgba(21, 128, 61, 0.05)",
    borderWidth: 2.6,
    borderDash: item.borderDash,
    pointRadius: 0,
    pointHoverRadius: 4,
    pointHitRadius: 10,
    tension: 0.2,
    fill: item.isBearish ? "-1" : "origin",
    spanGaps: true,
    yAxisID: "y",
    meta: item,
    segment: {
      borderColor: (context) => getMarketBreadthSignalColor(item, context.p1?.parsed?.y, context.p0?.parsed?.y),
    },
  }));
  const indexDatasets = payload.indexSeries.map((item) => ({
    label: `${item.label} (100=base)`,
    data: item.values,
    borderColor: item.color,
    backgroundColor: item.color,
    borderWidth: 1.9,
    borderDash: [5, 5],
    pointRadius: 0,
    pointHoverRadius: 3,
    pointHitRadius: 10,
    tension: 0.12,
    spanGaps: true,
    yAxisID: "yIndex",
    meta: item,
  }));
  const thresholdDataset = (value, label, color, dash = [6, 6], width = 1.3) => ({
    label,
    data: payload.labels.map(() => value),
    borderColor: color,
    borderDash: dash,
    borderWidth: width,
    pointRadius: 0,
    pointHoverRadius: 0,
  });
  const primaryCount = lineDatasets.length;
  const lineCount = lineDatasets.length + indexDatasets.length;
  const datasets = [...lineDatasets, ...indexDatasets];
  if (payload.unit !== "count") {
    datasets.push(
      thresholdDataset(0, "0%p baseline", "rgba(17, 24, 39, 0.72)", [], 1.8),
      thresholdDataset(-5, "-5%p watch", "rgba(217, 119, 6, 0.48)", [5, 6]),
      thresholdDataset(-10, "-10%p narrowing", "rgba(220, 38, 38, 0.5)", [2, 6]),
    );
  }

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: payload.labels,
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
            color: "#4f4f49",
            filter: (item) => item.datasetIndex < lineCount,
            usePointStyle: true,
            boxWidth: 9,
            boxHeight: 9,
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              if (context.datasetIndex >= lineCount) {
                return `${context.dataset.label}: ${formatBreadthValue(context.parsed.y, payload.unit)}`;
              }
              if (context.datasetIndex >= primaryCount) {
                const meta = context.dataset.meta ?? {};
                const rawValue = meta.rawValues?.[context.dataIndex];
                return `${meta.label ?? context.dataset.label}: ${Number(context.parsed.y).toFixed(1)} / ${formatBreadthIndexLevel(rawValue)}`;
              }
              const index = context.dataIndex;
              const meta = context.dataset.meta ?? {};
              if (payload.unit === "count") {
                return `${context.dataset.label}: ${formatBreadthValue(context.parsed.y, payload.unit)}`;
              }
              const equalLabel = meta.equalWeighted?.symbol ?? meta.equalWeighted?.label ?? "Equal weight";
              const capLabel = meta.capWeighted?.symbol ?? meta.capWeighted?.label ?? "Benchmark";
              return [
                `${context.dataset.label}: ${formatBreadthValue(context.parsed.y, payload.unit)}`,
                `${equalLabel} 52W: ${formatSignedPercent(meta.equalReturns?.[index])}`,
                `${capLabel} 52W: ${formatSignedPercent(meta.capReturns?.[index])}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          border: { color: "rgba(28,28,26,0.14)" },
          grid: { display: false },
          ticks: {
            color: "#8a8a83",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => (tickSet.has(value) ? formatRangeAxisDate(payload.labels[value], rangeKey) : ""),
          },
        },
        y: {
          min: yMin,
          max: yMax,
          border: { color: "rgba(28,28,26,0.14)" },
          grid: {
            color: (context) => (Number(context.tick?.value) === 0 ? "rgba(17,24,39,0.22)" : "rgba(28,28,26,0.07)"),
          },
          ticks: {
            color: "#77776f",
            callback: (value) => (
              payload.unit === "count"
                ? Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 })
                : `${Number(value).toFixed(0)}%p`
            ),
          },
          title: {
            display: true,
            text: payload.unit === "count" ? "Stock count" : "52W spread (%p)",
            color: "#77776f",
          },
        },
        yIndex: {
          position: "right",
          border: { color: "rgba(28,28,26,0.14)" },
          grid: { display: false },
          ticks: {
            color: "#8a8a83",
            callback: (value) => Number(value).toFixed(0),
          },
          title: { display: true, text: "Index rebased to 100", color: "#8a8a83" },
        },
      },
    },
  });
  charts.push(chart);
}

function renderMarketBreadthOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");
  const spreadPanel = getMarketBreadthSpreadPanel();
  const spreadEntries = getMarketBreadthSpreadSeriesEntries(spreadPanel);
  const indexEntries = getMarketBreadthIndexEntries(spreadPanel);
  const selectedSeriesKeys = getSelectedMarketBreadthSeriesKeys(spreadEntries);
  const selectedSeriesSet = new Set(selectedSeriesKeys);
  const selectedIndexKeys = getSelectedMarketBreadthIndexKeys(indexEntries);
  const selectedIndexSet = new Set(selectedIndexKeys);
  state.marketBreadthSeriesSelection = selectedSeriesKeys;
  state.marketBreadthIndexSelection = selectedIndexKeys;
  const rangeChips = (marketBreadthData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="market-rs-chip${state.marketBreadthRange === range.key ? " active" : ""}"
          data-market-breadth-range="${range.key}"
        >${range.label}</button>
      `,
    )
    .join("");
  const indexChips = indexEntries
    .map(([indexKey, item]) => {
      const isSelected = selectedIndexSet.has(indexKey);
      return `
        <button
          type="button"
          class="market-rs-chip${isSelected ? " active" : ""}"
          style="--index-color:${item?.color ?? "#6b7280"}"
          data-market-breadth-index="${indexKey}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >${item?.label ?? indexKey}</button>
      `;
    })
    .join("");
  const summaryCards = spreadEntries
    .map(([seriesKey, item]) => {
      const latestClass = getMarketBreadthLatestSignalClass(item);
      const latestSignalColor = getMarketBreadthSignalColor(item, item?.latest, item?.previous);
      const isSelected = selectedSeriesSet.has(seriesKey);
      const delta = formatBreadthDelta(item?.delta);
      return `
        <button
          type="button"
          class="market-breadth-summary-card${isSelected ? " active" : " inactive"}"
          style="--breadth-color:${latestSignalColor}; --breadth-line-style:${item?.isBearish ? "dashed" : "solid"}"
          data-market-breadth-series="${seriesKey}"
          aria-pressed="${isSelected ? "true" : "false"}"
        >
          <div class="market-breadth-summary-top">
            <span>${item?.label ?? "-"}</span>
            <strong class="${latestClass}">${formatBreadthValue(item?.latest, spreadPanel?.unit ?? "count")}</strong>
          </div>
          <p>${escapeHtml(item?.description ?? "Stockbee Primary Indicator")}</p>
          <small>전일 대비 ${delta} · ${item?.updatedAt ?? marketBreadthData.updatedAt ?? "-"}</small>
        </button>
      `;
    })
    .join("");
  const indexLabels = Object.values(spreadPanel?.indices ?? {})
    .map((item) => item?.label)
    .filter(Boolean)
    .join(" / ");
  usOverviewRoot.innerHTML = `
    <section class="market-breadth-overview">
      <article class="us-panel">
        <div class="us-section-head">
          <div>
            <h2>Market Breadth</h2>
            <p>Stockbee Primary Indicator의 분기 기준 +25% 상승 종목 수와 -25% 하락 종목 수를 일자별로 추적합니다. 지수선은 같은 기간 첫 값을 100으로 리베이스합니다.</p>
          </div>
          <div class="market-breadth-actions">
            <a class="market-breadth-link" href="${MARKET_BREADTH_SOURCE_URL}" target="_blank" rel="noreferrer">Open Source Page</a>
            <a class="market-breadth-link" href="${MARKET_BREADTH_SHEET_URL}" target="_blank" rel="noreferrer">Open Sheet</a>
          </div>
        </div>
      </article>
      <article class="us-panel market-breadth-spread-panel">
        <div class="us-section-head">
          <div>
            <h2>${spreadPanel?.label ?? "Stockbee Primary Indicator"}</h2>
            <p>${spreadPanel?.subtitle ?? "Quarter +25% / -25% breadth with index overlays"}</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${marketBreadthData.updatedAt || "-"}</span>
            <span class="market-rs-pill">Daily update</span>
          </div>
        </div>
        <div class="market-breadth-summary-grid">${summaryCards}</div>
        <div class="market-rs-chip-row">${rangeChips}</div>
        <div class="market-breadth-index-controls">
          <span>Index Overlay</span>
          <div class="market-rs-chip-row">${indexChips}</div>
        </div>
        <div class="market-breadth-spread-meta">
          <span>실선: Quarter +25%, 긴 점선: Quarter -25%</span>
          <span>초록 구간: 내부 breadth 개선, 빨강 구간: 내부 breadth 악화</span>
          <span>지수 점선: ${indexLabels || "미국 주요지수"} 첫 값을 100으로 리베이스</span>
          <span>+25% 상승 종목 증가와 -25% 하락 종목 감소를 같이 확인</span>
        </div>
        <div class="chart-wrap market-breadth-spread-chart-wrap">
          <canvas data-market-breadth-spread-chart></canvas>
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
  usOverviewRoot.querySelectorAll("[data-market-breadth-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketBreadthRange = button.dataset.marketBreadthRange || marketBreadthData.defaultRange || "3y";
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-market-breadth-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const seriesKey = button.dataset.marketBreadthSeries;
      if (!seriesKey) {
        return;
      }
      const allKeys = spreadEntries.map(([key]) => key);
      const current = getSelectedMarketBreadthSeriesKeys(spreadEntries);
      const next = current.includes(seriesKey)
        ? current.filter((key) => key !== seriesKey)
        : [...current, seriesKey];
      state.marketBreadthSeriesSelection = next.length ? next : allKeys;
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-market-breadth-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const indexKey = button.dataset.marketBreadthIndex;
      if (!indexKey) {
        return;
      }
      const allKeys = indexEntries.map(([key]) => key);
      const current = getSelectedMarketBreadthIndexKeys(indexEntries);
      const next = current.includes(indexKey)
        ? current.filter((key) => key !== indexKey)
        : [...current, indexKey];
      state.marketBreadthIndexSelection = next.length ? next : allKeys;
      render();
    });
  });
  const spreadCanvas = usOverviewRoot.querySelector("canvas[data-market-breadth-spread-chart]");
  if (spreadCanvas && spreadPanel) {
    createMarketBreadthSpreadChart(
      spreadCanvas,
      state.marketBreadthRange,
      state.marketBreadthSeriesSelection,
      state.marketBreadthIndexSelection,
    );
  }
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

function formatOneDecimal(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return Number(value).toFixed(1);
}

function formatSignedScore(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}`;
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
    "2w": 10,
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

function getRotationScoreColor(score) {
  if (!Number.isFinite(Number(score))) {
    return "#eef0eb";
  }
  const numeric = Number(score);
  const magnitude = Math.min(Math.abs(numeric), 18);
  const strength = magnitude / 18;
  if (numeric > 0) {
    return `hsl(150, ${48 + strength * 22}%, ${95 - strength * 24}%)`;
  }
  if (numeric < 0) {
    return `hsl(8, ${56 + strength * 18}%, ${95 - strength * 22}%)`;
  }
  return "#eef0eb";
}

function getRotationClassLabel(classification) {
  const labels = {
    Leading: "Leading",
    Improving: "Improving",
    Weakening: "Weakening",
    Lagging: "Lagging",
  };
  return labels[classification] ?? "Neutral";
}

function getRotationClassRank(classification) {
  const ranks = {
    Lagging: 0,
    Weakening: 1,
    Improving: 2,
    Leading: 3,
  };
  return ranks[classification] ?? -1;
}

function getRotationClassKorean(classification) {
  const labels = {
    Leading: "주도",
    Improving: "개선",
    Weakening: "둔화",
    Lagging: "소외",
  };
  return labels[classification] ?? "중립";
}

function getRotationClassRule(classification) {
  const rules = {
    Leading: "1W > 0, 2W > 0, 1M > 0",
    Improving: "1W > 0, and not all Leading conditions",
    Weakening: "1W <= 0, 1M 또는 2W > 0",
    Lagging: "그 외",
  };
  return rules[classification] ?? "";
}

function getRotationHistoryShadeColor(classification) {
  const colors = {
    Leading: "rgba(19, 112, 71, 0.20)",
    Improving: "rgba(22, 163, 74, 0.10)",
    Weakening: "rgba(248, 113, 113, 0.12)",
    Lagging: "rgba(180, 35, 24, 0.18)",
  };
  return colors[classification] ?? "rgba(107, 114, 128, 0.08)";
}

function getRotationHistoryBorderColor(classification) {
  const colors = {
    Leading: "#137047",
    Improving: "#16a34a",
    Weakening: "#ef4444",
    Lagging: "#b42318",
  };
  return colors[classification] ?? "#6b7280";
}

function getSignedValueClass(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  if (numeric > 0) {
    return "is-positive";
  }
  if (numeric < 0) {
    return "is-negative";
  }
  return "";
}

function renderRotationCandidateList(items, emptyText) {
  if (!items?.length) {
    return `<p class="market-rs-empty">${emptyText}</p>`;
  }
  return items
    .map(
      (item) => `
        <article class="briefing-rotation-name">
          <div>
            <strong>${item.label}</strong>
            <span>${item.sectorLabel}</span>
          </div>
          <div class="briefing-rotation-name-stats">
            <b class="${getSignedValueClass(item.score)}">Score ${formatSignedScore(item.score)}</b>
            <span class="${getSignedValueClass(item.excessReturns?.["1w"])}">1W vs QQQ ${formatSignedPercent(item.excessReturns?.["1w"])}</span>
          </div>
        </article>
      `,
    )
    .join("");
}

function createBriefingRotationHistoryChart(canvas, sector, history) {
  if (typeof Chart === "undefined" || !canvas || !history?.length) {
    return;
  }
  const labels = history.map((item) => item.date);
  const values = history.map((item) => (Number.isFinite(Number(item.score)) ? Number(item.score) : null));
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const minValue = finiteValues.length ? Math.min(...finiteValues, 0) : -5;
  const maxValue = finiteValues.length ? Math.max(...finiteValues, 0) : 5;
  const spread = Math.max(maxValue - minValue, 4);
  const tickIndexes = getMacroTickIndexes(labels, "1y", canvas.clientWidth ?? 0);
  const tickSet = new Set(tickIndexes);
  const bandsPlugin = {
    id: `briefingRotationBands-${sector?.key ?? "selected"}`,
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      const xScale = scales.x;
      if (!chartArea || !xScale) {
        return;
      }
      ctx.save();
      history.forEach((item, index) => {
        const center = xScale.getPixelForValue(index);
        const previousCenter = index > 0 ? xScale.getPixelForValue(index - 1) : chartArea.left;
        const nextCenter = index < history.length - 1 ? xScale.getPixelForValue(index + 1) : chartArea.right;
        const left = index > 0 ? (previousCenter + center) / 2 : chartArea.left;
        const right = index < history.length - 1 ? (center + nextCenter) / 2 : chartArea.right;
        ctx.fillStyle = getRotationHistoryShadeColor(item.classification);
        ctx.fillRect(left, chartArea.top, Math.max(right - left, 1), chartArea.bottom - chartArea.top);
      });
      ctx.restore();
    },
  };

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: `${sector?.label ?? "Sector"} score`,
          data: values,
          borderColor: getRotationHistoryBorderColor(sector?.classification),
          backgroundColor: getRotationHistoryBorderColor(sector?.classification),
          borderWidth: 2.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHitRadius: 10,
          tension: 0.22,
          spanGaps: true,
          segment: {
            borderColor: (context) => getRotationHistoryBorderColor(
              history[context.p1DataIndex]?.classification
                ?? history[context.p0DataIndex]?.classification
                ?? sector?.classification,
            ),
          },
        },
        {
          label: "Zero line",
          data: labels.map(() => 0),
          borderColor: "rgba(31, 41, 55, 0.34)",
          borderDash: [5, 5],
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    },
    plugins: [bandsPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const point = items?.[0];
              const date = history[point?.dataIndex]?.date ?? point?.label;
              return formatFullIsoDate(date);
            },
            label: (context) => {
              if (context.datasetIndex === 1) {
                return "Zero line";
              }
              const item = history[context.dataIndex] ?? {};
              return [
                `Score ${formatSignedScore(context.parsed.y)}`,
                `${getRotationClassLabel(item.classification)} / ${getRotationClassKorean(item.classification)}`,
                `1W ${formatSignedPercent(item.excessReturns?.["1w"])}`,
                `1M ${formatSignedPercent(item.excessReturns?.["1m"])}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            axis.ticks = tickIndexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8d8d86",
            autoSkip: false,
            maxRotation: 0,
            callback: (value) => (tickSet.has(value) ? formatRangeAxisDate(labels[value], "1y") : ""),
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: minValue - spread * 0.14,
          max: maxValue + spread * 0.14,
          ticks: {
            color: "#8d8d86",
            callback: (value) => formatSignedScore(value),
            maxTicksLimit: 6,
          },
          title: { display: true, text: "Rotation Score", color: "#8d8d86" },
          grid: { color: "rgba(70, 70, 66, 0.12)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });
  charts.push(chart);
}

function calculatePearsonCorrelation(leftValues, rightValues) {
  const pairs = leftValues
    .map((left, index) => [Number(left), Number(rightValues[index])])
    .filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right));
  if (pairs.length < 10) {
    return null;
  }
  const leftMean = pairs.reduce((sum, [left]) => sum + left, 0) / pairs.length;
  const rightMean = pairs.reduce((sum, [, right]) => sum + right, 0) / pairs.length;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  pairs.forEach(([left, right]) => {
    const leftDelta = left - leftMean;
    const rightDelta = right - rightMean;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta ** 2;
    rightVariance += rightDelta ** 2;
  });
  const denominator = Math.sqrt(leftVariance * rightVariance);
  if (!denominator) {
    return null;
  }
  return numerator / denominator;
}

function getBriefingDistributionBenchmarkMeta(benchmarkKey = state.briefingRotationDistributionBenchmark) {
  return (
    BRIEFING_ROTATION_DISTRIBUTION_BENCHMARKS.find((item) => item.key === benchmarkKey) ??
    BRIEFING_ROTATION_DISTRIBUTION_BENCHMARKS[0]
  );
}

function getBriefingDistributionXAxisMeta(axisKey = state.briefingRotationDistributionXAxis) {
  return (
    BRIEFING_ROTATION_DISTRIBUTION_X_AXES.find((item) => item.key === axisKey) ??
    BRIEFING_ROTATION_DISTRIBUTION_X_AXES[0]
  );
}

function getBriefingDistributionCorrWindowMeta(windowKey = state.briefingRotationDistributionCorrWindow) {
  return (
    BRIEFING_ROTATION_DISTRIBUTION_CORR_WINDOWS.find((item) => item.key === windowKey) ??
    BRIEFING_ROTATION_DISTRIBUTION_CORR_WINDOWS.at(-1)
  );
}

function getBriefingIndexDailyReturnsByDate(itemKey) {
  const item = window.marketPriceData?.items?.[itemKey];
  const dates = item?.dates ?? [];
  const values = item?.values ?? [];
  const returns = new Map();
  for (let index = 1; index < dates.length; index += 1) {
    const current = Number(values[index]);
    const previous = Number(values[index - 1]);
    if (!dates[index] || !Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
      continue;
    }
    returns.set(dates[index], ((current / previous) - 1) * 100);
  }
  return returns;
}

function getBriefingIndexPeriodReturn(itemKey, periodKey) {
  const period = BRIEFING_ROTATION_DISTRIBUTION_PERIODS[periodKey];
  if (!period) {
    return null;
  }
  const item = window.marketPriceData?.items?.[itemKey];
  const values = item?.values ?? [];
  const finiteValues = values.map(Number).filter(Number.isFinite);
  if (finiteValues.length <= period) {
    return null;
  }
  const current = finiteValues.at(-1);
  const base = finiteValues.at(-(period + 1));
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) {
    return null;
  }
  return ((current / base) - 1) * 100;
}

function getBriefingSectorMixedReturnFromPanels(sectorKey, periodKey) {
  const sector = (window.marketBriefingData?.sectorPanels ?? []).find((panel) => panel.key === sectorKey);
  const items = sector?.items ?? [];
  const values = [];
  let weightedSum = 0;
  let weightSum = 0;
  items.forEach((item) => {
    const value = Number(item?.overviewReturns?.[periodKey] ?? item?.returns?.[periodKey]);
    if (!Number.isFinite(value)) {
      return;
    }
    const weight = Number(item?.marketCapUsd ?? item?.marketCap);
    if (Number.isFinite(weight) && weight > 0) {
      weightedSum += value * weight;
      weightSum += weight;
    }
    values.push(value);
  });
  if (!values.length) {
    return null;
  }
  const equalWeighted = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (weightSum > 0) {
    return (weightedSum / weightSum) * 0.5 + equalWeighted * 0.5;
  }
  return equalWeighted;
}

function getBriefingSectorDistributionReturn(sector, periodKey) {
  const directValue = Number(sector?.returns?.[periodKey]);
  if (Number.isFinite(directValue)) {
    return directValue;
  }
  return getBriefingSectorMixedReturnFromPanels(sector?.key, periodKey);
}

function getBriefingRotationDistributionXValue(sector, benchmarkMeta, xAxisMeta) {
  if (xAxisMeta.kind === "score") {
    const score = Number(sector?.score);
    return Number.isFinite(score) ? score : null;
  }
  const sectorReturn = getBriefingSectorDistributionReturn(sector, xAxisMeta.key);
  const benchmarkReturn = getBriefingIndexPeriodReturn(benchmarkMeta.itemKey, xAxisMeta.key);
  if (!Number.isFinite(sectorReturn) || !Number.isFinite(benchmarkReturn)) {
    return null;
  }
  return sectorReturn - benchmarkReturn;
}

function buildBriefingRotationDistribution(
  sectors,
  historyBySector,
  benchmarkKey = state.briefingRotationDistributionBenchmark,
  xAxisKey = state.briefingRotationDistributionXAxis,
  corrWindowKey = state.briefingRotationDistributionCorrWindow,
) {
  const benchmarkMeta = getBriefingDistributionBenchmarkMeta(benchmarkKey);
  const xAxisMeta = getBriefingDistributionXAxisMeta(xAxisKey);
  const corrWindowMeta = getBriefingDistributionCorrWindowMeta(corrWindowKey);
  const qqqReturnsByDate = getBriefingIndexDailyReturnsByDate("nasdaq100");
  const benchmarkReturnsByDate = getBriefingIndexDailyReturnsByDate(benchmarkMeta.itemKey);
  const seenSectorKeys = new Set();
  const rawPoints = (sectors ?? [])
    .map((sector) => {
      if (!sector?.key || seenSectorKeys.has(sector.key)) {
        return null;
      }
      seenSectorKeys.add(sector.key);
      const history = (historyBySector?.[sector.key] ?? []).slice(-corrWindowMeta.sessions);
      const sectorReturns = [];
      const benchmarkReturns = [];
      history.forEach((item) => {
        const benchmarkReturn = benchmarkReturnsByDate.get(item.date);
        let sectorReturn = Number(item.returns?.["1d"]);
        if (!Number.isFinite(sectorReturn)) {
          const qqqReturn = qqqReturnsByDate.get(item.date);
          const excessReturn = Number(item.excessReturns?.["1d"]);
          sectorReturn = Number.isFinite(qqqReturn) && Number.isFinite(excessReturn) ? qqqReturn + excessReturn : NaN;
        }
        if (!Number.isFinite(sectorReturn) || !Number.isFinite(benchmarkReturn)) {
          return;
        }
        benchmarkReturns.push(benchmarkReturn);
        sectorReturns.push(sectorReturn);
      });
      const correlation = calculatePearsonCorrelation(sectorReturns, benchmarkReturns);
      if (!Number.isFinite(correlation)) {
        return null;
      }
      const sectorPeriodReturn =
        xAxisMeta.kind === "return" ? getBriefingSectorDistributionReturn(sector, xAxisMeta.key) : null;
      const xValue = getBriefingRotationDistributionXValue(sector, benchmarkMeta, xAxisMeta);
      if (!Number.isFinite(xValue)) {
        return null;
      }
      const score = Number(sector.score);
      const rawCorrelationPct = correlation * 100;
      return {
        x: xValue,
        y: Math.max(rawCorrelationPct, -25),
        key: sector.key,
        label: sector.label,
        classification: sector.classification,
        score: Number.isFinite(score) ? score : null,
        xValue,
        xAxisKey: xAxisMeta.key,
        xAxisKind: xAxisMeta.kind,
        xAxisLabel: xAxisMeta.label,
        sampleSize: sectorReturns.length,
        correlation,
        rawCorrelationPct,
        corrWindowKey: corrWindowMeta.key,
        corrWindowLabel: corrWindowMeta.label,
        corrWindowSessions: corrWindowMeta.sessions,
        benchmarkLabel: benchmarkMeta.label,
        benchmarkReturn:
          xAxisMeta.kind === "return"
            ? getBriefingIndexPeriodReturn(benchmarkMeta.itemKey, xAxisMeta.key)
            : null,
        sectorPeriodReturn,
        excessReturns: sector.excessReturns ?? {},
        returns: sector.returns ?? {},
      };
    })
    .filter(Boolean);
  const occupiedBuckets = new Map();
  const points = rawPoints.map((point) => {
    const bucketKey = `${Math.round(point.x * 10)}|${Math.round(point.y * 2)}`;
    const bucketCount = occupiedBuckets.get(bucketKey) ?? 0;
    occupiedBuckets.set(bucketKey, bucketCount + 1);
    if (!bucketCount) {
      return point;
    }
    const offsetDirection = bucketCount % 2 === 0 ? 1 : -1;
    const offsetMagnitude = Math.ceil(bucketCount / 2);
    return {
      ...point,
      x: point.x + offsetDirection * offsetMagnitude * 0.16,
      y: Math.min(100, Math.max(-25, point.y + offsetDirection * offsetMagnitude * 2.2)),
      isJittered: true,
    };
  });

  const scores = points.map((point) => point.x).filter(Number.isFinite);
  const minScore = scores.length ? Math.min(...scores, -2) : -6;
  const maxScore = scores.length ? Math.max(...scores, 2) : 6;
  const scoreSpread = Math.max(maxScore - minScore, 4);
  return {
    points,
    xMin: minScore - scoreSpread * 0.16,
    xMax: maxScore + scoreSpread * 0.16,
    benchmark: benchmarkMeta,
    xAxis: xAxisMeta,
    corrWindow: corrWindowMeta,
  };
}

function createBriefingRotationDistributionChart(canvas, distribution) {
  if (typeof Chart === "undefined" || !canvas || !distribution?.points?.length) {
    return;
  }
  const getDistributionLabel = (raw) => {
    const label = String(raw?.label ?? "");
    const cleaned = label.replace(/\s*\([^)]*\)\s*/g, "").trim();
    if (cleaned.length <= 8) {
      return cleaned;
    }
    return `${cleaned.slice(0, 8)}…`;
  };
  const getDistributionPointRadius = (raw) => {
    const value = Math.abs(Number(raw?.x));
    if (!Number.isFinite(value)) {
      return 6;
    }
    return Math.max(5, Math.min(10, 5 + value / 2.8));
  };
  const labelPlugin = {
    id: "briefingRotationDistributionLabels",
    afterDatasetsDraw(chart) {
      const { ctx, chartArea } = chart;
      const dataset = chart.data.datasets?.[0];
      const meta = chart.getDatasetMeta(0);
      if (!chartArea || !dataset || !meta?.data?.length) {
        return;
      }
      const occupiedRects = [];
      const pointObstacles = meta.data
        .map((element, index) => {
          const raw = dataset.data[index];
          if (!element || !raw) {
            return null;
          }
          const radius = getDistributionPointRadius(raw) + 7;
          return {
            left: element.x - radius,
            right: element.x + radius,
            top: element.y - radius,
            bottom: element.y + radius,
          };
        })
        .filter(Boolean);
      const candidates = [
        { x: 0, y: 24, align: "center" },
        { x: 0, y: -24, align: "center" },
        { x: 32, y: 0, align: "left" },
        { x: -32, y: 0, align: "right" },
        { x: 30, y: 22, align: "left" },
        { x: -30, y: 22, align: "right" },
        { x: 30, y: -22, align: "left" },
        { x: -30, y: -22, align: "right" },
        { x: 0, y: 42, align: "center" },
        { x: 0, y: -42, align: "center" },
        { x: 46, y: 16, align: "left" },
        { x: -46, y: 16, align: "right" },
        { x: 46, y: -16, align: "left" },
        { x: -46, y: -16, align: "right" },
        { x: 62, y: 0, align: "left" },
        { x: -62, y: 0, align: "right" },
        { x: 62, y: 32, align: "left" },
        { x: -62, y: 32, align: "right" },
        { x: 62, y: -32, align: "left" },
        { x: -62, y: -32, align: "right" },
        { x: 0, y: 60, align: "center" },
        { x: 0, y: -60, align: "center" },
      ];
      const orderedElements = meta.data
        .map((element, index) => ({ element, raw: dataset.data[index], index }))
        .filter((item) => item.element && item.raw)
        .sort((a, b) => Number(b.raw.x ?? 0) - Number(a.raw.x ?? 0));
      const rectIntersects = (rect, other) =>
        rect.left < other.right &&
        rect.right > other.left &&
        rect.top < other.bottom &&
        rect.bottom > other.top;
      const countIntersections = (rect, rects) =>
        rects.reduce((count, other) => count + (rectIntersects(rect, other) ? 1 : 0), 0);
      const clampRect = (rect) => ({
        ...rect,
        outside:
          rect.left < chartArea.left + 4 ||
          rect.right > chartArea.right - 4 ||
          rect.top < chartArea.top + 4 ||
          rect.bottom > chartArea.bottom - 4,
      });
      ctx.save();
      ctx.font = "700 10px Inter, sans-serif";
      ctx.textBaseline = "middle";
      orderedElements.forEach(({ element, raw }) => {
        const label = getDistributionLabel(raw);
        if (!label) {
          return;
        }
        const pointX = element.x;
        const pointY = element.y;
        const textWidth = Math.min(74, ctx.measureText(label).width);
        const pillWidth = textWidth + 12;
        const pillHeight = 17;
        let best = null;
        candidates.forEach((candidate, candidateIndex) => {
          const centerX =
            candidate.align === "left"
              ? pointX + candidate.x + pillWidth / 2
              : candidate.align === "right"
                ? pointX + candidate.x - pillWidth / 2
                : pointX + candidate.x;
          const centerY = pointY + candidate.y;
          const unclampedLeft = centerX - pillWidth / 2;
          const unclampedTop = centerY - pillHeight / 2;
          const adjustedLeft = Math.max(chartArea.left + 4, Math.min(unclampedLeft, chartArea.right - pillWidth - 4));
          const adjustedTop = Math.max(chartArea.top + 4, Math.min(unclampedTop, chartArea.bottom - pillHeight - 4));
          const rect = clampRect({
            left: adjustedLeft,
            right: adjustedLeft + pillWidth,
            top: adjustedTop,
            bottom: adjustedTop + pillHeight,
            centerX,
            centerY,
            candidate,
            wasShifted: Math.abs(adjustedLeft - unclampedLeft) > 0.5 || Math.abs(adjustedTop - unclampedTop) > 0.5,
          });
          const labelOverlapPenalty = countIntersections(rect, occupiedRects) * 6000;
          const bubbleOverlapPenalty = countIntersections(rect, pointObstacles) * 4500;
          const outsidePenalty = rect.outside || rect.wasShifted ? 500 : 0;
          const score =
            labelOverlapPenalty +
            bubbleOverlapPenalty +
            outsidePenalty +
            candidateIndex * 4 +
            Math.abs(candidate.y) +
            Math.abs(candidate.x) * 0.35;
          if (!best || score < best.score) {
            best = { ...rect, score };
          }
        });
        if (!best) {
          return;
        }
        const rect = {
          left: best.left,
          right: best.right,
          top: best.top,
          bottom: best.bottom,
          centerX: best.left + pillWidth / 2,
          centerY: best.top + pillHeight / 2,
        };
        occupiedRects.push(rect);
        const needsLeader = Math.hypot(rect.centerX - pointX, rect.centerY - pointY) > 19;
        if (needsLeader) {
          ctx.strokeStyle = "rgba(75, 85, 99, 0.42)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(pointX, pointY);
          ctx.lineTo(rect.centerX, rect.centerY);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
        ctx.strokeStyle = getRotationHistoryBorderColor(raw.classification);
        ctx.lineWidth = 0.8;
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(rect.left, rect.top, pillWidth, pillHeight, 8);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(rect.left, rect.top, pillWidth, pillHeight);
          ctx.strokeRect(rect.left, rect.top, pillWidth, pillHeight);
        }
        ctx.fillStyle = "#1f2937";
        ctx.textAlign = "center";
        ctx.fillText(label, rect.centerX, rect.centerY + 0.5, pillWidth - 8);
      });
      ctx.restore();
    },
  };
  const alignmentPlugin = {
    id: "briefingRotationDistributionGuides",
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea, scales } = chart;
      if (!chartArea || !scales.x || !scales.y) {
        return;
      }
      ctx.save();
      const zeroX = scales.x.getPixelForValue(0);
      const negativeZoneRight = Math.max(chartArea.left, Math.min(zeroX, chartArea.right));
      const positiveZoneLeft = Math.max(chartArea.left, Math.min(zeroX, chartArea.right));
      if (negativeZoneRight > chartArea.left) {
        ctx.fillStyle = "rgba(248, 113, 113, 0.075)";
        ctx.fillRect(chartArea.left, chartArea.top, negativeZoneRight - chartArea.left, chartArea.bottom - chartArea.top);
      }
      if (positiveZoneLeft < chartArea.right) {
        ctx.fillStyle = "rgba(22, 163, 74, 0.075)";
        ctx.fillRect(positiveZoneLeft, chartArea.top, chartArea.right - positiveZoneLeft, chartArea.bottom - chartArea.top);
      }
      if (zeroX >= chartArea.left && zeroX <= chartArea.right) {
        ctx.strokeStyle = "rgba(31, 41, 55, 0.40)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(zeroX, chartArea.top);
        ctx.lineTo(zeroX, chartArea.bottom);
        ctx.stroke();
      }
      const zeroY = scales.y.getPixelForValue(0);
      if (zeroY >= chartArea.top && zeroY <= chartArea.bottom) {
        ctx.strokeStyle = "rgba(31, 41, 55, 0.22)";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(chartArea.left, zeroY);
        ctx.lineTo(chartArea.right, zeroY);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(31, 41, 55, 0.34)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, chartArea.bottom);
      ctx.lineTo(chartArea.right, chartArea.top);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(31, 41, 55, 0.62)";
      ctx.font = "700 11px Inter, sans-serif";
      ctx.textAlign = "right";
      const guideLabel =
        distribution.xAxis?.kind === "score"
          ? `Score-${distribution.benchmark?.label ?? "QQQ"} alignment`
          : `${distribution.xAxis?.label ?? ""} rel return-${distribution.benchmark?.label ?? "QQQ"} alignment`;
      ctx.fillText(guideLabel, chartArea.right - 4, chartArea.top + 14);
      ctx.restore();
    },
  };

  const chart = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Rotation sectors",
          data: distribution.points,
          borderColor: (context) => getRotationHistoryBorderColor(context.raw?.classification),
          backgroundColor: (context) => getRotationHistoryShadeColor(context.raw?.classification),
          borderWidth: 1.7,
          pointRadius: (context) => getDistributionPointRadius(context.raw),
          pointHoverRadius: (context) => getDistributionPointRadius(context.raw) + 2,
          pointHitRadius: (context) => getDistributionPointRadius(context.raw) + 2,
        },
      ],
    },
    plugins: [alignmentPlugin, labelPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      interaction: { mode: "nearest", intersect: true },
      hover: { mode: "nearest", intersect: true },
      onClick: (_event, elements) => {
        const point = elements?.[0];
        const raw = point ? chart.data.datasets[point.datasetIndex]?.data?.[point.index] : null;
        if (!raw?.key) {
          return;
        }
        state.briefingRotationSectorKey = raw.key;
        render();
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.raw?.label ?? "",
            label: (context) => {
              const item = context.raw ?? {};
              const xAxisMeta = distribution.xAxis ?? getBriefingDistributionXAxisMeta();
              const lines = [
                `${xAxisMeta.kind === "score" ? "Score" : `${xAxisMeta.label} vs ${item.benchmarkLabel ?? distribution.benchmark?.label ?? "QQQ"}`} ${xAxisMeta.kind === "score" ? formatSignedScore(item.x) : formatSignedPercent(item.x)}`,
                `${item.benchmarkLabel ?? distribution.benchmark?.label ?? "QQQ"} ${item.corrWindowLabel ?? distribution.corrWindow?.label ?? "3M"} corr ${formatOneDecimal(Number(item.rawCorrelationPct))}% (${item.sampleSize} sessions)`,
                `${getRotationClassLabel(item.classification)} / ${getRotationClassKorean(item.classification)}`,
              ];
              if (xAxisMeta.kind === "return") {
                lines.push(`Rotation Score ${formatSignedScore(item.score)}`);
                lines.push(`Sector ${item.xAxisLabel ?? ""} ${formatSignedPercent(item.sectorPeriodReturn)}`);
                lines.push(`Benchmark ${item.xAxisLabel ?? ""} ${formatSignedPercent(item.benchmarkReturn)}`);
              } else {
                ["1w", "1m"].forEach((periodKey) => {
                  const sectorReturn = Number(item.returns?.[periodKey]);
                  const benchmarkReturn = getBriefingIndexPeriodReturn(distribution.benchmark?.itemKey, periodKey);
                  const relativeReturn =
                    Number.isFinite(sectorReturn) && Number.isFinite(benchmarkReturn)
                      ? sectorReturn - benchmarkReturn
                      : null;
                  lines.push(`${periodKey.toUpperCase()} vs ${item.benchmarkLabel ?? distribution.benchmark?.label ?? "QQQ"} ${formatSignedPercent(relativeReturn)}`);
                });
              }
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          min: distribution.xMin,
          max: distribution.xMax,
          title: {
            display: true,
            text:
              distribution.xAxis?.kind === "score"
                ? "Rotation Score"
                : `${distribution.xAxis?.title ?? "Relative return"} vs ${distribution.benchmark?.label ?? "QQQ"}`,
            color: "#6b6b64",
          },
          ticks: {
            color: "#8d8d86",
            callback: (value) =>
              distribution.xAxis?.kind === "score" ? formatSignedScore(value) : formatSignedPercent(value),
            maxTicksLimit: 7,
          },
          grid: { color: "rgba(70, 70, 66, 0.12)" },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: -25,
          max: 100,
          title: {
            display: true,
            text: `${distribution.corrWindow?.label ?? "3M"} correlation with ${distribution.benchmark?.label ?? "QQQ"}`,
            color: "#6b6b64",
          },
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${Math.round(value)}%`,
            maxTicksLimit: 7,
          },
          grid: { color: "rgba(70, 70, 66, 0.12)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });
  charts.push(chart);
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

function getMarketRsRowByTicker(ticker) {
  const normalized = String(ticker ?? "").trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return (marketRsData.rows ?? []).find((row) => String(row.ticker ?? "").toUpperCase() === normalized) ?? null;
}

function getBriefingRsTicker(item) {
  const rawCandidates = [
    item?.ticker,
    String(item?.label ?? "").split(/\s+/)[0],
  ];
  const candidates = rawCandidates
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean)
    .flatMap((ticker) => [ticker, ticker.replace(".", "-")]);

  for (const ticker of candidates) {
    const row = getMarketRsRowByTicker(ticker);
    if (row) {
      return row.ticker;
    }
  }
  return "";
}

function getBriefingRsLinkAttrs(item) {
  const ticker = getBriefingRsTicker(item);
  if (!ticker) {
    return "";
  }
  return `data-briefing-rs-ticker="${ticker}" role="button" tabindex="0" aria-label="Open ${ticker} in Market RS"`;
}

function openMarketRsTicker(ticker) {
  const row = getMarketRsRowByTicker(ticker);
  if (!row) {
    return;
  }

  state.tab = "Market";
  state.marketView = "RS";
  state.rsUniverse = "all";
  state.rsFilter = "all";
  state.rsBriefingSector = "all";
  state.rsMarketCapRange = "all";
  state.rsCustomMarketCapMin = "";
  state.rsCustomMarketCapMax = "";
  state.rsSelectedTicker = row.ticker;
  state.query = row.ticker;
  if (searchInput) {
    searchInput.value = row.ticker;
  }

  render();
  requestAnimationFrame(() => {
    usOverviewRoot.querySelector(".market-rs-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
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
          const rsLinkAttrs = getBriefingRsLinkAttrs(item);
          return `
            <article
              class="briefing-tile ${item.tileClass ?? "sm"} ${changeClass}${rsLinkAttrs ? " is-rs-linked" : ""}"
              style="background:${item.mapColor ?? "#f3f4f6"}"
              title="${item.name} / ${formatSignedPercent(item.dayChangePct)}"
              ${rsLinkAttrs}
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
          const oneDayChange = getBriefingOverviewReturn(item, "1d");
          const oneWeekChange = getBriefingOverviewReturn(item, "1w");
          const oneMonthChange = getBriefingOverviewReturn(item, "1m");
          const changeClass = Number(overviewChange) > 0 ? "is-up" : Number(overviewChange) < 0 ? "is-down" : "";
          const sizeClass = getBriefingOverviewSizeClass(sector.items ?? [], item);
          const rsLinkAttrs = getBriefingRsLinkAttrs(item);
          return `
            <article
              class="briefing-tile briefing-tile-overview ${sizeClass} ${changeClass}${rsLinkAttrs ? " is-rs-linked" : ""}"
              style="background:${getBriefingOverviewColor(item, state.briefingMapRange)}"
              ${rsLinkAttrs}
            >
              <span class="briefing-tile-ticker">${item.label}</span>
              <span class="briefing-tile-change">${formatSignedPercent(overviewChange)}</span>
              <div class="briefing-tile-tooltip">
                <strong>${item.name}</strong>
                <span>${sector.label}</span>
                <div class="briefing-tooltip-grid">
                  <span>1D</span><b>${formatSignedPercent(oneDayChange)}</b>
                  <span>1W</span><b>${formatSignedPercent(oneWeekChange)}</b>
                  <span>1M</span><b>${formatSignedPercent(oneMonthChange)}</b>
                  <span>Price</span><b>${formatBriefingPrice(item)}</b>
                  <span>Market Cap</span><b>${formatMarketCapCompact(item.marketCapUsd)}</b>
                </div>
                <small>Color: ${selectedBriefingRangeMeta.label} ${formatSignedPercent(overviewChange)}</small>
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
    { key: "nasdaq", label: "NASDAQ Composite" },
    { key: "nasdaq100", label: "NASDAQ 100 (QQQ)" },
    { key: "sox", label: "필라델피아 반도체 (SOX)" },
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
      const fixedReturnMarkup = [
        { key: "1d", label: "1D" },
        { key: "1w", label: "1W" },
        { key: "1m", label: "1M" },
      ]
        .map((range) => {
          const value = getBriefingIndexReturn(item, range.key);
          return `
            <span class="briefing-index-return-pill">
              <small>${range.label}</small>
              <b class="${getSignedValueClass(value)}">${formatSignedPercent(value)}</b>
            </span>
          `;
        })
        .join("");
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
          <div class="briefing-index-return-grid">${fixedReturnMarkup}</div>
        </article>
      `;
    })
    .join("");
  const fedWatch = briefing.fedWatch ?? null;
  const fedWatchColumns = fedWatch?.columns ?? [];
  const fedWatchRows = fedWatch?.rows ?? [];
  const fedWatchSourceUpdated = fedWatch?.sourceUpdatedAt ? formatFullIsoDate(fedWatch.sourceUpdatedAt) : null;
  const fedWatchRefreshed = fedWatch?.refreshedAt ? formatFullIsoDate(fedWatch.refreshedAt) : null;
  const fedWatchMarkup = fedWatchRows.length
    ? `
      <div class="briefing-fedwatch-scroll">
        <table class="briefing-fedwatch-table">
          <thead>
            <tr>
              <th>Meeting</th>
              ${fedWatchColumns.map((column) => `<th>${column}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${fedWatchRows
              .map((row) => {
                const maxRange = row.maxRange;
                return `
                  <tr>
                    <th>${formatShortIsoDate(row.meetingDate)}</th>
                    ${(row.probabilities ?? [])
                      .map((value, index) => {
                        const range = fedWatchColumns[index];
                        return `<td class="${range === maxRange ? "is-max" : ""}">${formatOneDecimal(value)}%</td>`;
                      })
                      .join("")}
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `
    : '<p class="market-rs-empty">FedWatch data is not available.</p>';

  const rotationSignal = briefing.rotationSignal ?? {};
  const allRotationSectors = rotationSignal.sectors ?? [];
  const rotationSectors = allRotationSectors;
  const rotationHistory = rotationSignal.history ?? {};
  const selectedRotationSectorKey = allRotationSectors.some((sector) => sector.key === state.briefingRotationSectorKey)
    ? state.briefingRotationSectorKey
    : rotationSectors[0]?.key ?? allRotationSectors[0]?.key ?? "";
  state.briefingRotationSectorKey = selectedRotationSectorKey;
  const selectedRotationSector = allRotationSectors.find((sector) => sector.key === selectedRotationSectorKey) ?? rotationSectors[0] ?? null;
  const selectedRotationHistory = rotationHistory[selectedRotationSectorKey] ?? [];
  const rotationHistoryLatest = selectedRotationHistory.at(-1) ?? {};
  const selectedDistributionBenchmark = getBriefingDistributionBenchmarkMeta(state.briefingRotationDistributionBenchmark);
  state.briefingRotationDistributionBenchmark = selectedDistributionBenchmark.key;
  const selectedDistributionXAxis = getBriefingDistributionXAxisMeta(state.briefingRotationDistributionXAxis);
  state.briefingRotationDistributionXAxis = selectedDistributionXAxis.key;
  const selectedDistributionCorrWindow = getBriefingDistributionCorrWindowMeta(state.briefingRotationDistributionCorrWindow);
  state.briefingRotationDistributionCorrWindow = selectedDistributionCorrWindow.key;
  const rotationDistribution = buildBriefingRotationDistribution(
    allRotationSectors,
    rotationHistory,
    selectedDistributionBenchmark.key,
    selectedDistributionXAxis.key,
    selectedDistributionCorrWindow.key,
  );
  const highBenchmarkCouplingCount = rotationDistribution.points.filter((point) => point.correlation >= 0.65).length;
  const independentLeaderCount = rotationDistribution.points.filter((point) => point.x > 0 && point.correlation < 0.35).length;
  const averageBenchmarkCorrelation = rotationDistribution.points.length
    ? rotationDistribution.points.reduce((sum, point) => sum + point.correlation, 0) / rotationDistribution.points.length
    : null;
  const distributionBenchmarkControls = BRIEFING_ROTATION_DISTRIBUTION_BENCHMARKS.map(
    (benchmark) => `
      <button
        type="button"
        class="briefing-rotation-distribution-benchmark${selectedDistributionBenchmark.key === benchmark.key ? " active" : ""}"
        data-briefing-rotation-distribution-benchmark="${benchmark.key}"
      >
        ${benchmark.label}
      </button>
    `,
  ).join("");
  const distributionXAxisControls = BRIEFING_ROTATION_DISTRIBUTION_X_AXES.map(
    (axis) => `
      <button
        type="button"
        class="briefing-rotation-distribution-benchmark${selectedDistributionXAxis.key === axis.key ? " active" : ""}"
        data-briefing-rotation-distribution-x-axis="${axis.key}"
      >
        ${axis.label}
      </button>
    `,
  ).join("");
  const distributionCorrWindowControls = BRIEFING_ROTATION_DISTRIBUTION_CORR_WINDOWS.map(
    (windowMeta) => `
      <button
        type="button"
        class="briefing-rotation-distribution-benchmark${selectedDistributionCorrWindow.key === windowMeta.key ? " active" : ""}"
        data-briefing-rotation-distribution-corr-window="${windowMeta.key}"
      >
        ${windowMeta.label}
      </button>
    `,
  ).join("");
  const distributionXAxisDescription =
    selectedDistributionXAxis.kind === "score"
      ? `X축은 기존 가중 Rotation Score입니다. Score = QQQ 대비 초과수익률 가중합이며 섹터 수익률은 시총가중 50% + 동일가중 50% 혼합입니다.`
      : `X축은 ${selectedDistributionXAxis.label} 섹터 혼합수익률에서 ${selectedDistributionBenchmark.label} ${selectedDistributionXAxis.label} 수익률을 뺀 초과수익률입니다.`;
  const distributionXAxisLabel =
    selectedDistributionXAxis.kind === "score"
      ? "Rotation Score"
      : `${selectedDistributionXAxis.label} vs ${selectedDistributionBenchmark.label}`;
  const distributionMetricDescription =
    selectedDistributionXAxis.kind === "score"
      ? "Score 선택 시 가로축은 자체 로테이션 점수입니다. 1W~6M 선택 시 가로축은 선택 지수 대비 해당 기간 초과수익률입니다."
      : `${selectedDistributionXAxis.label} 선택 중입니다. 가로축 0%보다 오른쪽이면 해당 기간에 ${selectedDistributionBenchmark.label}보다 강했다는 뜻입니다.`;
  const rotationDistributionMarkup = rotationDistribution.points.length
    ? `
      <article class="briefing-rotation-distribution-panel">
        <div class="briefing-rotation-distribution-head">
          <div>
            <strong>Rotation Score Distribution</strong>
            <span>${distributionXAxisDescription} Y축은 ${selectedDistributionCorrWindow.label}=${selectedDistributionCorrWindow.sessions}거래일 ${selectedDistributionBenchmark.label} 일간수익률 상관계수입니다. 점을 누르면 해당 섹터 히스토리로 이동합니다.</span>
          </div>
          <div class="briefing-rotation-distribution-side">
            <div class="briefing-rotation-distribution-control-block">
              <div class="briefing-rotation-distribution-control-label">
                <span>비교 지수</span>
                <em>Y축 상관계수와 기간별 초과수익률 기준</em>
              </div>
              <div class="briefing-rotation-distribution-controls">
                ${distributionBenchmarkControls}
              </div>
            </div>
            <div class="briefing-rotation-distribution-control-block">
              <div class="briefing-rotation-distribution-control-label">
                <span>상관기간</span>
                <em>섹터와 선택 지수의 일간수익률 동행성 측정 기간</em>
              </div>
              <div class="briefing-rotation-distribution-controls is-corr">
                ${distributionCorrWindowControls}
              </div>
            </div>
            <div class="briefing-rotation-distribution-control-block is-axis">
              <div class="briefing-rotation-distribution-control-label">
                <span>가로축</span>
                <em>Score 또는 기간별 상대성과 선택</em>
              </div>
              <div class="briefing-rotation-distribution-controls is-axis">
                ${distributionXAxisControls}
              </div>
            </div>
            <div class="briefing-rotation-distribution-stats">
              <span><b>${formatOneDecimal(Number(averageBenchmarkCorrelation) * 100)}%</b> avg corr</span>
              <span><b>${highBenchmarkCouplingCount}</b> ${selectedDistributionBenchmark.couplingLabel}</span>
              <span><b>${independentLeaderCount}</b> independent positives</span>
            </div>
          </div>
        </div>
        <div class="briefing-rotation-distribution-explainer">
          <span><b>비교 지수</b>${selectedDistributionBenchmark.description}</span>
          <span><b>상관기간</b>${selectedDistributionCorrWindow.description}</span>
          <span><b>가로축</b>${distributionMetricDescription}</span>
        </div>
        <div class="briefing-rotation-distribution-guide">
          <span><b>-100%</b> ${selectedDistributionBenchmark.label}와 반대로 움직인다는 뜻입니다. 방어/헤지 성격이 강하지만 지속성 확인이 필요합니다.</span>
          <span><b>0%</b> 같이 움직인 정도가 낮다는 뜻입니다. Rotation Score가 양수면 분산효과가 있는 주도 후보로 볼 수 있습니다.</span>
          <span><b>100%</b> ${selectedDistributionBenchmark.label}와 거의 같이 움직인다는 뜻입니다. 지수 베타가 높아 분산효과는 낮습니다.</span>
        </div>
        <div class="briefing-rotation-distribution-legend">
          <span><i class="is-leading"></i>주도</span>
          <span><i class="is-improving"></i>개선</span>
          <span><i class="is-weakening"></i>둔화</span>
          <span><i class="is-lagging"></i>소외</span>
          <em>배경색은 ${distributionXAxisLabel} 0 기준입니다. 붉은 영역은 음수, 초록 영역은 양수입니다. 대각선은 회귀선이 아니라 X축 방향과 ${selectedDistributionBenchmark.label} 연동성의 정렬 정도를 보는 시각 보조선입니다.</em>
        </div>
        <div class="briefing-rotation-distribution-chart-wrap">
          <canvas data-briefing-rotation-distribution></canvas>
        </div>
      </article>
    `
    : "";
  const rotationHistoryLegend = ["Leading", "Improving", "Weakening", "Lagging"]
    .map(
      (classification) => `
        <span class="briefing-rotation-history-legend-item">
          <i style="background:${getRotationHistoryShadeColor(classification)};border-color:${getRotationHistoryBorderColor(classification)}"></i>
          ${getRotationClassLabel(classification)}
        </span>
      `,
    )
    .join("");
  const rotationSectorMarkup = rotationSectors
    .map(
      (sector) => `
        <button
          type="button"
          class="briefing-rotation-sector is-${String(sector.classification ?? "neutral").toLowerCase()}${sector.key === selectedRotationSectorKey ? " active" : ""}"
          data-rotation-sector="${sector.key}"
        >
          <div class="briefing-rotation-sector-head">
            <strong>${sector.label}</strong>
            <span>${getRotationClassKorean(sector.classification)}</span>
          </div>
          <b class="${getSignedValueClass(sector.score)}">Score ${formatSignedScore(sector.score)}</b>
          <div class="briefing-rotation-sector-metrics">
            <span class="${getSignedValueClass(sector.excessReturns?.["1w"])}">1W ${formatSignedPercent(sector.excessReturns?.["1w"])}</span>
            <span class="${getSignedValueClass(sector.excessReturns?.["2w"])}">2W ${formatSignedPercent(sector.excessReturns?.["2w"])}</span>
            <span class="${getSignedValueClass(sector.excessReturns?.["1m"])}">1M ${formatSignedPercent(sector.excessReturns?.["1m"])}</span>
          </div>
        </button>
      `,
    )
    .join("");
  const rotationDailyLeaders = rotationSignal.dailyLeaders ?? [];
  const rotationDailyLeaderMarkup = rotationDailyLeaders
    .map((sector, index) => {
      const topNames = (sector.top ?? [])
        .map((item) => `${item.ticker} ${formatSignedPercent(item.returns?.["1d"] ?? item.overviewReturns?.["1d"] ?? item.excessReturns?.["1d"])}`)
        .join(" · ");
      return `
        <button
          type="button"
          class="briefing-daily-leader-card is-${String(sector.classification ?? "neutral").toLowerCase()}${sector.key === selectedRotationSectorKey ? " active" : ""}"
          data-rotation-sector="${sector.key}"
          data-rotation-scroll-history="true"
        >
          <span>#${index + 1}</span>
          <div>
            <strong>${sector.label}</strong>
            <small class="briefing-daily-stock-label">섹터 상위 종목 수익률</small>
            <small>${topNames || getRotationClassKorean(sector.classification)}</small>
          </div>
          <b class="${getSignedValueClass(sector.excessReturn1d)}">${formatSignedPercent(sector.excessReturn1d)} <em>(vs QQQ)</em></b>
        </button>
      `;
    })
    .join("");
  const rotationDailyLaggards = rotationSignal.dailyLaggards ?? [];
  const rotationDailyLaggardMarkup = rotationDailyLaggards
    .map((sector, index) => {
      const bottomNames = (sector.bottom ?? sector.top ?? [])
        .map((item) => `${item.ticker} ${formatSignedPercent(item.returns?.["1d"] ?? item.overviewReturns?.["1d"] ?? item.excessReturns?.["1d"])}`)
        .join(" · ");
      return `
        <button
          type="button"
          class="briefing-daily-leader-card is-${String(sector.classification ?? "neutral").toLowerCase()} is-laggard${sector.key === selectedRotationSectorKey ? " active" : ""}"
          data-rotation-sector="${sector.key}"
          data-rotation-scroll-history="true"
        >
          <span>#${index + 1}</span>
          <div>
            <strong>${sector.label}</strong>
            <small class="briefing-daily-stock-label">섹터 하위 종목 수익률</small>
            <small>${bottomNames || getRotationClassKorean(sector.classification)}</small>
          </div>
          <b class="${getSignedValueClass(sector.excessReturn1d)}">${formatSignedPercent(sector.excessReturn1d)} <em>(vs QQQ)</em></b>
        </button>
      `;
    })
    .join("");
  const rotationClassImprovers = allRotationSectors
    .map((sector) => {
      const history = rotationHistory[sector.key] ?? [];
      const previous = history.length >= 2 ? history[history.length - 2] : null;
      const latest = history.at(-1) ?? null;
      const fromRank = getRotationClassRank(previous?.classification);
      const toRank = getRotationClassRank(latest?.classification ?? sector.classification);
      return {
        ...sector,
        previousClassification: previous?.classification,
        latestClassification: latest?.classification ?? sector.classification,
        latestScore: latest?.score ?? sector.score,
        improvementSteps: toRank - fromRank,
        latestDate: latest?.date,
      };
    })
    .filter((sector) => sector.improvementSteps > 0)
    .sort((a, b) => {
      const stepDiff = Number(b.improvementSteps) - Number(a.improvementSteps);
      if (stepDiff !== 0) {
        return stepDiff;
      }
      const scoreA = Number.isFinite(Number(a.latestScore)) ? Number(a.latestScore) : -999;
      const scoreB = Number.isFinite(Number(b.latestScore)) ? Number(b.latestScore) : -999;
      return scoreB - scoreA;
    });
  const rotationClassImproverMarkup = rotationClassImprovers
    .map(
      (sector, index) => `
        <article class="briefing-rotation-improver-card is-${String(sector.latestClassification ?? "neutral").toLowerCase()}">
          <span>#${index + 1}</span>
          <div>
            <strong>${sector.label}</strong>
            <small>${getRotationClassKorean(sector.previousClassification)} -> ${getRotationClassKorean(sector.latestClassification)} · ${formatShortIsoDate(sector.latestDate)}</small>
          </div>
          <b class="${getSignedValueClass(sector.latestScore)}">${formatSignedScore(sector.latestScore)}</b>
        </article>
      `,
    )
    .join("");
  const rotationHistoryMarkup = selectedRotationSector && selectedRotationHistory.length
    ? `
      <article class="briefing-rotation-history-panel">
        <div class="briefing-rotation-history-head">
          <div>
            <strong>${selectedRotationSector.label}</strong>
            <span>${formatShortIsoDate(selectedRotationHistory[0]?.date)} - ${formatShortIsoDate(rotationHistoryLatest.date)}</span>
          </div>
          <div class="briefing-rotation-history-stats">
            <b class="${getSignedValueClass(rotationHistoryLatest.score)}">Score ${formatSignedScore(rotationHistoryLatest.score)}</b>
            <span>${getRotationClassLabel(rotationHistoryLatest.classification)} / ${getRotationClassKorean(rotationHistoryLatest.classification)}</span>
          </div>
        </div>
        <div class="briefing-rotation-history-legend">${rotationHistoryLegend}</div>
        <div class="briefing-rotation-history-chart-wrap">
          <canvas data-briefing-rotation-history></canvas>
        </div>
      </article>
    `
    : `
      <article class="briefing-rotation-history-panel">
        <p class="market-rs-empty">선택한 섹터의 Rotation Score 히스토리가 아직 없습니다.</p>
      </article>
    `;
  const rotationQuadrantMarkup = ["Leading", "Improving", "Weakening", "Lagging"]
    .map((classification) => {
      const sectors = allRotationSectors.filter((sector) => sector.classification === classification);
      return `
        <article class="briefing-rotation-quadrant is-${classification.toLowerCase()}">
          <div class="briefing-rotation-quadrant-head">
            <strong>${getRotationClassLabel(classification)}</strong>
            <span>${getRotationClassKorean(classification)} ${sectors.length}</span>
          </div>
          <span class="briefing-rotation-rule">${getRotationClassRule(classification)}</span>
          <p>${sectors.map((sector) => sector.label).join(" · ") || "해당 섹터 없음"}</p>
        </article>
      `;
    })
    .join("");
  const rotationCandidates = rotationSignal.candidates ?? {};
  const rotationCandidateMarkup = `
    <article class="briefing-rotation-candidate-card">
      <div class="briefing-rotation-candidate-head">
        <strong>Buy Watch</strong>
        <span>섹터와 종목 모두 QQQ 대비 강세</span>
      </div>
      <div class="briefing-rotation-name-list">
        ${renderRotationCandidateList(rotationCandidates.buyWatch, "아직 뚜렷한 편입 후보가 없습니다.")}
      </div>
    </article>
    <article class="briefing-rotation-candidate-card">
      <div class="briefing-rotation-candidate-head">
        <strong>Early Rotation</strong>
        <span>단기 개선, 중기 회복 초입</span>
      </div>
      <div class="briefing-rotation-name-list">
        ${renderRotationCandidateList(rotationCandidates.earlyRotation, "초기 로테이션 후보가 없습니다.")}
      </div>
    </article>
    <article class="briefing-rotation-candidate-card">
      <div class="briefing-rotation-candidate-head">
        <strong>Trim Watch</strong>
        <span>QQQ 대비 약세 전환 경계</span>
      </div>
      <div class="briefing-rotation-name-list">
        ${renderRotationCandidateList(rotationCandidates.trimWatch, "축소 경계 후보가 없습니다.")}
      </div>
    </article>
  `;

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
          </div>
        </div>
        <div class="briefing-legend">
          <span>${briefing.mapLegend?.positive ?? ""}</span>
          <span>${briefing.mapLegend?.negative ?? ""}</span>
          <span>${briefing.mapLegend?.size ?? ""}</span>
        </div>
      </article>

      <section class="briefing-market-row">
      <article class="us-panel briefing-index-panel">
        <div class="us-section-head">
          <div>
            <h2>미국 주요 지수</h2>
            <p>다우 (DIA), S&amp;P 500 (SPY), 나스닥 100 (QQQ), 러셀 2000 (IWM)의 최신 레벨과 등락을 바로 확인합니다.</p>
          </div>
        </div>
        <div class="briefing-index-grid">${indexMarkup}</div>
      </article>

      <article class="us-panel briefing-fedwatch-panel">
        <div class="us-section-head">
          <div>
            <h2>CME FedWatch</h2>
            <p>Conditional meeting probabilities by target rate range.</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${fedWatch?.asOf ?? "-"}</span>
          </div>
        </div>
        ${fedWatchMarkup}
        <div class="briefing-fedwatch-source">
          <span>Source: ${fedWatch?.source ?? "CME FedWatch"}${fedWatchSourceUpdated ? ` · source updated ${fedWatchSourceUpdated}` : ""}${fedWatchRefreshed ? ` · refreshed ${fedWatchRefreshed}` : ""}</span>
          ${fedWatch?.sourceUrl ? `<a href="${fedWatch.sourceUrl}" target="_blank" rel="noreferrer">Open CME</a>` : ""}
        </div>
        ${fedWatch?.sourceNote ? `<p class="briefing-fedwatch-note">${fedWatch.sourceNote}</p>` : ""}
      </article>
      </section>

      <article class="us-panel briefing-rotation-panel">
        <div class="us-section-head">
          <div>
            <h2>Rotation Signal</h2>
            <p>US 브리핑 종목군을 NASDAQ 100 (QQQ) 대비 초과수익률로 비교해 포트 편입 후보와 약화 후보를 추적합니다.</p>
            <p class="briefing-rotation-formula">Score = QQQ 대비 초과수익률 가중합: 1D 20% · 1W 40% · 2W 20% · 1M 20%. 섹터 수익률은 시총가중 50% + 동일가중 50% 혼합.</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">Benchmark ${rotationSignal.benchmark?.label ?? "QQQ"}</span>
          </div>
        </div>
        <div class="briefing-daily-leader-panel">
          <div class="briefing-daily-leader-head">
            <strong>Yesterday Sector Leaders</strong>
            <span>섹터 숫자: 1D vs QQQ 초과수익률 · 아래 종목: 실제 1D 수익률</span>
          </div>
          <div class="briefing-daily-leader-grid">${rotationDailyLeaderMarkup || '<p class="market-rs-empty">전일 초과수익률 데이터를 아직 계산하지 못했습니다.</p>'}</div>
          <div class="briefing-daily-leader-head is-laggard">
            <strong>Yesterday Sector Laggards</strong>
            <span>섹터 숫자: 1D vs QQQ 초과수익률 · 아래 종목: 실제 1D 수익률</span>
          </div>
          <div class="briefing-daily-leader-grid">${rotationDailyLaggardMarkup || '<p class="market-rs-empty">전일 약세 섹터 데이터를 아직 계산하지 못했습니다.</p>'}</div>
          <div class="briefing-daily-leader-head is-improver">
            <strong>Daily Rotation Improvers</strong>
            <span>Classification improved versus the previous trading day, sorted by improvement and score</span>
          </div>
          <div class="briefing-rotation-improver-grid">${rotationClassImproverMarkup || '<p class="market-rs-empty">No sectors improved classification versus the previous trading day.</p>'}</div>        </div>
        <div class="briefing-rotation-grid">${rotationSectorMarkup}</div>
        ${rotationDistributionMarkup}
        ${rotationHistoryMarkup}
        <div class="briefing-rotation-bottom">
          <div class="briefing-rotation-quadrants">${rotationQuadrantMarkup}</div>
          <div class="briefing-rotation-candidates">${rotationCandidateMarkup}</div>
        </div>
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
  usOverviewRoot.querySelectorAll("[data-briefing-rs-ticker]").forEach((element) => {
    element.addEventListener("click", () => {
      openMarketRsTicker(element.dataset.briefingRsTicker);
    });
    element.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      openMarketRsTicker(element.dataset.briefingRsTicker);
    });
  });
  usOverviewRoot.querySelectorAll("[data-rotation-sector]").forEach((button) => {
    button.addEventListener("click", () => {
      state.briefingRotationSectorKey = button.dataset.rotationSector || "";
      const shouldScrollHistory = button.dataset.rotationScrollHistory === "true";
      render();
      if (shouldScrollHistory) {
        requestAnimationFrame(() => {
          document.querySelector(".briefing-rotation-history-panel")?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }
    });
  });
  usOverviewRoot.querySelectorAll("[data-briefing-rotation-distribution-benchmark]").forEach((button) => {
    button.addEventListener("click", () => {
      state.briefingRotationDistributionBenchmark = button.dataset.briefingRotationDistributionBenchmark || "qqq";
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-briefing-rotation-distribution-x-axis]").forEach((button) => {
    button.addEventListener("click", () => {
      state.briefingRotationDistributionXAxis = button.dataset.briefingRotationDistributionXAxis || "score";
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-briefing-rotation-distribution-corr-window]").forEach((button) => {
    button.addEventListener("click", () => {
      state.briefingRotationDistributionCorrWindow = button.dataset.briefingRotationDistributionCorrWindow || "3m";
      render();
    });
  });
  const rotationHistoryCanvas = usOverviewRoot.querySelector("canvas[data-briefing-rotation-history]");
  if (rotationHistoryCanvas && selectedRotationSector && selectedRotationHistory.length) {
    createBriefingRotationHistoryChart(rotationHistoryCanvas, selectedRotationSector, selectedRotationHistory);
  }
  const rotationDistributionCanvas = usOverviewRoot.querySelector("canvas[data-briefing-rotation-distribution]");
  if (rotationDistributionCanvas && rotationDistribution.points.length) {
    createBriefingRotationDistributionChart(rotationDistributionCanvas, rotationDistribution);
  }
}

function formatRsNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
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

function formatAtrPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(2)}%`;
}

function formatAtrMultiple(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}x`;
}

function formatSignedSigma(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}σ`;
}

function formatDollarPrice(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  return `$${Number(value).toFixed(2)}`;
}

function getExtensionZoneLabel(zone) {
  if (zone === "extreme") {
    return "Extreme";
  }
  if (zone === "stretched") {
    return "Stretched";
  }
  if (zone === "watch") {
    return "Watch";
  }
  if (zone === "normal") {
    return "Normal";
  }
  return "N/A";
}

function renderExtensionTick(label, value, maxRange) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(maxRange)) || Number(maxRange) <= 0) {
    return "";
  }
  const position = Math.max(0, Math.min(100, ((Number(value) + Number(maxRange)) / (Number(maxRange) * 2)) * 100));
  return `<span class="market-rs-extension-tick" style="left:${position}%"><i></i><b>${label}</b></span>`;
}

function renderMarketRsExtensionGauge(metric) {
  if (!metric || !Number.isFinite(Number(metric.atrMultiple))) {
    return "";
  }
  const atrPct = Number(metric.atrPct);
  const atrLabel = Number.isFinite(atrPct)
    ? { label: "ATR%", value: formatAtrPercent(atrPct) }
    : { label: "ATR", value: formatDollarPrice(metric.atr) };
  const thresholds = metric.sigmaThresholds ?? {};
  const sigma1 = Number(thresholds["1"]);
  const sigma2 = Number(thresholds["2"]);
  const sigma3 = Number(thresholds["3"]);
  const atrMultiple = Number(metric.atrMultiple);
  const maxRange = Math.max(
    Number.isFinite(sigma3) ? sigma3 * 1.15 : 4,
    Math.abs(atrMultiple) * 1.15,
    1,
  );
  const markerPosition = Math.max(0, Math.min(100, ((atrMultiple + maxRange) / (maxRange * 2)) * 100));
  const ticks = [
    renderExtensionTick("-3σ", -sigma3, maxRange),
    renderExtensionTick("-2σ", -sigma2, maxRange),
    renderExtensionTick("-1σ", -sigma1, maxRange),
    renderExtensionTick("0", 0, maxRange),
    renderExtensionTick("+1σ", sigma1, maxRange),
    renderExtensionTick("+2σ", sigma2, maxRange),
    renderExtensionTick("+3σ", sigma3, maxRange),
  ].join("");

  return `
    <article class="market-rs-extension-card is-${metric.zone ?? "na"}">
      <div class="market-rs-extension-head">
        <div>
          <strong>${metric.label ?? "-"}</strong>
          <span>${metric.direction === "below" ? "Below anchor" : "Above anchor"}</span>
        </div>
        <b>${getExtensionZoneLabel(metric.zone)}</b>
      </div>
      <div class="market-rs-extension-scale">
        <div class="market-rs-extension-track">
          ${ticks}
          <span class="market-rs-extension-marker" style="left:${markerPosition}%"></span>
        </div>
      </div>
      <div class="market-rs-extension-stats">
        <span>ATR Multiple <strong>${formatAtrMultiple(metric.atrMultiple)}</strong></span>
        <span>Gap <strong>${formatSignedPercent(metric.deviationPct)}</strong></span>
        <span>Sigma <strong>${formatSignedSigma(metric.signedSigma)}</strong></span>
        <span>Anchor <strong>${formatDollarPrice(metric.anchor)}</strong></span>
        <span>${atrLabel.label} <strong>${atrLabel.value}</strong></span>
      </div>
    </article>
  `;
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

function formatLargeNumber(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  if (Math.abs(numeric) >= 1_000_000_000) {
    return `${(numeric / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(numeric) >= 1_000_000) {
    return `${(numeric / 1_000_000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(numeric);
}

function formatRsFinancialUsd(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric < 0 ? "-" : "";
  const absolute = Math.abs(numeric);
  if (absolute >= 1_000_000_000) {
    return `${sign}$${(absolute / 1_000_000_000).toFixed(1)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${sign}$${(absolute / 1_000_000).toFixed(0)}M`;
  }
  return `${sign}$${absolute.toFixed(0)}`;
}

function formatRsFinancialPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
}

function formatRsFinancialMargin(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  return `${Number(value).toFixed(1)}%`;
}

function formatRsFinancialPp(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}pp`;
}

function formatRsFinancialEps(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric < 0 ? "-" : "";
  return `${sign}$${Math.abs(numeric).toFixed(2)}`;
}

function formatRsFinancialPeriodRange(start, end) {
  const startText = formatShortIsoDate(start);
  const endText = formatShortIsoDate(end);
  if (startText && endText) {
    return `${startText} - ${endText}`;
  }
  return startText || endText || "-";
}

function renderMarketRsFinancials(row) {
  if (!row) {
    return "";
  }

  const ticker = row.ticker;
  const isFinancialsCovered = Boolean(row.memberships?.sp500 || row.memberships?.nasdaq100);
  const item = marketRsFinancialsData.financials?.[ticker];
  const updatedAt = marketRsFinancialsData.updatedAt ? formatKstDateTime(marketRsFinancialsData.updatedAt) : "";
  const scopeText = marketRsFinancialsData.scope?.basis ?? "SEC GAAP/XBRL proxy.";

  if (!isFinancialsCovered) {
    return `
      <div class="market-rs-financial-panel">
        <div class="market-rs-financial-head">
          <strong>Quarterly Financials</strong>
          <span>S&P 500 + NASDAQ 100 coverage</span>
        </div>
        <p class="market-rs-empty">Financials are currently available for S&P 500 and NASDAQ 100 names.</p>
      </div>
    `;
  }

  if (!item?.quarters?.length) {
    return `
      <div class="market-rs-financial-panel">
        <div class="market-rs-financial-head">
          <strong>Quarterly Financials</strong>
          <span>${updatedAt ? `Updated ${updatedAt}` : "SEC EDGAR"}</span>
        </div>
        <p class="market-rs-empty">Recent quarterly financials were not available from SEC companyfacts for this ticker.</p>
      </div>
    `;
  }

  const rows = item.quarters
    .map((quarter) => `
      <tr>
        <td>${quarter.period ?? "-"}</td>
        <td>${formatRsFinancialPeriodRange(quarter.periodStart, quarter.periodEnd)}</td>
        <td>${formatRsFinancialUsd(quarter.revenue)}</td>
        <td><span class="${getSignedValueClass(quarter.revenueYoyPct)}">${formatRsFinancialPercent(quarter.revenueYoyPct)}</span></td>
        <td>${formatRsFinancialMargin(quarter.grossMarginPct)}</td>
        <td>${formatRsFinancialMargin(quarter.operatingMarginPct)}</td>
        <td><span class="${getSignedValueClass(quarter.operatingMarginYoyPp)}">${formatRsFinancialPp(quarter.operatingMarginYoyPp)}</span></td>
        <td>${formatRsFinancialEps(quarter.epsDiluted)}</td>
        <td>${formatRsFinancialUsd(quarter.ocf)}</td>
        <td>${formatRsFinancialUsd(quarter.fcf)}</td>
      </tr>
    `)
    .join("");

  return `
    <div class="market-rs-financial-panel">
      <div class="market-rs-financial-head">
        <div>
          <strong>Quarterly Financials</strong>
          <p>Latest 8 quarters. Revenue YoY / OPM YoY pp included.</p>
        </div>
        <span>${updatedAt ? `Updated ${updatedAt}` : "SEC EDGAR"}</span>
      </div>
      <div class="market-rs-financial-table-wrap">
        <table class="market-rs-financial-table">
          <thead>
            <tr>
              <th>Quarter</th>
              <th>FY Dates</th>
              <th>Revenue</th>
              <th>Rev YoY</th>
              <th>GPM</th>
              <th>OPM</th>
              <th>OPM YoY</th>
              <th>EPS</th>
              <th>OCF</th>
              <th>FCF</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="market-rs-financial-note">${scopeText}</p>
    </div>
  `;
}

function normalizeCanslimTicker(ticker) {
  const normalized = String(ticker ?? "").toUpperCase();
  if (normalized === "GOOG") {
    return "GOOGL";
  }
  return normalized;
}

function getMarketCanslimProfile(ticker) {
  const normalized = normalizeCanslimTicker(ticker);
  const direct = marketCanslimData.profiles?.[normalized];
  if (direct) {
    return direct;
  }
  return Object.values(marketCanslimData.profiles ?? {}).find((profile) =>
    (profile.aliases ?? []).map((alias) => String(alias).toUpperCase()).includes(normalized),
  );
}

function getMarketCanslimEarningsProfile(ticker) {
  const normalized = normalizeCanslimTicker(ticker);
  return marketCanslimEarningsData.profiles?.[normalized] ?? marketCanslimEarningsData.profiles?.[ticker] ?? null;
}

function formatCanslimEarningsPercent(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
}

function formatCanslimEarningsValue(value) {
  if (!Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}`;
}

function getCanslimEarningsTone(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  if (numeric > 0) {
    return " is-positive";
  }
  if (numeric < 0) {
    return " is-negative";
  }
  return "";
}

function renderMarketCanslimEarningsSurprise(row) {
  const earningsProfile = getMarketCanslimEarningsProfile(row?.ticker);
  const quarters = earningsProfile?.quarters ?? [];
  const sourceText = "Yahoo Finance / yfinance EPS consensus proxy";
  const coverageText = marketCanslimEarningsData.scope?.tickerCount
    ? `${marketCanslimEarningsData.scope.coveredCount ?? 0}/${marketCanslimEarningsData.scope.tickerCount} EPS coverage names covered`
    : "EPS surprise coverage";
  if (!quarters.length) {
    return `
      <div class="market-rs-financial-panel market-canslim-surprise-panel">
        <div class="market-rs-financial-head">
          <div>
            <strong>Earnings Surprise</strong>
            <p>${sourceText}. ${coverageText}</p>
          </div>
        </div>
        <p class="market-rs-empty">EPS estimate vs actual 데이터가 아직 없습니다.</p>
      </div>
    `;
  }

  const rows = quarters
    .map((quarter) => {
      const eps = quarter.eps ?? {};
      return `
        <tr>
          <td>${quarter.period ?? "-"}</td>
          <td>${formatFullIsoDate(quarter.releaseDate)}</td>
          <td>${formatRsFinancialEps(eps.estimate)}</td>
          <td>${formatRsFinancialEps(eps.actual)}</td>
          <td><span class="${getCanslimEarningsTone(eps.surpriseValue)}">${formatCanslimEarningsValue(eps.surpriseValue)}</span></td>
          <td><span class="${getCanslimEarningsTone(eps.surprisePct)}">${formatCanslimEarningsPercent(eps.surprisePct)}</span></td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="market-rs-financial-panel market-canslim-surprise-panel">
      <div class="market-rs-financial-head">
        <div>
          <strong>Earnings Surprise</strong>
          <p>최근 4개 발표 분기 EPS 실제치 vs 컨센서스만 표시합니다. ${sourceText}. ${coverageText}</p>
        </div>
        <span>Updated ${formatShortIsoDate(marketCanslimEarningsData.updatedAt)}</span>
      </div>
      <div class="market-rs-financial-table-wrap">
        <table class="market-rs-financial-table market-canslim-surprise-table">
          <thead>
            <tr>
              <th>Quarter</th>
              <th>Release</th>
              <th>EPS Est</th>
              <th>EPS Actual</th>
              <th>EPS Beat</th>
              <th>EPS %</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="market-rs-financial-note">${marketCanslimEarningsData.scope?.basis ?? ""} Source: ${sourceText}; GAAP/Non-GAAP is not explicitly classified by this feed.</p>
    </div>
  `;
}

function getCanslimStatusLabel(status) {
  if (status === "pass") {
    return "Pass";
  }
  if (status === "watch") {
    return "Watch";
  }
  if (status === "fail") {
    return "Fail";
  }
  return "Pending";
}

function getCanslimStatusClass(status) {
  if (status === "pass") {
    return " pass";
  }
  if (status === "watch") {
    return " watch";
  }
  if (status === "fail") {
    return " fail";
  }
  return " pending";
}

function buildCanslimC(row, financialItem) {
  const latest = financialItem?.quarters?.[0];
  if (!latest) {
    return {
      key: "C",
      title: "Current Earnings",
      status: "pending",
      summary: "최근 분기 재무 데이터 없음",
      detail: "O'Neil식 C는 최근 분기 EPS YoY가 핵심입니다. 해당 데이터가 들어오면 EPS YoY와 매출 YoY를 같이 판정합니다.",
    };
  }
  const revenueYoy = Number(latest.revenueYoyPct);
  const opmYoy = Number(latest.operatingMarginYoyPp);
  const eps = Number(latest.epsDiluted);
  let status = "pending";
  if (Number.isFinite(eps) && eps > 0 && Number.isFinite(revenueYoy)) {
    if (revenueYoy >= 25 && (!Number.isFinite(opmYoy) || opmYoy >= 0)) {
      status = "pass";
    } else if (revenueYoy >= 10 || (Number.isFinite(opmYoy) && opmYoy > 0)) {
      status = "watch";
    } else {
      status = "fail";
    }
  }
  return {
    key: "C",
    title: "Current Earnings",
    status,
    summary: `${latest.period ?? "Latest"} Rev YoY ${formatRsFinancialPercent(latest.revenueYoyPct)} / EPS ${formatRsFinancialEps(latest.epsDiluted)}`,
    detail:
      "EPS YoY는 아직 별도 산출 전이라 Revenue YoY, EPS 흑자 여부, OPM YoY를 보조로 보는 proxy입니다. 엄밀한 C 판정은 EPS YoY 추가 후 확정해야 합니다.",
  };
}

function buildAutoMarketCanslimProfile(row, financialItem) {
  const quarters = financialItem?.quarters ?? [];
  const revenueYoyValues = quarters
    .map((quarter) => Number(quarter.revenueYoyPct))
    .filter((value) => Number.isFinite(value));
  const averageRevenueYoy = revenueYoyValues.length
    ? revenueYoyValues.reduce((sum, value) => sum + value, 0) / revenueYoyValues.length
    : null;
  const positiveEpsCount = quarters.filter((quarter) => Number(quarter.epsDiluted) > 0).length;
  return {
    ticker: row?.ticker,
    generated: true,
    catalyst: "No manual catalyst tag yet. Add a company-specific product, management, industry, or regulatory catalyst before scoring N strictly.",
    annualNote: quarters.length
      ? `Proxy only: last ${quarters.length} quarters loaded, ${positiveEpsCount} quarters with positive EPS, average revenue YoY ${
          averageRevenueYoy === null ? "-" : `${averageRevenueYoy.toFixed(1)}%`
        }. Strict O'Neil A still needs 3-5Y annual EPS growth.`
      : "Quarterly financials are not loaded yet. Strict O'Neil A needs 3-5Y annual EPS growth.",
    institutionNote:
      "Institutional sponsorship is pending. Add 13F holder count, fund ownership quality, and QoQ ownership trend before scoring I strictly.",
    ratings: {
      n: "pending",
      i: "pending",
    },
  };
}

function buildCanslimA(profile, financialItem) {
  const quarters = financialItem?.quarters ?? [];
  const epsValues = quarters
    .map((quarter) => Number(quarter.epsDiluted))
    .filter((value) => Number.isFinite(value));
  const revenueYoyValues = quarters
    .map((quarter) => Number(quarter.revenueYoyPct))
    .filter((value) => Number.isFinite(value));
  const averageRevenueYoy = revenueYoyValues.length
    ? revenueYoyValues.reduce((sum, value) => sum + value, 0) / revenueYoyValues.length
    : null;
  const ttmEps = epsValues.length ? epsValues.reduce((sum, value) => sum + value, 0) : null;
  let status = "pending";
  if (epsValues.length >= 4 && ttmEps !== null && averageRevenueYoy !== null) {
    if (ttmEps > 0 && averageRevenueYoy >= 25) {
      status = "pass";
    } else if (ttmEps > 0 && averageRevenueYoy >= 10) {
      status = "watch";
    } else {
      status = "fail";
    }
  }
  if (!profile?.generated) {
    status = "pending";
  }
  return {
    key: "A",
    title: "Annual Earnings",
    status,
    summary: ttmEps === null ? "5Y annual EPS pending" : `TTM EPS proxy ${formatRsFinancialEps(ttmEps)} / Avg Rev YoY ${formatRsFinancialPercent(averageRevenueYoy)}`,
    detail: profile?.annualNote ?? "최근 3~5년 연간 EPS 성장률 데이터가 아직 연결되지 않았습니다.",
  };
}

function buildCanslimN(row, profile) {
  const status = profile?.ratings?.n ?? "pending";
  const confirmations = [
    row?.priceNewHigh1y ? "1Y price high" : "",
    row?.rsNewHigh1yAll ? "1Y RS high" : "",
  ].filter(Boolean);
  return {
    key: "N",
    title: "New Catalyst",
    status,
    summary: profile?.catalyst ?? "수동 catalyst 태그 없음",
    detail: confirmations.length
      ? `Price confirmation: ${confirmations.join(" / ")}. 신고가는 catalyst의 확인 신호로만 사용합니다.`
      : "Price confirmation 없음. 신고가는 catalyst의 핵심 점수가 아니라 확인 신호로만 사용합니다.",
  };
}

function buildCanslimS(row) {
  const shares = Number(row?.sharesOutstanding);
  let status = "pending";
  if (Number.isFinite(shares)) {
    if (shares <= 1_000_000_000) {
      status = "pass";
    } else if (shares <= 5_000_000_000) {
      status = "watch";
    } else {
      status = "fail";
    }
  }
  return {
    key: "S",
    title: "Supply / Demand",
    status,
    summary: `Shares ${Number.isFinite(shares) ? formatLargeNumber(shares) : "-"} / MCap ${formatMarketCapCompact(row?.marketCap)}`,
    detail:
      "O'Neil식 S는 제한된 공급과 강한 수요를 봅니다. M7은 유동성은 좋지만 shares outstanding이 커서 strict supply 관점에서는 불리하게 표시될 수 있습니다.",
  };
}

function buildCanslimL(row) {
  const universe = state.marketView === "Canslim" ? state.canslimUniverse : state.rsUniverse;
  const score = Number(getMarketRsUniverseScore(row ?? {}, universe) ?? row?.rsRatingAll);
  let status = "pending";
  if (Number.isFinite(score)) {
    if (score >= 80) {
      status = "pass";
    } else if (score >= 70) {
      status = "watch";
    } else {
      status = "fail";
    }
  }
  return {
    key: "L",
    title: "Leader / Laggard",
    status,
    summary: `RS ${formatRsNumber(score)} / 1M ${formatRsNumber(row?.rsPeriods?.["1m"])} / 3M ${formatRsNumber(row?.rsPeriods?.["3m"])}`,
    detail: "RS 탭과 중복을 줄이기 위해 L은 80 이상 리더 조건 충족 여부만 간단히 확인합니다.",
  };
}

function buildCanslimI(profile) {
  return {
    key: "I",
    title: "Institutional Sponsorship",
    status: profile?.ratings?.i ?? "pending",
    summary: "13F ownership trend pending",
    detail: profile?.institutionNote ?? "13F 기반 보유 기관 수와 QoQ 보유 변화가 아직 연결되지 않았습니다.",
  };
}

function buildCanslimM() {
  if (marketCanslimDirectionCache) {
    return marketCanslimDirectionCache;
  }
  const spy = marketPriceData.items?.sp500 ?? marketPriceData.items?.spy;
  const values = spy?.values ?? [];
  const latest = Number(values.at?.(-1));
  const ema50 = calculateEmaSeries(values, 50).at(-1);
  const ema200 = calculateEmaSeries(values, 200).at(-1);
  let status = "pending";
  if (Number.isFinite(latest) && Number.isFinite(ema50) && Number.isFinite(ema200)) {
    if (latest > ema50 && latest > ema200 && ema50 > ema200) {
      status = "pass";
    } else if (latest > ema200) {
      status = "watch";
    } else {
      status = "fail";
    }
  }
  marketCanslimDirectionCache = {
    key: "M",
    title: "Market Direction",
    status,
    summary: Number.isFinite(latest) ? `S&P 500 vs 50/200 EMA: ${getCanslimStatusLabel(status)}` : "Market trend pending",
    detail: "1차 구현은 S&P 500의 50/200 EMA 위치만 사용합니다. 추후 Breadth/VIX/Distribution day를 결합하는 편이 좋습니다.",
  };
  return marketCanslimDirectionCache;
}

function getCanslimScoreFromChecks(checks) {
  const score = checks.reduce((sum, item) => {
    if (item.status === "pass") {
      return sum + 1;
    }
    if (item.status === "watch") {
      return sum + 0.5;
    }
    return sum;
  }, 0);
  return {
    score,
    maxScore: checks.length,
    passCount: checks.filter((item) => item.status === "pass").length,
    watchCount: checks.filter((item) => item.status === "watch").length,
    pendingCount: checks.filter((item) => item.status === "pending").length,
  };
}

function buildMarketCanslimAnalysis(row) {
  if (!row) {
    return null;
  }
  const cacheKey = `${state.canslimUniverse || "all"}:${row.ticker}`;
  const cached = marketCanslimAnalysisCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const ticker = normalizeCanslimTicker(row.ticker);
  const financialItem = marketRsFinancialsData.financials?.[ticker] ?? marketRsFinancialsData.financials?.[row.ticker];
  const profile = getMarketCanslimProfile(row.ticker) ?? buildAutoMarketCanslimProfile(row, financialItem);
  const checks = [
    buildCanslimC(row, financialItem),
    buildCanslimA(profile, financialItem),
    buildCanslimN(row, profile),
    buildCanslimS(row),
    buildCanslimL(row),
    buildCanslimI(profile),
    buildCanslimM(),
  ];
  const analysis = {
    profile,
    financialItem,
    checks,
    score: getCanslimScoreFromChecks(checks),
  };
  marketCanslimAnalysisCache.set(cacheKey, analysis);
  return analysis;
}

function formatCanslimScore(score) {
  if (!score || !Number.isFinite(Number(score.score))) {
    return "-";
  }
  return `${Number(score.score).toFixed(1)}/${score.maxScore}`;
}

function renderMarketRsCanslim(row) {
  const analysis = buildMarketCanslimAnalysis(row);
  if (!analysis) {
    return "";
  }
  const { profile, checks, score } = analysis;
  const earningsSurpriseMarkup = renderMarketCanslimEarningsSurprise(row);
  const rows = checks.map((item) => `
    <div class="market-canslim-item${getCanslimStatusClass(item.status)}">
      <div class="market-canslim-letter">${item.key}</div>
      <div>
        <div class="market-canslim-title">
          <strong>${item.title}</strong>
          <span>${getCanslimStatusLabel(item.status)}</span>
        </div>
        <p>${item.summary}</p>
        <small>${item.detail}</small>
      </div>
    </div>
  `).join("");

  return `
    <div class="market-rs-financial-panel market-canslim-panel">
      <div class="market-rs-financial-head">
        <div>
          <strong>CANSLIM Check</strong>
          <p>${profile.generated ? "S&P500 auto proxy. C/S/L/M are calculated; A/N/I require stricter annual, catalyst, and 13F data." : "Momentum is kept mostly in RS; this panel emphasizes earnings, catalyst, supply, institutions, and market direction."}</p>
        </div>
        <span>${formatCanslimScore(score)} proxy</span>
      </div>
      <div class="market-canslim-grid">${rows}</div>
      <p class="market-rs-financial-note">${profile.generated ? "Auto proxy uses RS data and the existing S&P500/NASDAQ100 financial dataset. Do not treat Pending N/I/A as a fail." : marketCanslimData.scope?.basis ?? ""}</p>
    </div>
    ${earningsSurpriseMarkup}
  `;
}

function getMarketCanslimRows(briefingSectorData = getMarketRsBriefingSectorData()) {
  const query = normalizeMarketTickerSearch(state.query);
  const universe = state.canslimUniverse || "all";
  return (marketRsData.rows ?? [])
    .filter((row) => {
      if (universe === "sp500") {
        return Boolean(row.memberships?.sp500);
      }
      if (universe === "nasdaq100") {
        return Boolean(row.memberships?.nasdaq100);
      }
      if (universe === "dowjones") {
        return Boolean(row.memberships?.dowjones);
      }
      if (universe === "russell2000") {
        return Boolean(row.memberships?.russell2000);
      }
      return true;
    })
    .filter((row) => matchesBriefingSectorKey(row, state.canslimBriefingSector, briefingSectorData))
    .map((row) => {
      const profile = getMarketCanslimProfile(row.ticker);
      const analysis = buildMarketCanslimAnalysis(row);
      return {
        ticker: row.ticker,
        profile,
        analysis,
        canslimScore: analysis?.score?.score ?? 0,
        canslimMaxScore: analysis?.score?.maxScore ?? 0,
        row,
        name: row.name ?? row.ticker,
        marketCap: row.marketCap,
        rsRating: getMarketRsUniverseScore(row, universe),
      };
    })
    .filter((entry) => {
      if (!query) {
        return true;
      }
      return [
        ...marketTickerSearchTerms(entry.ticker, entry.name),
        entry.profile?.catalyst,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(query));
    })
    .sort((left, right) => {
      if (state.canslimSort === "marketCapDesc") {
        return (Number(right.marketCap) || 0) - (Number(left.marketCap) || 0);
      }
      if (state.canslimSort === "marketCapAsc") {
        return (Number(left.marketCap) || 0) - (Number(right.marketCap) || 0);
      }
      if (state.canslimSort === "rsDesc") {
        return (Number(right.rsRating) || 0) - (Number(left.rsRating) || 0);
      }
      if (state.canslimSort === "rsAsc") {
        return (Number(left.rsRating) || 0) - (Number(right.rsRating) || 0);
      }
      if (state.canslimSort === "canslimAsc") {
        const scoreDiff = (Number(left.canslimScore) || 0) - (Number(right.canslimScore) || 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
      } else {
        const scoreDiff = (Number(right.canslimScore) || 0) - (Number(left.canslimScore) || 0);
        if (scoreDiff !== 0) {
          return scoreDiff;
        }
      }
      const leftScore = Number(left.rsRating);
      const rightScore = Number(right.rsRating);
      if (Number.isFinite(leftScore) && Number.isFinite(rightScore) && leftScore !== rightScore) {
        return rightScore - leftScore;
      }
      return String(left.ticker).localeCompare(String(right.ticker));
    });
}

function getSelectedMarketCanslimRow(rows) {
  return rows.find((entry) => entry.ticker === state.canslimSelectedTicker) ?? rows[0] ?? null;
}

function getCanslimSortField(sortKey = state.canslimSort) {
  if (String(sortKey).startsWith("marketCap")) {
    return "marketCap";
  }
  if (String(sortKey).startsWith("rs")) {
    return "rs";
  }
  return "canslim";
}

function getCanslimSortDirection(sortKey = state.canslimSort) {
  return String(sortKey).endsWith("Asc") ? "asc" : "desc";
}

function buildCanslimSortKey(field, direction) {
  const suffix = direction === "asc" ? "Asc" : "Desc";
  return `${field}${suffix}`;
}

function renderMarketCanslimOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  if (!marketRsData.universes?.[state.canslimUniverse]) {
    state.canslimUniverse = "all";
  }
  const briefingSectorData = getMarketRsBriefingSectorData();
  if (
    state.canslimBriefingSector !== "all" &&
    state.canslimBriefingSector !== "briefingAll" &&
    !briefingSectorData.groups.some((sector) => sector.key === state.canslimBriefingSector)
  ) {
    state.canslimBriefingSector = "all";
  }
  const rows = getMarketCanslimRows(briefingSectorData);
  const selected = getSelectedMarketCanslimRow(rows);
  if (selected) {
    state.canslimSelectedTicker = selected.ticker;
  }
  const selectedRow = selected?.row ?? (selected ? { ticker: selected.ticker, name: selected.name } : null);
  const canslimMarkup = renderMarketRsCanslim(selectedRow);
  const financialMarkup = renderMarketRsFinancials(selectedRow);
  const profileCoveredCount = rows.filter((entry) => entry.profile).length;
  const financialCoveredCount = rows.filter((entry) => {
    const ticker = normalizeCanslimTicker(entry.ticker);
    return Boolean(marketRsFinancialsData.financials?.[ticker] ?? marketRsFinancialsData.financials?.[entry.ticker]);
  }).length;
  const universeChips = Object.entries(marketRsData.universes ?? {})
    .map(
      ([key, meta]) => `
        <button
          type="button"
          class="market-rs-chip${state.canslimUniverse === key ? " active" : ""}"
          data-canslim-universe="${key}"
        >${meta.label}</button>
      `,
    )
    .join("");
  const briefingSectorChips = [
    { key: "all", label: "All CANSLIM", count: marketRsData.rows?.length ?? 0 },
    { key: "briefingAll", label: "Daily Briefing 전체", count: briefingSectorData.allTickers.length },
    ...briefingSectorData.groups.map((sector) => ({
      key: sector.key,
      label: sector.label,
      count: sector.tickers.length,
    })),
  ]
    .map(
      (sector) => `
        <button
          type="button"
          class="market-rs-chip market-rs-sector-chip${state.canslimBriefingSector === sector.key ? " active" : ""}"
          data-canslim-briefing-sector="${sector.key}"
        >${sector.label}<small>${sector.count}</small></button>
      `,
    )
    .join("");
  const activeSortField = getCanslimSortField();
  const activeSortDirection = getCanslimSortDirection();
  const sortChips = [
    { field: "canslim", label: "CANSLIM" },
    { field: "rs", label: "RS" },
    { field: "marketCap", label: "Market Cap" },
  ]
    .map(
      (item) => {
        const active = activeSortField === item.field;
        const arrow = active ? (activeSortDirection === "asc" ? "↑" : "↓") : "↕";
        return `
        <button
          type="button"
          class="market-rs-chip${active ? " active" : ""}"
          data-canslim-sort-field="${item.field}"
        >${item.label} ${arrow}</button>
      `;
      },
    )
    .join("");
  const canslimCardLimit = ENABLE_CANSLIM_LIMITED_CARDS
    ? Math.max(CANSLIM_CARD_BATCH_SIZE, Number(state.canslimVisibleCardCount) || CANSLIM_CARD_BATCH_SIZE)
    : rows.length;
  const canslimCardRows = ENABLE_CANSLIM_LIMITED_CARDS ? rows.slice(0, canslimCardLimit) : rows;
  const hasMoreCanslimCards = ENABLE_CANSLIM_LIMITED_CARDS && canslimCardRows.length < rows.length;
  const cards = canslimCardRows
    .map((entry) => `
      <button
        type="button"
        class="market-rs-card${state.canslimSelectedTicker === entry.ticker ? " active" : ""}"
        data-canslim-ticker="${entry.ticker}"
      >
        <div class="market-rs-card-top">
          <span class="market-rs-card-ticker">${entry.ticker}</span>
          <span class="market-rs-card-score">${formatRsNumber(entry.rsRating)}</span>
        </div>
        <p class="market-rs-card-name">${entry.name}</p>
        <p class="market-rs-card-cap">${formatMarketCapCompact(entry.marketCap)}</p>
        <div class="market-rs-card-meta">
          <span>CANSLIM</span>
          <strong>${formatCanslimScore(entry.analysis?.score)}</strong>
        </div>
        <div class="market-rs-card-meta">
          <span>Source</span>
          <strong>${entry.profile ? "Profile" : "Auto"}</strong>
        </div>
      </button>
    `)
    .join("");
  const cardsMoreMarkup = hasMoreCanslimCards
    ? `
      <div class="market-rs-card-more">
        <span>${canslimCardRows.length} / ${rows.length} names</span>
        <button type="button" class="total-date-button" data-canslim-show-more>더 보기 +${Math.min(CANSLIM_CARD_BATCH_SIZE, rows.length - canslimCardRows.length)}</button>
      </div>
    `
    : ENABLE_CANSLIM_LIMITED_CARDS && rows.length
      ? `<p class="market-rs-empty market-rs-card-count">${rows.length} names all loaded.</p>`
      : "";

  usOverviewRoot.innerHTML = `
    <section class="market-rs-overview">
      <article class="us-panel">
        <div class="us-section-head market-rs-head">
          <div>
            <h2>CANSLIM</h2>
            <p>${marketCanslimData.scope?.basis ?? "CANSLIM checklist and investor-facing quarterly financial data."}</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${marketRsData.updatedAt ?? "-"}</span>
            <span class="market-rs-pill">${getMarketRsUniverseLabel(state.canslimUniverse)}</span>
            <span class="market-rs-pill">${getMarketRsBriefingSectorLabel(state.canslimBriefingSector, briefingSectorData).replace("RS", "CANSLIM")}</span>
            <span class="market-rs-pill">${rows.length} RS names</span>
            <span class="market-rs-pill">${financialCoveredCount} financials</span>
            <span class="market-rs-pill">${profileCoveredCount} manual profiles</span>
            <span class="market-rs-pill">Financials separated from RS</span>
          </div>
        </div>
        <div class="market-rs-controls">
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Universe</span>
            <div class="market-rs-chip-row">${universeChips}</div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Daily Briefing Sector</span>
            <div class="market-rs-chip-row market-rs-briefing-sector-row">${briefingSectorChips}</div>
          </div>
        </div>
      </article>

      <section class="market-rs-layout">
        <article class="us-panel market-rs-leaders">
          <div class="us-section-head">
            <div>
              <h2>CANSLIM Coverage</h2>
              <p>RS 유니버스를 그대로 사용합니다. 수동 프로필이 없는 종목도 재무/RS 기반 자동 proxy 체크를 표시합니다.</p>
            </div>
            <div class="market-rs-chip-row">${sortChips}</div>
          </div>
          <div class="market-rs-card-grid">${cards || '<p class="market-rs-empty">검색 결과가 없습니다.</p>'}</div>
          ${cardsMoreMarkup}
        </article>

        <article class="us-panel market-rs-detail">
          <div class="us-section-head">
            <div>
              <h2>${selected?.ticker ?? "-"}</h2>
              <p>${selected?.name ?? "Select a ticker from the CANSLIM coverage list."}</p>
            </div>
            <span class="market-rs-detail-score">${formatRsNumber(selected?.rsRating)}</span>
          </div>
          <div class="market-rs-metrics">
            <div class="market-rs-metric">
              <span>RS Rating</span>
              <strong>${formatRsNumber(selected?.rsRating)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Market Cap</span>
              <strong>${formatMarketCapCompact(selected?.marketCap)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>CANSLIM Score</span>
              <strong>${formatCanslimScore(selected?.analysis?.score)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>RS Link</span>
              <strong>${selected?.row ? "Available" : "Pending"}</strong>
            </div>
          </div>
          ${canslimMarkup || '<p class="market-rs-empty">CANSLIM profile is not available for this ticker yet. RS universe membership and quarterly financials still remain available here.</p>'}
          ${financialMarkup}
        </article>
      </section>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-canslim-ticker]").forEach((button) => {
    button.addEventListener("click", () => {
      state.canslimSelectedTicker = button.dataset.canslimTicker;
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-canslim-universe]").forEach((button) => {
    button.addEventListener("click", () => {
      state.canslimUniverse = button.dataset.canslimUniverse || "all";
      state.canslimSelectedTicker = "";
      resetCanslimCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-canslim-briefing-sector]").forEach((button) => {
    button.addEventListener("click", () => {
      state.canslimBriefingSector = button.dataset.canslimBriefingSector || "all";
      state.canslimSelectedTicker = "";
      resetCanslimCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-canslim-sort-field]").forEach((button) => {
    button.addEventListener("click", () => {
      const field = button.dataset.canslimSortField || "canslim";
      const currentField = getCanslimSortField();
      const currentDirection = getCanslimSortDirection();
      const nextDirection = currentField === field && currentDirection === "desc" ? "asc" : "desc";
      state.canslimSort = buildCanslimSortKey(field, nextDirection);
      state.canslimSelectedTicker = "";
      resetCanslimCardLimit();
      render();
    });
  });
  const canslimShowMoreButton = usOverviewRoot.querySelector("[data-canslim-show-more]");
  if (canslimShowMoreButton) {
    canslimShowMoreButton.addEventListener("click", () => {
      state.canslimVisibleCardCount = Math.min(
        rows.length,
        Math.max(CANSLIM_CARD_BATCH_SIZE, Number(state.canslimVisibleCardCount) || CANSLIM_CARD_BATCH_SIZE) + CANSLIM_CARD_BATCH_SIZE,
      );
      render();
    });
  }
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

function getMarketRsNewHighSuffix(universeKey) {
  if (universeKey === "sp500") {
    return "Sp500";
  }
  if (universeKey === "nasdaq100") {
    return "Nasdaq100";
  }
  if (universeKey === "dowjones") {
    return "Dowjones";
  }
  if (universeKey === "russell2000") {
    return "Russell2000";
  }
  return "All";
}

function getMarketRsFilterNewHighWindow(filterKey = state.rsFilter) {
  if (filterKey === "newHigh3m") {
    return "3m";
  }
  if (filterKey === "newHigh1y" || filterKey === "newHigh") {
    return "1y";
  }
  if (filterKey === "priceNewHigh3m") {
    return "3m";
  }
  if (filterKey === "priceNewHigh1y") {
    return "1y";
  }
  return null;
}

function getMarketRsFilterNewHighKind(filterKey = state.rsFilter) {
  if (filterKey === "newHigh3m" || filterKey === "newHigh1y" || filterKey === "newHigh") {
    return "rs";
  }
  if (filterKey === "priceNewHigh3m" || filterKey === "priceNewHigh1y") {
    return "price";
  }
  return null;
}

function getMarketRsUniverseNewHigh(row, universeKey, windowKey = "1y") {
  const suffix = getMarketRsNewHighSuffix(universeKey);
  if (windowKey === "3m") {
    return Boolean(row[`rsNewHigh3m${suffix}`]);
  }
  const value = row[`rsNewHigh1y${suffix}`] ?? row[`rsNewHigh${suffix}`];
  return Boolean(value ?? (suffix === "All" ? row.rsNewHigh : false));
}

function getMarketRsPriceNewHigh(row, windowKey = "1y") {
  if (windowKey === "3m") {
    return Boolean(row.priceNewHigh3m);
  }
  return Boolean(row.priceNewHigh1y ?? row.priceNewHigh);
}

function getMarketRsNewHighLabel(windowKey = getMarketRsFilterNewHighWindow() ?? "1y", kind = getMarketRsFilterNewHighKind() ?? "rs") {
  const prefix = kind === "price" ? "Price NH" : "RS NH";
  return windowKey === "3m" ? `${prefix} 3M` : `${prefix} 1Y`;
}

function matchesMarketRsNewHighFilter(row, universeKey, filterKey = state.rsFilter) {
  const kind = getMarketRsFilterNewHighKind(filterKey);
  const windowKey = getMarketRsFilterNewHighWindow(filterKey);
  if (!kind || !windowKey) {
    return true;
  }
  if (kind === "price") {
    return getMarketRsPriceNewHigh(row, windowKey);
  }
  return getMarketRsUniverseNewHigh(row, universeKey, windowKey);
}

function getMarketRsBriefingSectorData() {
  const groups = (window.marketBriefingData?.sectorPanels ?? [])
    .map((sector) => {
      const tickers = [
        ...new Set(
          (sector.items ?? [])
            .map((item) => getBriefingRsTicker(item))
            .filter(Boolean),
        ),
      ];
      return {
        key: sector.key,
        label: sector.label ?? sector.key,
        tickers,
      };
    })
    .filter((sector) => sector.key && sector.tickers.length);
  const tickerToSectors = new Map();
  groups.forEach((sector) => {
    sector.tickers.forEach((ticker) => {
      const current = tickerToSectors.get(ticker) ?? [];
      current.push({ key: sector.key, label: sector.label });
      tickerToSectors.set(ticker, current);
    });
  });
  const allTickers = [...new Set(groups.flatMap((sector) => sector.tickers))];
  return { groups, tickerToSectors, allTickers };
}

function getMarketRsBriefingSectorLabel(sectorKey, sectorData = getMarketRsBriefingSectorData()) {
  if (sectorKey === "all") {
    return "All RS";
  }
  if (sectorKey === "briefingAll") {
    return "Daily Briefing 전체";
  }
  return sectorData.groups.find((sector) => sector.key === sectorKey)?.label ?? "Daily Briefing";
}

function getMarketRsBriefingSectorLabels(row, sectorData) {
  const labels = sectorData?.tickerToSectors?.get(row?.ticker) ?? [];
  return labels.map((item) => item.label);
}

function formatMarketRsBriefingSectorLabels(row, sectorData, limit = 2) {
  const labels = getMarketRsBriefingSectorLabels(row, sectorData);
  if (!labels.length) {
    return "-";
  }
  const visible = labels.slice(0, limit).join(", ");
  return labels.length > limit ? `${visible} +${labels.length - limit}` : visible;
}

function matchesBriefingSectorKey(row, sectorKey, sectorData) {
  if (sectorKey === "all") {
    return true;
  }
  if (sectorKey === "briefingAll") {
    return sectorData.allTickers.includes(row.ticker);
  }
  const sector = sectorData.groups.find((item) => item.key === sectorKey);
  if (!sector) {
    return true;
  }
  return sector.tickers.includes(row.ticker);
}

function matchesMarketRsBriefingSector(row, sectorData) {
  return matchesBriefingSectorKey(row, state.rsBriefingSector, sectorData);
}

function hasFiniteSeriesValue(values) {
  return Array.isArray(values) && values.some((value) => Number.isFinite(value));
}

function getLastFiniteSeriesIndex(values) {
  if (!Array.isArray(values)) {
    return -1;
  }
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (Number.isFinite(values[index])) {
      return index;
    }
  }
  return -1;
}

function getMarketRsHistoryRatingSeries(history, universeKey) {
  if (!history) {
    return { values: [], universeKey: "all", fallback: false };
  }
  const fallbackValues = history.rsRatingAll ?? history.rsRating ?? [];
  const seriesByUniverse = {
    sp500: history.rsRatingSp500,
    nasdaq100: history.rsRatingNasdaq100,
    dowjones: history.rsRatingDowjones,
    russell2000: history.rsRatingRussell2000,
    all: fallbackValues,
  };
  const selectedValues = seriesByUniverse[universeKey] ?? fallbackValues;
  if (hasFiniteSeriesValue(selectedValues)) {
    return { values: selectedValues, universeKey, fallback: false };
  }
  return {
    values: fallbackValues,
    universeKey: "all",
    fallback: universeKey !== "all" && hasFiniteSeriesValue(fallbackValues),
  };
}

function getMarketRsHistoryRatings(history, universeKey) {
  return getMarketRsHistoryRatingSeries(history, universeKey).values;
}

const MARKET_RS_SCORE_RANGES = [
  { key: "all", label: "All", min: 1, max: 100 },
  { key: "90", label: "90-99", min: 90, max: 100 },
  { key: "80", label: "80-89", min: 80, max: 90 },
  { key: "70", label: "70-79", min: 70, max: 80 },
  { key: "50", label: "50-69", min: 50, max: 70 },
  { key: "under50", label: "<50", min: 1, max: 50 },
];

const TREND_SCORE_RANGES = [
  { key: "all", label: "All", min: 0, max: 10.01 },
  { key: "10", label: "10", min: 10, max: 10.01 },
  { key: "8", label: "8-9", min: 8, max: 10 },
  { key: "6", label: "6-7", min: 6, max: 8 },
  { key: "4", label: "4-5", min: 4, max: 6 },
  { key: "under4", label: "<4", min: 0, max: 4 },
];

const CLIMAX_SCORE_RANGES = [
  { key: "all", label: "All", min: 0, max: Number.POSITIVE_INFINITY },
  { key: "8plus", label: "8+", min: 8, max: Number.POSITIVE_INFINITY },
  { key: "5", label: "5-7", min: 5, max: 8 },
  { key: "4", label: "4", min: 4, max: 5 },
  { key: "1", label: "1-3", min: 1, max: 4 },
  { key: "0", label: "0", min: 0, max: 1 },
];

function getMarketRsCapRangeMeta(key) {
  return MARKET_RS_CAP_RANGES.find((range) => range.key === key) ?? MARKET_RS_CAP_RANGES[0];
}

function getScoreRangeMeta(ranges, key) {
  return ranges.find((range) => range.key === key) ?? ranges[0];
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

function matchesMarketCapRange(row, rangeKey, customMinValue = "", customMaxValue = "") {
  const marketCap = Number(row.marketCap);
  if (!Number.isFinite(marketCap)) {
    return false;
  }
  const customMin = parseMarketCapInput(customMinValue);
  const customMax = parseMarketCapInput(customMaxValue);
  if (customMin !== null && marketCap < customMin) {
    return false;
  }
  if (customMax !== null && marketCap > customMax) {
    return false;
  }
  if (customMin !== null || customMax !== null) {
    return true;
  }
  const range = getMarketRsCapRangeMeta(rangeKey);
  return marketCap >= range.min && marketCap < range.max;
}

function parseScoreInput(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function matchesScoreRange(score, ranges, rangeKey, customMinValue = "", customMaxValue = "") {
  const numeric = Number(score);
  if (!Number.isFinite(numeric)) {
    return false;
  }
  const customMin = parseScoreInput(customMinValue);
  const customMax = parseScoreInput(customMaxValue);
  if (customMin !== null && numeric < customMin) {
    return false;
  }
  if (customMax !== null && numeric > customMax) {
    return false;
  }
  if (customMin !== null || customMax !== null) {
    return true;
  }
  const range = getScoreRangeMeta(ranges, rangeKey);
  return numeric >= range.min && numeric < range.max;
}

function matchesMarketRsCapRange(row) {
  return matchesMarketCapRange(row, state.rsMarketCapRange, state.rsCustomMarketCapMin, state.rsCustomMarketCapMax);
}

function matchesMarketRsScoreRange(row) {
  return matchesScoreRange(
    getMarketRsUniverseScore(row, state.rsUniverse),
    MARKET_RS_SCORE_RANGES,
    state.rsScoreRange,
    state.rsCustomScoreMin,
    state.rsCustomScoreMax,
  );
}

function matchesTrendScoreCapRange(row) {
  return matchesMarketCapRange(
    row,
    state.trendScoreMarketCapRange,
    state.trendScoreCustomMarketCapMin,
    state.trendScoreCustomMarketCapMax,
  );
}

function matchesTrendScoreScoreRange(row) {
  return matchesScoreRange(
    row.score,
    TREND_SCORE_RANGES,
    state.trendScoreScoreRange,
    state.trendScoreCustomScoreMin,
    state.trendScoreCustomScoreMax,
  );
}

function matchesTrendScoreClimaxRange(row) {
  return matchesScoreRange(
    row.climaxScore,
    CLIMAX_SCORE_RANGES,
    state.trendScoreClimaxRange,
    state.trendScoreCustomClimaxMin,
    state.trendScoreCustomClimaxMax,
  );
}

function getVisibleMarketRsRows(briefingSectorData = getMarketRsBriefingSectorData()) {
  const query = normalizeMarketTickerSearch(state.query);
  return (marketRsData.rows ?? [])
    .filter((row) => {
      if (!matchesMarketRsCapRange(row)) {
        return false;
      }
      if (!matchesMarketRsScoreRange(row)) {
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
      if (!matchesMarketRsBriefingSector(row, briefingSectorData)) {
        return false;
      }
      if (!query) {
        return matchesMarketRsNewHighFilter(row, state.rsUniverse);
      }
      const matchesQuery = marketTickerSearchTerms(row.ticker, row.name).some((term) => term.includes(query));
      if (!matchesQuery) {
        return false;
      }
      return matchesMarketRsNewHighFilter(row, state.rsUniverse);
    })
    .sort((left, right) => {
      if (query) {
        const leftTicker = normalizeMarketTickerSearch(left.ticker);
        const rightTicker = normalizeMarketTickerSearch(right.ticker);
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
    case "atr21Pct":
      return row.atr21Pct ?? Number.NEGATIVE_INFINITY;
    case "gap52w":
      return row.distanceTo52wHighPct ?? Number.POSITIVE_INFINITY;
    case "rsNewHigh":
      return getMarketRsUniverseNewHigh(row, state.rsUniverse, getMarketRsFilterNewHighWindow() ?? "1y") ? 1 : 0;
    case "priceNewHigh":
      return getMarketRsPriceNewHigh(row, getMarketRsFilterNewHighKind() === "price" ? getMarketRsFilterNewHighWindow() : "1y") ? 1 : 0;
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

function calculateEmaSeries(values, period) {
  const multiplier = 2 / (period + 1);
  let ema = null;
  return values.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    ema = ema === null ? numeric : numeric * multiplier + ema * (1 - multiplier);
    return Number(ema.toFixed(4));
  });
}

const MARKET_RS_CHART_SERIES = [
  { key: "rs", label: "RS Rating(L)", color: "#d93025" },
  { key: "ema10", label: "10EMA", period: 10, color: "#2563eb" },
  { key: "ema20", label: "20EMA", period: 20, color: "#d97706" },
  { key: "ema50", label: "50EMA", period: 50, color: "#16a34a" },
  { key: "ema100", label: "100EMA", period: 100, color: "#0f766e" },
  { key: "ema200", label: "200EMA", period: 200, color: "#7c3aed" },
];

function isMarketRsChartSeriesVisible(key) {
  return state.rsChartSeries?.[key] !== false;
}

function refreshMarketRsChartOnly() {
  const detailCanvas = usOverviewRoot.querySelector('[data-rs-chart="detail"]');
  const mddCanvas = usOverviewRoot.querySelector('[data-rs-chart="mdd"]');
  const atrCanvas = usOverviewRoot.querySelector('[data-rs-chart="atr"]');
  const selected = marketRsRowByTicker.get(state.rsSelectedTicker) ?? marketRsData.rows?.[0] ?? null;
  if (!detailCanvas || !selected) {
    return;
  }
  destroyCharts();
  createMarketRsChart(detailCanvas, selected);
  createMarketRsMddChart(mddCanvas, selected);
  createMarketRsAtrChart(atrCanvas, selected);
}

function syncMarketRsChartSeriesButtons() {
  usOverviewRoot.querySelectorAll("[data-rs-chart-series]").forEach((button) => {
    const seriesKey = button.dataset.rsChartSeries;
    button.classList.toggle("active", isMarketRsChartSeriesVisible(seriesKey));
    button.setAttribute("aria-pressed", isMarketRsChartSeriesVisible(seriesKey) ? "true" : "false");
  });
}

function buildMarketRsEarningsMarkers(row, selectedLabels, priceMin, priceMax) {
  const earningsProfile = getMarketCanslimEarningsProfile(row?.ticker);
  const quarters = earningsProfile?.quarters ?? [];
  if (!quarters.length || !selectedLabels.length) {
    return { data: [], byIndex: new Map() };
  }
  const markerY = Number.isFinite(priceMin) && Number.isFinite(priceMax)
    ? priceMin + (priceMax - priceMin) * 0.08
    : row?.price ?? 0;
  const byIndex = new Map();
  const rotations = [];
  const colors = [];
  const data = quarters
    .map((quarter) => {
      const releaseDate = quarter.releaseDate;
      if (!releaseDate) {
        return null;
      }
      let index = selectedLabels.findIndex((label) => label >= releaseDate);
      if (index < 0) {
        index = selectedLabels.length - 1;
      }
      if (index < 0) {
        return null;
      }
      byIndex.set(index, quarter);
      const surprisePct = Number(quarter.eps?.surprisePct);
      rotations.push(Number.isFinite(surprisePct) && surprisePct < 0 ? 180 : 0);
      colors.push(Number.isFinite(surprisePct) && surprisePct < 0 ? "#dc2626" : "#16a34a");
      return {
        x: selectedLabels[index],
        y: markerY,
      };
    })
    .filter(Boolean);
  return { data, byIndex, rotations, colors };
}

function calculateDrawdownSeries(values = []) {
  let runningHigh = null;
  return values.map((value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      return null;
    }
    runningHigh = runningHigh === null ? numeric : Math.max(runningHigh, numeric);
    if (!runningHigh) {
      return null;
    }
    return Number(((numeric / runningHigh - 1) * 100).toFixed(2));
  });
}

function calculateAtrPctSeries(highValues = [], lowValues = [], closeValues = [], window = 21) {
  const trueRangePct = closeValues.map((closeValue, index) => {
    const high = Number(highValues[index]);
    const low = Number(lowValues[index]);
    const close = Number(closeValue);
    if (!Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || close <= 0) {
      return null;
    }
    const previousClose = Number(closeValues[index - 1]);
    const ranges = [high - low];
    if (Number.isFinite(previousClose) && previousClose > 0) {
      ranges.push(Math.abs(high - previousClose), Math.abs(low - previousClose));
    }
    const trueRange = Math.max(...ranges.filter((value) => Number.isFinite(value)));
    if (!Number.isFinite(trueRange)) {
      return null;
    }
    return (trueRange / close) * 100;
  });

  return trueRangePct.map((_, index) => {
    const windowValues = trueRangePct
      .slice(Math.max(0, index - window + 1), index + 1)
      .filter((value) => Number.isFinite(value));
    if (windowValues.length < window) {
      return null;
    }
    const average = windowValues.reduce((sum, value) => sum + value, 0) / window;
    return Number(average.toFixed(2));
  });
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
  const ratingSeries = getMarketRsHistoryRatingSeries(history, state.rsUniverse);
  const selectedRatings = ratingSeries.values.slice(startIndex);
  const fullPrice = history.price ?? [];
  const selectedPrice = fullPrice.slice(startIndex);
  const emaSeries = Object.fromEntries(
    MARKET_RS_CHART_SERIES.filter((series) => series.period).map((series) => [
      series.key,
      calculateEmaSeries(fullPrice, series.period).slice(startIndex),
    ]),
  );
  const ratingValues = selectedRatings.filter((value) => Number.isFinite(value));
  const priceValues = [
    ...selectedPrice,
    ...MARKET_RS_CHART_SERIES.filter((series) => series.period && isMarketRsChartSeriesVisible(series.key)).flatMap((series) => emaSeries[series.key] ?? []),
  ].filter((value) => Number.isFinite(value));
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
  const earningsMarkers = buildMarketRsEarningsMarkers(row, selectedLabels, priceMin, priceMax);
  const ratingLatestIndex = getLastFiniteSeriesIndex(selectedRatings);
  const priceLatestIndex = getLastFiniteSeriesIndex(selectedPrice);
  const ratingLabelUniverse = getMarketRsUniverseLabel(ratingSeries.universeKey);

  const chartDatasets = [
    {
      label: `RS Rating(L) (${ratingLabelUniverse})`,
      data: selectedRatings,
      borderColor: "#d93025",
      backgroundColor: "#d93025",
      borderWidth: 2.6,
      tension: 0.18,
      spanGaps: true,
      pointRadius: (context) => (context.dataIndex === ratingLatestIndex ? 3 : 0),
      pointHoverRadius: 4,
      yAxisID: "y",
      hidden: !isMarketRsChartSeriesVisible("rs"),
    },
    {
      label: "Stock Price(R)",
      data: selectedPrice,
      borderColor: "#111827",
      backgroundColor: "#111827",
      borderWidth: 2,
      tension: 0.18,
      spanGaps: true,
      pointRadius: (context) => (context.dataIndex === priceLatestIndex ? 3 : 0),
      pointHoverRadius: 4,
      yAxisID: "y1",
    },
    ...MARKET_RS_CHART_SERIES.filter((series) => series.period).map((series) => ({
      label: series.label,
      data: emaSeries[series.key] ?? [],
      borderColor: series.color,
      backgroundColor: series.color,
      borderWidth: series.period >= 50 ? 1.8 : 1.6,
      borderDash: [5, 5],
      tension: 0.18,
      spanGaps: true,
      pointRadius: (context) => (context.dataIndex === getLastFiniteSeriesIndex(emaSeries[series.key]) ? 2 : 0),
      pointHoverRadius: 3,
      yAxisID: "y1",
      hidden: !isMarketRsChartSeriesVisible(series.key),
    })),
    {
      type: "scatter",
      label: "EPS Surprise",
      data: earningsMarkers.data,
      borderColor: earningsMarkers.colors,
      backgroundColor: earningsMarkers.colors,
      pointStyle: "triangle",
      pointRotation: earningsMarkers.rotations,
      pointRadius: earningsMarkers.data.length ? 7 : 0,
      pointHoverRadius: 9,
      yAxisID: "y1",
      showLine: false,
      order: -1,
      isEarningsSurprise: true,
    },
  ];

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: selectedLabels,
      datasets: chartDatasets,
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
              if (context.dataset.isEarningsSurprise) {
                const index = selectedLabels.indexOf(context.raw?.x ?? context.label);
                const event = earningsMarkers.byIndex.get(index);
                const eps = event?.eps ?? {};
                const surprisePct = Number(eps.surprisePct);
                const label = Number.isFinite(surprisePct) && surprisePct < 0 ? "EPS Shock" : "EPS Beat";
                return [
                  `${label} ${formatCanslimEarningsPercent(eps.surprisePct)}`,
                  `Actual ${formatRsFinancialEps(eps.actual)} / Est ${formatRsFinancialEps(eps.estimate)}`,
                  `Diff ${formatCanslimEarningsValue(eps.surpriseValue)}`,
                ];
              }
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
          display: isMarketRsChartSeriesVisible("rs"),
          position: "left",
          min: ratingMin,
          max: ratingMax,
          grid: { color: "rgba(28,28,26,0.08)" },
          ticks: {
            color: "#a12620",
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
            color: "#111827",
            callback: (value) => formatUsStockPrice(Number(value), value >= 100 ? 0 : 2),
          },
        },
      },
    },
  });

  charts.push(chart);
}

function createMarketRsMddChart(canvas, row) {
  if (typeof Chart === "undefined" || !canvas || !row) {
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
  const selectedPrice = (history.price ?? []).slice(startIndex);
  const drawdownSeries = calculateDrawdownSeries(selectedPrice);
  const drawdownValues = drawdownSeries.filter((value) => Number.isFinite(value));
  const latestDrawdownIndex = getLastFiniteSeriesIndex(drawdownSeries);
  let minDrawdown = drawdownValues.length ? Math.floor((Math.min(...drawdownValues) - 2) / 5) * 5 : -10;
  minDrawdown = Math.min(-5, minDrawdown);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: selectedLabels,
      datasets: [
        {
          label: "Stock MDD",
          data: drawdownSeries,
          borderColor: "#b42318",
          backgroundColor: "rgba(220, 38, 38, 0.13)",
          borderWidth: 2.2,
          fill: "origin",
          tension: 0.16,
          spanGaps: true,
          pointRadius: (context) => (context.dataIndex === latestDrawdownIndex ? 3 : 0),
          pointHoverRadius: 4,
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
          display: true,
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
            label: (context) => `Stock MDD: ${formatSignedPercent(Number(context.parsed.y))}`,
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
          min: minDrawdown,
          max: 0,
          grid: { color: "rgba(28,28,26,0.08)" },
          ticks: {
            color: "#9f1d1d",
            callback: (value) => `${Number(value).toFixed(0)}%`,
          },
        },
      },
    },
  });

  charts.push(chart);
}

function createMarketRsAtrChart(canvas, row) {
  if (typeof Chart === "undefined" || !canvas || !row) {
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
  const atrSeries = calculateAtrPctSeries(history.high ?? [], history.low ?? [], history.price ?? []);
  const selectedAtr = atrSeries.slice(startIndex);
  const atrValues = selectedAtr.filter((value) => Number.isFinite(value));
  const latestAtrIndex = getLastFiniteSeriesIndex(selectedAtr);
  const atrAverage = atrValues.length
    ? atrValues.reduce((sum, value) => sum + value, 0) / atrValues.length
    : null;
  const averageSeries = selectedAtr.map((value) => (Number.isFinite(value) && Number.isFinite(atrAverage) ? Number(atrAverage.toFixed(2)) : null));
  const atrMax = atrValues.length ? Math.max(...atrValues) : Number(row.atr21Pct);
  const yMax = Number.isFinite(atrMax) ? Math.ceil((atrMax + 1) / 2) * 2 : 10;

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: selectedLabels,
      datasets: [
        {
          label: "21D ATR%",
          data: selectedAtr,
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.12)",
          borderWidth: 2.2,
          fill: true,
          tension: 0.16,
          spanGaps: true,
          pointRadius: (context) => (context.dataIndex === latestAtrIndex ? 3 : 0),
          pointHoverRadius: 4,
        },
        {
          label: "Selected-period avg",
          data: averageSeries,
          borderColor: "#94a3b8",
          backgroundColor: "#94a3b8",
          borderWidth: 1.4,
          borderDash: [5, 5],
          tension: 0,
          spanGaps: true,
          pointRadius: 0,
          pointHoverRadius: 0,
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
          display: true,
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
            label: (context) => `${context.dataset.label}: ${formatAtrPercent(Number(context.parsed.y))}`,
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
          min: 0,
          max: yMax,
          grid: { color: "rgba(28,28,26,0.08)" },
          ticks: {
            color: "#2563eb",
            callback: (value) => `${Number(value).toFixed(0)}%`,
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

  const briefingSectorData = getMarketRsBriefingSectorData();
  if (
    state.rsBriefingSector !== "all" &&
    state.rsBriefingSector !== "briefingAll" &&
    !briefingSectorData.groups.some((sector) => sector.key === state.rsBriefingSector)
  ) {
    state.rsBriefingSector = "all";
  }
  const rows = getVisibleMarketRsRows(briefingSectorData);
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
    <button type="button" class="market-rs-chip${state.rsFilter === "all" ? " active" : ""}" data-rs-filter="all">All Ratings</button>
    <button type="button" class="market-rs-chip${state.rsFilter === "newHigh3m" ? " active" : ""}" data-rs-filter="newHigh3m">RS New High (3M)</button>
    <button type="button" class="market-rs-chip${state.rsFilter === "newHigh1y" || state.rsFilter === "newHigh" ? " active" : ""}" data-rs-filter="newHigh1y">RS New High (1Y)</button>
    <button type="button" class="market-rs-chip${state.rsFilter === "priceNewHigh3m" ? " active" : ""}" data-rs-filter="priceNewHigh3m">Stock Price New High (3M)</button>
    <button type="button" class="market-rs-chip${state.rsFilter === "priceNewHigh1y" ? " active" : ""}" data-rs-filter="priceNewHigh1y">Stock Price New High (1Y)</button>
  `;
  const briefingSectorChips = [
    { key: "all", label: "All RS", count: marketRsData.rows?.length ?? 0 },
    { key: "briefingAll", label: "Daily Briefing 전체", count: briefingSectorData.allTickers.length },
    ...briefingSectorData.groups.map((sector) => ({
      key: sector.key,
      label: sector.label,
      count: sector.tickers.length,
    })),
  ]
    .map(
      (sector) => `
        <button
          type="button"
          class="market-rs-chip market-rs-sector-chip${state.rsBriefingSector === sector.key ? " active" : ""}"
          data-rs-briefing-sector="${sector.key}"
        >${sector.label}<small>${sector.count}</small></button>
      `,
    )
    .join("");
  const marketCapChips = MARKET_RS_CAP_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.rsMarketCapRange === range.key ? " active" : ""}"
        data-rs-market-cap="${range.key}"
      >${range.label}</button>
    `,
  ).join("");
  const scoreChips = MARKET_RS_SCORE_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.rsScoreRange === range.key ? " active" : ""}"
        data-rs-score-range="${range.key}"
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
  const leaderRows = sortedLeaderRows;
  const rsCardLimit = ENABLE_RS_LIMITED_CARDS
    ? Math.max(RS_CARD_BATCH_SIZE, Number(state.rsVisibleCardCount) || RS_CARD_BATCH_SIZE)
    : leaderRows.length;
  const rsCardRows = ENABLE_RS_LIMITED_CARDS ? leaderRows.slice(0, rsCardLimit) : leaderRows;
  const hasMoreRsCards = ENABLE_RS_LIMITED_CARDS && rsCardRows.length < leaderRows.length;
  const activeNewHighKind = getMarketRsFilterNewHighKind() ?? "rs";
  const activeNewHighWindow = getMarketRsFilterNewHighWindow() ?? "1y";
  const activeNewHighLabel = getMarketRsNewHighLabel(activeNewHighWindow, activeNewHighKind);
  const leaderCards = rsCardRows
    .map((row) => {
      const score = getMarketRsUniverseScore(row, state.rsUniverse);
      const briefingSectorLabel = formatMarketRsBriefingSectorLabels(row, briefingSectorData);
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
          <div class="market-rs-card-meta">
            <span>ATR%</span>
            <strong>${formatAtrPercent(row.atr21Pct)}</strong>
          </div>
          <div class="market-rs-card-meta">
            <span>Briefing</span>
            <strong>${briefingSectorLabel}</strong>
          </div>
          ${matchesMarketRsNewHighFilter(row, state.rsUniverse, state.rsFilter === "all" ? "newHigh1y" : state.rsFilter) ? `<div class="market-rs-flag">${activeNewHighLabel}</div>` : ""}
        </button>
      `;
    })
    .join("");
  const leaderCardMoreMarkup = hasMoreRsCards
    ? `
      <div class="market-rs-card-more">
        <span>${rsCardRows.length} / ${leaderRows.length} names</span>
        <button type="button" class="total-date-button" data-rs-show-more>더 보기 +${Math.min(RS_CARD_BATCH_SIZE, leaderRows.length - rsCardRows.length)}</button>
      </div>
    `
    : ENABLE_RS_LIMITED_CARDS && leaderRows.length
      ? `<p class="market-rs-empty market-rs-card-count">${leaderRows.length} names all loaded.</p>`
      : "";
  const tableRows = tableSortRows
    .map((row) => {
      const score = getMarketRsUniverseScore(row, state.rsUniverse);
      return `
        <tr data-rs-ticker="${row.ticker}">
          <td>${row.ticker}</td>
          <td>${row.name}</td>
          <td>${formatMarketRsBriefingSectorLabels(row, briefingSectorData, 3)}</td>
          <td>${formatMarketCapCompact(row.marketCap)}</td>
          <td>${formatRsNumber(score)}</td>
          <td>${formatRsNumber(row.rsPeriods?.["1m"])}</td>
          <td>${formatRsNumber(row.rsPeriods?.["3m"])}</td>
          <td>${formatRsNumber(row.rsPeriods?.["6m"])}</td>
          <td>${formatAtrPercent(row.atr21Pct)}</td>
          <td>${formatRsGapPercent(row.distanceTo52wHighPct)}</td>
          <td>${getMarketRsUniverseNewHigh(row, state.rsUniverse, "3m") ? "3M" : "-"} / ${getMarketRsUniverseNewHigh(row, state.rsUniverse, "1y") ? "1Y" : "-"}</td>
          <td>${getMarketRsPriceNewHigh(row, "3m") ? "3M" : "-"} / ${getMarketRsPriceNewHigh(row, "1y") ? "1Y" : "-"}</td>
        </tr>
      `;
    })
    .join("");
  const extension = selected?.extension ?? {};
  const extensionMarkup = ["ema21", "sma50"]
    .map((key) => renderMarketRsExtensionGauge(extension[key]))
    .join("");
  const rsChartSeriesChips = MARKET_RS_CHART_SERIES.map(
    (series) => `
      <button
        type="button"
        class="market-rs-chip market-rs-chart-series-chip${isMarketRsChartSeriesVisible(series.key) ? " active" : ""}"
        data-rs-chart-series="${series.key}"
        style="--series-color:${series.color}"
      >
        <i></i>${series.label}
      </button>
    `,
  ).join("");

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
            <span class="market-rs-pill">${rows.filter((row) => getMarketRsUniverseNewHigh(row, state.rsUniverse, "3m")).length} 3M RS highs</span>
            <span class="market-rs-pill">${rows.filter((row) => getMarketRsUniverseNewHigh(row, state.rsUniverse, "1y")).length} 1Y RS highs</span>
            <span class="market-rs-pill">${rows.filter((row) => getMarketRsPriceNewHigh(row, "3m")).length} 3M price highs</span>
            <span class="market-rs-pill">${rows.filter((row) => getMarketRsPriceNewHigh(row, "1y")).length} 1Y price highs</span>
            <span class="market-rs-pill">${getMarketRsBriefingSectorLabel(state.rsBriefingSector, briefingSectorData)}</span>
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
            <span class="market-rs-control-label">Daily Briefing Sector</span>
            <div class="market-rs-chip-row market-rs-briefing-sector-row">${briefingSectorChips}</div>
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
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">RS Score</span>
            <div class="market-rs-chip-row">${scoreChips}</div>
            <div class="market-rs-cap-custom">
              <label>
                <span>Min</span>
                <input type="number" inputmode="decimal" min="1" max="99" step="1" placeholder="ex. 80" value="${state.rsCustomScoreMin}" data-rs-score-min />
              </label>
              <label>
                <span>Max</span>
                <input type="number" inputmode="decimal" min="1" max="99" step="1" placeholder="optional" value="${state.rsCustomScoreMax}" data-rs-score-max />
              </label>
              <button type="button" class="total-date-button" data-rs-score-apply>Apply</button>
              <button type="button" class="total-date-button total-date-button-secondary" data-rs-score-clear>Clear</button>
            </div>
          </div>
        </div>
      </article>

      <section class="market-rs-layout">
        <article class="us-panel market-rs-leaders">
          <div class="us-section-head">
            <div>
              <h2>RS Leaders</h2>
              <p>${getMarketRsUniverseLabel(state.rsUniverse)} universe leaders by RS Rating. Showing ${leaderRows.length} names.</p>
            </div>
            <div class="market-rs-chip-row">${leaderSortChips}</div>
          </div>
          <div class="market-rs-card-grid">${leaderCards || '<p class="market-rs-empty">검색 결과가 없습니다.</p>'}</div>
          ${leaderCardMoreMarkup}
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
            <div class="market-rs-metric">
              <span>ATR 21D %</span>
              <strong>${formatAtrPercent(selected?.atr21Pct)}</strong>
            </div>
          </div>
          <div class="market-rs-extension-panel">
            <div class="market-rs-extension-title">
              <strong>ATR Extension</strong>
              <span>Distance from 21 EMA and 50 SMA measured as gap % divided by 21D ATR%.</span>
            </div>
            <div class="market-rs-extension-grid">
              ${extensionMarkup || '<p class="market-rs-empty">Extension data will appear after the next RS data refresh.</p>'}
            </div>
          </div>
          <div class="market-rs-chart-control-row">
            <span>Chart Lines</span>
            <div class="market-rs-chip-row">${rsChartSeriesChips}</div>
          </div>
          <div class="chart-wrap market-rs-chart-wrap">
            <canvas data-rs-chart="detail"></canvas>
          </div>
          <div class="market-rs-risk-chart-grid">
            <div>
              <div class="chart-wrap market-rs-mdd-chart-wrap">
                <canvas data-rs-chart="mdd"></canvas>
              </div>
            </div>
            <div>
              <div class="chart-wrap market-rs-mdd-chart-wrap">
                <canvas data-rs-chart="atr"></canvas>
              </div>
            </div>
          </div>
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
                <th>Briefing Sector</th>
                <th>${renderMarketRsSortHeader("Market Cap", "marketCap")}</th>
                <th>${renderMarketRsSortHeader("RS", "rs")}</th>
                <th>${renderMarketRsSortHeader("RS_1M", "rs1m")}</th>
                <th>${renderMarketRsSortHeader("RS_3M", "rs3m")}</th>
                <th>${renderMarketRsSortHeader("RS_6M", "rs6m")}</th>
                <th>${renderMarketRsSortHeader("ATR%", "atr21Pct")}</th>
                <th>${renderMarketRsSortHeader("52W Gap", "gap52w")}</th>
                <th>${renderMarketRsSortHeader("RS NH", "rsNewHigh")}</th>
                <th>${renderMarketRsSortHeader("Price NH", "priceNewHigh")}</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="12">검색 결과가 없습니다.</td></tr>'}</tbody>
          </table>
        </div>
      </article>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-rs-universe]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsUniverse = button.dataset.rsUniverse;
      resetRsCardLimit();
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
      resetRsCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-briefing-sector]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsBriefingSector = button.dataset.rsBriefingSector || "all";
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-market-cap]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsMarketCapRange = button.dataset.rsMarketCap || "all";
      state.rsCustomMarketCapMin = "";
      state.rsCustomMarketCapMax = "";
      state.rsSelectedTicker = "";
      resetRsCardLimit();
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
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  }
  if (rsMarketCapClearButton) {
    rsMarketCapClearButton.addEventListener("click", () => {
      state.rsCustomMarketCapMin = "";
      state.rsCustomMarketCapMax = "";
      state.rsMarketCapRange = "all";
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-rs-score-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsScoreRange = button.dataset.rsScoreRange || "all";
      state.rsCustomScoreMin = "";
      state.rsCustomScoreMax = "";
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  });
  const rsScoreMinInput = usOverviewRoot.querySelector("[data-rs-score-min]");
  const rsScoreMaxInput = usOverviewRoot.querySelector("[data-rs-score-max]");
  const rsScoreApplyButton = usOverviewRoot.querySelector("[data-rs-score-apply]");
  const rsScoreClearButton = usOverviewRoot.querySelector("[data-rs-score-clear]");
  if (rsScoreApplyButton && rsScoreMinInput && rsScoreMaxInput) {
    rsScoreApplyButton.addEventListener("click", () => {
      state.rsCustomScoreMin = rsScoreMinInput.value.trim();
      state.rsCustomScoreMax = rsScoreMaxInput.value.trim();
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  }
  if (rsScoreClearButton) {
    rsScoreClearButton.addEventListener("click", () => {
      state.rsCustomScoreMin = "";
      state.rsCustomScoreMax = "";
      state.rsScoreRange = "all";
      state.rsSelectedTicker = "";
      resetRsCardLimit();
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-rs-leader-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      state.rsLeaderSort = button.dataset.rsLeaderSort || "rs";
      resetRsCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-rs-chart-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const seriesKey = button.dataset.rsChartSeries;
      if (!seriesKey) {
        return;
      }
      state.rsChartSeries = {
        ...state.rsChartSeries,
        [seriesKey]: !isMarketRsChartSeriesVisible(seriesKey),
      };
      syncMarketRsChartSeriesButtons();
      refreshMarketRsChartOnly();
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
  const rsShowMoreButton = usOverviewRoot.querySelector("[data-rs-show-more]");
  if (rsShowMoreButton) {
    rsShowMoreButton.addEventListener("click", () => {
      state.rsVisibleCardCount = Math.min(
        leaderRows.length,
        Math.max(RS_CARD_BATCH_SIZE, Number(state.rsVisibleCardCount) || RS_CARD_BATCH_SIZE) + RS_CARD_BATCH_SIZE,
      );
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-rs-ticker]").forEach((element) => {
    element.addEventListener("click", () => {
      state.rsSelectedTicker = element.dataset.rsTicker;
      render();
    });
  });

  const detailCanvas = usOverviewRoot.querySelector('[data-rs-chart="detail"]');
  if (detailCanvas && selected) {
    createMarketRsChart(detailCanvas, selected);
    createMarketRsMddChart(usOverviewRoot.querySelector('[data-rs-chart="mdd"]'), selected);
    createMarketRsAtrChart(usOverviewRoot.querySelector('[data-rs-chart="atr"]'), selected);
  }
}

function getTrendScoreUniverseLabel(key = state.trendScoreUniverse) {
  return marketTrendScoreData.universes?.[key]?.label ?? key;
}

function getTrendScoreRows() {
  return marketTrendScoreData.rows?.[state.trendScoreUniverse] ?? [];
}

function getTrendScoreBriefingSectorLabel(sectorKey, sectorData = getMarketRsBriefingSectorData()) {
  if (sectorKey === "all") {
    return "All Trend";
  }
  if (sectorKey === "briefingAll") {
    return "Daily Briefing 전체";
  }
  return sectorData.groups.find((sector) => sector.key === sectorKey)?.label ?? "Daily Briefing";
}

function matchesTrendScoreBriefingSector(row, sectorData) {
  if (state.trendScoreBriefingSector === "all") {
    return true;
  }
  if (state.trendScoreBriefingSector === "briefingAll") {
    return sectorData.allTickers.includes(row.ticker);
  }
  const sector = sectorData.groups.find((item) => item.key === state.trendScoreBriefingSector);
  if (!sector) {
    return true;
  }
  return sector.tickers.includes(row.ticker);
}

function getVisibleTrendScoreRows(briefingSectorData = getMarketRsBriefingSectorData()) {
  const query = normalizeMarketTickerSearch(state.query);
  const rows = getTrendScoreRows().filter((row) => {
    if (!matchesTrendScoreCapRange(row)) {
      return false;
    }
    if (!matchesTrendScoreScoreRange(row)) {
      return false;
    }
    if (!matchesTrendScoreClimaxRange(row)) {
      return false;
    }
    if (!matchesTrendScoreBriefingSector(row, briefingSectorData)) {
      return false;
    }
    if (!query) {
      return true;
    }
    return marketTickerSearchTerms(row.ticker, row.name).some((term) => term.includes(query));
  });
  return sortTrendScoreRows(rows);
}

function getSelectedTrendScoreRow(rows) {
  return rows.find((row) => row.ticker === state.trendScoreSelectedTicker) ?? rows[0] ?? null;
}

function getTrendScoreSortValue(row, sortKey) {
  switch (sortKey) {
    case "ticker":
      return row.ticker ?? "";
    case "name":
      return row.name ?? "";
    case "marketCap":
      return row.marketCap ?? Number.NEGATIVE_INFINITY;
    case "score":
      return row.score ?? Number.NEGATIVE_INFINITY;
    case "rank":
      return row.rank ?? Number.POSITIVE_INFINITY;
    case "rankChange":
      return row.rankChange ?? Number.NEGATIVE_INFINITY;
    case "rsRating":
      return row.rsRating ?? Number.NEGATIVE_INFINITY;
    case "climaxScore":
      return row.climaxScore ?? Number.NEGATIVE_INFINITY;
    case "absoluteScore":
      return row.absoluteScore ?? Number.NEGATIVE_INFINITY;
    case "relativeScore":
      return row.relativeScore ?? Number.NEGATIVE_INFINITY;
    case "momentumScore":
      return row.momentumScore ?? Number.NEGATIVE_INFINITY;
    case "atr21Pct":
      return row.atr21Pct ?? Number.NEGATIVE_INFINITY;
    case "deviation50Pct":
      return row.deviation50Pct ?? Number.NEGATIVE_INFINITY;
    default:
      return row.rank ?? Number.POSITIVE_INFINITY;
  }
}

function sortTrendScoreRows(rows) {
  const direction = state.trendScoreTableSortDirection === "asc" ? 1 : -1;
  const sortKey = state.trendScoreTableSortKey ?? "rank";
  return [...rows].sort((left, right) => {
    const leftValue = getTrendScoreSortValue(left, sortKey);
    const rightValue = getTrendScoreSortValue(right, sortKey);
    if (typeof leftValue === "string" || typeof rightValue === "string") {
      const comparison = String(leftValue).localeCompare(String(rightValue));
      if (comparison !== 0) {
        return comparison * direction;
      }
    } else if (leftValue !== rightValue) {
      return (leftValue < rightValue ? -1 : 1) * direction;
    }
    const leftRank = left.rank ?? Number.POSITIVE_INFINITY;
    const rightRank = right.rank ?? Number.POSITIVE_INFINITY;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }
    return String(left.ticker ?? "").localeCompare(String(right.ticker ?? ""));
  });
}

function renderTrendScoreSortHeader(label, sortKey) {
  const active = state.trendScoreTableSortKey === sortKey;
  const arrow = !active ? "" : state.trendScoreTableSortDirection === "asc" ? " ↑" : " ↓";
  return `<button type="button" class="market-rs-sort${active ? " active" : ""}" data-trend-score-sort="${sortKey}">${label}${arrow}</button>`;
}

function renderTrendLeaderSortButton(label, sortKey) {
  const active = state.trendScoreTableSortKey === sortKey;
  const arrow = active ? (state.trendScoreTableSortDirection === "asc" ? "↑" : "↓") : "↕";
  return `
    <button
      type="button"
      class="market-rs-chip trend-score-leader-sort${active ? " active" : ""}"
      data-trend-score-sort="${sortKey}"
      aria-pressed="${active ? "true" : "false"}"
    >
      <span>${label}</span>
      <b>${arrow}</b>
    </button>
  `;
}

function formatTrendRank(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  return `#${Number(value).toFixed(0)}`;
}

function formatTrendChange(value, unit = "") {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  if (Number(value) === 0) {
    return "0";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(0)}${unit}`;
}

function formatTrendSignedPercent(value) {
  if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) {
    return "-";
  }
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

function formatTrendList(items) {
  if (!Array.isArray(items) || !items.length) {
    return "-";
  }
  return items.join(", ");
}

function createTrendScoreChart(canvas, row) {
  if (typeof Chart === "undefined" || !row) {
    return;
  }
  const universeKey = state.trendScoreUniverse;
  const history = marketTrendScoreData.histories?.[universeKey]?.[row.ticker];
  const labels = marketTrendScoreData.historyDates ?? [];
  if (!history || !labels.length) {
    return;
  }
  const minStart = labels[0];
  const latestDate = labels[labels.length - 1];
  const startDate = shiftDateByRange(latestDate, state.trendScoreRange, minStart);
  const startIndex = Math.max(0, labels.findIndex((label) => label >= startDate));
  const selectedLabels = labels.slice(startIndex);
  const selectedRanks = (history.rank ?? []).slice(startIndex);
  const selectedScores = (history.score ?? []).slice(startIndex);
  const selectedClimaxScores = (history.climaxScore ?? []).slice(startIndex);
  const rankValues = selectedRanks.filter((value) => Number.isFinite(value));
  const maxRank = rankValues.length ? Math.max(...rankValues) : Math.max(20, row.rank ?? 20);
  const rankAxisMax = Math.min(Math.max(20, Math.ceil(maxRank / 10) * 10), getTrendScoreRows().length || 100);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: selectedLabels,
      datasets: [
        {
          label: "Rank",
          data: selectedRanks,
          borderColor: "#15803d",
          backgroundColor: "#15803d",
          borderWidth: 2.6,
          tension: 0.16,
          pointRadius: 1.8,
          pointHoverRadius: 4,
          yAxisID: "y",
        },
        {
          label: "Trend Score",
          data: selectedScores,
          borderColor: "#111827",
          backgroundColor: "#111827",
          borderWidth: 2,
          tension: 0.16,
          pointRadius: 1.8,
          pointHoverRadius: 4,
          yAxisID: "y1",
        },
        {
          label: "Climax Score",
          data: selectedClimaxScores,
          borderColor: "#f97316",
          backgroundColor: "#f97316",
          borderWidth: 2,
          tension: 0.16,
          pointRadius: 1.8,
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
          labels: { color: "#66665f", usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            title: (items) => items?.[0]?.label ?? "",
            label: (context) => {
              if (context.dataset.yAxisID === "y") {
                return `Rank: ${formatTrendRank(context.parsed.y)}`;
              }
              return `${context.dataset.label}: ${formatRsNumber(context.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          afterBuildTicks: (axis) => {
            const indexes = buildRegularDateTickIndexes(selectedLabels, state.trendScoreRange);
            axis.ticks = indexes.map((index) => ({ value: index }));
          },
          ticks: {
            color: "#8a8a83",
            autoSkip: false,
            maxRotation: 0,
            callback: (_, index, ticks) => {
              const labelIndex = ticks?.[index]?.value;
              return formatRangeAxisDate(selectedLabels[labelIndex], state.trendScoreRange);
            },
          },
        },
        y: {
          position: "left",
          reverse: true,
          min: 1,
          max: rankAxisMax,
          grid: { color: "rgba(28,28,26,0.08)" },
          ticks: {
            color: "#15803d",
            callback: (value) => `#${value}`,
          },
        },
        y1: {
          position: "right",
          min: 0,
          max: 10,
          grid: { drawOnChartArea: false },
          ticks: { color: "#111827", stepSize: 2 },
        },
      },
    },
  });
  charts.push(chart);
}

function renderMarketTrendScoreOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  const briefingSectorData = getMarketRsBriefingSectorData();
  if (
    state.trendScoreBriefingSector !== "all" &&
    state.trendScoreBriefingSector !== "briefingAll" &&
    !briefingSectorData.groups.some((sector) => sector.key === state.trendScoreBriefingSector)
  ) {
    state.trendScoreBriefingSector = "all";
  }
  const rows = getVisibleTrendScoreRows(briefingSectorData);
  const selected = getSelectedTrendScoreRow(rows);
  if (selected) {
    state.trendScoreSelectedTicker = selected.ticker;
  }

  const universeChips = Object.entries(marketTrendScoreData.universes ?? {})
    .map(
      ([key, meta]) => `
        <button
          type="button"
          class="market-rs-chip${state.trendScoreUniverse === key ? " active" : ""}"
          data-trend-score-universe="${key}"
        >${meta.label}</button>
      `,
    )
    .join("");
  const briefingSectorChips = [
    { key: "all", label: "All Trend", count: getTrendScoreRows().length },
    { key: "briefingAll", label: "Daily Briefing 전체", count: briefingSectorData.allTickers.length },
    ...briefingSectorData.groups.map((sector) => ({
      key: sector.key,
      label: sector.label,
      count: sector.tickers.length,
    })),
  ]
    .map(
      (sector) => `
        <button
          type="button"
          class="market-rs-chip market-rs-sector-chip${state.trendScoreBriefingSector === sector.key ? " active" : ""}"
          data-trend-score-briefing-sector="${sector.key}"
        >${sector.label}<small>${sector.count}</small></button>
      `,
    )
    .join("");
  const marketCapChips = MARKET_RS_CAP_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.trendScoreMarketCapRange === range.key ? " active" : ""}"
        data-trend-score-market-cap="${range.key}"
      >${range.label}</button>
    `,
  ).join("");
  const scoreChips = TREND_SCORE_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.trendScoreScoreRange === range.key ? " active" : ""}"
        data-trend-score-score-range="${range.key}"
      >${range.label}</button>
    `,
  ).join("");
  const climaxChips = CLIMAX_SCORE_RANGES.map(
    (range) => `
      <button
        type="button"
        class="market-rs-chip${state.trendScoreClimaxRange === range.key ? " active" : ""}"
        data-trend-score-climax-range="${range.key}"
      >${range.label}</button>
    `,
  ).join("");
  const leaderSortControls = [
    ["Score", "score"],
    ["Market Cap", "marketCap"],
    ["Climax", "climaxScore"],
  ]
    .map(([label, sortKey]) => renderTrendLeaderSortButton(label, sortKey))
    .join("");
  const trendScoreCardLimit = ENABLE_TREND_SCORE_LIMITED_CARDS
    ? Math.max(TREND_SCORE_CARD_BATCH_SIZE, Number(state.trendScoreVisibleCardCount) || TREND_SCORE_CARD_BATCH_SIZE)
    : rows.length;
  const trendScoreCardRows = ENABLE_TREND_SCORE_LIMITED_CARDS ? rows.slice(0, trendScoreCardLimit) : rows;
  const hasMoreTrendScoreCards = ENABLE_TREND_SCORE_LIMITED_CARDS && trendScoreCardRows.length < rows.length;
  const leaderCards = trendScoreCardRows
    .map(
      (row) => `
        <button
          type="button"
          class="market-rs-card${state.trendScoreSelectedTicker === row.ticker ? " active" : ""}"
          data-trend-score-ticker="${row.ticker}"
        >
          <div class="market-rs-card-top">
            <span class="market-rs-card-ticker">${row.ticker}</span>
            <span class="market-rs-card-score">${formatTrendRank(row.rank)}</span>
          </div>
          <p class="market-rs-card-name">${row.name}</p>
          <p class="market-rs-card-cap">${formatMarketCapCompact(row.marketCap)}</p>
          <div class="market-rs-card-meta">
            <span>Score</span>
            <strong>${formatRsNumber(row.score)}</strong>
          </div>
          <div class="market-rs-card-meta">
            <span>RS Trend</span>
            <strong>${formatRsNumber(row.relativeScore)}/4</strong>
          </div>
          <div class="market-rs-card-meta">
            <span>Climax</span>
            <strong>${formatRsNumber(row.climaxScore)}</strong>
          </div>
          <div class="market-rs-flag">${row.zone ?? "-"}</div>
        </button>
      `,
    )
    .join("");
  const leaderCardMoreMarkup = hasMoreTrendScoreCards
    ? `
      <div class="trend-score-card-more">
        <span>${trendScoreCardRows.length} / ${rows.length} names</span>
        <button type="button" class="total-date-button" data-trend-score-show-more>더 보기 +${Math.min(TREND_SCORE_CARD_BATCH_SIZE, rows.length - trendScoreCardRows.length)}</button>
      </div>
    `
    : ENABLE_TREND_SCORE_LIMITED_CARDS && rows.length
      ? `<p class="market-rs-empty trend-score-card-count">${rows.length} names all loaded.</p>`
      : "";
  const tableRows = rows
    .map(
      (row) => `
        <tr data-trend-score-ticker="${row.ticker}">
          <td>${formatTrendRank(row.rank)}</td>
          <td>${row.ticker}</td>
          <td>${row.name}</td>
          <td>${formatMarketCapCompact(row.marketCap)}</td>
          <td>${formatRsNumber(row.score)}</td>
          <td>${formatTrendChange(row.rankChange)}</td>
          <td>${formatRsNumber(row.absoluteScore)}/4</td>
          <td>${formatRsNumber(row.relativeScore)}/4</td>
          <td>${formatRsNumber(row.momentumScore)}/2</td>
          <td>${formatRsNumber(row.climaxScore)}</td>
          <td>${formatRsNumber(row.rsRating)}</td>
          <td>${formatAtrPercent(row.atr21Pct)}</td>
          <td>${formatTrendSignedPercent(row.deviation50Pct)}</td>
          <td>${formatTrendList(row.climaxFlags)}</td>
          <td>${row.state ?? "-"}</td>
        </tr>
      `,
    )
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-rs-overview trend-score-overview">
      <article class="us-panel">
        <div class="us-section-head market-rs-head">
          <div>
            <h2>추세스코어</h2>
            <p>${marketTrendScoreData.scoring?.description ?? ""}</p>
          </div>
          <div class="market-rs-summary-pills">
            <span class="market-rs-pill">As of ${marketTrendScoreData.updatedAt ?? "-"}</span>
            <span class="market-rs-pill">${getTrendScoreUniverseLabel()}</span>
            <span class="market-rs-pill">${getTrendScoreBriefingSectorLabel(state.trendScoreBriefingSector, briefingSectorData)}</span>
            <span class="market-rs-pill">${rows.length} names</span>
          </div>
        </div>
        <div class="market-rs-controls">
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Universe</span>
            <div class="market-rs-chip-row">${universeChips}</div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Daily Briefing Sector</span>
            <div class="market-rs-chip-row market-rs-briefing-sector-row">${briefingSectorChips}</div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Market Cap</span>
            <div class="market-rs-chip-row">${marketCapChips}</div>
            <div class="market-rs-cap-custom">
              <label>
                <span>Min</span>
                <input type="text" inputmode="decimal" placeholder="ex. 5B" value="${state.trendScoreCustomMarketCapMin}" data-trend-score-market-cap-min />
              </label>
              <label>
                <span>Max</span>
                <input type="text" inputmode="decimal" placeholder="optional" value="${state.trendScoreCustomMarketCapMax}" data-trend-score-market-cap-max />
              </label>
              <button type="button" class="total-date-button" data-trend-score-market-cap-apply>Apply</button>
              <button type="button" class="total-date-button total-date-button-secondary" data-trend-score-market-cap-clear>Clear</button>
            </div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Trend Score</span>
            <div class="market-rs-chip-row">${scoreChips}</div>
            <div class="market-rs-cap-custom">
              <label>
                <span>Min</span>
                <input type="number" inputmode="decimal" min="0" max="10" step="0.1" placeholder="ex. 8" value="${state.trendScoreCustomScoreMin}" data-trend-score-score-min />
              </label>
              <label>
                <span>Max</span>
                <input type="number" inputmode="decimal" min="0" max="10" step="0.1" placeholder="optional" value="${state.trendScoreCustomScoreMax}" data-trend-score-score-max />
              </label>
              <button type="button" class="total-date-button" data-trend-score-score-apply>Apply</button>
              <button type="button" class="total-date-button total-date-button-secondary" data-trend-score-score-clear>Clear</button>
            </div>
          </div>
          <div class="market-rs-control-block">
            <span class="market-rs-control-label">Climax Score</span>
            <div class="market-rs-chip-row">${climaxChips}</div>
            <div class="market-rs-cap-custom">
              <label>
                <span>Min</span>
                <input type="number" inputmode="decimal" min="0" step="1" placeholder="ex. 4" value="${state.trendScoreCustomClimaxMin}" data-trend-score-climax-min />
              </label>
              <label>
                <span>Max</span>
                <input type="number" inputmode="decimal" min="0" step="1" placeholder="optional" value="${state.trendScoreCustomClimaxMax}" data-trend-score-climax-max />
              </label>
              <button type="button" class="total-date-button" data-trend-score-climax-apply>Apply</button>
              <button type="button" class="total-date-button total-date-button-secondary" data-trend-score-climax-clear>Clear</button>
            </div>
          </div>
        </div>
      </article>

      <section class="market-rs-layout trend-score-layout">
        <article class="us-panel market-rs-leaders">
          <div class="us-section-head">
            <div>
              <h2>Trend Leaders</h2>
              <p>${getTrendScoreUniverseLabel()} / ${getTrendScoreBriefingSectorLabel(state.trendScoreBriefingSector, briefingSectorData)} ranked by 10-point trend score and tie-breakers.</p>
            </div>
            <div class="trend-score-leader-sortbar" aria-label="Trend leader sort">
              ${leaderSortControls}
            </div>
          </div>
          <div class="market-rs-card-grid trend-score-card-grid">${leaderCards || '<p class="market-rs-empty">검색 결과가 없습니다.</p>'}</div>
          ${leaderCardMoreMarkup}
        </article>

        <article class="us-panel market-rs-detail">
          <div class="us-section-head">
            <div>
              <h2>${selected?.ticker ?? "-"}</h2>
              <p>${selected?.name ?? "Select a ticker from the table or search box."}</p>
            </div>
            <span class="market-rs-detail-score">${formatRsNumber(selected?.score)}</span>
          </div>
          <div class="market-rs-metrics">
            <div class="market-rs-metric">
              <span>Rank</span>
              <strong>${formatTrendRank(selected?.rank)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Rank Δ</span>
              <strong>${formatTrendChange(selected?.rankChange)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Score</span>
              <strong>${formatRsNumber(selected?.score)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Abs / RS / Mo</span>
              <strong>${formatRsNumber(selected?.absoluteScore)}/${formatRsNumber(selected?.relativeScore)}/${formatRsNumber(selected?.momentumScore)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Climax</span>
              <strong>${formatRsNumber(selected?.climaxScore)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Price</span>
              <strong>${formatUsStockPrice(selected?.price)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>50DMA Gap</span>
              <strong>${formatTrendSignedPercent(selected?.deviation50Pct)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>ATR 21D %</span>
              <strong>${formatAtrPercent(selected?.atr21Pct)}</strong>
            </div>
            <div class="market-rs-metric">
              <span>Base Weight</span>
              <strong>${formatTrendSignedPercent(selected?.baseWeightPct)}</strong>
            </div>
          </div>
          <div class="market-rs-extension-panel">
            <div class="market-rs-extension-title">
              <strong>Scoring Logic</strong>
              <span>① Price/50DMA/200DMA 4점 + ② 벤치마크 대비 RS 라인 추세 4점 + ③ 단기 모멘텀 2점. Climax는 OHLCV 기반 급등, 21EMA/ATR Extension 과열, 거래량 확장, 갭상승, 일중반전, Stalling, Shellac을 별도로 점검합니다.</span>
            </div>
            <div class="market-rs-extension-grid">
              <article class="market-rs-extension-card">
                <div class="market-rs-extension-head"><strong>Absolute</strong><b>${formatRsNumber(selected?.absoluteScore)}/4</b></div>
                <div class="market-rs-extension-stats"><span>20DMA gap <strong>${formatTrendSignedPercent(selected?.deviation20Pct)}</strong></span><span>200DMA gap <strong>${formatTrendSignedPercent(selected?.deviation200Pct)}</strong></span></div>
              </article>
              <article class="market-rs-extension-card">
                <div class="market-rs-extension-head"><strong>Relative</strong><b>${formatRsNumber(selected?.relativeScore)}/4</b></div>
                <div class="market-rs-extension-stats"><span>RS Rating <strong>${formatRsNumber(selected?.rsRating)}</strong></span><span>State <strong>${selected?.state ?? "-"}</strong></span></div>
              </article>
              <article class="market-rs-extension-card">
                <div class="market-rs-extension-head"><strong>ATR Ext</strong><b>${formatAtrMultiple(selected?.atrExt50)}</b></div>
                <div class="market-rs-extension-stats"><span>10EMA <strong>${formatAtrMultiple(selected?.atrExt10)}</strong></span><span>20DMA <strong>${formatAtrMultiple(selected?.atrExt20)}</strong></span><span>200DMA <strong>${formatAtrMultiple(selected?.atrExt200)}</strong></span></div>
              </article>
              <article class="market-rs-extension-card${Number(selected?.climaxScore) >= 4 ? " is-stretched" : ""}">
                <div class="market-rs-extension-head"><strong>Climax</strong><b>${formatRsNumber(selected?.climaxScore)}</b></div>
                <div class="market-rs-extension-stats"><span>Flags <strong>${formatTrendList(selected?.climaxFlags)}</strong></span><span>Extended <strong>${formatTrendList(selected?.extendedFlags)}</strong></span></div>
              </article>
            </div>
          </div>
          <div class="chart-wrap market-rs-chart-wrap">
            <canvas data-trend-score-chart="detail"></canvas>
          </div>
          <p class="market-rs-chart-caption">Left axis: daily rank, inverted so #1 is at the top. Right axis: 0-10 trend and climax scores. Hover shows the exact date.</p>
        </article>
      </section>

      <article class="us-panel market-rs-table-panel">
        <div class="us-section-head">
          <div>
            <h2>Full Trend Score Table</h2>
            <p>Search from the top bar, switch NASDAQ100/S&P500, then click any row to inspect daily rank history.</p>
          </div>
        </div>
        <div class="market-rs-table-wrap">
          <table class="market-rs-table trend-score-table">
            <thead>
              <tr>
                <th>${renderTrendScoreSortHeader("Rank", "rank")}</th>
                <th>${renderTrendScoreSortHeader("Ticker", "ticker")}</th>
                <th>${renderTrendScoreSortHeader("Name", "name")}</th>
                <th>${renderTrendScoreSortHeader("Market Cap", "marketCap")}</th>
                <th>${renderTrendScoreSortHeader("Score", "score")}</th>
                <th>${renderTrendScoreSortHeader("Rank Δ", "rankChange")}</th>
                <th>${renderTrendScoreSortHeader("Abs", "absoluteScore")}</th>
                <th>${renderTrendScoreSortHeader("RS", "relativeScore")}</th>
                <th>${renderTrendScoreSortHeader("Mo", "momentumScore")}</th>
                <th>${renderTrendScoreSortHeader("Climax", "climaxScore")}</th>
                <th>${renderTrendScoreSortHeader("RS Rating", "rsRating")}</th>
                <th>${renderTrendScoreSortHeader("ATR%", "atr21Pct")}</th>
                <th>${renderTrendScoreSortHeader("50DMA Gap", "deviation50Pct")}</th>
                <th>Climax Flags</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>${tableRows || '<tr><td colspan="15">검색 결과가 없습니다.</td></tr>'}</tbody>
          </table>
        </div>
      </article>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-trend-score-universe]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendScoreUniverse = button.dataset.trendScoreUniverse || "all";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-trend-score-briefing-sector]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendScoreBriefingSector = button.dataset.trendScoreBriefingSector || "all";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  });
  usOverviewRoot.querySelectorAll("[data-trend-score-market-cap]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendScoreMarketCapRange = button.dataset.trendScoreMarketCap || "all";
      state.trendScoreCustomMarketCapMin = "";
      state.trendScoreCustomMarketCapMax = "";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  });
  const trendScoreMarketCapMinInput = usOverviewRoot.querySelector("[data-trend-score-market-cap-min]");
  const trendScoreMarketCapMaxInput = usOverviewRoot.querySelector("[data-trend-score-market-cap-max]");
  const trendScoreMarketCapApplyButton = usOverviewRoot.querySelector("[data-trend-score-market-cap-apply]");
  const trendScoreMarketCapClearButton = usOverviewRoot.querySelector("[data-trend-score-market-cap-clear]");
  if (trendScoreMarketCapApplyButton && trendScoreMarketCapMinInput && trendScoreMarketCapMaxInput) {
    trendScoreMarketCapApplyButton.addEventListener("click", () => {
      state.trendScoreCustomMarketCapMin = trendScoreMarketCapMinInput.value.trim();
      state.trendScoreCustomMarketCapMax = trendScoreMarketCapMaxInput.value.trim();
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  if (trendScoreMarketCapClearButton) {
    trendScoreMarketCapClearButton.addEventListener("click", () => {
      state.trendScoreCustomMarketCapMin = "";
      state.trendScoreCustomMarketCapMax = "";
      state.trendScoreMarketCapRange = "all";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-trend-score-score-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendScoreScoreRange = button.dataset.trendScoreScoreRange || "all";
      state.trendScoreCustomScoreMin = "";
      state.trendScoreCustomScoreMax = "";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  });
  const trendScoreScoreMinInput = usOverviewRoot.querySelector("[data-trend-score-score-min]");
  const trendScoreScoreMaxInput = usOverviewRoot.querySelector("[data-trend-score-score-max]");
  const trendScoreScoreApplyButton = usOverviewRoot.querySelector("[data-trend-score-score-apply]");
  const trendScoreScoreClearButton = usOverviewRoot.querySelector("[data-trend-score-score-clear]");
  if (trendScoreScoreApplyButton && trendScoreScoreMinInput && trendScoreScoreMaxInput) {
    trendScoreScoreApplyButton.addEventListener("click", () => {
      state.trendScoreCustomScoreMin = trendScoreScoreMinInput.value.trim();
      state.trendScoreCustomScoreMax = trendScoreScoreMaxInput.value.trim();
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  if (trendScoreScoreClearButton) {
    trendScoreScoreClearButton.addEventListener("click", () => {
      state.trendScoreCustomScoreMin = "";
      state.trendScoreCustomScoreMax = "";
      state.trendScoreScoreRange = "all";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-trend-score-climax-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.trendScoreClimaxRange = button.dataset.trendScoreClimaxRange || "all";
      state.trendScoreCustomClimaxMin = "";
      state.trendScoreCustomClimaxMax = "";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  });
  const trendScoreClimaxMinInput = usOverviewRoot.querySelector("[data-trend-score-climax-min]");
  const trendScoreClimaxMaxInput = usOverviewRoot.querySelector("[data-trend-score-climax-max]");
  const trendScoreClimaxApplyButton = usOverviewRoot.querySelector("[data-trend-score-climax-apply]");
  const trendScoreClimaxClearButton = usOverviewRoot.querySelector("[data-trend-score-climax-clear]");
  if (trendScoreClimaxApplyButton && trendScoreClimaxMinInput && trendScoreClimaxMaxInput) {
    trendScoreClimaxApplyButton.addEventListener("click", () => {
      state.trendScoreCustomClimaxMin = trendScoreClimaxMinInput.value.trim();
      state.trendScoreCustomClimaxMax = trendScoreClimaxMaxInput.value.trim();
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  if (trendScoreClimaxClearButton) {
    trendScoreClimaxClearButton.addEventListener("click", () => {
      state.trendScoreCustomClimaxMin = "";
      state.trendScoreCustomClimaxMax = "";
      state.trendScoreClimaxRange = "all";
      state.trendScoreSelectedTicker = "";
      resetTrendScoreCardLimit();
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-trend-score-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextSortKey = button.dataset.trendScoreSort;
      if (state.trendScoreTableSortKey === nextSortKey) {
        state.trendScoreTableSortDirection = state.trendScoreTableSortDirection === "asc" ? "desc" : "asc";
      } else {
        state.trendScoreTableSortKey = nextSortKey || "rank";
        state.trendScoreTableSortDirection = nextSortKey === "rank" || nextSortKey === "ticker" || nextSortKey === "name" ? "asc" : "desc";
      }
      resetTrendScoreCardLimit();
      render();
    });
  });
  const trendScoreShowMoreButton = usOverviewRoot.querySelector("[data-trend-score-show-more]");
  if (trendScoreShowMoreButton) {
    trendScoreShowMoreButton.addEventListener("click", () => {
      state.trendScoreVisibleCardCount = Math.min(
        rows.length,
        Math.max(TREND_SCORE_CARD_BATCH_SIZE, Number(state.trendScoreVisibleCardCount) || TREND_SCORE_CARD_BATCH_SIZE) + TREND_SCORE_CARD_BATCH_SIZE,
      );
      render();
    });
  }
  usOverviewRoot.querySelectorAll("[data-trend-score-ticker]").forEach((element) => {
    element.addEventListener("click", () => {
      state.trendScoreSelectedTicker = element.dataset.trendScoreTicker;
      render();
    });
  });

  const detailCanvas = usOverviewRoot.querySelector('[data-trend-score-chart="detail"]');
  if (detailCanvas && selected) {
    createTrendScoreChart(detailCanvas, selected);
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

function formatMemoryDollar(value, unit = "USD") {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return `$${Number(value).toFixed(3)} ${unit}`;
}

function formatMemoryPremium(value) {
  if (!Number.isFinite(value)) {
    return "-";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(1)}%`;
}

function getMemorySpotCheckValues(row) {
  const runtime = row.spotKey ? memorySpotRuntime.items[row.spotKey] : null;
  const spotPrice = Number.isFinite(runtime?.latestValue) ? runtime.latestValue : row.spotPrice;
  const spotDate = runtime?.latestDate ?? row.spotDate ?? null;
  const contractPrice = row.contractPrice;
  const premiumPct = Number.isFinite(spotPrice) && Number.isFinite(contractPrice) && contractPrice !== 0
    ? ((spotPrice - contractPrice) / contractPrice) * 100
    : row.premiumPct;
  return { spotPrice, spotDate, premiumPct };
}

function formatMemoryRangeValue(range) {
  if (!range || !Number.isFinite(range.low) || !Number.isFinite(range.high)) {
    return "-";
  }
  return range.label ?? `${range.low}-${range.high}%`;
}

function getMemoryRangeMidpoint(range) {
  if (!range || !Number.isFinite(range.low) || !Number.isFinite(range.high)) {
    return null;
  }
  return Number(((range.low + range.high) / 2).toFixed(1));
}

function createMemoryContractGuideChart(canvas, rows) {
  if (typeof Chart === "undefined" || !Array.isArray(rows) || !rows.length) {
    return;
  }

  const labels = rows.map((row) => row.period);
  const series = [
    { key: "dram", label: "DRAM", color: "#2563eb" },
    { key: "nand", label: "NAND", color: "#ea580c" },
    { key: "hbm", label: "HBM / Blended", color: "#0f766e" },
  ];

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: series.map((item) => ({
        label: item.label,
        data: rows.map((row) => getMemoryRangeMidpoint(row[item.key])),
        tension: 0.25,
        spanGaps: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHitRadius: 10,
        borderWidth: 2.6,
        backgroundColor: item.color,
        borderColor: item.color,
      })),
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
            label: (context) => `${context.dataset.label}: ${Number(context.parsed.y).toFixed(1)}% midpoint`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#8d8d86", maxRotation: 0 },
          border: { color: "#d8d8d2" },
        },
        y: {
          ticks: { color: "#8d8d86", callback: (value) => `${value}%`, maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
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
  { key: "ytd", label: "YTD" },
  { key: "1y", label: "1Y" },
  { key: "3y", label: "3Y" },
  { key: "max", label: "Max" },
];

function getMemorySpotRange(targetKey) {
  return state.memorySpotRanges?.[targetKey] ?? "3y";
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

function getOrnnGpuSeriesEntries() {
  return Object.entries(ornnGpuIndexData?.series ?? {});
}

function getActiveOrnnGpuSeries() {
  return ornnGpuIndexData?.series?.[state.ornnGpuKey] ?? getOrnnGpuSeriesEntries()[0]?.[1] ?? null;
}

function getOrnnGpuRangeConfig() {
  return (ornnGpuIndexData.ranges ?? []).find((range) => range.key === state.ornnGpuRange)
    ?? (ornnGpuIndexData.ranges ?? [])[0]
    ?? { key: "3m", label: "3M", days: 90 };
}

function buildOrnnGpuChartPayload(series) {
  const dates = series?.dates ?? [];
  const values = series?.values ?? [];
  const range = getOrnnGpuRangeConfig();
  const startDate = range.key === "ytd" && dates.length ? shiftDateByRange(dates[dates.length - 1], "ytd", dates[0]) : "";
  const rangeDays = Number(range.days) || 90;
  const startIndex = startDate
    ? Math.max(0, dates.findIndex((label) => label >= startDate))
    : Math.max(0, dates.length - rangeDays);
  return {
    labels: dates.slice(startIndex),
    datasets: [
      {
        label: series?.label ?? "GPU Index",
        data: values.slice(startIndex),
        borderColor: series?.color ?? "#111827",
        backgroundColor: "rgba(17, 24, 39, 0.05)",
        borderWidth: 2.8,
        tension: 0.22,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 10,
        spanGaps: true,
      },
    ],
  };
}

function createOrnnGpuIndexChart(canvas, series) {
  if (typeof Chart === "undefined" || !series) {
    return;
  }

  const payload = buildOrnnGpuChartPayload(series);
  const allValues = payload.datasets.flatMap((dataset) => dataset.data.filter((value) => Number.isFinite(value)));
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const maxValue = allValues.length ? Math.max(...allValues) : 5;
  const yMin = Math.max(0, Math.floor(minValue * 0.9 * 10) / 10);
  const yMax = Math.ceil(maxValue * 1.1 * 10) / 10;
  const selectedTickIndexes = getMacroTickIndexes(payload.labels, state.ornnGpuRange, canvas?.clientWidth ?? 0);
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
          display: false,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            title: (tooltipItems) => tooltipItems?.[0]?.label ?? "",
            label: (context) => `${context.dataset.label}: ${formatGpuCloudValue(context.parsed.y)}`,
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
              return label ? formatRangeAxisDate(label, state.ornnGpuRange) : "";
            },
          },
          border: { color: "#d8d8d2" },
        },
        y: {
          min: yMin,
          max: yMax,
          ticks: { color: "#8d8d86", callback: (value) => formatGpuCloudValue(value), maxTicksLimit: 6 },
          grid: { color: "rgba(70, 70, 66, 0.10)" },
          border: { color: "#d8d8d2" },
        },
      },
    },
  });

  charts.push(chart);
}

function renderGpuCloudOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.innerHTML = "";
  companyGrid.classList.add("hidden");

  if (!gpuCloudRuntime.loaded) {
    hydrateGpuCloudRuntimeFromLocal();
  }

  const semiSeries = getGpuSemiAnalysisSeries();
  const ornnSeriesEntries = getOrnnGpuSeriesEntries();
  const activeOrnnSeries = getActiveOrnnGpuSeries();
  const ornnGpuTabsMarkup = ornnSeriesEntries
    .map(
      ([key, item]) => `
        <button
          type="button"
          class="total-series-chip${state.ornnGpuKey === key ? " active" : ""}"
          data-ornn-gpu="${key}"
        >
          <span class="total-series-dot" style="background:${item.color}"></span>
          ${item.label}
        </button>`,
    )
    .join("");
  const ornnRangeMarkup = (ornnGpuIndexData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.ornnGpuRange === range.key ? " active" : ""}"
          data-ornn-gpu-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");

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
      <section class="memory-panel-grid memory-panel-grid-wide gpu-rental-chart-grid">
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
              <h3>Ornn Compute Price Index</h3>
              <p>GPU rental spot index from dashboard.ornnai.com. Use the chip selector to switch hardware.</p>
            </div>
            <div class="m7-range-row">${ornnRangeMarkup}</div>
          </div>
          <div class="total-series-row total-series-row-left">
            ${ornnGpuTabsMarkup}
          </div>
          <div class="memory-card-meta gpu-term-meta">
            <span>${ornnGpuIndexData.source?.name ?? "Ornn Compute Price Index"}</span>
            <span>${activeOrnnSeries?.latestDate ?? "-"} ${Number.isFinite(activeOrnnSeries?.latestValue) ? `| ${formatGpuCloudValue(activeOrnnSeries.latestValue)}` : ""}</span>
            <span>${formatGpuCloudChange(activeOrnnSeries?.latestChangePct)}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Active GPU</span>
            <span class="memory-stat-value">${activeOrnnSeries?.apiName ?? activeOrnnSeries?.label ?? "-"}</span>
          </div>
          <div class="memory-stat-row">
            <span class="memory-stat-label">Source</span>
            <span class="memory-stat-value">dashboard.ornnai.com public index API</span>
          </div>
          <div class="memory-chart-wrap">
            <canvas data-ornn-gpu-index="overview"></canvas>
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

  usOverviewRoot.querySelectorAll("[data-ornn-gpu]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ornnGpuKey = button.dataset.ornnGpu || state.ornnGpuKey;
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-ornn-gpu-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ornnGpuRange = button.dataset.ornnGpuRange || state.ornnGpuRange;
      render();
    });
  });

  const ornnCanvas = usOverviewRoot.querySelector('[data-ornn-gpu-index="overview"]');
  if (ornnCanvas && activeOrnnSeries) {
    createOrnnGpuIndexChart(ornnCanvas, activeOrnnSeries);
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
  const contractGuide = memorySpotData.trendforceContractGuide ?? {};
  const contractRows = contractGuide.quarterlyRows ?? [];
  const contractTableRows = contractRows
    .map(
      (row) => `
        <div class="memory-contract-row">
          <span>
            <strong>${row.period}</strong>
            <small>${row.basis}</small>
            <a href="${row.sourceUrl}" target="_blank" rel="noreferrer">${row.sourceTitle}</a>
            ${row.nandSourceUrl ? `<a href="${row.nandSourceUrl}" target="_blank" rel="noreferrer">${row.nandSourceTitle}</a>` : ""}
            ${row.hbmSourceUrl ? `<a href="${row.hbmSourceUrl}" target="_blank" rel="noreferrer">${row.hbmSourceTitle}</a>` : ""}
          </span>
          <span>${formatMemoryRangeValue(row.dram)}</span>
          <span>${formatMemoryRangeValue(row.nand)}</span>
          <span>${formatMemoryRangeValue(row.hbm)}</span>
        </div>`,
    )
    .join("");
  const monthlyWatchRows = (contractGuide.monthlyRows ?? [])
    .map(
      (row) => `
        <div class="memory-note-row">
          <span>
            <strong>${row.period} ${row.segment}</strong>
            <small>${row.basis}</small>
            <a href="${row.sourceUrl}" target="_blank" rel="noreferrer">${row.sourceTitle}</a>
          </span>
          <span>${row.range}</span>
        </div>`,
    )
    .join("");
  const spotContractChecks = memorySpotData.spotContractChecks ?? {};
  const spotContractRows = (spotContractChecks.rows ?? [])
    .map((row) => {
      const check = getMemorySpotCheckValues(row);
      return `
        <div class="memory-spot-contract-row">
          <span>
            <strong>${row.item}</strong>
            <small>${row.note}</small>
          </span>
          <span>
            <strong>${formatMemoryDollar(check.spotPrice, row.spotUnit)}</strong>
            <small>${check.spotDate ?? "-"}</small>
          </span>
          <span>
            <strong>${formatMemoryDollar(row.contractPrice, row.contractUnit)}</strong>
            <small>${row.contractDate ?? "not public"}</small>
          </span>
          <span>${formatMemoryPremium(check.premiumPct)}</span>
        </div>`;
    })
    .join("");

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
        <h2>Memory Data Dashboard</h2>
        <p>Spot benchmarks plus TrendForce contract-price guides for DRAM, NAND, and HBM</p>
      </div>
      <section class="memory-banner">
        <div>
          <strong>Source</strong>
          <span>${memorySpotData.source?.name ?? "Public memory data dashboard"}</span>
        </div>
        <div>
          <strong>Updated</strong>
          <span>${memorySpotRuntime.updatedAt || memorySpotData.updatedAt || (memorySpotRuntime.loading ? "Loading..." : "Awaiting first scrape")}</span>
        </div>
        <div>
          <strong>Coverage</strong>
          <span>${featuredItems.length} spot benchmarks + contract guide</span>
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
      <section class="memory-panel memory-contract-panel">
        <div class="us-panel-head">
          <div>
            <h3>${contractGuide.title ?? "TrendForce Memory Contract Price Guide"}</h3>
            <p>${contractGuide.subtitle ?? "Quarterly contract-price momentum from public TrendForce articles"}</p>
          </div>
          <div class="memory-card-meta gpu-term-meta">
            <span>Updated ${contractGuide.updatedAt ?? "-"}</span>
            <span>${contractGuide.unit ?? "% QoQ"}</span>
          </div>
        </div>
        <div class="memory-contract-grid">
          <div class="memory-chart-wrap">
            <canvas data-memory-contract-guide="trendforce"></canvas>
          </div>
          <div class="memory-contract-table">
            <div class="memory-contract-head">
              <span>Period</span>
              <span>DRAM</span>
              <span>NAND</span>
              <span>HBM/Blend</span>
            </div>
            ${contractTableRows}
          </div>
        </div>
        <div class="memory-guide-note">${contractGuide.note ?? ""}</div>
        ${monthlyWatchRows ? `
          <div class="memory-monthly-watch">
            <div class="memory-list-head memory-note-head">
              <span>Monthly watch</span>
              <span>Move</span>
            </div>
            ${monthlyWatchRows}
          </div>
        ` : ""}
      </section>
      <section class="memory-panel memory-spot-contract-panel">
        <div class="us-panel-head">
          <div>
            <h3>${spotContractChecks.title ?? "Spot vs Contract Dollar Check"}</h3>
            <p>${spotContractChecks.subtitle ?? ""}</p>
          </div>
          ${(spotContractChecks.sources ?? [
            {
              title: spotContractChecks.sourceTitle ?? "TrendForce price page",
              url: spotContractChecks.sourceUrl ?? "https://www.trendforce.com/price/dram/dram_spot",
            },
            spotContractChecks.secondarySourceUrl ? {
              title: spotContractChecks.secondarySourceTitle ?? "Secondary source",
              url: spotContractChecks.secondarySourceUrl,
            } : null,
          ]).filter(Boolean).map((source) => `
            <a class="market-breadth-link" href="${source.url}" target="_blank" rel="noreferrer">
              ${source.title}
            </a>
          `).join("")}
        </div>
        <div class="memory-spot-contract-table">
          <div class="memory-spot-contract-head">
            <span>Item</span>
            <span>Spot</span>
            <span>Contract</span>
            <span>Spot premium</span>
          </div>
          ${spotContractRows}
        </div>
        <div class="memory-guide-note">${spotContractChecks.note ?? ""}</div>
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

  const contractCanvas = usOverviewRoot.querySelector('[data-memory-contract-guide="trendforce"]');
  if (contractCanvas) {
    createMemoryContractGuideChart(contractCanvas, contractRows);
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
        <p>Quarterly capex, OCF, and derived FCF trends on the same CY-adjusted basis</p>
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
        <article class="cloud-panel cloud-panel-wide">
          <div class="us-panel-head">
            <div>
              <h3>${capexDashboardData.quarterlyFcf.title}</h3>
              <p>${capexDashboardData.quarterlyFcf.subtitle}</p>
            </div>
          </div>
          <div class="cloud-chart-wrap cloud-chart-wrap-tall">
            <canvas data-capex-chart="quarterly-fcf"></canvas>
          </div>
          ${capexDashboardData.quarterlyFcf.sourceNote ? `<p class="capex-source-note">${capexDashboardData.quarterlyFcf.sourceNote}</p>` : ""}
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
  const quarterlyFcfCanvas = usOverviewRoot.querySelector('[data-capex-chart="quarterly-fcf"]');
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
  if (quarterlyFcfCanvas) {
    createCapexBarChart(quarterlyFcfCanvas, capexDashboardData.quarterLabels, capexDashboardData.quarterlyFcf, (value) => `$${Number(value).toFixed(1)}B`);
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
  const marketTrendRiskMarkup = buildMarketTrendRiskSummary()
    .map(
      (item) => `
        <span class="market-trend-risk-pill ${item.tone}" title="${item.date}">
          <span>${item.label}</span>
          <strong>${item.text}</strong>
        </span>`,
    )
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
            <p>S&P 500, NASDAQ 100, SOX의 일별 지수와 EMA(10, 20, 60, 120, 200)를 장기 시계열 기준으로 확인합니다.</p>
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
        <div class="market-trend-risk-block">
          <div class="market-trend-meta">
            <span>21일 ATR, 전체 고점 대비 MDD, 60D Rolling MDD, 하락폭의 ATR 배수를 각각 분리해서 봅니다.</span>
            <span>${marketTrendRiskMarkup}</span>
          </div>
          <div class="market-trend-risk-grid">
            <div class="market-trend-risk-card market-trend-risk-card-atr">
              <div class="market-trend-risk-card-head">
                <strong>21D ATR (%)</strong>
                <span>일중 변동성</span>
              </div>
              <div class="market-trend-risk-chart-wrap">
                <canvas data-market-trend="risk" data-market-trend-risk="atr"></canvas>
              </div>
            </div>
            <div class="market-trend-risk-card market-trend-risk-card-multiple">
              <div class="market-trend-risk-card-head">
                <strong>Drawdown / ATR</strong>
                <span>하락폭의 ATR 배수</span>
              </div>
              <div class="market-trend-risk-chart-wrap">
                <canvas data-market-trend="risk" data-market-trend-risk="multiple"></canvas>
              </div>
            </div>
            <div class="market-trend-risk-card market-trend-risk-card-drawdown">
              <div class="market-trend-risk-card-head">
                <strong>MDD from High (%)</strong>
                <span>고점 대비 하락률</span>
              </div>
              <div class="market-trend-risk-chart-wrap">
                <canvas data-market-trend="risk" data-market-trend-risk="drawdown"></canvas>
              </div>
            </div>
            <div class="market-trend-risk-card market-trend-risk-card-rolling-drawdown">
              <div class="market-trend-risk-card-head">
                <strong>60D Rolling MDD (%)</strong>
                <span>최근 60거래일 고점 대비</span>
              </div>
              <div class="market-trend-risk-chart-wrap">
                <canvas data-market-trend="risk" data-market-trend-risk="rollingDrawdown60"></canvas>
              </div>
            </div>
          </div>
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

  usOverviewRoot.querySelectorAll('[data-market-trend="risk"]').forEach((trendRiskCanvas) => {
    createMarketTrendRiskChart(
      trendRiskCanvas,
      state.marketTrendRange,
      state.marketTrendIndex,
      state.marketTrendCustomStart,
      state.marketTrendCustomEnd,
    );
  });

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
      state.macroDashboardRange = button.dataset.macroDashboardRange || "3y";
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
    { key: "fx_dashboard", canvas: "fx_dashboard", className: "macro-panel-wide" },
    { key: "energy", canvas: "energy", className: "" },
    { key: "natural_gas", canvas: "natural_gas", className: "" },
    { key: "metals", canvas: "metals", className: "" },
    { key: "strategic", canvas: "strategic", className: "macro-panel-wide" },
    { key: "food", canvas: "food", className: "macro-panel-wide" },
  ]
    .map(({ key, canvas, className }) => {
      const panel = getMarketMacroPanel(key);
      if (!panel) {
        return "";
      }
      const selectedSeries = new Set(getMarketMacroSelection(key));
      const customRange = getMarketMacroCustomRange(key);
      const seriesChips = Object.entries(panel.series ?? {})
        .map(
          ([seriesKey, item]) => `
            <button
              type="button"
              class="m7-range-chip macro-dashboard-chip${selectedSeries.has(seriesKey) ? " active" : ""}"
              data-market-macro-series="${seriesKey}"
              data-market-macro-panel="${key}"
            >
              <i class="macro-series-dot" style="background:${item.color}"></i>
              ${item.name}
            </button>`,
        )
        .join("");
      const customDateMarkup = `
            <div class="total-date-row market-macro-date-row">
              <label class="total-date-field">
                Start
                <input type="date" value="${customRange.start || ""}" data-market-macro-custom-start="${key}">
              </label>
              <label class="total-date-field">
                End
                <input type="date" value="${customRange.end || ""}" data-market-macro-custom-end="${key}">
              </label>
              <div class="total-date-actions">
                <button type="button" class="total-date-button" data-market-macro-custom-apply="${key}">Apply</button>
                <button type="button" class="total-date-button total-date-button-secondary" data-market-macro-custom-reset="${key}">Reset</button>
              </div>
            </div>
          `;
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
          <div class="market-macro-series-row">
            ${seriesChips}
          </div>
          ${customDateMarkup}
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
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start: "", end: "" },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-custom-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroCustomApply;
      if (!panelKey) {
        return;
      }
      const startInput = usOverviewRoot.querySelector(`[data-market-macro-custom-start="${panelKey}"]`);
      const endInput = usOverviewRoot.querySelector(`[data-market-macro-custom-end="${panelKey}"]`);
      const start = startInput?.value || "";
      const end = endInput?.value || "";
      if (start && end && start > end) {
        return;
      }
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start, end },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-custom-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroCustomReset;
      if (!panelKey) {
        return;
      }
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start: "", end: "" },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroPanel;
      const seriesKey = button.dataset.marketMacroSeries;
      if (!panelKey || !seriesKey) {
        return;
      }
      const selected = new Set(getMarketMacroSelection(panelKey));
      if (selected.has(seriesKey)) {
        if (selected.size <= 1) {
          return;
        }
        selected.delete(seriesKey);
      } else {
        selected.add(seriesKey);
      }
      state.marketMacroSelections = {
        ...state.marketMacroSelections,
        [panelKey]: [...selected],
      };
      render();
    });
  });

  ["fx_dashboard", "energy", "natural_gas", "metals", "strategic", "food"].forEach((panelKey) => {
    const canvas = usOverviewRoot.querySelector(`[data-market-macro="${panelKey}"]`);
    if (canvas) {
      createMarketMacroChart(canvas, panelKey, getMarketMacroRange(panelKey));
    }
  });
}

function bindMarketMacroPanelControls(panelKeys) {
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
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start: "", end: "" },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-custom-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroCustomApply;
      if (!panelKey) {
        return;
      }
      const startInput = usOverviewRoot.querySelector(`[data-market-macro-custom-start="${panelKey}"]`);
      const endInput = usOverviewRoot.querySelector(`[data-market-macro-custom-end="${panelKey}"]`);
      const start = startInput?.value || "";
      const end = endInput?.value || "";
      if (start && end && start > end) {
        return;
      }
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start, end },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-custom-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroCustomReset;
      if (!panelKey) {
        return;
      }
      state.marketMacroCustomRanges = {
        ...state.marketMacroCustomRanges,
        [panelKey]: { start: "", end: "" },
      };
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-macro-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.marketMacroPanel;
      const seriesKey = button.dataset.marketMacroSeries;
      if (!panelKey || !seriesKey) {
        return;
      }
      const selected = new Set(getMarketMacroSelection(panelKey));
      if (selected.has(seriesKey)) {
        if (selected.size <= 1) {
          return;
        }
        selected.delete(seriesKey);
      } else {
        selected.add(seriesKey);
      }
      state.marketMacroSelections = {
        ...state.marketMacroSelections,
        [panelKey]: [...selected],
      };
      render();
    });
  });

  panelKeys.forEach((panelKey) => {
    const canvas = usOverviewRoot.querySelector(`[data-market-macro="${panelKey}"]`);
    if (canvas) {
      createMarketMacroChart(canvas, panelKey, getMarketMacroRange(panelKey));
    }
  });
}

function renderMarketLiquidityOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const rangeSource = (marketMacroData.ranges ?? []).length ? marketMacroData.ranges : marketPriceData.ranges ?? [];
  const marketUpdatedAt = marketMacroData.updatedAt || marketPriceData.updatedAt || "-";
  const panelKeys = ["liquidity_global_m2", "liquidity_net", "liquidity_tga", "liquidity_sofr_iorb", "liquidity_policy_2y"];
  const liquidityPanels = [
    { key: "liquidity_global_m2", canvas: "liquidity_global_m2", className: "macro-panel-wide" },
    { key: "liquidity_net", canvas: "liquidity_net", className: "" },
    { key: "liquidity_tga", canvas: "liquidity_tga", className: "" },
    { key: "liquidity_sofr_iorb", canvas: "liquidity_sofr_iorb", className: "" },
    { key: "liquidity_policy_2y", canvas: "liquidity_policy_2y", className: "" },
  ]
    .map((panelConfig) => buildMarketMacroPanelCard(panelConfig, rangeSource))
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Liquidity Dashboard</h2>
            <p>Bloomberg-style Global M2 proxy first, followed by Fed net liquidity, Treasury cash balance, reserve-market spread, and Fed policy versus US 2Y.</p>
          </div>
          <div class="us-price-controls">
            <div class="us-price-updated">Updated ${marketUpdatedAt}</div>
          </div>
        </div>
        <div class="macro-panel-grid">
          ${liquidityPanels}
        </div>
      </section>
    </section>
  `;

  bindMarketMacroPanelControls(panelKeys);
}

function renderMarketValuationOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const bounds = getMarketValuationBounds();
  const selected = new Set(getMarketValuationSelection());
  const rangeMarkup = (marketValuationData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketValuationRange === range.key ? " active" : ""}"
          data-market-valuation-range="${range.key}"
        >
          ${range.label}
        </button>`,
    )
    .join("");
  const seriesMarkup = Object.entries(marketValuationData?.series ?? {})
    .map(
      ([key, item]) => `
        <button
          type="button"
          class="total-series-chip${selected.has(key) ? " active" : ""}"
          data-market-valuation-series="${key}"
        >
          <span class="total-series-dot" style="background:${item.color}"></span>
          ${item.label}
        </button>`,
    )
    .join("");
  const snapshotMarkup = Object.entries(marketValuationData?.series ?? {})
    .map(([key, item]) => {
      const lastIndex = (item.values ?? []).findLastIndex((value) => Number.isFinite(Number(value)));
      const latestValue = lastIndex >= 0 ? Number(item.values[lastIndex]) : null;
      const latestDate = lastIndex >= 0 ? item.dates?.[lastIndex] : "";
      return `
        <article class="vix-snapshot-card">
          <span class="vix-snapshot-label">${item.label}</span>
          <strong class="vix-snapshot-value">${formatValuationValue(latestValue, item.formatter)}</strong>
          <span class="vix-snapshot-date">${latestDate || "-"}</span>
        </article>`;
    })
    .join("");

  usOverviewRoot.innerHTML = `
    <section class="market-overview">
      <section class="us-panel us-price-panel">
        <div class="us-section-head us-price-head">
          <div>
            <h2>Valuation Dashboard</h2>
            <p>Shiller CAPE는 현재 S&amp;P 500 가격을 최근 10년 평균 실질 이익으로 나눈 장기 밸류에이션 지표입니다. 경기 사이클에 따른 이익 급등락을 완화해 시장이 장기 이익 대비 비싼지 싼지 확인할 때 씁니다.</p>
            <p>공식 Shiller CAPE는 월간 데이터입니다. Daily CAPE Proxy는 최신 월간 CAPE 기준에 S&amp;P 500 일간 종가 변화를 반영한 추정치이며, 공식 일간 Shiller 데이터는 아닙니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${rangeMarkup}</div>
            <div class="us-price-updated">Updated ${marketValuationData.updatedAt || "-"}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-market-valuation-start
              min="${bounds.min}"
              max="${bounds.max}"
              value="${state.marketValuationCustomStart || ""}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-market-valuation-end
              min="${bounds.min}"
              max="${bounds.max}"
              value="${state.marketValuationCustomEnd || ""}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-market-valuation-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-market-valuation-reset>Reset</button>
          </div>
        </div>
        <div class="total-series-row">
          ${seriesMarkup}
        </div>
        <div class="vix-snapshot-grid">
          ${snapshotMarkup}
        </div>
        <div class="market-trend-meta">
          <span>Source: ${marketValuationData.source?.name ?? "Shiller data"}</span>
          <span>${marketValuationData.source?.frequency ?? "Monthly"} data</span>
          <span>Daily CAPE Proxy = S&amp;P 500 일간 종가 기반 추정치</span>
        </div>
        <div class="us-price-chart-wrap">
          <canvas data-market-valuation="overview"></canvas>
        </div>
      </section>
    </section>
  `;

  usOverviewRoot.querySelectorAll("[data-market-valuation-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketValuationRange = button.dataset.marketValuationRange || marketValuationData.defaultRange || "max";
      state.marketValuationCustomStart = "";
      state.marketValuationCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelector("[data-market-valuation-apply]")?.addEventListener("click", () => {
    const start = usOverviewRoot.querySelector("[data-market-valuation-start]")?.value || "";
    const end = usOverviewRoot.querySelector("[data-market-valuation-end]")?.value || "";
    if (start && end && start > end) {
      return;
    }
    state.marketValuationCustomStart = start;
    state.marketValuationCustomEnd = end;
    render();
  });

  usOverviewRoot.querySelector("[data-market-valuation-reset]")?.addEventListener("click", () => {
    state.marketValuationCustomStart = "";
    state.marketValuationCustomEnd = "";
    render();
  });

  usOverviewRoot.querySelectorAll("[data-market-valuation-series]").forEach((button) => {
    button.addEventListener("click", () => {
      const seriesKey = button.dataset.marketValuationSeries;
      if (!seriesKey) {
        return;
      }
      const next = new Set(getMarketValuationSelection());
      if (next.has(seriesKey)) {
        if (next.size <= 1) {
          return;
        }
        next.delete(seriesKey);
      } else {
        next.add(seriesKey);
      }
      state.marketValuationSelection = [...next];
      render();
    });
  });

  const canvas = usOverviewRoot.querySelector("[data-market-valuation='overview']");
  if (canvas) {
    createMarketValuationChart(canvas, state.marketValuationRange);
  }
}

function renderMarketVixOverview() {
  usOverviewRoot.classList.remove("hidden");
  companyGrid.classList.add("hidden");
  companyGrid.innerHTML = "";

  const vixUpdatedAt = getMarketVixUpdatedAt();
  const familyBounds = getMarketVixBounds("family");
  const metricsBounds = getMarketVixBounds("metrics");
  const fixedIncomeBounds = getMarketVixBounds("fixedIncome");
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
  const fixedIncomeRangeMarkup = (marketVixData.ranges ?? [])
    .map(
      (range) => `
        <button
          type="button"
          class="m7-range-chip${state.marketVixFixedIncomeRange === range.key ? " active" : ""}"
          data-market-vix-fixed-income-range="${range.key}"
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
        <article class="vix-contract-row">
          <div class="vix-contract-id">
            <strong>${contract.label || "-"}</strong>
            <span>${contract.symbol || "-"}</span>
          </div>
          <span class="vix-contract-expiry">${contract.expiration || "-"}</span>
          <strong class="vix-contract-price">${formatVixLevel(contract.price)}</strong>
        </article>
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
          <aside class="vix-contract-panel">
            <div class="vix-contract-panel-head">
              <div>
                <strong>Latest Settlements</strong>
                <span>VX monthly futures</span>
              </div>
              <span>${marketVixData.curve?.latestDate || "-"}</span>
            </div>
            <div class="vix-contract-list">
              ${latestContractsMarkup || '<div class="vix-contract-empty">No curve data</div>'}
            </div>
          </aside>
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
            <h2>Bond Volatility & Credit Spread</h2>
            <p>채권 변동성 MOVE Index와 High Yield Spread를 기존 VIX history와 같은 기간 선택 방식으로 표시합니다.</p>
          </div>
          <div class="us-price-controls">
            <div class="m7-range-row">${fixedIncomeRangeMarkup}</div>
            <div class="us-price-updated">${marketVixData.source?.fixedIncome ?? ""}</div>
          </div>
        </div>
        <div class="total-date-row">
          <label class="total-date-field">
            <span>Start</span>
            <input
              type="date"
              data-vix-fixed-income-start
              min="${fixedIncomeBounds.min}"
              max="${fixedIncomeBounds.max}"
              value="${state.marketVixFixedIncomeCustomStart || ""}"
            />
          </label>
          <label class="total-date-field">
            <span>End</span>
            <input
              type="date"
              data-vix-fixed-income-end
              min="${fixedIncomeBounds.min}"
              max="${fixedIncomeBounds.max}"
              value="${state.marketVixFixedIncomeCustomEnd || ""}"
            />
          </label>
          <div class="total-date-actions">
            <button type="button" class="total-date-button" data-vix-fixed-income-apply>Apply</button>
            <button type="button" class="total-date-button total-date-button-secondary" data-vix-fixed-income-reset>Reset</button>
          </div>
        </div>
        <div class="vix-fixed-income-grid">
          <div class="us-price-chart-wrap">
            <canvas data-market-vix="move"></canvas>
          </div>
          <div class="us-price-chart-wrap">
            <canvas data-market-vix="hy-spread"></canvas>
          </div>
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
      state.marketVixMetricsRange = button.dataset.marketVixMetricsRange || marketVixData.defaultRange || "3y";
      state.marketVixMetricsCustomStart = "";
      state.marketVixMetricsCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-vix-family-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketVixFamilyRange = button.dataset.marketVixFamilyRange || marketVixData.defaultRange || "3y";
      state.marketVixFamilyCustomStart = "";
      state.marketVixFamilyCustomEnd = "";
      render();
    });
  });

  usOverviewRoot.querySelectorAll("[data-market-vix-fixed-income-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.marketVixFixedIncomeRange = button.dataset.marketVixFixedIncomeRange || marketVixData.defaultRange || "3y";
      state.marketVixFixedIncomeCustomStart = "";
      state.marketVixFixedIncomeCustomEnd = "";
      render();
    });
  });

  const vixMetricsStartInput = usOverviewRoot.querySelector("[data-vix-metrics-start]");
  const vixMetricsEndInput = usOverviewRoot.querySelector("[data-vix-metrics-end]");
  const vixMetricsApplyButton = usOverviewRoot.querySelector("[data-vix-metrics-apply]");
  const vixMetricsResetButton = usOverviewRoot.querySelector("[data-vix-metrics-reset]");
  const vixFixedIncomeStartInput = usOverviewRoot.querySelector("[data-vix-fixed-income-start]");
  const vixFixedIncomeEndInput = usOverviewRoot.querySelector("[data-vix-fixed-income-end]");
  const vixFixedIncomeApplyButton = usOverviewRoot.querySelector("[data-vix-fixed-income-apply]");
  const vixFixedIncomeResetButton = usOverviewRoot.querySelector("[data-vix-fixed-income-reset]");
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

  if (vixFixedIncomeApplyButton && vixFixedIncomeStartInput && vixFixedIncomeEndInput) {
    vixFixedIncomeApplyButton.addEventListener("click", () => {
      const startValue = vixFixedIncomeStartInput.value || "";
      const endValue = vixFixedIncomeEndInput.value || "";
      if (startValue && endValue && startValue > endValue) {
        return;
      }
      state.marketVixFixedIncomeCustomStart = startValue;
      state.marketVixFixedIncomeCustomEnd = endValue;
      render();
    });
  }

  if (vixFixedIncomeResetButton) {
    vixFixedIncomeResetButton.addEventListener("click", () => {
      state.marketVixFixedIncomeCustomStart = "";
      state.marketVixFixedIncomeCustomEnd = "";
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

  const moveCanvas = usOverviewRoot.querySelector('[data-market-vix="move"]');
  if (moveCanvas) {
    createMarketVixFixedIncomeChart(moveCanvas, "move", state.marketVixFixedIncomeRange);
  }

  const hySpreadCanvas = usOverviewRoot.querySelector('[data-market-vix="hy-spread"]');
  if (hySpreadCanvas) {
    createMarketVixFixedIncomeChart(hySpreadCanvas, "hySpread", state.marketVixFixedIncomeRange);
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

  const axisSeries = buildSeriesForAxis(convertRevenueSeries(company, company.bars), company.month);
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

  if (state.tab === "Market") {
    entries = Object.entries(marketSubtabMeta);
    activeKey = state.marketView;
  } else if (state.tab === "BigTech") {
    entries = Object.entries(bigTechSubtabMeta);
    activeKey = state.bigTechView;
  } else if (state.tab === "Semis") {
    entries = Object.entries(semisSubtabMeta);
    activeKey = state.semisView;
  } else if (state.tab === "DataTrend") {
    entries = Object.entries(dataTrendSubtabMeta);
    activeKey = state.dataTrendView;
  } else {
    subtabSwitch.classList.add("hidden");
    return;
  }

  subtabSwitch.classList.remove("hidden");
  subtabSwitch.classList.add("subtab-switch");
  entries.forEach(([viewKey, meta]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `subtab-chip${activeKey === viewKey ? " active" : ""}${state.tab === "Market" && accentMarketSubtabs.has(viewKey) ? " is-market-accent" : ""}`;
    button.textContent = meta.label;
    button.addEventListener("click", () => {
      if (state.tab === "Market") {
        state.marketView = viewKey;
        if (viewKey === "RS" || viewKey === "TrendScore" || viewKey === "Canslim") {
          state.query = "";
          if (searchInput) {
            searchInput.value = "";
          }
        }
      } else if (state.tab === "BigTech") {
        state.bigTechView = viewKey;
      } else if (state.tab === "Semis") {
        state.semisView = viewKey;
      } else if (state.tab === "DataTrend") {
        state.dataTrendView = viewKey;
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
    if (state.marketView === "Liquidity") {
      summaryText.textContent = "Daily liquidity dashboard for Fed net liquidity, TGA balance, SOFR-IORB spread, Fed policy versus US 2Y, and global M2 proxy";
      return;
    }
    if (state.marketView === "Macro") {
      summaryText.textContent = "US monthly macro dashboard with snapshot, coverage, categories, and history";
      return;
    }
    if (state.marketView === "Valuation") {
      summaryText.textContent = "Long-term valuation dashboard using Shiller CAPE and S&P 500 monthly data";
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
    if (state.marketView === "TrendScore") {
      summaryText.textContent = "NASDAQ100 and S&P500 trend score rankings with daily rank history";
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
    summaryText.textContent = "US daily market briefing with curated heatmap, key headlines, and Korean mover notes";
    return;
  }

  if (state.tab === "Infra") {
    summaryText.textContent = "데이터센터 전력망 스트레스를 보는 일별 전력 허브 가격 대시보드";
    return;
  }

  if (state.tab === "DataTrend") {
    summaryText.textContent =
      state.dataTrendView === "Openrouter"
        ? "OpenRouter AI model rankings, token usage, market share, and leaderboard"
        : "X and Reddit keyword mention trend dashboard workspace";
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
    fragment.querySelector(".latest-revenue-value").textContent = formatRevenue(company);

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
    if (metricCaptions.length >= 5) {
      metricCaptions[1].textContent = "Market Cap";
      metricCaptions[2].textContent = "Revenue";
      metricCaptions[3].textContent = "MoM";
      metricCaptions[4].textContent = "YoY";
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

const OPENROUTER_COLORS = [
  "#ff5ca8",
  "#1888ff",
  "#ff6b45",
  "#8b5cf6",
  "#22c55e",
  "#f59e0b",
  "#14b8a6",
  "#64748b",
  "#ef4444",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
  "#c4c4c4",
];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatOpenrouterCount(value, unit = "tokens") {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }
  const suffix = unit === "tokens" ? " tokens" : "";
  if (Math.abs(numeric) >= 1e12) {
    return `${(numeric / 1e12).toFixed(2)}T${suffix}`;
  }
  if (Math.abs(numeric) >= 1e9) {
    return `${(numeric / 1e9).toFixed(2)}B${suffix}`;
  }
  if (Math.abs(numeric) >= 1e6) {
    return `${(numeric / 1e6).toFixed(1)}M${suffix}`;
  }
  if (Math.abs(numeric) >= 1e3) {
    return `${(numeric / 1e3).toFixed(1)}K${suffix}`;
  }
  return `${Math.round(numeric).toLocaleString("en-US")}${suffix}`;
}

function formatOpenrouterChange(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "";
  }
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${Math.round(numeric).toLocaleString("en-US")}%`;
}

function createOpenrouterStackedChart(canvas, chartData, { compact = false } = {}) {
  if (typeof Chart === "undefined" || !canvas || !chartData) {
    return;
  }
  const labels = chartData.dates ?? [];
  const isLog = state.openrouterScale === "log" && !compact;
  const datasets = (chartData.series ?? []).map((series, index) => ({
    label: series.label ?? series.key,
    data: (series.values ?? []).map((value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      return isLog && numeric <= 0 ? null : numeric;
    }),
    backgroundColor: series.key === "Others" ? "rgba(160, 160, 160, 0.42)" : OPENROUTER_COLORS[index % OPENROUTER_COLORS.length],
    borderColor: "#ffffff",
    borderWidth: compact ? 0 : 1,
    stack: "openrouter",
  }));
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
          position: "bottom",
          align: "start",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            color: "#56564f",
            font: { size: compact ? 10 : 11 },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatOpenrouterCount(context.parsed.y, chartData.unit)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: {
            color: "#77766d",
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: compact ? 4 : 7,
          },
        },
        y: {
          stacked: true,
          type: isLog ? "logarithmic" : "linear",
          min: isLog ? 1 : undefined,
          grid: { color: "rgba(17, 24, 39, 0.08)" },
          ticks: {
            color: "#77766d",
            callback: (value) => formatOpenrouterCount(value, chartData.unit).replace(" tokens", ""),
          },
        },
      },
    },
  });
  charts.push(chart);
}

function renderOpenrouterLeaderboardRows(rows) {
  return rows.slice(0, 20).map((row) => {
    const changeText = formatOpenrouterChange(row.change);
    const changeClass = Number(row.change) >= 0 ? "is-positive" : "is-negative";
    return `
      <div class="openrouter-rank-row">
        <div class="openrouter-rank-index">${row.rank}.</div>
        <div class="openrouter-model-dot">${escapeHtml((row.author ?? "?").slice(0, 2).toUpperCase())}</div>
        <div class="openrouter-rank-name">
          <strong>${escapeHtml(row.name)}</strong>
          <span>by ${escapeHtml(row.author)}${row.variant ? ` / ${escapeHtml(row.variant)}` : ""}</span>
        </div>
        <div class="openrouter-rank-value">
          <strong>${formatOpenrouterCount(row.tokens)}</strong>
          ${changeText ? `<span class="${changeClass}">${changeText}</span>` : "<span>-</span>"}
        </div>
      </div>
    `;
  }).join("");
}

function renderOpenrouterOverview() {
  companyGrid.classList.add("hidden");
  usOverviewRoot.classList.remove("hidden");
  const topChart = openrouterRankingsData.charts?.models;
  const views = openrouterRankingsData.leaderboardViews ?? [];
  const activeView = views.some((view) => view.key === state.openrouterLeaderboardView)
    ? state.openrouterLeaderboardView
    : "week";
  state.openrouterLeaderboardView = activeView;
  const rows = openrouterRankingsData.leaderboards?.[activeView] ?? [];
  const latestRows = rows.slice(0, 6);
  const secondaryKeys = ["marketShare", "tools", "images", "imageOutput", "naturalLanguage"];
  const latestDate = topChart?.dates?.length
    ? topChart.dates[topChart.dates.length - 1]
    : openrouterRankingsData.updatedAt ?? "-";
  const scaleButtons = `
    <div class="openrouter-scale-toggle">
      <button type="button" class="${state.openrouterScale === "linear" ? "active" : ""}" data-openrouter-scale="linear">Linear</button>
      <button type="button" class="${state.openrouterScale === "log" ? "active" : ""}" data-openrouter-scale="log">Log</button>
    </div>
  `;
  const viewButtons = views.map((view) => `
    <button type="button" class="market-rs-chip${activeView === view.key ? " active" : ""}" data-openrouter-view="${view.key}">
      ${escapeHtml(view.label)}
    </button>
  `).join("");
  const statCards = latestRows.map((row) => `
    <article class="openrouter-stat-card">
      <span>#${row.rank}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <small>by ${escapeHtml(row.author)}</small>
      <b>${formatOpenrouterCount(row.tokens)}</b>
    </article>
  `).join("");
  const secondaryCards = secondaryKeys.map((key) => {
    const chart = openrouterRankingsData.charts?.[key];
    if (!chart) {
      return "";
    }
    return `
      <article class="us-panel openrouter-secondary-card">
        <div class="openrouter-section-head">
          <div>
            <h3>${escapeHtml(chart.title)}</h3>
            <p>${escapeHtml(chart.subtitle)}</p>
          </div>
        </div>
        <div class="openrouter-mini-chart"><canvas data-openrouter-chart="${key}"></canvas></div>
      </article>
    `;
  }).join("");

  usOverviewRoot.innerHTML = `
    <section class="openrouter-page">
      <div class="openrouter-hero">
        <div>
          <h2>AI Model Rankings</h2>
          <p>Based on benchmarks and real usage data from millions of users accessing models through OpenRouter.</p>
        </div>
        <div class="openrouter-source">
          <span>Updated ${escapeHtml(openrouterRankingsData.updatedAt || "-")}</span>
          <a href="${escapeHtml(openrouterRankingsData.source?.url ?? "https://openrouter.ai/rankings")}" target="_blank" rel="noreferrer">OpenRouter</a>
        </div>
      </div>

      <article class="us-panel openrouter-chart-panel">
        <div class="openrouter-section-head">
          <div>
            <h3>Top Models</h3>
            <p>Weekly usage of models across OpenRouter</p>
          </div>
          ${scaleButtons}
        </div>
        <div class="openrouter-chart-wrap"><canvas id="openrouter-top-models-chart"></canvas></div>
        <p class="openrouter-caption">Latest weekly bucket: ${escapeHtml(latestDate)}</p>
      </article>

      <div class="openrouter-stat-grid">${statCards}</div>

      <article class="us-panel openrouter-leaderboard-panel">
        <div class="openrouter-section-head">
          <div>
            <h3>LLM Leaderboard</h3>
            <p>Compare the most popular models on OpenRouter.</p>
          </div>
          <div class="market-rs-chip-row">${viewButtons}</div>
        </div>
        <div class="openrouter-leaderboard-grid">${renderOpenrouterLeaderboardRows(rows) || "<p>No OpenRouter ranking data.</p>"}</div>
      </article>

      <section class="openrouter-secondary-grid">
        ${secondaryCards}
      </section>
    </section>
  `;

  createOpenrouterStackedChart(document.querySelector("#openrouter-top-models-chart"), topChart);
  secondaryKeys.forEach((key) => {
    createOpenrouterStackedChart(usOverviewRoot.querySelector(`[data-openrouter-chart="${key}"]`), openrouterRankingsData.charts?.[key], { compact: true });
  });
  usOverviewRoot.querySelectorAll("[data-openrouter-scale]").forEach((button) => {
    button.addEventListener("click", () => {
      state.openrouterScale = button.dataset.openrouterScale || "linear";
      renderOpenrouterOverview();
    });
  });
  usOverviewRoot.querySelectorAll("[data-openrouter-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.openrouterLeaderboardView = button.dataset.openrouterView || "week";
      renderOpenrouterOverview();
    });
  });
}

function render() {
  destroyCharts();
  ensureValidSelection();
  const showRsToolbar =
    state.tab === "Market" && (state.marketView === "RS" || state.marketView === "TrendScore" || state.marketView === "Canslim");
  if (toolbarRow) {
    toolbarRow.classList.toggle("hidden", state.tab !== "Taiwan" && !showRsToolbar);
  }
  if (sortBox) {
    sortBox.classList.toggle("hidden", state.tab !== "Taiwan");
  }
  if (searchInput) {
    if (showRsToolbar) {
      if (state.marketView === "TrendScore") {
        searchInput.placeholder = "Search trend score ticker...";
      } else if (state.marketView === "Canslim") {
        searchInput.placeholder = "Search CANSLIM ticker...";
      } else {
        searchInput.placeholder = "Search ticker or company...";
      }
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
    if (state.dataTrendView === "Openrouter") {
      renderOpenrouterOverview();
      return;
    }
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
    renderInfraOverview();
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
    if (state.marketView === "Liquidity") {
      renderMarketLiquidityOverview();
      return;
    }
    if (state.marketView === "Macro") {
      renderMarketMacroOverview();
      return;
    }
    if (state.marketView === "Valuation") {
      renderMarketValuationOverview();
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
    if (state.marketView === "TrendScore") {
      renderMarketTrendScoreOverview();
      return;
    }
    if (state.marketView === "Canslim") {
      renderMarketCanslimOverview();
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
  if (searchRenderTimer) {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = null;
  }
  if (state.tab === "Market" && (state.marketView === "RS" || state.marketView === "TrendScore" || state.marketView === "Canslim")) {
    searchRenderTimer = window.setTimeout(() => {
      searchRenderTimer = null;
      if (state.marketView === "TrendScore") {
        resetTrendScoreCardLimit();
      }
      if (state.marketView === "RS") {
        resetRsCardLimit();
      }
      if (state.marketView === "Canslim") {
        resetCanslimCardLimit();
      }
      render();
    }, 120);
    return;
  }
  render();
});

sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

render();
refreshBrandMeta();
