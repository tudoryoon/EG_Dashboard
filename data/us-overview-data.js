window.usOverviewData = (() => {
  function buildMonthlyLabels() {
    const labels = [];
    let year = 2016;
    let month = 4;
    while (year < 2026 || (year === 2026 && month <= 3)) {
      labels.push(`${String(year).slice(2)}/${String(month).padStart(2, "0")}`);
      month += 1;
      if (month === 13) {
        month = 1;
        year += 1;
      }
    }
    return labels;
  }

  function interpolateSeries(anchors, length) {
    const series = new Array(length).fill(null);
    for (let index = 0; index < anchors.length - 1; index += 1) {
      const current = anchors[index];
      const next = anchors[index + 1];
      const span = next.index - current.index;
      for (let offset = 0; offset <= span; offset += 1) {
        const ratio = span === 0 ? 0 : offset / span;
        series[current.index + offset] = Number(
          (current.value + (next.value - current.value) * ratio).toFixed(2),
        );
      }
    }
    return series;
  }

  const labels = buildMonthlyLabels();
  const length = labels.length;

  const valuationPanels = [
    {
      id: "sp500",
      title: "S&P 500",
      subtitle: "Fwd.12 P/E and Fwd.12 EPS · Monthly fallback",
      labels,
      pe: interpolateSeries(
        [
          { index: 0, value: 16.8 },
          { index: 18, value: 18.4 },
          { index: 42, value: 17.1 },
          { index: 57, value: 13.2 },
          { index: 72, value: 21.9 },
          { index: 90, value: 17.5 },
          { index: 108, value: 23.8 },
          { index: 119, value: 20.4 },
        ],
        length,
      ),
      eps: interpolateSeries(
        [
          { index: 0, value: 129 },
          { index: 18, value: 141 },
          { index: 42, value: 162 },
          { index: 57, value: 133 },
          { index: 72, value: 182 },
          { index: 90, value: 214 },
          { index: 108, value: 249 },
          { index: 119, value: 271 },
        ],
        length,
      ),
    },
    {
      id: "ndx",
      title: "NASDAQ 100",
      subtitle: "Fwd.12 P/E and Fwd.12 EPS · Monthly fallback",
      labels,
      pe: interpolateSeries(
        [
          { index: 0, value: 20.5 },
          { index: 20, value: 24.8 },
          { index: 42, value: 22.1 },
          { index: 57, value: 18.2 },
          { index: 72, value: 28.4 },
          { index: 90, value: 23.6 },
          { index: 108, value: 29.7 },
          { index: 119, value: 24.6 },
        ],
        length,
      ),
      eps: interpolateSeries(
        [
          { index: 0, value: 214 },
          { index: 20, value: 238 },
          { index: 42, value: 281 },
          { index: 57, value: 233 },
          { index: 72, value: 327 },
          { index: 90, value: 401 },
          { index: 108, value: 472 },
          { index: 119, value: 518 },
        ],
        length,
      ),
    },
    {
      id: "m7",
      title: "Magnificent 7",
      subtitle: "Blended Fwd.12 P/E and Fwd.12 EPS · Monthly fallback",
      labels,
      pe: interpolateSeries(
        [
          { index: 0, value: 25.8 },
          { index: 18, value: 29.4 },
          { index: 42, value: 26.7 },
          { index: 57, value: 20.6 },
          { index: 72, value: 34.9 },
          { index: 90, value: 28.1 },
          { index: 108, value: 36.2 },
          { index: 119, value: 30.8 },
        ],
        length,
      ),
      eps: interpolateSeries(
        [
          { index: 0, value: 96 },
          { index: 18, value: 111 },
          { index: 42, value: 138 },
          { index: 57, value: 120 },
          { index: 72, value: 169 },
          { index: 90, value: 215 },
          { index: 108, value: 268 },
          { index: 119, value: 302 },
        ],
        length,
      ),
    },
  ];

  const quarterLabels = ["23Q1", "23Q2", "23Q3", "23Q4", "24Q1", "24Q2", "24Q3", "24Q4", "25Q1", "25Q2", "25Q3", "25Q4"];
  const m7Quarterly = [
    { name: "Apple", revenue: [94.8, 81.8, 89.5, 119.6, 90.8, 85.8, 94.9, 124.3, 90.1, 86.2, 95.7, 126.8], eps: [1.52, 1.26, 1.46, 2.18, 1.53, 1.40, 1.64, 2.19, 1.58, 1.47, 1.71, 2.24] },
    { name: "Microsoft", revenue: [52.9, 56.2, 56.5, 62.0, 61.9, 64.7, 65.6, 69.6, 68.4, 71.2, 73.5, 76.8], eps: [2.45, 2.69, 2.99, 3.23, 2.94, 3.15, 3.30, 3.82, 3.20, 3.47, 3.73, 4.05] },
    { name: "Alphabet", revenue: [69.8, 74.6, 76.7, 86.3, 80.5, 84.7, 88.3, 96.5, 92.4, 97.1, 101.8, 109.6], eps: [1.17, 1.44, 1.55, 1.64, 1.89, 1.89, 2.12, 2.35, 1.96, 2.09, 2.27, 2.48] },
    { name: "Amazon", revenue: [127.4, 134.4, 143.1, 170.0, 143.3, 148.0, 158.9, 187.8, 151.4, 156.9, 167.5, 196.3], eps: [0.31, 0.65, 0.94, 1.00, 0.98, 1.26, 1.43, 1.86, 1.12, 1.31, 1.64, 2.02] },
    { name: "NVIDIA", revenue: [7.2, 13.5, 18.1, 22.1, 26.0, 30.0, 35.1, 39.3, 44.7, 50.6, 56.8, 64.2], eps: [0.82, 2.70, 3.71, 4.93, 5.18, 5.94, 6.63, 7.15, 7.62, 8.25, 8.98, 9.64] },
    { name: "Meta", revenue: [28.6, 32.0, 34.1, 40.1, 36.5, 39.1, 40.6, 47.3, 39.7, 42.6, 44.1, 50.7], eps: [2.20, 2.98, 4.39, 5.33, 4.71, 5.16, 5.74, 6.43, 5.12, 5.61, 6.08, 6.86] },
    { name: "Tesla", revenue: [23.3, 24.9, 23.4, 25.2, 21.3, 25.5, 25.2, 28.5, 23.4, 25.8, 27.2, 29.1], eps: [0.85, 0.91, 0.66, 0.71, 0.45, 0.52, 0.58, 0.72, 0.40, 0.47, 0.54, 0.69] },
  ];

  return { valuationPanels, m7Quarterly };
})();
