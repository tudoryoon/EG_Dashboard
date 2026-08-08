window.tokenPriceIndexData = {
  "updatedAt": "2026-08-03",
  "generatedAt": "2026-08-03T15:48:02.620Z",
  "source": {
    "label": "The Beta Index",
    "url": "https://thebetaindex.com",
    "methodologyUrl": "https://thebetaindex.com/methodology/",
    "dataUrl": "https://thebetaindex.com/data/",
    "cadence": "Weekly · Monday 13:00 UTC after validation"
  },
  "methodology": {
    "version": "1.2.1",
    "basePeriod": "2026-06",
    "baseValue": 100,
    "aggregation": "weighted geometric mean of tier median price relatives; dollar anchor is a separate arithmetic basket level",
    "inputWeight": 0.8,
    "outputWeight": 0.2,
    "note": "공개 PAYG 정가 기반이며 캐시·약정 할인·실제 기업 계약가는 반영하지 않습니다."
  },
  "latest": {
    "value": 105.4,
    "dollarAnchor": 1.974,
    "wowPct": 0,
    "sinceBasePct": 5.4,
    "status": "ok"
  },
  "history": [
    {
      "date": "2026-06-09",
      "value": 100
    },
    {
      "date": "2026-06-19",
      "value": 100
    },
    {
      "date": "2026-07-01",
      "value": 97.9
    },
    {
      "date": "2026-07-02",
      "value": 97.9
    },
    {
      "date": "2026-07-06",
      "value": 97.9
    },
    {
      "date": "2026-07-10",
      "value": 97.9
    },
    {
      "date": "2026-07-13",
      "value": 97.9
    },
    {
      "date": "2026-08-01",
      "value": 105.4
    },
    {
      "date": "2026-08-03",
      "value": 105.4
    }
  ],
  "lwciHistory": [
    {
      "date": "2026-06-19",
      "value": 100
    },
    {
      "date": "2026-07-01",
      "value": 96.6
    },
    {
      "date": "2026-07-10",
      "value": 96.6
    },
    {
      "date": "2026-07-13",
      "value": 96.6
    },
    {
      "date": "2026-08-01",
      "value": 103.4
    },
    {
      "date": "2026-08-03",
      "value": 103.4
    }
  ],
  "tiers": [
    {
      "tier": "flagship",
      "weight": 0.4,
      "member_count": 7,
      "median_blended_usd_per_mtok": 3.5,
      "base_median_blended_usd_per_mtok": 3.5,
      "index": 100,
      "affordable_frontier_blended_usd_per_mtok": 2,
      "affordable_frontier_model": "Zhipu AI GLM-5.2"
    },
    {
      "tier": "workhorse",
      "weight": 0.4,
      "member_count": 6,
      "median_blended_usd_per_mtok": 1.13,
      "base_median_blended_usd_per_mtok": 1,
      "index": 113,
      "affordable_frontier_blended_usd_per_mtok": 0.48,
      "affordable_frontier_model": "MiniMax MiniMax-M3"
    },
    {
      "tier": "efficient",
      "weight": 0.2,
      "member_count": 8,
      "median_blended_usd_per_mtok": 0.61,
      "base_median_blended_usd_per_mtok": 0.6,
      "index": 101.7,
      "affordable_frontier_blended_usd_per_mtok": 0.168,
      "affordable_frontier_model": "DeepSeek DeepSeek V4 Flash"
    }
  ]
};
