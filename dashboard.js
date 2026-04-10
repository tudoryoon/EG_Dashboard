const companies = window.dashboardCompanies ?? [];

const countryMeta = {
  US: { label: "US", currencies: ["USD"], defaultCurrency: "USD" },
  Taiwan: { label: "Taiwan", currencies: ["NTD", "USD"], defaultCurrency: "NTD" },
  Korea: { label: "Korea", currencies: ["KRW"], defaultCurrency: "KRW" },
};

const currencyMeta = {
  NTD: { label: "NT$", decimals: 1, suffix: "B" },
  USD: { label: "$", decimals: 1, suffix: "B" },
  KRW: { label: "KRW ", decimals: 0, suffix: "B" },
};

const yearColors = ["#2563eb", "#7c3aed", "#f59e0b", "#14b8a6", "#d93025", "#0f172a"];
const SERIES_START_YEAR = 2021;
const SERIES_START_MONTH = 1;

const state = {
  country: "Taiwan",
  currency: "NTD",
  sector: "All",
  query: "",
};

const charts = [];

const searchInput = document.querySelector("#search-input");
const countrySwitch = document.querySelector("#country-switch");
const currencySwitch = document.querySelector("#currency-switch");
const sectorChips = document.querySelector("#sector-chips");
const companyGrid = document.querySelector("#company-grid");
const summaryText = document.querySelector("#summary-text");
const summaryStats = document.querySelector("#summary-stats");
const cardTemplate = document.querySelector("#company-card-template");

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

function availableSectors() {
  return ["All", ...new Set(companiesByCountry(state.country).map((company) => company.sector))];
}

function ensureValidSelection() {
  const country = countryMeta[state.country];
  if (!country.currencies.includes(state.currency)) {
    state.currency = country.defaultCurrency;
  }
  const sectors = availableSectors();
  if (!sectors.includes(state.sector)) {
    state.sector = "All";
  }
}

function destroyCharts() {
  charts.splice(0).forEach((chart) => chart.destroy());
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
          borderDash: [6, 4],
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
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
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
  return companies.filter((company) => {
    const matchesCountry = company.country === state.country;
    const matchesSector = state.sector === "All" ? true : company.sector === state.sector;
    const matchesQuery = company.name.toLowerCase().includes(state.query.toLowerCase().trim());
    return matchesCountry && matchesSector && matchesQuery;
  });
}

function renderCountries() {
  countrySwitch.innerHTML = "";
  Object.entries(countryMeta).forEach(([countryKey, meta]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `country-button${state.country === countryKey ? " active" : ""}`;
    button.textContent = meta.label;
    button.addEventListener("click", () => {
      state.country = countryKey;
      state.currency = meta.defaultCurrency;
      state.sector = "All";
      render();
    });
    countrySwitch.appendChild(button);
  });
}

function renderCurrencies() {
  currencySwitch.innerHTML = "";
  countryMeta[state.country].currencies.forEach((currency) => {
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
  summaryText.textContent = `${countryMeta[state.country].label} ${list.length} companies`;

  const avgYoY =
    list.length > 0
      ? (list.reduce((sum, company) => sum + company.yoy, 0) / list.length).toFixed(1)
      : "0.0";
  const avgMoM =
    list.length > 0
      ? (list.reduce((sum, company) => sum + company.mom, 0) / list.length).toFixed(1)
      : "0.0";

  summaryStats.innerHTML = `
    <span class="summary-stat">Avg YoY ${avgYoY}%</span>
    <span class="summary-stat">Avg MoM ${avgMoM}%</span>
    <span class="summary-stat">Currency ${currencyMeta[state.currency].label.trim()}</span>
    <span class="summary-stat">Sector ${state.sector}</span>
  `;
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
  ensureValidSelection();
  renderCountries();
  renderCurrencies();
  renderSectors();
  const list = filteredCompanies();
  renderSummary(list);
  renderCards(list);
}

searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

render();
