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
    {
      name: "Apple",
      labels: quarterLabels,
      revenue: [117.2, 94.8, 81.8, 89.5, 119.6, 90.8, 85.8, 94.9, 124.3, 95.4, 94.0, 102.5],
      opm: [30.7, 29.9, 28.1, 30.1, 33.8, 30.7, 29.6, 31.2, 34.5, 31.0, 30.0, 31.6],
      segments: [
        { name: "iPhone", priorRevenue: 46.2, latestRevenue: 49.0, opm: null },
        { name: "Mac", priorRevenue: 7.7, latestRevenue: 8.7, opm: null },
        { name: "iPad", priorRevenue: 7.0, latestRevenue: 7.0, opm: null },
        { name: "Wearables", priorRevenue: 9.0, latestRevenue: 9.0, opm: null },
        { name: "Services", priorRevenue: 25.0, latestRevenue: 28.8, opm: null },
      ],
    },
    {
      name: "Microsoft",
      labels: quarterLabels,
      revenue: [50.1, 52.7, 52.9, 56.2, 56.5, 62.0, 61.9, 64.7, 65.6, 69.6, 70.1, 76.4],
      opm: [42.9, 38.7, 42.3, 43.2, 47.6, 43.6, 44.6, 43.1, 46.6, 45.5, 45.7, 44.9],
      segments: [
        { name: "Productivity & Business Processes", priorRevenue: 20.3, latestRevenue: 33.1, opm: 57.4 },
        { name: "Intelligent Cloud", priorRevenue: 28.5, latestRevenue: 29.9, opm: 40.6 },
        { name: "More Personal Computing", priorRevenue: 15.9, latestRevenue: 13.5, opm: 23.7 },
      ],
    },
    {
      name: "Alphabet",
      labels: quarterLabels,
      revenue: [69.8, 74.6, 76.7, 86.3, 80.5, 84.7, 88.3, 96.5, 90.2, 96.4, 102.3, 113.8],
      opm: [25.0, 29.3, 27.8, 27.5, 31.6, 32.4, 32.3, 32.1, 33.9, 32.4, 30.5, 31.6],
      segments: [
        { name: "Search & Other", priorRevenue: 54.0, latestRevenue: 63.1, opm: null },
        { name: "YouTube Ads", priorRevenue: 10.5, latestRevenue: 11.4, opm: null },
        { name: "Google Cloud", priorRevenue: 12.0, latestRevenue: 17.7, opm: 30.1 },
        { name: "Other Bets", priorRevenue: 0.4, latestRevenue: 0.4, opm: -973.0 },
      ],
    },
    {
      name: "Amazon",
      labels: quarterLabels,
      revenue: [127.4, 134.4, 143.1, 170.0, 143.3, 148.0, 158.9, 187.8, 155.7, 167.7, 180.2, 213.4],
      opm: [3.8, 5.7, 7.8, 7.8, 10.7, 9.9, 11.0, 11.3, 11.8, 11.5, 9.7, 11.7],
      segments: [
        { name: "North America", priorRevenue: 115.6, latestRevenue: 127.1, opm: 9.0 },
        { name: "International", priorRevenue: 43.4, latestRevenue: 50.7, opm: 2.0 },
        { name: "AWS", priorRevenue: 28.8, latestRevenue: 35.6, opm: 35.1 },
        { name: "Advertising services", priorRevenue: 17.3, latestRevenue: 21.3, opm: null },
      ],
    },
    {
      name: "NVIDIA",
      labels: quarterLabels,
      revenue: [7.2, 13.5, 18.1, 22.1, 26.0, 30.0, 35.1, 39.3, 44.1, 46.7, 57.0, 68.1],
      opm: [29.8, 50.3, 57.5, 61.6, 64.9, 62.1, 62.3, 61.1, 49.1, 60.8, 63.2, 65.0],
      segments: [
        { name: "Data Center", priorRevenue: 35.6, latestRevenue: 62.3, opm: null },
        { name: "Gaming", priorRevenue: 2.5, latestRevenue: 3.7, opm: null },
        { name: "Professional Visualization", priorRevenue: 0.5, latestRevenue: 1.3, opm: null },
        { name: "Automotive and Robotics", priorRevenue: 0.6, latestRevenue: 0.6, opm: null },
      ],
    },
    {
      name: "Meta",
      labels: quarterLabels,
      revenue: [28.6, 32.0, 34.1, 40.1, 36.5, 39.1, 40.6, 48.4, 42.3, 47.5, 51.2, 59.9],
      opm: [25.2, 29.4, 40.3, 40.8, 37.9, 38.0, 42.7, 48.3, 41.5, 43.0, 40.1, 41.3],
      segments: [
        { name: "Family of Apps", priorRevenue: 47.3, latestRevenue: 58.9, opm: 52.2 },
        { name: "Reality Labs", priorRevenue: 1.1, latestRevenue: 1.0, opm: -630.5 },
        { name: "Advertising", priorRevenue: 46.8, latestRevenue: 58.1, opm: null },
        { name: "Other revenue", priorRevenue: 0.5, latestRevenue: 0.8, opm: null },
      ],
    },
    {
      name: "Tesla",
      labels: quarterLabels,
      revenue: [23.3, 24.9, 23.4, 25.2, 21.3, 25.5, 25.2, 28.5, 23.4, 25.8, 27.2, 29.1],
      opm: [11.4, 10.8, 9.6, 8.7, 8.1, 7.4, 6.8, 6.2, 5.9, 6.1, 6.5, 7.0],
      segments: [
        { name: "Auto Sales", priorRevenue: 20.3, latestRevenue: 24.2, opm: 9.8 },
        { name: "Energy", priorRevenue: 1.8, latestRevenue: 2.7, opm: 16.2 },
        { name: "Services", priorRevenue: 3.1, latestRevenue: 3.8, opm: 5.1 },
      ],
    },
  ];

  return { valuationPanels, quarterLabels, m7Quarterly };
})();
