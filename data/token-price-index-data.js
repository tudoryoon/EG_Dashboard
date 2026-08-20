window.tokenPriceIndexData = {
  "updatedAt": "2026-08-18",
  "generatedAt": "2026-08-20T02:48:17.946384Z",
  "source": {
    "provider": "Silicon Data",
    "label": "Silicon Data LLM Token Expenditure Index",
    "portalUrl": "https://portal.silicondata.com/token-index-chart",
    "productUrl": "https://www.silicondata.com/products/silicon-index/llm-token-expenditure-index",
    "methodologyUrl": "https://docs.silicondata.com/api-reference/token_index_api",
    "cadence": "일간 · 공개 포털 관측값을 EG Dashboard에 매일 누적"
  },
  "latest": {
    "overall": {
      "ticker": "SDLLMTK",
      "label": "LLM Token Expenditure Index",
      "value": 1.0575,
      "date": "2026-08-18",
      "quality": "official-public"
    },
    "closed": {
      "ticker": "SDLLMCS",
      "label": "Closed Model Token Index",
      "value": 3.07,
      "date": "2026-08-03",
      "quality": "public-chart-reference"
    },
    "open": {
      "ticker": "SDLLMOS",
      "label": "Open Model Token Index",
      "value": 0.66,
      "date": "2026-08-03",
      "quality": "public-chart-reference"
    },
    "dailyChangePct": 0.9,
    "publicWindowChangePct": -22.08,
    "closedOpenPremium": 4.65
  },
  "series": {
    "overall": [
      {
        "date": "2026-07-31",
        "value": 1.3572,
        "quality": "official-public"
      },
      {
        "date": "2026-08-01",
        "value": 1.3394,
        "quality": "official-public"
      },
      {
        "date": "2026-08-02",
        "value": 1.3136,
        "quality": "official-public"
      },
      {
        "date": "2026-08-03",
        "value": 1.2901,
        "quality": "official-public"
      },
      {
        "date": "2026-08-04",
        "value": 1.2723,
        "quality": "official-public"
      },
      {
        "date": "2026-08-05",
        "value": 1.1997,
        "quality": "official-public"
      },
      {
        "date": "2026-08-06",
        "value": 1.1771,
        "quality": "official-public"
      },
      {
        "date": "2026-08-07",
        "value": 1.1692,
        "quality": "official-public"
      },
      {
        "date": "2026-08-08",
        "value": 1.1635,
        "quality": "official-public"
      },
      {
        "date": "2026-08-09",
        "value": 1.1269,
        "quality": "official-public"
      },
      {
        "date": "2026-08-10",
        "value": 1.124,
        "quality": "official-public"
      },
      {
        "date": "2026-08-11",
        "value": 1.0991,
        "quality": "official-public"
      },
      {
        "date": "2026-08-12",
        "value": 1.0775,
        "quality": "official-public"
      },
      {
        "date": "2026-08-13",
        "value": 1.0516,
        "quality": "official-public"
      },
      {
        "date": "2026-08-14",
        "value": 1.0293,
        "quality": "official-public"
      },
      {
        "date": "2026-08-15",
        "value": 1.0189,
        "quality": "official-public"
      },
      {
        "date": "2026-08-16",
        "value": 1.0217,
        "quality": "official-public"
      },
      {
        "date": "2026-08-17",
        "value": 1.0481,
        "quality": "official-public"
      },
      {
        "date": "2026-08-18",
        "value": 1.0575,
        "quality": "official-public"
      }
    ],
    "closed": [
      {
        "date": "2026-08-03",
        "value": 3.07,
        "quality": "public-chart-reference"
      }
    ],
    "open": [
      {
        "date": "2026-08-03",
        "value": 0.66,
        "quality": "public-chart-reference"
      }
    ]
  },
  "comparison": {
    "date": "2026-08-03",
    "values": [
      {
        "key": "overall",
        "ticker": "SDLLMTK",
        "label": "전체",
        "value": 1.29
      },
      {
        "key": "closed",
        "ticker": "SDLLMCS",
        "label": "Closed",
        "value": 3.07
      },
      {
        "key": "open",
        "ticker": "SDLLMOS",
        "label": "Open",
        "value": 0.66
      }
    ]
  },
  "methodology": {
    "unit": "USD per 1 million tokens",
    "aggregation": "모델별 추론 사용량과 시장 지출 비중으로 가중한 혼합 가격",
    "normalization": "입력·출력 토큰 구성, Context 길이, Batching 방식과 서비스 안정성을 정규화",
    "coverage": "Frontier API, Open-weight 플랫폼, 전용 인스턴스와 Self-hosted 기준 배포",
    "interpretation": "상승은 프리미엄 모델 사용 집중 또는 공급자의 가격 결정력 강화, 하락은 저가 모델 확산과 추론 효율 개선을 시사",
    "publicDataLimit": "공개 포털은 SDLLMTK의 최근 관측치만 제공합니다. 전체 히스토리와 Closed/Open 일간 시계열은 Silicon Data 구독이 필요합니다.",
    "subindexReference": "Closed/Open 최신값은 2026-08 공개 차트의 표기값이며, 기준일은 SDLLMTK $1.29와 공식 2026-08-03 값의 일치로 정렬한 추정입니다."
  }
};
