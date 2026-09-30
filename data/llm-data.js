window.llmDashboardData = {
  "updatedAt": "2026-09-29",
  "colors": {
    "openai": "#111827",
    "anthropic": "#d97745"
  },
  "snapshots": [
    {
      "provider": "OpenAI",
      "metric": "보도된 연환산 매출 런레이트",
      "value": "$40B+",
      "asOf": "2026-07 말 기준 · Bloomberg 8/13 보도",
      "tone": "openai"
    },
    {
      "provider": "Anthropic",
      "metric": "보도된 연환산 매출 런레이트",
      "value": "$65B+",
      "asOf": "2026-07 말 기준 · Reuters 8/17 보도",
      "tone": "anthropic"
    },
    {
      "provider": "OpenAI",
      "kind": "tracking",
      "metric": "TickerTrends ARR 추정치",
      "value": "$50.44B",
      "asOf": "2026-09-29 · 게시일 기준 · 관측일 미공개",
      "tone": "openai"
    },
    {
      "provider": "Anthropic",
      "kind": "tracking",
      "metric": "TickerTrends ARR 추정치",
      "value": "$76.8B",
      "asOf": "2026-09-29 · 게시일 기준 · 관측일 미공개",
      "tone": "anthropic"
    }
  ],
  "revenue": {
    "title": "OpenAI vs Anthropic 매출 런레이트",
    "subtitle": "실선: 회사 발표·언론 보도 · 점선: TickerTrends 추정치 · 단위 $B",
    "labels": [
      "2023-12",
      "2024-01",
      "2024-06",
      "2024-12",
      "2025-05",
      "2025-06",
      "2025-08",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09"
    ],
    "series": [
      {
        "key": "openai",
        "name": "OpenAI 회사 발표·보도",
        "mode": "actual",
        "values": [
          1.6,
          null,
          3.4,
          5.5,
          null,
          10,
          13,
          20,
          null,
          25,
          null,
          null,
          null,
          null,
          40,
          null,
          null
        ],
        "observations": {
          "2026-07": {
            "asOf": "2026-07-31",
            "reportedAt": "2026-08-13",
            "status": "reported",
            "qualifier": "more-than",
            "sourceUrl": "https://finance.yahoo.com/technology/ai/articles/openai-revenue-run-rate-tops-213604019.html",
            "periodSourceUrl": "https://blog.tickertrends.io/p/openai-arr-tracking-44-3b-bloomberg-40b-run-rate",
            "note": "Bloomberg 관계자 인용 보도. 7월 말 기준은 TickerTrends의 해당 보도 대조 자료로 확인. OpenAI 공식 공시나 감사된 연매출이 아님."
          }
        },
        "sourceLabels": [
          "The Information",
          null,
          "The Information",
          "Reuters",
          null,
          "OpenAI / Reuters",
          "Axios",
          "OpenAI CFO",
          null,
          "The Information / Reuters",
          null,
          null,
          null,
          null,
          "Bloomberg · 2026-08-13 보도 · $40B 초과",
          null,
          null
        ]
      },
      {
        "key": "openai",
        "name": "OpenAI 추적치",
        "mode": "tracking",
        "values": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          21.4,
          23.9,
          26.9,
          28.8,
          33,
          37.3,
          42.6,
          44.3,
          50.44
        ],
        "sourceLabels": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "TickerTrends · Jan 19",
          "TickerTrends · Feb 14",
          "TickerTrends · Mar 13",
          "TickerTrends · Apr 8",
          "TickerTrends · May 30",
          "TickerTrends · Jun 25",
          "TickerTrends 추정 · 기준일 2026-07-29",
          "TickerTrends 추정 · 기준일 2026-08-12",
          "TickerTrends 추정 · 게시일 기준 · 관측일 미공개 2026-09-29"
        ],
        "observations": {
          "2026-07": {
            "provider": "openai",
            "value": 42.6,
            "date": "2026-07-29",
            "asOf": "2026-07-29",
            "publishedAt": "2026-07-30",
            "dateBasis": "observation",
            "sourceUrl": "https://blog.tickertrends.io/p/openai-arr-growth-accelerated-july-2026",
            "sourceTitle": "OpenAI ARR Growth Accelerated Into July",
            "status": "tracking"
          },
          "2026-08": {
            "provider": "openai",
            "value": 44.3,
            "date": "2026-08-12",
            "asOf": "2026-08-12",
            "publishedAt": "2026-08-14",
            "dateBasis": "observation",
            "sourceUrl": "https://blog.tickertrends.io/p/openai-arr-tracking-44-3b-bloomberg-40b-run-rate",
            "sourceTitle": "OpenAI ARR Tracking Reached $44.3B as Bloomberg Reported $40B Run Rate",
            "status": "tracking"
          },
          "2026-09": {
            "provider": "openai",
            "value": 50.44,
            "date": "2026-09-29",
            "asOf": null,
            "publishedAt": "2026-09-29",
            "dateBasis": "publication",
            "sourceUrl": "https://blog.tickertrends.io/p/openai-and-anthropic-arr-tracking",
            "sourceTitle": "OpenAI and Anthropic ARR Tracking",
            "status": "tracking"
          }
        }
      },
      {
        "key": "anthropic",
        "name": "Anthropic 회사 발표·보도",
        "mode": "actual",
        "values": [
          null,
          0.087,
          null,
          1,
          3,
          null,
          5,
          9,
          null,
          14,
          19,
          30,
          47,
          null,
          65,
          null,
          null
        ],
        "observations": {
          "2026-07": {
            "asOf": "2026-07-31",
            "reportedAt": "2026-08-17",
            "status": "reported",
            "qualifier": "more-than",
            "sourceUrl": "https://www.aol.com/articles/anthropic-revenue-run-rate-tops-213602000.html",
            "note": "Reuters가 투자자에게 공유된 수치를 관계자에게 확인. Bloomberg 최초 보도. 공식 공시나 감사된 연매출이 아님."
          }
        },
        "sourceLabels": [
          null,
          "Anthropic",
          null,
          "Reuters",
          "Reuters",
          null,
          "Anthropic",
          "Anthropic / Bloomberg",
          null,
          "Anthropic",
          "Bloomberg",
          "Anthropic",
          "Anthropic",
          null,
          "Reuters / Bloomberg · 2026-08-17 보도 · $65B 초과",
          null,
          null
        ]
      },
      {
        "key": "anthropic",
        "name": "Anthropic 추적치",
        "mode": "tracking",
        "values": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          10.2,
          14.9,
          21.7,
          35.6,
          54.6,
          69.6,
          74.1,
          null,
          76.8
        ],
        "sourceLabels": [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          "TickerTrends · Jan 19",
          "TickerTrends · Feb 26",
          "TickerTrends · Mar 21",
          "TickerTrends · Apr 27",
          "TickerTrends · May 21",
          "TickerTrends · Jun 27",
          "TickerTrends 추정 · 게시일 기준 · 관측일 미공개 2026-07-23",
          null,
          "TickerTrends 추정 · 게시일 기준 · 관측일 미공개 2026-09-29"
        ],
        "observations": {
          "2026-07": {
            "provider": "anthropic",
            "value": 74.1,
            "date": "2026-07-23",
            "asOf": null,
            "publishedAt": "2026-07-23",
            "dateBasis": "publication",
            "sourceUrl": "https://blog.tickertrends.io/p/anthropic-vs-openai-arr-tracking",
            "sourceTitle": "Anthropic Is Tracking Above OpenAI in ARR, but Its Growth Is Beginning to Decelerate",
            "status": "tracking"
          },
          "2026-09": {
            "provider": "anthropic",
            "value": 76.8,
            "date": "2026-09-29",
            "asOf": null,
            "publishedAt": "2026-09-29",
            "dateBasis": "publication",
            "sourceUrl": "https://blog.tickertrends.io/p/openai-and-anthropic-arr-tracking",
            "sourceTitle": "OpenAI and Anthropic ARR Tracking",
            "status": "tracking"
          }
        }
      }
    ]
  },
  "methodology": [
    "실선은 회사 발표·언론 보도, 점선은 TickerTrends 추정치입니다. 추정치를 회사 공식 ARR로 해석하지 않습니다.",
    "월별로 가장 최근 공개된 추정치를 표시합니다. 별도 관측일이 없으면 게시일 기준이며, 실제 관측일과 구분합니다. 새 수치가 없으면 기존 값과 날짜를 유지합니다.",
    "연환산 런레이트는 최근 매출을 연간으로 환산한 속도 지표이며, 감사된 연간 매출이나 계약 잔고 기준 SaaS ARR과는 다릅니다.",
    "두 회사의 클라우드 파트너 매출 총액·순액 인식 방식이 달라 완전히 동일한 회계 기준 비교는 아닙니다. 빈 구간을 잇는 선은 일별 관측치나 보간한 데이터가 아닙니다."
  ],
  "sources": [
    {
      "label": "Anthropic: 7월 말 $65B 초과 (Reuters 2026-08-17, AOL 전재)",
      "url": "https://www.aol.com/articles/anthropic-revenue-run-rate-tops-213602000.html"
    },
    {
      "label": "OpenAI: $40B 초과 (Bloomberg 2026-08-13, Yahoo 전재)",
      "url": "https://finance.yahoo.com/technology/ai/articles/openai-revenue-run-rate-tops-213604019.html"
    },
    {
      "label": "OpenAI 보도 기준일 대조: 7/31 (TickerTrends 2026-08-14)",
      "url": "https://blog.tickertrends.io/p/openai-arr-tracking-44-3b-bloomberg-40b-run-rate"
    },
    {
      "label": "매출 비교 유의사항: 클라우드 파트너 총액·순액 인식 (Axios 2026-09-03)",
      "url": "https://www.axios.com/2026/09/03/anthropic-and-openais-revenue-chasm-explained"
    },
    {
      "label": "TickerTrends: OpenAI vs Anthropic ARR tracking (Jul 23, 2026)",
      "url": "https://blog.tickertrends.io/p/anthropic-vs-openai-arr-tracking"
    },
    {
      "label": "OpenAI revenue: Reuters / The Information",
      "url": "https://uk.finance.yahoo.com/news/openai-tops-25-billion-annualized-033836274.html"
    },
    {
      "label": "OpenAI revenue: Reuters ($10B, June 2025)",
      "url": "https://m.investing.com/news/stock-market-news/openais-annualized-revenue-hits-10-billion-up-from-55-billion-in-december-2024-4087508"
    },
    {
      "label": "Anthropic Series F: $5B run-rate and 300K business customers",
      "url": "https://www.anthropic.com/news/anthropic-raises-series-f-at-usd183b-post-money-valuation"
    },
    {
      "label": "Anthropic Series H: $47B run-rate",
      "url": "https://www.anthropic.com/news/series-h"
    },
    {
      "label": "TickerTrends: OpenAI ARR Growth Accelerated Into July",
      "url": "https://blog.tickertrends.io/p/openai-arr-growth-accelerated-july-2026"
    },
    {
      "label": "TickerTrends: OpenAI and Anthropic ARR Tracking",
      "url": "https://blog.tickertrends.io/p/openai-and-anthropic-arr-tracking"
    }
  ]
};
