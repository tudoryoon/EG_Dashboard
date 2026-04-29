window.cloudDashboardData = {
  labels: [
    "2021 Q4",
    "2022 Q1",
    "2022 Q2",
    "2022 Q3",
    "2022 Q4",
    "2023 Q1",
    "2023 Q2",
    "2023 Q3",
    "2023 Q4",
    "2024 Q1",
    "2024 Q2",
    "2024 Q3",
    "2024 Q4",
    "2025 Q1",
    "2025 Q2",
    "2025 Q3",
    "2025 Q4",
    "2026 Q1",
  ],
  colors: {
    amazon: "#f4b400",
    microsoft: "#2563eb",
    google: "#db4437",
  },
  yoyGrowth: {
    title: "Cloud Revenue Growth",
    subtitle: "YoY growth rate by quarter, constant-currency where provided",
    unit: "%",
    series: [
      {
        key: "amazon",
        name: "AWS",
        values: [39.54, 36.57, 33.29, 27.49, 20.24, 15.8, 12.16, 14.47, 13.22, 17.25, 18.7, 16.77, 18.93, 16.89, 17.47, 20.23, 23.6, 28.43],
      },
      {
        key: "microsoft",
        name: "Azure",
        values: [46.0, 49.0, 46.0, 42.0, 38.0, 31.0, 27.0, 27.0, 28.0, 28.0, 30.0, 34.0, 31.0, 35.0, 39.0, 39.0, 38.0, 39.0],
      },
      {
        key: "google",
        name: "Google Cloud",
        values: [44.6, 43.83, 35.61, 37.64, 32.02, 28.05, 27.96, 22.47, 25.66, 28.44, 28.84, 34.98, 30.06, 28.06, 31.67, 33.51, 47.75, 63.36],
      },
    ],
  },
  margin: {
    title: "Cloud Margin",
    subtitle: "Quarterly operating margin level, with Microsoft shown as Intelligent Cloud",
    unit: "%",
    series: [
      {
        key: "amazon",
        name: "AWS Margin",
        values: [29.77, 35.35, 28.95, 26.31, 24.35, 23.99, 24.23, 29.67, 29.61, 37.63, 35.52, 38.06, 36.93, 39.45, 32.91, 34.64, 35.03, 37.68],
      },
      {
        key: "microsoft",
        name: "MS Intelligent Cloud Margin",
        values: [null, null, null, 39.98, 37.53, 38.46, 39.81, 44.51, 44.39, 42.97, 41.35, 43.6, 42.48, 41.48, 40.63, 43.34, 42.16, 39.66],
      },
      {
        key: "google",
        name: "Google Cloud Margin",
        values: [-16.06, -12.13, -9.4, -6.41, -6.56, 2.56, 4.92, 3.16, 9.4, 9.4, 11.33, 17.15, 17.51, 17.76, 20.74, 23.71, 30.08, 32.94],
      },
    ],
  },
  revenue: {
    title: "Cloud Revenue",
    subtitle: "Quarterly cloud revenue scale, with Microsoft shown as Intelligent Cloud",
    unit: "$MM",
    series: [
      {
        key: "amazon",
        name: "AWS Revenue",
        values: [17780, 18441, 19739, 20538, 21378, 21354, 22140, 23509, 24204, 25037, 26281, 27452, 28786, 29267, 30873, 33006, 35579, 37587],
      },
      {
        key: "microsoft",
        name: "MS Intelligent Cloud Revenue",
        values: [null, null, null, 16885, 17926, 18244, 19889, 20013, 21525, 22141, 23785, 24092, 25544, 26751, 29878, 30897, 32907, 34681],
      },
      {
        key: "google",
        name: "Google Cloud Revenue",
        values: [5541, 5821, 6276, 6868, 7315, 7454, 8031, 8411, 9192, 9574, 10347, 11353, 11955, 12260, 13624, 15157, 17664, 20028],
      },
    ],
  },
};
