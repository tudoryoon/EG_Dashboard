const companies = window.dashboardCompanies ?? [];

const state = {
  currency: "NTD",
  sector: "All",
  query: "",
};

const charts = [];
const currencyMeta = {
  NTD: { label: "NT$", decimals: 1, suffix: "B" },
  USD: { label: "USD", decimals: 1, suffix: "B" },
  KRW: { label: "KRW", decimals: 0, suffix: "억" },
};
const currencyOrder = ["NTD", "USD", "KRW"];
const yearColors = ["#2563eb", "#7c3aed", "#f59e0b", "#14b8a6", "#d93025"];

const searchInput = document.querySelector("#search-input");
const currencySwitch = document.querySelector("#currency-switch");
const sectorChips = document.querySelector("#sector-chips");
const companyGrid = document.querySelector("#company-grid");
const summaryText = document.querySelector("#summary-text");
const summaryStats = document.querySelector("#summary-stats");
const cardTemplate = document.querySelector("#company-card-template");

const sectors = ["All", ...new Set(companies.map((company) => company.sector))];

function formatRevenue(company) {
  const meta = currencyMeta[state.currency];
  const value = company.currency[state.currency];
  return `${meta.label}${value.toFixed(meta.decimals)}${meta.suffix}`;
}

function formatDelta(value) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function revenueTickLabel(value) {
  const meta = currencyMeta[state.currency];
  if (state.currency === "KRW") {
    return `${meta.label}${Math.round(value)}${meta.suffix}`;
  }
  return `${meta.label}${Number(value).toFixed(0)}${meta.suffix}`;
}

function destroyCharts() {
  charts.splice(0).forEach((chart) => chart.destroy());
}

function createRevenueChart(canvas, company) {
  const grayBars = company.bars.map((_, index) => {
    const lightness = 26 + index * 2;
    return `hsl(0, 0%, ${Math.min(lightness, 48)}%)`;
  });

  const chart = new Chart(canvas, {
    type: "bar",
    data: {
      labels: ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"],
      datasets: [
        {
          type: "line",
          label: "YoY%",
          data: company.yoyLine,
          borderColor: "#d93025",
          backgroundColor: "#d93025",
          borderWidth: 2,
          tension: 0.32,
          pointRadius: 0,
          yAxisID: "yPercent",
        },
        {
          type: "line",
          label: "MoM%",
          data: company.momLine,
          borderColor: "#7b7b75",
          backgroundColor: "#7b7b75",
          borderWidth: 2,
          tension: 0.32,
          pointRadius: 0,
          yAxisID: "yPercent",
        },
        {
          type: "bar",
          label: "Revenue",
          data: company.bars,
          backgroundColor: grayBars,
          borderWidth: 0,
          borderRadius: 3,
          yAxisID: "yRevenue",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
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
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: "#8d8d86",
          },
          border: {
            color: "#d8d8d2",
          },
        },
        yRevenue: {
          position: "left",
          beginAtZero: true,
          grid: {
            color: "rgba(70, 70, 66, 0.10)",
          },
          ticks: {
            color: "#8d8d86",
            callback: (value) => revenueTickLabel(value),
            maxTicksLimit: 4,
          },
          border: {
            color: "#d8d8d2",
          },
        },
        yPercent: {
          position: "right",
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
            maxTicksLimit: 4,
          },
          border: {
            color: "#d8d8d2",
          },
        },
      },
    },
  });

  charts.push(chart);
}

function createYearlyChart(canvas, company) {
  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: company.yearly.labels,
      datasets: company.yearly.series.map((series, index) => ({
        label: series.year,
        data: series.values,
        borderColor: yearColors[index],
        backgroundColor: yearColors[index],
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
          grid: {
            display: false,
          },
          ticks: {
            color: "#8d8d86",
          },
          border: {
            color: "#d8d8d2",
          },
        },
        y: {
          suggestedMin: -20,
          suggestedMax: 60,
          ticks: {
            color: "#8d8d86",
            callback: (value) => `${value}%`,
            maxTicksLimit: 5,
          },
          grid: {
            color: (context) =>
              context.tick.value === 0
                ? "rgba(217, 48, 37, 0.55)"
                : "rgba(70, 70, 66, 0.10)",
            lineWidth: (context) => (context.tick.value === 0 ? 2.4 : 1),
          },
          border: {
            color: "#d8d8d2",
          },
        },
      },
    },
  });

  charts.push(chart);
}

function filteredCompanies() {
  return companies.filter((company) => {
    const matchesSector =
      state.sector === "All" ? true : company.sector === state.sector;
    const matchesQuery = company.name
      .toLowerCase()
      .includes(state.query.toLowerCase().trim());
    return matchesSector && matchesQuery;
  });
}

function renderCurrencies() {
  currencySwitch.innerHTML = "";
  currencyOrder.forEach((currency) => {
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
  sectors.forEach((sector) => {
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
  summaryText.textContent = `${list.length} companies`;
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
    <span class="summary-stat">Currency ${currencyMeta[state.currency].label}</span>
  `;
}

function renderCards(list) {
  destroyCharts();
  companyGrid.innerHTML = "";

  if (list.length === 0) {
    companyGrid.innerHTML = `<div class="empty-state">조건에 맞는 기업이 없습니다.</div>`;
    return;
  }

  list.forEach((company) => {
    const fragment = cardTemplate.content.cloneNode(true);
    fragment.querySelector(".company-name").textContent = company.name;
    fragment.querySelector(".revenue-value").textContent = formatRevenue(company);

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
    fragment.querySelector(".sector-pill").textContent = company.sector;

    companyGrid.appendChild(fragment);
    const card = companyGrid.lastElementChild;
    createRevenueChart(card.querySelector(".revenue-chart"), company);
    createYearlyChart(card.querySelector(".yearly-chart"), company);
  });
}

function render() {
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
