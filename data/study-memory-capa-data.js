window.studyMemoryCapaData = {
  updatedAt: "2026-07-15",
  unit: "DRAM: 연말 총 wafer CAPA (K WPM) · NAND: 생산 전환/증설 이벤트 · HDD: TB/drive 및 출하 단계",
  scope:
    "표시 기준을 연말 총량, HBM 배정 비중, 분기별 생산 이벤트로 분리했습니다. 서로 다른 층의 숫자는 합산하지 않으며, 회사가 직접 공시하지 않은 WPM은 리서치 기반 추정치로 표시합니다.",
  quarters: [
    { key: "2026Q1", year: "CY2026", label: "1Q" },
    { key: "2026Q2", year: "CY2026", label: "2Q" },
    { key: "2026Q3", year: "CY2026", label: "3Q" },
    { key: "2026Q4", year: "CY2026", label: "4Q" },
    { key: "2027Q1", year: "CY2027", label: "1Q" },
    { key: "2027Q2", year: "CY2027", label: "2Q" },
    { key: "2027Q3", year: "CY2027", label: "3Q" },
    { key: "2027Q4", year: "CY2027", label: "4Q" },
    { key: "2028Q1", year: "CY2028", label: "1Q" },
    { key: "2028Q2", year: "CY2028", label: "2Q" },
    { key: "2028Q3", year: "CY2028", label: "3Q" },
    { key: "2028Q4", year: "CY2028", label: "4Q" },
  ],
  legend: [
    { key: "online", label: "가동 / 출하", tone: "green" },
    { key: "ramp", label: "램프업 / 양산", tone: "teal" },
    { key: "equipment", label: "장비 반입 / 고객 인증", tone: "blue" },
    { key: "construction", label: "착공 / 클린룸", tone: "amber" },
    { key: "planned", label: "계획 / 시점 미정", tone: "gray" },
  ],
  sections: {
    dram: {
      title: "DRAM Capa Roadmap",
      subtitle:
        "연말 명목 wafer CAPA를 같은 단위로 비교하되, 복수 리서치의 범위와 회사가 공개한 Fab 가동 시점을 분리해 표시합니다.",
      kpis: [
        { label: "Samsung 2026E", value: "700-740K", note: "Mirae 700K · SK/DS 740K" },
        { label: "SK hynix 2026E", value: "605-610K", note: "Mirae 605K · SK/DS 610K" },
        { label: "Micron 2026E", value: "365K", note: "SK증권 연말 WPM 추정" },
      ],
      criteria: [
        {
          label: "연말 총량",
          value: "회사 전체 DRAM CAPA",
          note: "연말 명목 K WPM · 회사 공시가 아닌 리서치 추정",
        },
        {
          label: "HBM 배정",
          value: "DRAM 중 HBM wafer 비중",
          note: "전공정 기준 · TSV/패키징 제외",
        },
        {
          label: "분기 로드맵",
          value: "Fab 단계와 공급 시점",
          note: "설계치·증설분은 총량에 재합산 금지",
        },
      ],
      annualModel: {
        title: "연말 총 DRAM CAPA",
        badge: "공개 범위 · 보수적 N/D",
        unit: "K WPM · 2026은 공개 추정 범위, *는 DS 단일 시나리오",
        years: ["2025 Base", "2026E", "2027E", "2028E"],
        rows: [
          {
            label: "Samsung",
            values: ["650", "700-740", "865*", "975*"],
            yoy: ["기준", "YoY +7.7~13.8%", "DS +16.9%", "DS +12.7%"],
          },
          {
            label: "SK hynix",
            values: ["545", "605-610", "710*", "760*"],
            yoy: ["기준", "YoY +11.0~11.9%", "DS +16.4%", "DS +7.0%"],
          },
          {
            label: "Micron",
            values: ["340", "365", "N/D", "N/D"],
            yoy: ["기준", "YoY +7.4%", "공개 WPM 없음", "공개 WPM 없음"],
          },
          {
            label: "3사 합계",
            values: ["1,535", "1,670-1,715", "N/D", "N/D"],
            yoy: ["기준", "YoY +8.8~11.7%", "미산출", "미산출"],
            total: true,
          },
        ],
        note:
          "2026 증가는 신규 메가팹이 아니라 Samsung P4·SK hynix M15X 등 기존 캠퍼스 증설과 공정 전환 후 순증을 반영합니다. 2027E~2028E의 Samsung·SK hynix 값은 DS증권 단일 시나리오이며, Micron은 ID1·Tongluo·ID2의 공식 가동 시점만 공개하고 WPM은 공개하지 않아 보간값을 삭제했습니다. 따라서 3사 합계와 YoY도 2027년 이후 산출하지 않습니다.",
        sources: [
          {
            label: "2026 Outlook Mirae Asset (SEC 700K · SKH 605K)",
            url: "https://securities.miraeasset.com/bbs/download/2141014.pdf?attachmentId=2141014",
          },
          {
            label: "2026-06-17 DS Securities",
            url: "https://file.alphasquare.co.kr/media/pdfs/market-report/%EB%B0%98%EB%8F%84%EC%B2%B4Higher%2C20260617DS%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B6%8C.pdf",
          },
          {
            label: "2026-06-04 SK Securities",
            url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
          },
          {
            label: "2026-06-24 Micron supply roadmap",
            url: "https://investors.micron.com/static-files/2354ecda-77a0-4ddd-8462-a631eb491356",
          },
          {
            label: "2026-02-25 SK hynix Yongin official",
            url: "https://news.skhynix.com/new-facility-investment-for-yongin-semiconductor-cluster/",
          },
        ],
      },
      hbmAllocation: {
        title: "HBM 전공정 배정 비중",
        badge: "파생 추정 · 범위",
        unit: "회사 DRAM 총 CAPA 중 HBM core die용 wafer input",
        years: ["2026E", "2027E", "2028E"],
        rows: [
          {
            label: "Samsung",
            values: [
              { wpm: "140-170K", share: "19-23%" },
              { wpm: "230-250K", share: "27-29%" },
              { wpm: "300-320K", share: "31-33%" },
            ],
          },
          {
            label: "SK hynix",
            values: [
              { wpm: "160-180K", share: "26-30%" },
              { wpm: "210-230K", share: "30-32%" },
              { wpm: "250-270K", share: "33-36%" },
            ],
          },
          {
            label: "Micron",
            values: [
              { wpm: "80-90K", share: "22-25%" },
              { wpm: "N/D", share: "22-24%" },
              { wpm: "N/D", share: "21-23%" },
            ],
          },
        ],
        note:
          "비중을 핵심 지표로 표시하며 WPM은 위 연말 총량에 비중을 적용한 환산 범위입니다. Micron의 2027~2028 연말 총 WPM이 공개되지 않아 해당 환산값은 N/D로 처리했습니다. HBM 완제품·TSV·패키징 CAPA는 포함하지 않습니다.",
        sources: [
          {
            label: "2026-06-17 DS Securities",
            url: "https://file.alphasquare.co.kr/media/pdfs/market-report/%EB%B0%98%EB%8F%84%EC%B2%B4Higher%2C20260617DS%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B6%8C.pdf",
          },
          {
            label: "2026-06 DRAM/HBM capacity model",
            url: "https://log.eurekapu.com/memory-makers/dram-fab-capacity/",
          },
          {
            label: "2026-05-13 TrendForce HBM bulletin",
            url: "https://www.trendforce.com/research/download/RP260513PF3",
          },
          {
            label: "2026-06-24 Micron supply roadmap",
            url: "https://investors.micron.com/static-files/2354ecda-77a0-4ddd-8462-a631eb491356",
          },
        ],
      },
      roadmapTitle: "분기별 Fab 이벤트",
      roadmapNote: "셀에는 단계와 시점만 표시합니다. 클릭하면 설계치·증설분과 출처를 확인할 수 있습니다.",
      companyRows: [
        {
          company: "Samsung",
          scope: "P4 Ph3/Ph4/Ph2 · P5 · 1c DRAM/HBM",
          confidence: "2026-06 리서치 + 2026-05 회사 발표",
          confidenceTone: "mixed",
          summary:
            "2026년 연말 총 DRAM CAPA는 리서치별 700~740K WPM 범위입니다. P4 Ph3·Ph4·Ph2의 설계 CAPA는 서로 다른 단계의 라인 수치이며, 회사 총 CAPA와 별도로 봐야 합니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "P4 Ph4",
              delta: "1c tool-in",
              detail: "P4 Ph4의 1c DRAM 장비 셋업 시작 구간. 설계 최대 CAPA는 60~80K WPM 추정입니다.",
              basis: "2026-06-17 DS투자증권 팹 타임라인 기준이며 Samsung 공식 WPM 가이던스가 아닙니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "ramp",
              value: "P4 Ph3",
              delta: "1H26 공급 기여",
              detail: "P4 Ph3가 1H26 공급에 기여하는 구간. 설계 최대 120K 추정이며, 5월 HBM4E 샘플 출하는 1c 공정의 실제 가동을 확인해 줍니다.",
              basis: "120K는 2026-06-17 리서치 추정, 1c HBM4E 진행은 2026-05-29 Samsung 공식 발표입니다.",
              sourceIndexes: [0, 2],
            },
            "2026Q3": {
              status: "ramp",
              value: "P4 Ph4",
              delta: "초기 양산",
              detail: "P4 Ph4 초기 양산 목표 구간. 실제 공급 기여는 1H27부터로 추정됩니다.",
              basis: "설계 최대 CAPA와 초기 양산 시점 모두 2026-06-17 리서치 추정이며 실제 wafer input은 램프 속도에 따라 달라집니다.",
              sourceIndexes: [0],
            },
            "2027Q1": {
              status: "equipment",
              value: "P4 Ph2",
              delta: "장비 반입",
              detail: "P4 Ph2 장비 반입 시작 추정. 초기 양산은 2H27, 공급 기여는 1H28로 예상됩니다.",
              basis: "2026-06-17 리서치 팹 타임라인의 설계 최대치이며 회사 확정 CAPA가 아닙니다.",
              sourceIndexes: [0],
            },
            "2028Q1": {
              status: "online",
              value: "P5",
              delta: "초기 양산",
              detail: "P5 초기 양산 목표. 공급 기여는 2H28부터로 추정되며 P5·P6 전체 600K 보도치와는 범위가 다릅니다.",
              basis: "초기 양산·150K+ 설계치는 2026-06-17 리서치, P5/P6 건설 일정은 2026-05 보도로 교차 확인했습니다.",
              sourceIndexes: [0, 3],
            },
          },
          sources: [
            {
              label: "2026-06-17 DS Securities",
              url: "https://file.alphasquare.co.kr/media/pdfs/market-report/%EB%B0%98%EB%8F%84%EC%B2%B4Higher%2C20260617DS%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B6%8C.pdf",
            },
            {
              label: "2026-06-04 SK Securities",
              url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
            },
            {
              label: "2026-05-29 Samsung HBM4E",
              url: "https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-%EC%84%B8%EA%B3%84-%EC%B5%9C%EC%B4%88-hbm4e-12%EB%8B%A8-%EC%83%98%ED%94%8C-%EC%B6%9C%ED%95%98",
            },
            {
              label: "2026-05-13 P5/P6 construction",
              url: "https://www.koreajoongangdaily.com/business/samsung-fasttracks-construction-of-p6-chip-plant-in-pyeongtaek/12559743",
            },
          ],
        },
        {
          company: "SK hynix",
          scope: "M15X · Yongin Y1 · Cheongju",
          confidence: "2026-06 리서치 + 회사 공식",
          confidenceTone: "mixed",
          summary:
            "M15X는 2Q26 초기 양산, 2H26 공급 기여, 설계 최대 100K WPM으로 최신 추정됩니다. Yongin Y1은 2027년 2월 첫 클린룸 개장을 기준으로 단계별 램프를 표시합니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "M15X",
              delta: "ramp prep",
              detail: "M15X 장비 반입과 초기 wafer-in 준비 구간. 분기 실투입 WPM은 공개되지 않았습니다.",
              basis: "2026-06-17 팹 타임라인에서 초기 양산을 2Q26으로 추정하므로 1Q26은 준비 구간으로 분류했습니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "online",
              value: "M15X",
              delta: "초기 양산",
              detail: "M15X 초기 양산 목표 2Q26, 공급 기여 2H26. 100K는 완전 램프 시 설계 최대치입니다. 6월 18일 HBM4E 12단 샘플 공급은 제품·패키징 진척이며 WPM 증설 수치가 아닙니다.",
              basis: "100K는 2026-06-17 DS투자증권 추정입니다. HBM4E 샘플은 SK hynix 공식 발표로 교차 확인했으며 2Q26 실제 투입량이 100K라는 뜻은 아닙니다.",
              sourceIndexes: [0, 4],
            },
            "2026Q3": {
              status: "ramp",
              value: "CY26 증설",
              delta: "투자분 추정",
              detail: "2026년 DRAM 증설 투자분 추정. M15X 일부 공간은 2H26 범용 1c DRAM에도 배정될 것으로 예상됩니다.",
              basis: "2026-06-04 SK증권 추정이며 M15X 설계 최대 100K와 별도로 더하면 안 됩니다.",
              sourceIndexes: [1],
            },
            "2026Q4": {
              status: "equipment",
              value: "Y1 Ph1",
              delta: "tool-in",
              detail: "Yongin Y1 Ph1 장비 반입 시작 추정. 첫 클린룸 공식 개장 목표는 2027년 2월입니다.",
              basis: "장비 반입은 2026-06-17 리서치 추정, 클린룸 일정은 회사 공식 발표입니다.",
              sourceIndexes: [0, 3],
            },
            "2027Q1": {
              status: "online",
              value: "Y1 Ph1",
              delta: "첫 클린룸",
              detail: "Y1 Ph1 초기 양산 및 첫 클린룸 개장 구간. 공급 기여는 2H27로 추정됩니다.",
              basis: "100K+는 설계 최대치 추정입니다. 회사 공식 발표는 6개 클린룸과 첫 클린룸 2027년 2월 일정만 제공합니다.",
              sourceIndexes: [0, 3],
            },
            "2027Q4": {
              status: "online",
              value: "Y1 Ph2",
              delta: "초기 양산",
              detail: "Y1 Ph2 초기 양산 추정. 실제 공급 기여는 2H28로 예상됩니다.",
              basis: "2026-06-17 리서치 타임라인의 설계 최대치이며 공식 WPM이 아닙니다.",
              sourceIndexes: [0],
            },
            "2028Q3": {
              status: "ramp",
              value: "Y1 Ph2",
              delta: "2H28 supply",
              detail: "Y1 Ph2의 공급 기여 추정 구간. 장기적으로 회사는 Yongin 4개 팹 건설을 2033년까지 앞당길 계획입니다.",
              basis: "분기 공급 기여는 리서치 추정, 2033년 일정은 2026-06-29 회사 공식 설명입니다.",
              sourceIndexes: [0, 2],
            },
          },
          sources: [
            {
              label: "2026-06-17 DS Securities",
              url: "https://file.alphasquare.co.kr/media/pdfs/market-report/%EB%B0%98%EB%8F%84%EC%B2%B4Higher%2C20260617DS%ED%88%AC%EC%9E%90%EC%A6%9D%EA%B6%8C.pdf",
            },
            {
              label: "2026-06-04 SK Securities",
              url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
            },
            {
              label: "2026-06-29 SK hynix strategy",
              url: "https://news.skhynix.com/fact-05/",
            },
            {
              label: "2026-02-25 Yongin official",
              url: "https://news.skhynix.com/new-facility-investment-for-yongin-semiconductor-cluster/",
            },
            {
              label: "2026-06-18 SK hynix HBM4E",
              url: "https://news.skhynix.com/12-layer-hbm4e-sample/",
            },
          ],
        },
        {
          company: "Micron",
          scope: "Tongluo · Virginia Fab 6 · Idaho ID1/ID2 · New York Fab 1",
          confidence: "2026-06/07 회사 공시 + 리서치",
          confidenceTone: "official",
          summary:
            "2026년 말 총 DRAM CAPA는 365K WPM 추정입니다. 회사는 Tongluo가 mid-2027부터 의미 있는 출하, ID1 mid-2027, ID2 late-2028 첫 wafer output이라고 공시했습니다.",
          cells: {
            "2026Q1": {
              status: "construction",
              value: "Tongluo",
              delta: "$1.8B acquisition",
              detail: "3월 PSMC Tongluo fab 인수 완료 및 동일 규모 두 번째 클린룸 건설 시작.",
              basis: "2026-06-25 Micron 10-Q에 확인된 실제 일정입니다. WPM은 공개되지 않았습니다.",
              sourceIndexes: [1],
            },
            "2026Q2": {
              status: "ramp",
              value: "CY26 증설",
              delta: "증설분 추정",
              detail: "Micron의 2026년 DRAM 증설분 리서치 추정. Virginia Fab 6는 1α DDR4/LPDDR4 생산을 시작했지만 OMT 이전을 포함한 재배치 성격이 큽니다.",
              basis: "30~40K는 2026-06-04 SK증권 추정이며, Fab 6 가동 상태는 2026-05-26 TrendForce로 교차 확인했습니다.",
              sourceIndexes: [2, 3],
            },
            "2026Q3": {
              status: "construction",
              value: "NY Fab 1",
              delta: "first concrete",
              detail: "7월 9일 Clay, New York 첫 Fab의 첫 콘크리트 타설을 완료해 site work에서 수직 건설 단계로 전환했습니다. Micron은 2035년까지 미국 투자 계획을 2,500억 달러 이상으로 확대하고 장기적으로 미국에서 DRAM의 40%를 생산하는 목표를 제시했습니다.",
              basis: "Micron 공식 발표입니다. New York Fab의 WPM과 첫 wafer-out 시점은 이번 발표에서 공개하지 않아 연말 CAPA 모델에는 더하지 않았습니다.",
              sourceIndexes: [4],
            },
            "2026Q4": {
              status: "ramp",
              value: "HBM4E",
              delta: "개발 · CY27 HVM",
              detail: "HBM4는 1-beta DRAM 기반으로 이미 high-volume shipment 중입니다. 1-gamma는 HBM4가 아니라 HBM4E에 적용되며 회사는 HBM4E volume production을 2027년으로 제시했습니다.",
              basis: "2026-06-24 Micron FY3Q26 공식 발표의 공정 구분입니다. 해당 발표에는 HBM용 WPM 수치가 없습니다.",
              sourceIndexes: [0],
            },
            "2027Q2": {
              status: "online",
              value: "ID1 / Tongluo",
              delta: "mid-27",
              detail: "Idaho ID1 첫 DRAM wafer output과 Tongluo 기존 fab의 의미 있는 출하 목표 구간.",
              basis: "2026-06-25 Micron 10-Q의 공식 일정입니다.",
              sourceIndexes: [1],
            },
            "2027Q4": {
              status: "ramp",
              value: "Fab 6",
              delta: "램프 추정",
              detail: "Virginia Fab 6 월 wafer input이 2Q26 대비 4Q27에 1.5배가 될 것으로 예상됩니다. Micron 전체 순증이 아니라 OMT 생산 이전을 포함합니다.",
              basis: "2026-05-26 TrendForce 추정. 글로벌 Micron 총 CAPA 증가로 단순 환산하지 않습니다.",
              sourceIndexes: [3],
            },
            "2028Q4": {
              status: "online",
              value: "ID2 wafer-out",
              delta: "late-28",
              detail: "두 번째 Idaho fab의 초기 DRAM wafer output 공식 목표.",
              basis: "2026-06-25 Micron 10-Q 기준입니다.",
              sourceIndexes: [1],
            },
          },
          sources: [
            {
              label: "2026-06-24 Micron FY3Q26 remarks",
              url: "https://investors.micron.com/static-files/631b1a32-5537-46ae-8f40-82e42fc79dfe",
            },
            {
              label: "2026-06-25 Micron 10-Q",
              url: "https://investors.micron.com/static-files/23023765-dfef-4e7e-845b-cd744fc20d93",
            },
            {
              label: "2026-06-04 SK Securities",
              url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
            },
            {
              label: "2026-05-26 TrendForce Fab 6",
              url: "https://www.trendforce.com/presscenter/news/20260526-13061.html",
            },
            {
              label: "2026-07-09 Micron New York Fab",
              url: "https://investors.micron.com/news-releases/news-release-details/micron-accelerates-us-investments-pours-first-concrete-new-york",
            },
          ],
        },
      ],
    },
    nand: {
      title: "NAND Capa Roadmap",
      subtitle:
        "오래된 2030 총량 시나리오 대신 2026년 5~7월에 확인된 실제 노드 전환·신규 투자·wafer-out 이벤트를 표시합니다. Kioxia와 SanDisk는 동일 JV fab이므로 중복 합산하지 않습니다.",
      metricNote:
        "최신 공개자료에는 업체별 총 NAND WPM 시계열이 완전하게 공개되지 않습니다. 아래 수치는 회사 총 CAPA가 아니라 증설·전환 대상 또는 공정 milestone입니다.",
      criteria: [
        {
          label: "총 CAPA",
          value: "업체별 공개치 부족",
          note: "회사 간 합계·YoY 미산출",
        },
        {
          label: "추적 기준",
          value: "노드·Fab 전환 이벤트",
          note: "순증과 전환 대상 규모를 구분",
        },
        {
          label: "중복 방지",
          value: "Kioxia·SanDisk JV 1회",
          note: "동일 물리 Fab은 합산 금지",
        },
      ],
      annualModel: {
        title: "최신 NAND Capacity Actions",
        badge: "2026-05~07 refresh",
        unit: "증설·전환 규모 / 생산 milestone",
        showYoy: false,
        years: ["1H26", "2H26", "CY27", "2H28"],
        rows: [
          { label: "Samsung", values: ["V8 전환", "Xi'an2 30-45K", "국내 재개 추정", "-"] },
          { label: "SK hynix / Solidigm", values: ["321L QLC", "Dalian2 30-50K", "국내 재개 추정", "-"] },
          { label: "Kioxia / SanDisk", values: ["K2 BiCS8", "+30K Yokkaichi 추정", "BiCS10 scale", "-"] },
          { label: "Micron", values: ["Singapore 착공", "G9 ramp", "차세대 node", "첫 wafer-out"] },
        ],
        note:
          "2026-06-04 SK증권의 fab별 추정과 2026-06-02 Kioxia Investor Day, 2026-06-25 Micron 10-Q, 2026-07-03 Kioxia·SanDisk 실제 생산 개시를 결합했습니다. 서로 단위가 달라 합계나 YoY를 계산하지 않습니다.",
        sources: [
          {
            label: "2026-06-04 SK Securities",
            url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
          },
          {
            label: "2026-06-02 Kioxia Investor Day",
            url: "https://www.kioxia-holdings.com/en-jp/news/2026/20260602-1.html",
          },
          {
            label: "2026-06-25 Micron 10-Q",
            url: "https://investors.micron.com/static-files/23023765-dfef-4e7e-845b-cd744fc20d93",
          },
          {
            label: "2026-07-03 Kioxia/SanDisk K2",
            url: "https://www.kioxia.com/en-jp/about/news/2026/20260703-2.html",
          },
          {
            label: "2026-07-03 Kioxia BiCS10 sample",
            url: "https://apac.kioxia.com/en-apac/about/news/2026/20260703-1.html",
          },
        ],
      },
      roadmapTitle: "분기별 생산 전환 이벤트",
      roadmapNote: "WPM 숫자는 회사 총량이 아니라 해당 증설·전환 대상 규모입니다.",
      companyRows: [
        {
          company: "Samsung",
          scope: "Xi'an V8/V9 · domestic cleanroom",
          confidence: "2026-05/06 산업 리서치",
          confidenceTone: "reported",
          summary:
            "Xi'an 1공장 V8 전환 뒤 램프, Xi'an 2공장 V9 전환 대상 30~45K WPM이 핵심입니다. 이는 순증 총량이 아니라 전환 대상 규모입니다.",
          cells: {
            "2026Q1": {
              status: "online",
              value: "V8 convert",
              delta: "Xi'an 1",
              detail: "기존 V6 라인의 V8 전환 완료 구간.",
              basis: "2026-06-04 SK증권의 최신 fab별 점검입니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "construction",
              value: "30-45K",
              delta: "Xi'an 2 V9",
              detail: "Xi'an 2공장의 V9 전환 대상 규모 추정. 신규 순증 CAPA로 전부 더하면 안 됩니다.",
              basis: "2026-06-04 SK증권 추정과 2026-05-25 TrendForce 보도로 교차 확인했습니다.",
              sourceIndexes: [0, 1],
            },
            "2026Q3": {
              status: "ramp",
              value: "V8 ramp",
              delta: "2H26",
              detail: "Xi'an 1공장 V8 전환 물량의 하반기 램프 준비 구간.",
              basis: "2026-06-04 SK증권의 2H26 방향성입니다. 실제 분기 WPM은 미공개입니다.",
              sourceIndexes: [0],
            },
            "2027Q3": {
              status: "planned",
              value: "Domestic",
              delta: "2H27 restart",
              detail: "P5 등 국내 신규 공간에서 NAND 투자가 재개될 가능성을 표시합니다.",
              basis: "2026-06-04 리서치 전망이며 확정 투자 발표가 아닙니다.",
              sourceIndexes: [0],
            },
          },
          sources: [
            {
              label: "2026-06-04 SK Securities",
              url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
            },
            {
              label: "2026-05-25 TrendForce Xi'an",
              url: "https://www.trendforce.com/news/2026/05/25/news-samsung-reportedly-begins-v9-nand-cleanroom-build-out-in-xian-following-v8-ramp-up-and-v6-phase-out/",
            },
            {
              label: "2026-05-18 TrendForce 2Q26 NAND",
              url: "https://www.trendforce.com/research/download/RP131121IB",
            },
          ],
        },
        {
          company: "SK hynix / Solidigm",
          scope: "Dalian 1/2 · 321L QLC · Cheongju",
          confidence: "2026-06 리서치 + 회사 공식",
          confidenceTone: "mixed",
          summary:
            "Dalian 2의 V8 신규 투자 30~50K WPM이 2H26 핵심 추정입니다. 6월 회사 공식 장기전략에는 Cheongju 신규 NAND fab 투자가 포함됐지만 구체 WPM·가동일은 미공개입니다.",
          cells: {
            "2026Q1": {
              status: "online",
              value: "321L QLC",
              delta: "product ramp",
              detail: "321-layer QLC 기반 제품 램프. 제품 mix 이벤트이며 신규 fab CAPA가 아닙니다.",
              basis: "회사 제품 발표와 2026-06 산업 자료를 함께 반영했습니다.",
              sourceIndexes: [2],
            },
            "2026Q2": {
              status: "construction",
              value: "30-50K",
              delta: "Dalian 2 V8",
              detail: "비어 있던 Dalian 2 fab의 V8 신규 투자 대상 규모 추정.",
              basis: "2026-06-04 SK증권 추정이며 실제 wafer input은 장비 반입·수율에 따라 달라질 수 있습니다.",
              sourceIndexes: [0],
            },
            "2026Q3": {
              status: "equipment",
              value: "V8 tool-in",
              delta: "2H26",
              detail: "Dalian 2 신규 NAND 장비 투입 예상 구간.",
              basis: "2026-06-04 리서치 전망입니다.",
              sourceIndexes: [0],
            },
            "2027Q3": {
              status: "planned",
              value: "Cheongju",
              delta: "new NAND fab",
              detail: "회사 장기전략상 Cheongju에 신규 NAND fab을 포함한 투자가 예정돼 있으나 구체 분기와 WPM은 미공개입니다.",
              basis: "2026-06-29 SK hynix 공식 중장기 투자 설명입니다. 이 칸의 분기는 방향성 표기를 위한 가이드입니다.",
              sourceIndexes: [1],
            },
          },
          sources: [
            {
              label: "2026-06-04 SK Securities",
              url: "https://www.hankyung.com/koreamarket/consensus/pdf/2026-06-0397aa4d7f1d9c63edb010f68c702867",
            },
            {
              label: "2026-06-29 SK hynix strategy",
              url: "https://news.skhynix.com/fact-05/",
            },
            {
              label: "SK hynix 321L QLC official",
              url: "https://news.skhynix.com/begin-supply-321-layer-qlc-nand-cssd/",
            },
          ],
        },
        {
          company: "Micron",
          scope: "Singapore NAND · G9",
          confidence: "2026-06 회사 공시",
          confidenceTone: "official",
          summary:
            "G9 NAND node가 2026년 램프 중이며, Singapore 신규 wafer fab은 2H28 첫 가동이 공식 목표입니다. 회사는 WPM을 공개하지 않았습니다.",
          cells: {
            "2026Q1": {
              status: "construction",
              value: "Groundbreak",
              delta: "Singapore",
              detail: "Singapore 기존 NAND 단지 내 추가 wafer fab 착공.",
              basis: "2026-06-25 Micron 10-Q에서 2026년 1월 착공과 2H28 가동 목표를 재확인했습니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "ramp",
              value: "G9 ramp",
              delta: "highest-volume path",
              detail: "G9 NAND node가 램프 중이며 Micron 역사상 최대 volume node가 될 경로라고 회사가 설명했습니다.",
              basis: "2026-06-24 FY3Q26 prepared remarks. WPM 수치는 공개되지 않았습니다.",
              sourceIndexes: [1],
            },
            "2027Q3": {
              status: "ramp",
              value: "Next node",
              delta: "2H27 volume",
              detail: "차세대 NAND node의 volume production 목표 구간.",
              basis: "2026-06-24 FY3Q26 prepared remarks의 2H27 일정입니다.",
              sourceIndexes: [1],
            },
            "2028Q3": {
              status: "online",
              value: "Wafer-out",
              delta: "2H28",
              detail: "Singapore 신규 NAND wafer fab의 공식 가동 목표 구간.",
              basis: "2026-06-25 Micron 10-Q 기준이며 정확한 분기와 WPM은 미공개입니다.",
              sourceIndexes: [0],
            },
          },
          sources: [
            {
              label: "2026-06-25 Micron 10-Q",
              url: "https://investors.micron.com/static-files/23023765-dfef-4e7e-845b-cd744fc20d93",
            },
            {
              label: "2026-06-24 Micron FY3Q26 remarks",
              url: "https://investors.micron.com/static-files/631b1a32-5537-46ae-8f40-82e42fc79dfe",
            },
          ],
        },
        {
          company: "Kioxia",
          scope: "Kitakami K2 · Yokkaichi Fab7 · BiCS10",
          confidence: "2026-06/07 회사 공식",
          confidenceTone: "official",
          summary:
            "6월 Investor Day에서 FY26 CAPEX 4,500억 엔과 22% GB CAGR 지원 계획을 제시했고, 7월 3일 K2에서 BiCS10 생산을 시작하면서 1Tb TLC 샘플도 출하했습니다.",
          cells: {
            "2026Q1": {
              status: "ramp",
              value: "BiCS8",
              delta: "K2 ramp",
              detail: "K2의 8세대 BiCS 생산 램프 구간.",
              basis: "6월 Investor Day와 7월 생산 개시 발표에서 K2가 BiCS8을 이미 생산 중임을 재확인했습니다.",
              sourceIndexes: [0, 2],
            },
            "2026Q2": {
              status: "equipment",
              value: "¥450B",
              delta: "FY26 CAPEX",
              detail: "FY25 2,800억 엔에서 FY26 4,500억 엔으로 CAPEX 확대. BiCS8 증설, BiCS10 램프, Fab7·K2 투자가 포함됩니다.",
              basis: "2026-06-02 Kioxia Investor Day Q&A의 회사 공식 수치입니다.",
              sourceIndexes: [0, 1],
            },
            "2026Q3": {
              status: "online",
              value: "BiCS10",
              delta: "332L · K2 production",
              detail: "2026년 7월 3일 K2에서 BiCS10 생산을 시작하고 1Tb TLC 샘플 출하를 발표했습니다. 332단, 4.8Gb/s 인터페이스, BiCS8 대비 bit density 59% 개선이 핵심입니다.",
              basis: "Kioxia·SanDisk 공동 생산 발표와 Kioxia 제품 샘플 발표를 함께 확인했습니다. 정확한 WPM은 공개되지 않았습니다.",
              sourceIndexes: [2, 3],
            },
            "2027Q2": {
              status: "ramp",
              value: "22% GB CAGR",
              delta: "through FY28",
              detail: "FY26·FY27 투자를 통해 FY28까지 GB 공급능력 연평균 22% 성장을 지원하는 회사 계획.",
              basis: "WPM이 아닌 bit/GB 성장 계획이므로 wafer CAPA와 동일시하지 않습니다.",
              sourceIndexes: [1],
            },
          },
          sources: [
            {
              label: "2026-06-02 Kioxia Investor Day",
              url: "https://www.kioxia-holdings.com/en-jp/news/2026/20260602-1.html",
            },
            {
              label: "2026-06-02 Kioxia Q&A",
              url: "https://www.kioxia-holdings.com/content/dam/kioxia-hd/en-jp/ir/library/event/asset/Investor-Day-2026-Eng-QA.pdf",
            },
            {
              label: "2026-07-03 Kioxia/SanDisk K2",
              url: "https://www.kioxia.com/en-jp/about/news/2026/20260703-2.html",
            },
            {
              label: "2026-07-03 Kioxia BiCS10 sample",
              url: "https://apac.kioxia.com/en-apac/about/news/2026/20260703-1.html",
            },
          ],
        },
        {
          company: "SanDisk",
          scope: "Kioxia JV · Kitakami K2",
          confidence: "JV 공식 + 2026-05 SEC",
          confidenceTone: "official",
          summary:
            "Kioxia와 같은 K2 물리 CAPA를 공유합니다. 7월 BiCS10 생산·1Tb TLC 샘플 출하는 별도 SanDisk fab 증설이 아니며 시장 CAPA 합계에서 중복 제거해야 합니다.",
          cells: {
            "2026Q1": {
              status: "ramp",
              value: "BiCS8",
              delta: "JV allocation",
              detail: "K2 BiCS8 생산분의 JV 배분. Kioxia 행과 동일한 물리 설비입니다.",
              basis: "SanDisk 2026-05 10-Q와 Kioxia Investor Day를 함께 확인했습니다.",
              sourceIndexes: [1, 2],
            },
            "2026Q2": {
              status: "equipment",
              value: "JV funding",
              delta: "K2/Fab7",
              detail: "K1·Y7·K2 startup 관련 선급금과 JV 설비투자 부담이 계속되는 구간.",
              basis: "2026-05-01 SanDisk 10-Q의 Flash Ventures 투자·선급금 공시입니다.",
              sourceIndexes: [1],
            },
            "2026Q3": {
              status: "online",
              value: "BiCS10",
              delta: "332L · K2 production",
              detail: "Kioxia와 공동으로 K2에서 BiCS10 생산을 시작하고 1Tb TLC 샘플을 출하했습니다. Kioxia 행과 동일한 물리 CAPA이므로 중복 합산하지 않습니다.",
              basis: "2026-07-02/03 SanDisk·Kioxia 공식 발표입니다.",
              sourceIndexes: [0, 3],
            },
          },
          sources: [
            {
              label: "2026-07-03 Kioxia/SanDisk K2",
              url: "https://www.kioxia.com/en-jp/about/news/2026/20260703-2.html",
            },
            {
              label: "2026-05-01 SanDisk 10-Q",
              url: "https://investor.sandisk.com/static-files/21ecbf29-74ac-4abd-9563-2afd618ddbba",
            },
            {
              label: "2026-06-02 Kioxia Investor Day",
              url: "https://www.kioxia-holdings.com/en-jp/news/2026/20260602-1.html",
            },
            {
              label: "2026-07-02 SanDisk BiCS10 sample",
              url: "https://www.sandisk.com/company/newsroom/press-releases/2026/2026-07-02-sandisk-announces-bics10-1tb-tlc",
            },
          ],
        },
      ],
    },
    hdd: {
      title: "HDD Capa Roadmap",
      subtitle:
        "HDD 업체는 공장 unit CAPA를 공개하지 않으므로 TB/drive, 고객 인증, volume shipment를 실질 공급능력 지표로 사용합니다. 최신 확인이 없는 과거 exabyte 전망은 제거했습니다.",
      metricNote:
        "같은 수의 드라이브를 생산해도 TB/drive가 높아지면 출하 가능한 exabyte가 늘어납니다. 아래 수치는 wafer WPM과 비교할 수 없습니다.",
      criteria: [
        {
          label: "공급력 Proxy",
          value: "TB/drive",
          note: "공장 unit CAPA는 미공개",
        },
        {
          label: "진행 단계",
          value: "인증 → 양산 → 출하",
          note: "고객 채택 여부를 함께 확인",
        },
        {
          label: "비교 기준",
          value: "Exabyte 공급능력",
          note: "DRAM·NAND WPM과 직접 비교 금지",
        },
      ],
      roadmapTitle: "분기별 인증·출하 이벤트",
      roadmapNote: "용량과 고객 인증 단계가 실제 공급 확대를 확인하는 핵심 지표입니다.",
      companyRows: [
        {
          company: "Seagate",
          scope: "Mozaic 4+ HAMR · nearline",
          confidence: "2026-03/04 회사 공식",
          confidenceTone: "official",
          summary:
            "44TB Mozaic 4+가 2개 hyperscaler에서 인증을 마치고 volume shipping 중입니다. 최신 공식자료로 확인되지 않은 과거 2H26 exabyte crossover 수치는 제거했습니다.",
          cells: {
            "2026Q1": {
              status: "online",
              value: "44TB",
              delta: "2 hyperscalers",
              detail: "Mozaic 4+가 두 hyperscale cloud 고객에서 인증을 마치고 volume shipment에 진입했습니다.",
              basis: "2026-03-03 Seagate 공식 발표의 실제 출하 상태입니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "ramp",
              value: "HAMR ramp",
              delta: "Mozaic scale",
              detail: "4월 실적발표에서 HAMR 기반 Mozaic 제품의 지속적인 램프와 생산 실행을 재확인했습니다.",
              basis: "2026-04-28 Seagate FY3Q26 실적발표. 별도 EB 수치는 공개되지 않았습니다.",
              sourceIndexes: [1],
            },
          },
          sources: [
            {
              label: "2026-03-03 Seagate Mozaic 4+",
              url: "https://investors.seagate.com/news/news-details/2026/Seagate-Delivers-Industrys-Highest-Capacity-Hard-Drives-with-Next-Generation-Mozaic-4/default.aspx",
            },
            {
              label: "2026-04-28 Seagate FY3Q26",
              url: "https://investors.seagate.com/news/news-details/2026/Seagate-Technology-Reports-Fiscal-Third-Quarter-2026-Financial-Results/",
            },
          ],
        },
        {
          company: "Western Digital",
          scope: "UltraSMR ePMR · HAMR",
          confidence: "2026-02/05 회사 공식",
          confidenceTone: "official",
          summary:
            "40TB UltraSMR ePMR는 hyperscaler 인증 중이며 2H26 volume production 목표입니다. 5월 발표에서도 최신 고용량 UltraSMR의 복수 hyperscaler 인증 진행을 재확인했습니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "40TB",
              delta: "2 hyperscalers",
              detail: "40TB UltraSMR ePMR의 두 hyperscaler 고객 인증 진행.",
              basis: "2026-02-03 WD Innovation Day 공식 발표입니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "equipment",
              value: "UltraSMR",
              delta: "qualification",
              detail: "5월에도 최신 고용량 UltraSMR HDD가 복수 hyperscaler 인증 중임을 회사가 재확인했습니다.",
              basis: "2026-05-18 WD 공식 발표. 제품 보안 기능 발표이지만 현재 인증 상태를 명시합니다.",
              sourceIndexes: [1],
            },
            "2026Q3": {
              status: "online",
              value: "40TB",
              delta: "2H26 volume target",
              detail: "40TB UltraSMR ePMR volume production 목표 구간.",
              basis: "2026-02-03 회사 공식 로드맵이며 5월에도 인증 진행 상태가 유지됐습니다.",
              sourceIndexes: [0, 1],
            },
            "2027Q2": {
              status: "ramp",
              value: "HAMR",
              delta: "2027 ramp",
              detail: "두 hyperscaler 인증 이후 HAMR ramp production을 시작하는 회사 목표.",
              basis: "정확한 분기는 미공개이므로 2027년 중간에 가이드로 배치했습니다.",
              sourceIndexes: [0],
            },
            "2028Q4": {
              status: "planned",
              value: "60TB path",
              delta: "100TB HAMR 2029",
              detail: "ePMR 60TB 확장과 HAMR 100TB+ 장기 로드맵. 60TB의 정확한 출시 분기는 미공개입니다.",
              basis: "2026-02-03 WD 공식 기술 로드맵입니다.",
              sourceIndexes: [0],
            },
          },
          sources: [
            {
              label: "2026-02-03 WD Innovation Day",
              url: "https://investor.wdc.com/node/27841",
            },
            {
              label: "2026-05-18 WD qualification update",
              url: "https://investor.wdc.com/news-releases/news-release-details/wd-advances-next-generation-trusted-infrastructure-industrys",
            },
          ],
        },
        {
          company: "Toshiba",
          scope: "M12 FC-MAMR · SMR/CMR · 12-disk",
          confidence: "2026-03 회사 공식",
          confidenceTone: "official",
          summary:
            "30~34TB SMR 샘플 출하가 시작됐고 28TB CMR 샘플은 3Q26 목표입니다. 이후 HAMR·12-disk는 방향만 공개돼 정량 CAPA로 쓰지 않습니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "30-34TB",
              delta: "SMR sample",
              detail: "M12 FC-MAMR + host-managed SMR 샘플 출하 시작.",
              basis: "2026-03-30 Toshiba 공식 발표입니다.",
              sourceIndexes: [0],
            },
            "2026Q3": {
              status: "equipment",
              value: "28TB",
              delta: "CMR sample",
              detail: "28TB CMR 모델 샘플 출하 공식 목표 구간.",
              basis: "2026-03-30 Toshiba 공식 발표의 3Q26 일정입니다.",
              sourceIndexes: [0],
            },
            "2026Q4": {
              status: "planned",
              value: "HAMR / 12-disk",
              delta: "next quarters",
              detail: "향후 분기에 HAMR 및 12-disk 제품을 도입한다는 방향성. 정확한 분기·용량은 미공개입니다.",
              basis: "2026-03-30 회사 발표에서 구체 시점 없이 upcoming quarters로 제시했습니다.",
              sourceIndexes: [0],
            },
          },
          sources: [
            {
              label: "2026-03-30 Toshiba M12",
              url: "https://news.toshiba.com/press-releases/press-release-details/2026/Toshiba-Begins-Sampling-of-30-34-TB-SMR-Nearline-Hard-Disk-Drives/default.aspx",
            },
          ],
        },
      ],
    },
  },
};
