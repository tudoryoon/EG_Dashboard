window.semisMemoryCapaData = {
  updatedAt: "2026-07-09",
  unit: "12-inch wafer starts per month, K WPM",
  scope:
    "Public company releases and industry-news estimates. Wafer-start figures are directional capacity markers, not audited company guidance, and HBM allocation can reduce commodity DRAM bit output.",
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
    { key: "online", label: "Online / output", tone: "green" },
    { key: "ramp", label: "Ramp / mass-production readiness", tone: "teal" },
    { key: "equipment", label: "Equipment move-in / qualification", tone: "blue" },
    { key: "construction", label: "Construction / cleanroom", tone: "amber" },
    { key: "planned", label: "Planned / TBD capacity", tone: "gray" },
  ],
  sections: {
    dram: {
      title: "DRAM Capa Roadmap",
      subtitle:
        "Samsung, SK hynix, Micron의 공개/보도 기반 DRAM wafer-start 증설 로드맵입니다. 숫자는 K WPM 기준이며, fab별 행은 중복될 수 있어 단순 합산하지 않습니다.",
      kpis: [
        { label: "Tracked DRAM rows", value: "10", note: "IDM 3사 주요 fab / line" },
        { label: "Largest disclosed single fab", value: "360K", note: "SK hynix Yongin Fab 1 full plan by 2030" },
        { label: "Near-term disclosed ramp", value: "2026", note: "Samsung 1c + SK hynix M15X 중심" },
      ],
      rows: [
        {
          company: "Samsung",
          fab: "1c DRAM build-out",
          location: "Pyeongtaek P4 + existing-line conversions",
          product: "1c DRAM / HBM4",
          target: "60K -> 140K -> 200K WPM",
          confidence: "reported",
          cells: {
            "2025Q4": { status: "ramp", label: "60K", note: "reported equipment-ready target" },
            "2026Q2": { status: "ramp", label: "+80K", note: "reported added readiness" },
            "2026Q4": { status: "ramp", label: "+60K", note: "reported 200K run-rate target" },
          },
          note:
            "TrendForce/ETNews reported Samsung aims for 200K WPM of 1c DRAM capacity by end-2026, through P4 and process conversions.",
          sources: [
            {
              label: "TrendForce / ETNews",
              url: "https://www.trendforce.com/news/2025/11/19/news-samsung-reportedly-plans-200k-1c-dram-wafersmonth-by-2026-about-one-third-of-its-total-output/",
            },
          ],
        },
        {
          company: "Samsung",
          fab: "Pyeongtaek P3 upgrade",
          location: "Pyeongtaek, Korea",
          product: "Advanced DRAM",
          target: "115K WPM by end-2026",
          confidence: "analyst-report",
          cells: {
            "2026Q4": { status: "online", label: "115K", note: "reported P3 end-2026 capacity" },
          },
          note:
            "Reported analyst view: P3 reaches 115K WPM by end-2026. Treat as fab-level run-rate marker, not incremental addition.",
          sources: [
            {
              label: "TrendForce / Commercial Times",
              url: "https://www.trendforce.com/news/2025/10/17/news-memory-giants-hbm-focus-could-limit-dram-growth-through-2026-taiwan-firms-boost-ddr4/",
            },
          ],
        },
        {
          company: "Samsung",
          fab: "Pyeongtaek P4 Phase 2",
          location: "Pyeongtaek, Korea",
          product: "HBM4-oriented 1c DRAM",
          target: "60K WPM phase-2 mass production",
          confidence: "analyst-report",
          cells: {
            "2026Q2": { status: "online", label: "60K", note: "phase-2 mass production start reported" },
            "2026Q3": { status: "ramp", label: "Ramp", note: "HBM4/advanced-node allocation" },
            "2026Q4": { status: "ramp", label: "Ramp", note: "run-rate stabilization" },
          },
          note:
            "This row overlaps with Samsung's broader 1c build-out row; use it to locate the fab timing, not to add twice.",
          sources: [
            {
              label: "TrendForce / Commercial Times",
              url: "https://www.trendforce.com/news/2025/10/17/news-memory-giants-hbm-focus-could-limit-dram-growth-through-2026-taiwan-firms-boost-ddr4/",
            },
          ],
        },
        {
          company: "Samsung",
          fab: "Pyeongtaek P5",
          location: "Pyeongtaek, Korea",
          product: "Next-gen HBM / 1c DRAM",
          target: "WPM TBD",
          confidence: "planned",
          cells: {
            "2027Q4": { status: "construction", label: "Late-27?", note: "earlier reports cited late-2027 production plan" },
            "2028Q1": { status: "planned", label: "P5-1", note: "newer reports point to phased ramp from 2028" },
            "2028Q2": { status: "planned", label: "P5-1", note: "capacity not disclosed" },
          },
          note:
            "Recent reporting indicates P5-1 phased operation in 2028 and P5-2 later; keep as timing marker until WPM is disclosed.",
          sources: [
            {
              label: "TrendForce / Chosun",
              url: "https://www.trendforce.com/news/2026/07/06/news-micron-breaks-ground-on-hiroshima-fab-expansion-scaling-1%CE%B3-dram-and-hbm-output-as-equipment-set-for-2h28/",
            },
          ],
        },
        {
          company: "SK hynix",
          fab: "M15X Cheongju",
          location: "Cheongju, Korea",
          product: "HBM3E / HBM4 DRAM",
          target: "10K H1'26 -> 50K Q4'26; 80-90K full",
          confidence: "reported",
          cells: {
            "2026Q1": { status: "equipment", label: "Wafer-in", note: "first cleanroom wafer loading reported" },
            "2026Q2": { status: "ramp", label: "10K", note: "reported H1 2026 initial ramp" },
            "2026Q4": { status: "ramp", label: "50K", note: "reported Q4 2026 capacity target" },
            "2027Q4": { status: "online", label: "80-90K", note: "full utilization range from industry reports" },
          },
          note:
            "M15X is the near-term SK hynix DRAM/HBM relief valve before Yongin. DBR cites up to 90K WPM at 100% utilization.",
          sources: [
            {
              label: "TrendForce / The Bell",
              url: "https://www.trendforce.com/news/2025/10/02/news-sk-hynix-reportedly-to-double-dram-capacity-in-2h26-to-match-samsung-pulls-back-on-nand/",
            },
            {
              label: "DBR / DongA",
              url: "https://dbr.donga.com/kfocus/view/en/article_no/2274",
            },
          ],
        },
        {
          company: "SK hynix",
          fab: "Yongin Fab 1",
          location: "Yongin, Korea",
          product: "Leading-edge DRAM / HBM",
          target: "6 cleanrooms x 60K = 360K WPM by H1'30",
          confidence: "reported-model",
          cells: {
            "2027Q1": { status: "equipment", label: "Equip", note: "first cleanroom equipment move-in pulled to Feb 2027" },
            "2027Q3": { status: "ramp", label: "+60K", note: "phase-1 cadence estimate" },
            "2028Q1": { status: "ramp", label: "120K", note: "two-phase cumulative cadence estimate" },
            "2028Q3": { status: "ramp", label: "180K", note: "three-phase cumulative cadence estimate" },
          },
          note:
            "The +60K per six-month cadence is a model based on public reporting; actual wafer-in timing depends on equipment delivery.",
          sources: [
            {
              label: "TechTimes / The Elec",
              url: "https://www.techtimes.com/articles/317859/20260606/sk-hynix-dram-capacity-roadmap-revealed-yongin-alone-adds-360k-wafers-monthly.htm",
            },
          ],
        },
        {
          company: "Micron",
          fab: "HBM DRAM capacity",
          location: "Global DRAM network",
          product: "HBM",
          target: "20K end-2024 -> 60K end-2025",
          confidence: "reported",
          cells: {
            "2025Q4": { status: "online", label: "60K", note: "reported HBM wafer capacity target" },
          },
          note:
            "This is HBM-oriented wafer capacity, not total Micron DRAM capacity. It is useful for AI-memory supply pressure.",
          sources: [
            {
              label: "Chosun Daily",
              url: "https://www.chosun.com/english/industry-en/2025/01/16/6J7JMUH2RBDT3IJUXSI4ZUIZEA/",
            },
          ],
        },
        {
          company: "Micron",
          fab: "Manassas modernization",
          location: "Manassas, Virginia",
          product: "1-alpha DDR4",
          target: "4x DDR4 wafer supply; WPM undisclosed",
          confidence: "official",
          cells: {
            "2026Q4": { status: "equipment", label: "Qual", note: "qualified production expected by end-CY2026" },
          },
          note:
            "Micron says the Manassas investment will quadruple DDR4 wafer supply, but does not disclose WPM.",
          sources: [
            {
              label: "Micron IR",
              url: "https://investors.micron.com/news-releases/news-release-details/micron-advances-made-america-memory-manufacturing-expansion",
            },
          ],
        },
        {
          company: "Micron",
          fab: "Idaho ID1 / ID2",
          location: "Boise, Idaho",
          product: "Leading-edge DRAM",
          target: "Initial ID1 wafer output mid-2027; WPM undisclosed",
          confidence: "official",
          cells: {
            "2027Q2": { status: "equipment", label: "ID1", note: "initial wafer output target around mid-2027" },
            "2027Q3": { status: "ramp", label: "Ramp", note: "customer qualification follows initial output" },
            "2028Q4": { status: "planned", label: "ID2", note: "second Idaho fab timing not fully disclosed" },
          },
          note:
            "NIST confirms two Boise HVM DRAM fabs, each about 600K sqft cleanroom; Micron confirms ID1 initial wafer output in mid-CY2027.",
          sources: [
            {
              label: "NIST CHIPS",
              url: "https://www.nist.gov/chips/micron-idaho-boise",
            },
            {
              label: "Micron IR",
              url: "https://investors.micron.com/news-releases/news-release-details/micron-advances-made-america-memory-manufacturing-expansion",
            },
          ],
        },
        {
          company: "Micron",
          fab: "Taiwan Tongluo P5",
          location: "Tongluo, Taiwan",
          product: "300mm DRAM cleanroom",
          target: "Meaningful output 2H 2027; WPM undisclosed",
          confidence: "reported",
          cells: {
            "2026Q2": { status: "construction", label: "Close", note: "transaction expected to close by Q2 2026" },
            "2027Q3": { status: "ramp", label: "Ramp", note: "meaningful DRAM output begins in 2H 2027" },
            "2027Q4": { status: "ramp", label: "Ramp", note: "phased equipment/ramp" },
          },
          note:
            "Existing 300K sqft cleanroom may accelerate capacity versus greenfield construction, but WPM is not disclosed.",
          sources: [
            {
              label: "Cleanroom Technology",
              url: "https://cleanroomtechnology.com/micron-buys-taiwan-fab-for-1-8bn-to-boost",
            },
          ],
        },
        {
          company: "Micron",
          fab: "Hiroshima expansion",
          location: "Hiroshima, Japan",
          product: "1-gamma DRAM / HBM",
          target: "Equipment from 2H 2028; WPM TBD",
          confidence: "official-reported",
          cells: {
            "2028Q3": { status: "equipment", label: "Equip", note: "equipment delivery/install begins 2H 2028" },
            "2028Q4": { status: "equipment", label: "Equip", note: "capacity ramp after install/yield stabilization" },
          },
          note:
            "Micron broke ground on a JPY 1.5T Hiroshima expansion; output impact likely after equipment and yield ramp.",
          sources: [
            {
              label: "TrendForce / Bloomberg / EE Times Japan",
              url: "https://www.trendforce.com/news/2026/07/06/news-micron-breaks-ground-on-hiroshima-fab-expansion-scaling-1%CE%B3-dram-and-hbm-output-as-equipment-set-for-2h28/",
            },
          ],
        },
      ],
    },
    nand: {
      title: "NAND Capa Roadmap",
      subtitle: "이번 커밋에서는 틀만 잡아둡니다. 다음 패스에서 Samsung, SK hynix/Solidigm, Micron, SanDisk, Kioxia의 NAND fab/QLC/eSSD 증설을 채웁니다.",
      rows: [
        { company: "Samsung", fab: "TBD", location: "Korea / China", product: "NAND / eSSD", target: "Research pending", cells: {} },
        { company: "SK hynix / Solidigm", fab: "TBD", location: "Korea / China", product: "NAND / eSSD", target: "Research pending", cells: {} },
        { company: "Micron", fab: "TBD", location: "Singapore / Japan / U.S.", product: "NAND", target: "Research pending", cells: {} },
        { company: "SanDisk", fab: "TBD", location: "Japan JV", product: "NAND", target: "Research pending", cells: {} },
        { company: "Kioxia", fab: "TBD", location: "Japan", product: "NAND", target: "Research pending", cells: {} },
      ],
    },
    hdd: {
      title: "HDD Capa Roadmap",
      subtitle: "이번 커밋에서는 틀만 잡아둡니다. 다음 패스에서 Seagate, Western Digital, Toshiba의 nearline/HAMR/SMR exabyte capacity를 정리합니다.",
      rows: [
        { company: "Seagate", fab: "TBD", location: "Global HDD assembly", product: "Nearline / HAMR", target: "Research pending", cells: {} },
        { company: "Western Digital", fab: "TBD", location: "Global HDD assembly", product: "Nearline / ePMR", target: "Research pending", cells: {} },
        { company: "Toshiba", fab: "TBD", location: "Global HDD assembly", product: "Nearline", target: "Research pending", cells: {} },
      ],
    },
  },
};
