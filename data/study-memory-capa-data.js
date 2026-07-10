window.studyMemoryCapaData = {
  updatedAt: "2026-07-10",
  unit: "DRAM/NAND: 12-inch wafer starts per month (K WPM) · HDD: disclosed TB/drive and exabyte-ramp milestones",
  scope:
    "제공된 CAPA 검증 리포트 2종을 출발점으로 사용하되, 회사 IR·공식 발표·산업 리서치로 교차 검증했습니다. WPM은 공시 실적이 아닌 추정치이며 bit 공급과 같지 않습니다.",
  quarters: [
    { key: "2025Q4", year: "CY2025", label: "4Q" },
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
        "삼성전자·SK하이닉스·Micron의 신규 DRAM/HBM 생산 이벤트입니다. 숫자는 서로 중복될 수 있는 공장·노드별 지표이므로 회사 총 CAPA와 단순 합산하지 않습니다.",
      kpis: [
        { label: "DRAM report scenario", value: "+78%", note: "3사 월 CAPA 2025~2030 추정" },
        { label: "NAND report scenario", value: "726K → 1,000K", note: "3사 월 CAPA 2026~2030 추정" },
        { label: "HDD tracking lens", value: "TB / drive", note: "공장 WPM 대신 밀도·EB 램프 추적" },
      ],
      annualModel: {
        title: "연말 총 CAPA 시나리오",
        badge: "Provided-report model",
        unit: "K WPM",
        years: ["2025", "2026E", "2027E", "2028E", "2029E", "2030E"],
        rows: [
          { label: "Samsung", values: ["~600", "658", "725", "823", "920", "1,018"] },
          { label: "SK hynix", values: ["~510", "603", "668", "768", "883", "1,020"] },
          { label: "Micron", values: ["~370", "367", "392", "450", "523", "598"] },
          { label: "3사 합계", values: ["~1,480", "1,628", "1,785", "2,041", "2,326", "2,636"], total: true },
        ],
        note:
          "제공 리포트의 시나리오 입력값이며 오차 ±10% 이상입니다. 외부 벤치마크인 미래에셋 2026 Outlook은 2026년 말 Samsung 약 700K, SK hynix 약 605K WPM을 제시하므로 Samsung 수치는 단일 확정값으로 보지 않습니다.",
        sources: [
          {
            label: "Mirae Asset 2026 Outlook",
            url: "https://securities.miraeasset.com/bbs/download/2141014.pdf?attachmentId=2141014",
          },
        ],
      },
      companyRows: [
        {
          company: "Samsung",
          scope: "1c DRAM / P4 / P5",
          confidence: "산업보도 + 리서치",
          confidenceTone: "reported",
          summary:
            "1c DRAM 60K → 140K → 200K WPM 경로는 보도치입니다. 미래에셋은 P4 순증 55K와 2026년 말 총 700K WPM을 별도 추정합니다.",
          cells: {
            "2025Q4": {
              status: "ramp",
              value: "60K",
              delta: "1c",
              detail: "1c DRAM 장비 준비·초기 램프 보도치.",
              basis: "TrendForce가 ETNews 보도를 인용한 1c DRAM 초기 준비능력 추정치이며 회사 공식 가이던스는 아닙니다.",
              sourceIndexes: [0],
            },
            "2026Q2": {
              status: "ramp",
              value: "140K",
              delta: "1c 누적",
              detail: "1c DRAM 누적 준비능력 보도치. P4 순증 추정과 범위가 겹칠 수 있음.",
              basis: "TrendForce가 ETNews 보도를 인용해 제시한 1c DRAM 누적 CAPA 경로입니다. 공장별 순증을 단순 합산한 값이 아닙니다.",
              sourceIndexes: [0],
            },
            "2026Q4": {
              status: "ramp",
              value: "200K",
              delta: "1c 목표",
              detail: "2026년 말 1c DRAM 목표 보도치. 회사 총 DRAM CAPA가 아님.",
              basis: "TrendForce·ETNews 보도에 기반한 2026년 말 1c DRAM run-rate 목표이며 Samsung 전체 DRAM CAPA가 아닙니다.",
              sourceIndexes: [0],
            },
            "2028Q1": {
              status: "planned",
              value: "P5-1",
              delta: "시점 추정",
              detail: "P5 단계 가동은 2028년 전후로 보도됐으나 공식 WPM은 미공개.",
              basis: "공식 WPM이 없는 시점 추정 항목입니다. 직접 연결할 수 있는 확정 CAPA 근거는 아직 없습니다.",
              sourceIndexes: [],
            },
          },
          sources: [
            {
              label: "TrendForce / ETNews",
              url: "https://www.trendforce.com/news/2025/11/19/news-samsung-reportedly-plans-200k-1c-dram-wafersmonth-by-2026-about-one-third-of-its-total-output/",
            },
            {
              label: "Mirae Asset",
              url: "https://securities.miraeasset.com/bbs/download/2141014.pdf?attachmentId=2141014",
            },
          ],
        },
        {
          company: "SK hynix",
          scope: "M15X / Yongin Fab 1",
          confidence: "공식 일정 + 보도 WPM",
          confidenceTone: "mixed",
          summary:
            "M15X 10K → 50K WPM은 보도치입니다. Yongin은 회사가 6개 클린룸과 첫 클린룸 2027년 2월 개장을 공식 발표했지만 WPM은 공개하지 않았습니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "Wafer-in",
              delta: "M15X",
              detail: "M15X 초기 웨이퍼 투입·장비 반입 구간.",
            },
            "2026Q2": {
              status: "ramp",
              value: "10K",
              delta: "M15X",
              detail: "M15X 초기 DRAM/HBM WPM 보도치.",
            },
            "2026Q4": {
              status: "ramp",
              value: "50K",
              delta: "M15X",
              detail: "M15X 2026년 4분기 WPM 목표 보도치.",
            },
            "2027Q1": {
              status: "equipment",
              value: "Cleanroom",
              delta: "Yongin",
              detail: "회사 공식: 첫 클린룸 개장 목표를 2027년 5월에서 2월로 앞당김.",
            },
            "2027Q4": {
              status: "online",
              value: "80-90K",
              delta: "M15X full",
              detail: "M15X 완전 가동 범위 보도치. 공식 회사 가이던스가 아님.",
            },
            "2028Q3": {
              status: "ramp",
              value: "Phase 3",
              delta: "Yongin",
              detail: "Yongin의 단계별 증설 방향만 표시. 분기별 WPM은 비공개이므로 숫자 합산 제외.",
            },
          },
          sources: [
            {
              label: "SK hynix official",
              url: "https://news.skhynix.com/new-facility-investment-for-yongin-semiconductor-cluster/",
            },
            {
              label: "TrendForce / The Bell",
              url: "https://www.trendforce.com/news/2025/10/02/news-sk-hynix-reportedly-to-double-dram-capacity-in-2h26-to-match-samsung-pulls-back-on-nand/",
            },
          ],
        },
        {
          company: "Micron",
          scope: "Idaho / Tongluo / Manassas",
          confidence: "회사 IR",
          confidenceTone: "official",
          summary:
            "Micron은 공장별 WPM 대신 wafer-out 시점을 공개합니다. ID1 mid-2027, ID2 late-2028, Tongluo 기존 fab 출하는 mid-2027 일정입니다.",
          cells: {
            "2026Q2": {
              status: "construction",
              value: "Build",
              delta: "ID1 / ID2",
              detail: "Idaho ID1·ID2 건설 진행. WPM 미공개.",
            },
            "2026Q4": {
              status: "online",
              value: "1α DDR4",
              delta: "Manassas",
              detail: "Manassas에서 1-alpha DDR4 생산 starts를 2026년 6월 IR에서 확인.",
            },
            "2027Q2": {
              status: "online",
              value: "ID1 / P5",
              delta: "mid-27",
              detail: "ID1 첫 wafer output과 Tongluo 기존 P5의 meaningful shipments가 mid-CY2027 목표.",
            },
            "2028Q4": {
              status: "online",
              value: "Wafer-out",
              delta: "ID2",
              detail: "회사 공식 목표: ID2 첫 wafer output late-CY2028.",
            },
          },
          sources: [
            {
              label: "Micron FY3Q26 IR",
              url: "https://investors.micron.com/static-files/2354ecda-77a0-4ddd-8462-a631eb491356",
            },
          ],
        },
      ],
    },
    nand: {
      title: "NAND Capa Roadmap",
      subtitle:
        "2026년은 순증설보다 공정 전환과 eSSD·QLC mix가 핵심입니다. Kioxia와 SanDisk는 동일 JV fab을 공유하므로 두 행을 더해 시장 CAPA로 계산하면 안 됩니다.",
      annualModel: {
        title: "3사 연말 총 CAPA 시나리오",
        badge: "Provided-report model",
        unit: "K WPM",
        years: ["2026E", "2027E", "2028E", "2029E", "2030E"],
        rows: [
          { label: "Samsung", values: ["358", "388", "405", "425", "450"] },
          { label: "SK hynix / Solidigm", values: ["235", "255", "260", "280", "300"] },
          { label: "Micron", values: ["133", "138", "160", "210", "250"] },
          { label: "3사 합계", values: ["726", "781", "825", "915", "1,000"], total: true },
        ],
        note:
          "제공 리포트의 3사 시나리오로 Kioxia/SanDisk·YMTC를 제외합니다. 미래에셋은 2026년 전 산업 순증을 약 39K WPM(2025 CAPA의 약 3%), TrendForce는 주요 업체의 실질 신규 CAPA가 거의 없다고 봅니다.",
        sources: [
          {
            label: "Mirae Asset 2026 Outlook",
            url: "https://securities.miraeasset.com/bbs/download/2141014.pdf?attachmentId=2141014",
          },
          {
            label: "TrendForce 1Q26 NAND",
            url: "https://www.trendforce.com/presscenter/news/20260525-13058.html",
          },
        ],
      },
      companyRows: [
        {
          company: "Samsung",
          scope: "Xi'an V8 → V9 / P4",
          confidence: "리서치·산업보도",
          confidenceTone: "reported",
          summary:
            "Xi'an은 V6를 V8로 전환한 뒤 V9 인프라를 구축 중입니다. 2026년 신규 순증은 P4 약 20K WPM 추정이나 회사 공식 WPM은 없습니다.",
          cells: {
            "2026Q1": {
              status: "online",
              value: "V8",
              delta: "Xi'an",
              detail: "3월 말 V6→236-layer V8 전환 완료 보도.",
            },
            "2026Q2": {
              status: "construction",
              value: "V9 infra",
              delta: "Xi'an",
              detail: "286-layer V9 인프라 구축 보도. 단순 신규 WPM이 아닌 공정 전환 중심.",
            },
            "2026Q4": {
              status: "equipment",
              value: "V9 prep",
              delta: "CY26",
              detail: "연내 투자 완료·양산 준비 목표 보도.",
            },
            "2027Q2": {
              status: "ramp",
              value: "V9 output",
              delta: "Target",
              detail: "본격 output은 2027년 목표. 정확한 분기는 미공개.",
            },
          },
          sources: [
            {
              label: "TrendForce / Sisa Journal",
              url: "https://www.trendforce.com/news/2026/05/25/news-samsung-reportedly-begins-v9-nand-cleanroom-build-out-in-xian-following-v8-ramp-up-and-v6-phase-out/",
            },
            {
              label: "Mirae Asset",
              url: "https://securities.miraeasset.com/bbs/download/2141014.pdf?attachmentId=2141014",
            },
          ],
        },
        {
          company: "SK hynix / Solidigm",
          scope: "321L QLC / M17 Cheongju",
          confidence: "회사 공식",
          confidenceTone: "official",
          summary:
            "2026년은 321-layer QLC와 eSSD mix 개선, 신규 NAND fab M17은 CY2027 착공·1H29 가동 목표입니다. M17 WPM은 미공개입니다.",
          cells: {
            "2025Q4": {
              status: "online",
              value: "321L",
              delta: "QLC",
              detail: "321-layer QLC NAND 양산 시작은 2025년 8월 공식 발표.",
            },
            "2026Q2": {
              status: "online",
              value: "cSSD",
              delta: "Dell supply",
              detail: "321-layer QLC cSSD 공급을 2026년 4월 시작.",
            },
            "2027Q1": {
              status: "construction",
              value: "M17 build",
              delta: "CY27",
              detail: "회사 공식 착공 목표는 CY2027이며 정확한 분기는 미공개.",
            },
            "2028Q4": {
              status: "construction",
              value: "M17",
              delta: "1H29 op",
              detail: "M17 가동 목표는 2029년 상반기. 현재 화면 범위 밖의 다음 핵심 공급 이벤트.",
            },
          },
          sources: [
            {
              label: "SK hynix M17 official",
              url: "https://news.skhynix.com/fact-07/",
            },
            {
              label: "SK hynix 321L QLC",
              url: "https://news.skhynix.com/begin-supply-321-layer-qlc-nand-cssd/",
            },
          ],
        },
        {
          company: "Micron",
          scope: "Singapore NAND fab",
          confidence: "회사 공식",
          confidenceTone: "official",
          summary:
            "Singapore NAND Center of Excellence 내 700K sq ft 클린룸을 건설합니다. 약 $24B/10년 투자, 첫 wafer output은 2H28 목표입니다.",
          cells: {
            "2026Q1": {
              status: "construction",
              value: "Ground",
              delta: "$24B / 10Y",
              detail: "2026년 1월 착공. 총 700K sq ft cleanroom 계획.",
            },
            "2028Q3": {
              status: "online",
              value: "Wafer-out",
              delta: "2H28",
              detail: "회사 공식 첫 wafer output 목표는 2028년 하반기. 정확한 분기는 미공개.",
            },
            "2028Q4": {
              status: "ramp",
              value: "Ramp",
              delta: "Demand-led",
              detail: "수요에 맞춘 단계적 램프. 공식 WPM은 미공개.",
            },
          },
          sources: [
            {
              label: "Micron official",
              url: "https://investors.micron.com/news-releases/news-release-details/micron-breaks-ground-advanced-wafer-fabrication-facility",
            },
          ],
        },
        {
          company: "Kioxia",
          scope: "Kitakami K2 / Yokkaichi Fab7",
          confidence: "회사 공식",
          confidenceTone: "official",
          summary:
            "K2는 2025년 9월 가동을 시작했고 1H26 meaningful output 목표입니다. FY26·FY27 투자는 BiCS8 증설과 BiCS10 ramp에 집중됩니다.",
          cells: {
            "2025Q4": {
              status: "online",
              value: "K2 online",
              delta: "BiCS8",
              detail: "Kitakami Fab2 operation 시작. 218-layer BiCS8 생산 capability.",
            },
            "2026Q2": {
              status: "ramp",
              value: "Output",
              delta: "Meaningful",
              detail: "회사 공식 meaningful output 목표: 1H26.",
            },
            "2026Q4": {
              status: "ramp",
              value: "BiCS8",
              delta: "K2 / Fab7",
              detail: "FY26 capex는 BiCS8 capacity와 K2·Fab7 장비 투입 중심.",
            },
            "2027Q4": {
              status: "ramp",
              value: "BiCS10",
              delta: "22% GB CAGR",
              detail: "FY26~FY27 투자를 통해 FY28까지 22% GB CAGR 지원 계획. WPM이 아닌 bit-growth 계획.",
            },
          },
          sources: [
            {
              label: "Kioxia Integrated Report",
              url: "https://www.kioxia-holdings.com/content/dam/kioxia-hd/en-jp/ir/library/integrated-report/2025/asset/Integrated-Report-2025-all-print-en.pdf",
            },
            {
              label: "Kioxia Investor Day Q&A",
              url: "https://www.kioxia-holdings.com/content/dam/kioxia-hd/en-jp/ir/library/event/asset/Kioxia-Investor-Day-2026-Eng-QA.pdf",
            },
          ],
        },
        {
          company: "SanDisk",
          scope: "Kioxia JV / K2",
          confidence: "JV 공식",
          confidenceTone: "official",
          summary:
            "Kioxia와 같은 K2·Yokkaichi 생산기반을 공유합니다. 전체 fab CAPA의 약 80%가 JV이고 JV output은 50:50이므로 SanDisk 몫은 gross 기준 약 40%입니다.",
          cells: {
            "2025Q4": {
              status: "online",
              value: "K2 JV",
              delta: "Operation",
              detail: "Kioxia와 공동 발표한 Kitakami Fab2 operation 시작.",
            },
            "2026Q2": {
              status: "ramp",
              value: "Output",
              delta: "Meaningful",
              detail: "K2 meaningful output 목표 1H26. Kioxia 행과 같은 physical capacity이므로 중복 합산 금지.",
            },
            "2026Q4": {
              status: "ramp",
              value: "BiCS8",
              delta: "JV share",
              detail: "Flash Ventures 투자분에 따른 BiCS8 output 배분.",
            },
            "2027Q4": {
              status: "ramp",
              value: "BiCS10",
              delta: "JV share",
              detail: "Kioxia와 공동 node conversion. 독립 신규 fab가 아님.",
            },
          },
          sources: [
            {
              label: "Kioxia / SanDisk K2",
              url: "https://www.sandisk.com/ko-kr/company/newsroom/press-releases/2025/2025-09-29-kioxia-and-sandisk-announce-beginning-of-operation-of-fab2-at-kitakami-plant-japan-to-meet-the-market-demand-driven-by-ai",
            },
            {
              label: "SanDisk 10-K JV structure",
              url: "https://investor.sandisk.com/static-files/aa2fb019-6782-45f8-a9ff-108486c78c0a",
            },
          ],
        },
      ],
    },
    hdd: {
      title: "HDD Capa Roadmap",
      subtitle:
        "HDD 업체는 공장 unit CAPA를 거의 공개하지 않습니다. 따라서 허위 WPM 대신 최대 TB/drive, platter density, 고객 인증과 exabyte crossover를 실질 공급능력 지표로 사용합니다.",
      metricNote:
        "HDD의 CAPA 증가는 공장 증설보다 HAMR/ePMR/MAMR로 한 대당 TB를 높이는 방식이 중심입니다. 같은 드라이브 수로 더 많은 EB를 출하할 수 있다는 뜻입니다.",
      companyRows: [
        {
          company: "Seagate",
          scope: "Mozaic HAMR / nearline",
          confidence: "회사 IR + SEC",
          confidenceTone: "official",
          summary:
            "Mozaic 4+ 44TB를 2개 hyperscaler에 volume shipping 중입니다. HAMR가 nearline EB의 과반을 넘는 시점은 2H26, 5TB/platter 도입 목표는 early-2028입니다.",
          cells: {
            "2025Q4": {
              status: "equipment",
              value: "4TB/disk",
              delta: "Qual",
              detail: "4+ TB per disk platform qualification 시작. disk는 platter 의미.",
            },
            "2026Q1": {
              status: "online",
              value: "44TB",
              delta: "Volume",
              detail: "Mozaic 4+ up to 44TB, 2개 hyperscale cloud 고객에 volume shipment.",
            },
            "2026Q3": {
              status: "ramp",
              value: ">50% EB",
              delta: "HAMR mix",
              detail: "회사 목표: 2H26 HAMR 기반 nearline drive가 exabyte shipment crossover.",
            },
            "2028Q1": {
              status: "ramp",
              value: "5TB/disk",
              delta: "Target",
              detail: "회사 로드맵: early-CY2028 5TB per disk(platter) 기술 도입.",
            },
          },
          sources: [
            {
              label: "Seagate Mozaic 4+",
              url: "https://investors.seagate.com/news/news-details/2026/Seagate-Delivers-Industrys-Highest-Capacity-Hard-Drives-with-Next-Generation-Mozaic-4/default.aspx",
            },
            {
              label: "Seagate SEC call",
              url: "https://www.sec.gov/Archives/edgar/data/1137789/000113778925000150/fq425consolidatedscript-8x.htm",
            },
          ],
        },
        {
          company: "Western Digital",
          scope: "ePMR / UltraSMR / HAMR",
          confidence: "회사 공식",
          confidenceTone: "official",
          summary:
            "40TB UltraSMR ePMR은 2개 hyperscaler 인증 중이며 2H26 volume production 목표입니다. HAMR ramp는 2027년, 100TB는 2029년 로드맵입니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "40TB",
              delta: "Qual",
              detail: "2개 hyperscaler 고객 인증 진행.",
            },
            "2026Q3": {
              status: "online",
              value: "40TB",
              delta: "Volume",
              detail: "40TB UltraSMR ePMR volume production 목표: 2H26.",
            },
            "2027Q2": {
              status: "ramp",
              value: "HAMR",
              delta: "Ramp 2027",
              detail: "HAMR 고객 인증 후 2027년 ramp production 계획. 정확한 분기는 미공개.",
            },
            "2028Q4": {
              status: "planned",
              value: "60TB",
              delta: "ePMR path",
              detail: "ePMR를 60TB까지 확장하는 로드맵. 정확한 출시 분기는 미공개이며 100TB HAMR 목표는 2029년.",
            },
          },
          sources: [
            {
              label: "WD Innovation Day",
              url: "https://investor.wdc.com/node/27841",
            },
          ],
        },
        {
          company: "Toshiba",
          scope: "FC-MAMR / SMR / 12-disk",
          confidence: "회사 공식",
          confidenceTone: "official",
          summary:
            "M12 30~34TB SMR 샘플을 2026년 3월 시작했고 28TB CMR 샘플은 3Q26 목표입니다. 이후 HAMR와 12-disk platform을 순차 도입합니다.",
          cells: {
            "2026Q1": {
              status: "equipment",
              value: "30-34TB",
              delta: "SMR sample",
              detail: "M12 FC-MAMR + host-managed SMR 샘플 출하 시작.",
            },
            "2026Q3": {
              status: "equipment",
              value: "28TB",
              delta: "CMR sample",
              detail: "28TB CMR 모델 sample shipment 목표: 3Q26.",
            },
            "2026Q4": {
              status: "planned",
              value: "12-disk",
              delta: "HAMR next",
              detail: "차기 분기들에 HAMR와 12-disk 구성을 도입할 계획. 양산 분기는 미공개.",
            },
          },
          sources: [
            {
              label: "Toshiba M12 official",
              url: "https://news.toshiba.com/press-releases/press-release-details/2026/Toshiba-Begins-Sampling-of-30-34-TB-SMR-Nearline-Hard-Disk-Drives/default.aspx",
            },
            {
              label: "Toshiba 12-disk",
              url: "https://news.toshiba.com/press-releases/press-release-details/2025/Toshiba-First-in-Industry-to-Verify-12-Disk-Stacking-Technology-for-Hard-Drives/default.aspx",
            },
          ],
        },
      ],
    },
  },
};
