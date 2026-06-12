window.marketCanslimData = {
  updatedAt: "2026-06-12",
  scope: {
    universe: "M7 prototype",
    basis:
      "William O'Neil CANSLIM-style checklist. C uses latest available quarterly financials where available. N is catalyst-focused, with price/RS new highs treated only as confirmation, not the core catalyst.",
  },
  profiles: {
    AAPL: {
      ticker: "AAPL",
      catalyst:
        "Services mix, device ecosystem monetization, and on-device AI cycle. Hardware growth still needs confirmation.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; use as incomplete until 5Y annual EPS is added.",
      institutionNote:
        "Mega-cap institutional sponsorship is established, but 13F holder-count and QoQ ownership trend are not loaded yet.",
      ratings: {
        n: "watch",
        i: "watch",
      },
    },
    AMZN: {
      ticker: "AMZN",
      catalyst:
        "AWS AI/cloud demand, advertising scale, and retail operating leverage. Catalyst quality depends on cloud revenue acceleration.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; recent profitability recovery should be verified against 5Y annual EPS.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "pass",
        i: "watch",
      },
    },
    GOOGL: {
      ticker: "GOOGL",
      aliases: ["GOOG"],
      catalyst:
        "Search monetization, cloud AI demand, and Gemini/product-cycle execution. Watch whether AI capex converts into revenue acceleration.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; verify 5Y annual EPS trend before strict CANSLIM pass.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "watch",
        i: "watch",
      },
    },
    META: {
      ticker: "META",
      catalyst:
        "AI-driven ad ranking, Reels monetization, and operating leverage. New product risk remains Reality Labs/AI investment intensity.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; recent margin recovery needs annual EPS confirmation.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "pass",
        i: "watch",
      },
    },
    MSFT: {
      ticker: "MSFT",
      catalyst:
        "Azure AI, Copilot, and enterprise AI platform adoption. Key test is whether backlog/RPO converts into cloud revenue growth.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; strict A pass requires 5Y annual EPS growth.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "pass",
        i: "watch",
      },
    },
    NVDA: {
      ticker: "NVDA",
      catalyst:
        "AI accelerator cycle, networking, and data-center platform expansion. Catalyst is strong if revenue/EPS growth remains exceptional.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; recent growth is strong but strict A pass needs 5Y annual EPS.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "pass",
        i: "watch",
      },
    },
    TSLA: {
      ticker: "TSLA",
      catalyst:
        "Autonomy, robotaxi, energy storage, and lower-cost vehicle platform. Core auto margin/revenue execution remains the confirmation point.",
      annualNote:
        "Annual EPS history is not loaded in this prototype; recent operating volatility prevents a strict A pass without annual data.",
      institutionNote:
        "Institutional sponsorship is established; 13F ownership trend is pending.",
      ratings: {
        n: "watch",
        i: "watch",
      },
    },
  },
};
