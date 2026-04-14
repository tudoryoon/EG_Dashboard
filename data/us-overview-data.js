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
        {
          name: "Productivity & Business Processes",
          priorRevenue: 20.3,
          latestRevenue: 33.1,
          opm: 57.4,
          history: [
            { quarter: "24Q1", revenue: 18.6, yoy: 12.9, opm: 53.6 },
            { quarter: "24Q2", revenue: 19.2, yoy: 13.2, opm: 53.4 },
            { quarter: "24Q3", revenue: 19.6, yoy: 11.7, opm: 51.8 },
            { quarter: "24Q4", revenue: 20.3, yoy: 11.1, opm: 49.9 },
            { quarter: "25Q1", revenue: 28.3, yoy: 52.3, opm: 58.3 },
            { quarter: "25Q2", revenue: 29.4, yoy: 52.9, opm: 57.4 },
            { quarter: "25Q3", revenue: 29.9, yoy: 53.0, opm: 58.0 },
            { quarter: "25Q4", revenue: 33.1, yoy: 63.0, opm: 57.4 },
          ],
        },
        {
          name: "Intelligent Cloud",
          priorRevenue: 28.5,
          latestRevenue: 29.9,
          opm: 40.6,
          history: [
            { quarter: "24Q1", revenue: 24.3, yoy: 19.4, opm: 48.4 },
            { quarter: "24Q2", revenue: 25.9, yoy: 20.3, opm: 48.1 },
            { quarter: "24Q3", revenue: 26.7, yoy: 21.0, opm: 46.9 },
            { quarter: "24Q4", revenue: 28.5, yoy: 18.8, opm: 45.1 },
            { quarter: "25Q1", revenue: 24.1, yoy: -0.7, opm: 43.6 },
            { quarter: "25Q2", revenue: 25.5, yoy: -1.3, opm: 42.5 },
            { quarter: "25Q3", revenue: 26.8, yoy: 0.2, opm: 41.5 },
            { quarter: "25Q4", revenue: 29.9, yoy: 4.8, opm: 40.6 },
          ],
        },
        {
          name: "More Personal Computing",
          priorRevenue: 15.9,
          latestRevenue: 13.5,
          opm: 23.7,
          history: [
            { quarter: "24Q1", revenue: 13.7, yoy: 2.5, opm: 37.9 },
            { quarter: "24Q2", revenue: 16.9, yoy: 18.6, opm: 25.4 },
            { quarter: "24Q3", revenue: 15.6, yoy: 17.5, opm: 31.6 },
            { quarter: "24Q4", revenue: 15.9, yoy: 14.3, opm: 31.0 },
            { quarter: "25Q1", revenue: 13.2, yoy: -3.6, opm: 26.8 },
            { quarter: "25Q2", revenue: 14.7, yoy: -13.3, opm: 26.7 },
            { quarter: "25Q3", revenue: 13.4, yoy: -14.2, opm: 26.4 },
            { quarter: "25Q4", revenue: 13.5, yoy: -15.4, opm: 23.7 },
          ],
        },
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
        {
          name: "North America",
          priorRevenue: 115.6,
          latestRevenue: 127.1,
          opm: 9.0,
          history: [
            { quarter: "24Q1", revenue: 86.3, yoy: 12.0, opm: 5.8 },
            { quarter: "24Q2", revenue: 90.0, yoy: 9.0, opm: 5.7 },
            { quarter: "24Q3", revenue: 95.5, yoy: 9.0, opm: 6.0 },
            { quarter: "24Q4", revenue: 115.6, yoy: 10.0, opm: 8.0 },
            { quarter: "25Q1", revenue: 92.9, yoy: 8.0, opm: 6.2 },
            { quarter: "25Q2", revenue: 100.1, yoy: 11.0, opm: 7.5 },
            { quarter: "25Q3", revenue: 106.3, yoy: 11.0, opm: 4.5 },
            { quarter: "25Q4", revenue: 127.1, yoy: 10.0, opm: 9.0 },
          ],
        },
        {
          name: "International",
          priorRevenue: 43.4,
          latestRevenue: 50.7,
          opm: 2.0,
          history: [
            { quarter: "24Q1", revenue: 31.9, yoy: 10.0, opm: 2.8 },
            { quarter: "24Q2", revenue: 31.7, yoy: 7.0, opm: 0.9 },
            { quarter: "24Q3", revenue: 35.9, yoy: 12.0, opm: 3.6 },
            { quarter: "24Q4", revenue: 43.4, yoy: 8.0, opm: 3.0 },
            { quarter: "25Q1", revenue: 33.5, yoy: 5.0, opm: 3.0 },
            { quarter: "25Q2", revenue: 36.8, yoy: 16.0, opm: 4.1 },
            { quarter: "25Q3", revenue: 40.9, yoy: 14.0, opm: 2.9 },
            { quarter: "25Q4", revenue: 50.7, yoy: 16.8, opm: 2.0 },
          ],
        },
        {
          name: "AWS",
          priorRevenue: 28.8,
          latestRevenue: 35.6,
          opm: 35.1,
          history: [
            { quarter: "24Q1", revenue: 25.0, yoy: 17.0, opm: 37.6 },
            { quarter: "24Q2", revenue: 26.3, yoy: 19.0, opm: 35.4 },
            { quarter: "24Q3", revenue: 27.5, yoy: 19.0, opm: 37.8 },
            { quarter: "24Q4", revenue: 28.8, yoy: 19.0, opm: 36.8 },
            { quarter: "25Q1", revenue: 29.3, yoy: 17.0, opm: 39.2 },
            { quarter: "25Q2", revenue: 30.9, yoy: 17.5, opm: 33.0 },
            { quarter: "25Q3", revenue: 33.0, yoy: 20.0, opm: 34.5 },
            { quarter: "25Q4", revenue: 35.6, yoy: 23.6, opm: 35.1 },
          ],
        },
        {
          name: "Advertising services",
          priorRevenue: 17.3,
          latestRevenue: 21.3,
          opm: null,
          history: [
            { quarter: "24Q1", revenue: 11.8, yoy: 24.3, opm: null },
            { quarter: "24Q2", revenue: 12.8, yoy: 19.5, opm: null },
            { quarter: "24Q3", revenue: 14.3, yoy: 18.8, opm: null },
            { quarter: "24Q4", revenue: 17.3, yoy: 18.0, opm: null },
            { quarter: "25Q1", revenue: 13.9, yoy: 17.7, opm: null },
            { quarter: "25Q2", revenue: 15.7, yoy: 22.9, opm: null },
            { quarter: "25Q3", revenue: 17.7, yoy: 23.5, opm: null },
            { quarter: "25Q4", revenue: 21.3, yoy: 23.2, opm: null },
          ],
        },
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
        {
          name: "Family of Apps",
          priorRevenue: 47.3,
          latestRevenue: 58.9,
          opm: 52.2,
          history: [
            { quarter: "24Q1", revenue: 36.0, yoy: 27.2, opm: 49.0 },
            { quarter: "24Q2", revenue: 38.7, yoy: 21.4, opm: 49.9 },
            { quarter: "24Q3", revenue: 40.3, yoy: 18.8, opm: 54.0 },
            { quarter: "24Q4", revenue: 47.3, yoy: 21.2, opm: 59.9 },
            { quarter: "25Q1", revenue: 41.9, yoy: 16.4, opm: 51.9 },
            { quarter: "25Q2", revenue: 47.1, yoy: 21.8, opm: 53.0 },
            { quarter: "25Q3", revenue: 50.8, yoy: 25.9, opm: 49.2 },
            { quarter: "25Q4", revenue: 58.9, yoy: 24.6, opm: 52.2 },
          ],
        },
        {
          name: "Reality Labs",
          priorRevenue: 1.1,
          latestRevenue: 1.0,
          opm: -630.5,
          history: [
            { quarter: "24Q1", revenue: 0.4, yoy: 29.8, opm: -874.1 },
            { quarter: "24Q2", revenue: 0.4, yoy: 45.2, opm: -1271.4 },
            { quarter: "24Q3", revenue: 0.3, yoy: 28.6, opm: -1640.0 },
            { quarter: "24Q4", revenue: 1.1, yoy: 1.1, opm: -458.6 },
            { quarter: "25Q1", revenue: 0.4, yoy: -6.4, opm: -1021.8 },
            { quarter: "25Q2", revenue: 0.4, yoy: 4.8, opm: -1224.3 },
            { quarter: "25Q3", revenue: 0.5, yoy: 74.1, opm: -943.0 },
            { quarter: "25Q4", revenue: 1.0, yoy: -11.8, opm: -630.5 },
          ],
        },
        {
          name: "Advertising",
          priorRevenue: 46.8,
          latestRevenue: 58.1,
          opm: null,
          history: [
            { quarter: "24Q1", revenue: 35.6, yoy: 26.8, opm: null },
            { quarter: "24Q2", revenue: 38.3, yoy: 21.7, opm: null },
            { quarter: "24Q3", revenue: 39.9, yoy: 18.5, opm: null },
            { quarter: "24Q4", revenue: 46.8, yoy: 20.9, opm: null },
            { quarter: "25Q1", revenue: 41.4, yoy: 16.2, opm: null },
            { quarter: "25Q2", revenue: 46.6, yoy: 21.5, opm: null },
            { quarter: "25Q3", revenue: 50.1, yoy: 25.6, opm: null },
            { quarter: "25Q4", revenue: 58.1, yoy: 24.3, opm: null },
          ],
        },
        {
          name: "Other revenue",
          priorRevenue: 0.5,
          latestRevenue: 0.8,
          opm: null,
          history: [
            { quarter: "24Q1", revenue: 0.4, yoy: 85.4, opm: null },
            { quarter: "24Q2", revenue: 0.4, yoy: 95.0, opm: null },
            { quarter: "24Q3", revenue: 0.4, yoy: 48.1, opm: null },
            { quarter: "24Q4", revenue: 0.5, yoy: 55.4, opm: null },
            { quarter: "25Q1", revenue: 0.5, yoy: 34.2, opm: null },
            { quarter: "25Q2", revenue: 0.6, yoy: 49.9, opm: null },
            { quarter: "25Q3", revenue: 0.7, yoy: 59.0, opm: null },
            { quarter: "25Q4", revenue: 0.8, yoy: 54.3, opm: null },
          ],
        },
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
