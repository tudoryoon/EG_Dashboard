(function () {
  "use strict";
  const { defaults, calculate } = window.EgMuseModel;
  const $ = (id) => document.getElementById(id);
  const storageKey = "eg-muse-ai-v1";
  const colors = { gpu: "#1485ae", cpu: "#b27028", profit: "#26946d", expenses: "#94a29d" };
  const charts = {};
  const groups = [
    ["이용량", [
      ["dau", "일간 이용자", "B", .1], ["tok", "1인 일간 처리 토큰", "M", .5, "Prefill + Decode"],
      ["prefill", "Prefill 비중", "%", 1, "비용이 아닌 토큰 구성만 변경"], ["mins", "1인 에이전트 활성 시간", "분/일", 1],
    ]],
    ["GPU 추론 / B200", [
      ["preset", "사용자당 생성 속도 프리셋"], ["tpd", "$1당 처리 토큰", "M", 1, "통합 추론 효율 / 원본 InferenceX 가정"],
      ["tco", "GPU 시간당 TCO", "$/h", .01], ["kw", "GPU당 전체 전력", "kW", .05, "칩 TDP가 아닌 원본 역산값"],
      ["util", "GPU 가동률", "%", 1],
    ]],
    ["CPU 에이전트 / MicroVM", [
      ["sess", "1인 일간 세션", "회", 1], ["tail", "세션 종료 후 대기", "분", .5], ["peak", "피크 / 평균 배수", "배", .1],
      ["fleet", "피크 시 서버군 사용률", "%", 1], ["ccores", "서버당 물리 코어", "개", 1],
      ["vcpu", "VM당 할당 vCPU", "개", 1], ["gram", "VM당 할당 RAM", "GB", .5], ["ucpu", "할당 CPU 평균 사용률", "%", 1],
      ["uram", "VM 실제 호스트 RAM", "GB", .05], ["udisk", "VM 쓰기 디스크", "GB", .1],
      ["maxcpu", "호스트 CPU 사용 상한", "%", 1], ["maxram", "호스트 RAM 사용 상한", "%", 1],
      ["ocpu", "vCPU 초과 할당 상한", "배", .5], ["oram", "RAM 초과 할당 상한", "배", .1],
      ["srv", "CPU 서버 시간당 비용", "$/h", .1], ["skw", "서버당 전체 전력", "kW", .1],
      ["stor", "스토리지·스냅샷 연간 비용", "$M", 1],
    ]],
    ["메모리·스토리지", [
      ["gps", "GPU 서버당 GPU", "개", 1], ["hbm", "GPU당 HBM", "GB", 1], ["gdram", "GPU 서버당 DRAM", "TB", .5],
      ["gnvme", "GPU 서버당 NVMe", "TB", .01], ["cdram", "CPU 서버당 DRAM", "TB", .5],
      ["cnvme", "CPU 서버당 NVMe", "TB", .1], ["shared", "공유 스토리지", "PB", 10],
    ]],
    ["Meta 사용자당 연간 손익", [
      ["rev", "기존 연간 매출", "$", .1, "원본의 분기 실적 연환산 가정"], ["exp", "기존 연간 비용", "$", .1],
    ]],
  ];
  const percentKeys = new Set(["prefill", "util", "fleet", "ucpu", "maxcpu", "maxram"]);
  const positiveKeys = new Set(["tpd", "tco", "kw", "cdram"]);
  const e = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (x, d = 2) => Number.isFinite(x) ? x.toLocaleString("en-US", { maximumFractionDigits: d }) : "N/A";
  const compact = (x) => {
    if (!Number.isFinite(x)) return "N/A";
    for (const [scale, suffix] of [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]]) {
      if (Math.abs(x) >= scale) return num(x / scale) + suffix;
    }
    return num(x);
  };
  const money = (x) => {
    if (!Number.isFinite(x)) return "N/A";
    const amount = Math.abs(x);
    return (x < 0 ? "-$" : "$") + (amount > 0 && amount < .01 ? amount.toPrecision(3) : compact(amount));
  };
  const pct = (x) => num(x * 100, 1) + "%";
  const bytes = (tb) => tb >= 1e6 ? num(tb / 1e6) + " EB" : tb >= 1e3 ? num(tb / 1e3) + " PB" : num(tb) + " TB";
  const table = (rows) => `<table><tbody>${rows.map(([label, value]) => `<tr><td>${e(label)}</td><td>${e(value)}</td></tr>`).join("")}</tbody></table>`;

  $("inputs").innerHTML = groups.map(([title, fields], i) => `<details ${i < 2 ? "open" : ""}><summary>${title}</summary><fieldset aria-label="${title}">${fields.map(([key, label, unit, step, hint]) => {
    const control = key === "preset"
      ? `<select id="preset"><option value="191">~60 tok/s</option><option value="121">~125 tok/s</option><option value="60">~207 tok/s</option><option value="33">~290 tok/s</option><option value="custom">직접 입력</option></select>`
      : `<div class="input-unit"><input id="${key}" type="number" min="${positiveKeys.has(key) ? .000001 : 0}" ${percentKeys.has(key) ? 'max="100"' : ""} step="any" inputmode="decimal" data-step="${step}" required><span>${unit}</span></div>`;
    return `<div class="field"><label for="${key}">${label}${hint ? `<small>${hint}</small>` : ""}</label>${control}</div>`;
  }).join("")}</fieldset></details>`).join("");

  function setValues(values) {
    Object.keys(defaults).forEach((key) => { $(key).value = values[key]; });
    $("preset").value = ["191", "121", "60", "33"].includes(String(values.tpd)) ? String(values.tpd) : "custom";
  }
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    calculate(saved);
  } catch { saved = {}; }
  setValues({ ...defaults, ...saved });

  function bar(id, labels, datasets, format, stacked = false) {
    if (!window.Chart) return;
    if (charts[id]) {
      charts[id].data = { labels, datasets };
      charts[id].update("none");
      return;
    }
    charts[id] = new Chart($(id), {
      type: "bar", data: { labels, datasets },
      options: {
        indexAxis: "y", responsive: true, maintainAspectRatio: false, animation: false,
        datasets: { bar: { maxBarThickness: 24, borderRadius: 2 } },
        scales: {
          x: { stacked, beginAtZero: true, grid: { color: "#e9eeeb" }, ticks: { maxTicksLimit: 5, callback: format } },
          y: { stacked, grid: { display: false }, ticks: { color: "#3f4944", font: { size: 11 }, autoSkip: false } },
        },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${format(c.raw)}` } } },
      },
    });
  }
  function render(r) {
    const { p } = r;
    $("metrics").innerHTML = [
      ["총 연간 비용", money(r.total), `GPU ${money(r.gpuYear)} / CPU ${money(r.cpuYear)}`],
      ["사용자당 연간 비용", money(r.perUser), `일간 ${money(r.perUser / 365)}`],
      ["총 전력", num(r.gw) + " GW", `GPU ${num(r.gpuGW)} / CPU ${num(r.cpuGW)} GW`],
      ["필요 B200 GPU", compact(r.gpus) + "개", `CPU 서버 ${compact(r.servers)}대`],
    ].map(([label, value, detail]) => `<div class="metric"><small>${label}</small><strong>${value}</strong><small>${detail}</small></div>`).join("");
    $("revenue-summary").innerHTML = `<div>기존 이익액 유지<strong>+${money(r.preserveProfit)}</strong><small>1인당 연간 추가 매출<br>기존 이익 ${money(r.profit)} 유지</small></div><div>기존 이익률 유지<strong>${r.preserveMargin === null ? "N/A" : "+" + money(r.preserveMargin)}</strong><small>1인당 연간 추가 매출<br>기존 이익률 ${pct(r.margin)} 유지</small></div>`;
    const freeProfit = r.profit - r.perUser;
    $("free-profit").innerHTML = `추가 매출 없이 무료 제공 시 사용자당 연간 손익: <strong class="${freeProfit < 0 ? "loss" : ""}">${money(freeProfit)}</strong>. ${r.users === 0 ? "이용자 0명: 원본 규칙에 따라 사용자당 비용은 0으로 표시하되 고정 스토리지 비용은 남습니다." : ""}`;
    bar("revenue", ["현재", "무료 제공 / 추가 매출 0", "기존 이익액 유지", "기존 이익률 유지"], [
      { label: "기존 비용", data: [p.exp, p.exp, p.exp, p.exp], backgroundColor: colors.expenses },
      { label: "GPU", data: [0, r.gpuU, r.gpuU, r.gpuU], backgroundColor: colors.gpu },
      { label: "CPU", data: [0, r.cpuU, r.cpuU, r.cpuU], backgroundColor: colors.cpu },
      { label: "이익", data: [r.profit, Math.max(freeProfit, 0), r.profit, r.preserveMargin === null ? 0 : p.rev + r.preserveMargin - p.exp - r.perUser], backgroundColor: colors.profit },
    ], money, true);
    bar("cost", ["GPU 추론", "CPU 에이전트"], [{ label: "연간 비용", data: [r.gpuYear, r.cpuYear], backgroundColor: [colors.gpu, colors.cpu] }], money);
    bar("memory", r.memory.map((x) => x.label), [{ label: "용량", data: r.memory.map((x) => x.tb), backgroundColor: r.memory.map((x) => colors[x.type]) }], bytes);
    $("memory-table").innerHTML = table([["GPU 서버", compact(r.gpuServers) + "대"], ...r.memory.map((x) => [x.label, bytes(x.tb)]), ["전체 DRAM + HBM", bytes(r.totalDramTB)]]);
    $("reconciliation").innerHTML = `<div>사용자 기반 계산<strong>${money(r.gpuYear)}</strong><small>N × T × 365 ÷ (E × U)</small></div><div>GPU 서버군 기반 계산<strong>${money(r.gpuYearByFleet)}</strong><small>GPU 수 × 시간당 TCO × 8,760<br>두 식의 차이 ${num(Math.abs(r.gpuYear - r.gpuYearByFleet), 6)}달러</small></div>`;
    $("gpu-table").innerHTML = table([
      ["일간 토큰", compact(r.tokensDay)], ["Prefill", compact(r.prefillTokens)], ["Decode", compact(r.decodeTokens)],
      ["전체 초당 처리량", compact(r.tokensDay / 86400) + " tok/s"], ["GPU당 초당 처리량", compact(r.throughput) + " tok/s"],
      ["필요 B200", compact(r.gpus)], ["GPU 전력", num(r.gpuGW) + " GW"], ["GW당 연간 비용", money(r.perGW)],
      ["1인 일간 GPU 비용", money(r.gpuPerUserDay)], ["연간 GPU 비용", money(r.gpuYear)],
    ]);
    $("cpu-table").innerHTML = table([
      ["일간 VM 사용량", compact(r.vmMinutes) + " VM·분"], ["평균 / 피크 VM", compact(r.avgVM) + " / " + compact(r.peakVM)],
      ["확보 슬롯", compact(r.slots)], ["서버 / 코어", compact(r.servers) + " / " + compact(r.cores)],
      ["CPU 전력", num(r.cpuGW) + " GW"], ["연간 서버 비용", money(r.serverYear)], ["스토리지·스냅샷", money(p.stor * 1e6)],
      ["1인 일간 CPU 비용", money(r.cpuYear / Math.max(r.users, 1) / 365)], ["연간 CPU 비용", money(r.cpuYear)],
    ]);
    $("limit-table").innerHTML = `<table><thead><tr><th>서버당 VM 수 제약</th><th>허용 VM</th></tr></thead><tbody>${r.limits.map((l) => `<tr class="${l.key === r.binding.key ? "binding" : ""}"><td>${l.label}${l.key === r.binding.key ? " / 병목" : ""}<small>${l.formula}</small></td><td>${num(Math.floor(l.value), 0)}</td></tr>`).join("")}</tbody></table>`;
    $("vm-table").innerHTML = table([
      ["서버당 VM", num(r.density)], ["vCPU / RAM 초과 할당", num(r.cpuOversub) + "배 / " + num(r.ramOversub) + "배"],
      ["평균 CPU / 호스트 RAM 사용", pct(r.cpuBusy) + " / " + pct(r.ramBusy)], ["전체 할당 vCPU", compact(r.fleetVcpu)],
      ["전체 할당 게스트 RAM", bytes(r.guestRamTB)], ["실제 호스트 RAM 사용", bytes(r.hostRamTB)], ["실제 쓰기 디스크 사용", bytes(r.diskTB)],
    ]);
    $("user-table").innerHTML = table([
      ["기존 매출", money(p.rev)], ["기존 비용", money(p.exp)], ["기존 이익", money(r.profit)],
      ["Muse GPU 비용", money(r.gpuU)], ["Muse CPU 비용", money(r.cpuU)], ["Muse 총비용", money(r.perUser)],
      ["추가 매출 0일 때 손익", money(freeProfit)], ["기존 이익액 유지 매출", money(p.rev + r.preserveProfit)],
      ["기존 이익률 유지 매출", r.preserveMargin === null ? "N/A" : money(p.rev + r.preserveMargin)],
    ]);
    const formulas = [
      ["일간 토큰", "N × T", compact(r.tokensDay)], ["1인 일간 GPU 비용", "T ÷ E ÷ U", money(r.gpuPerUserDay)],
      ["연간 GPU 비용", "N × T × 365 ÷ (E × U)", money(r.gpuYear)], ["GPU 초당 처리량", "E × TCO ÷ 3,600", compact(r.throughput)],
      ["필요 GPU", "N × T ÷ 86,400 ÷ GPU 초당 처리량 ÷ U", compact(r.gpus)], ["GPU 전력 (GW)", "GPU × kW ÷ 1,000,000", num(r.gpuGW)],
      ["GW당 연간 비용", "1,000,000 ÷ kW × TCO × 8,760", money(r.perGW)],
      ["일간 VM·분", "N × (활성 분 + 세션 수 × 대기 분)", compact(r.vmMinutes)],
      ["피크 VM", "일간 VM·분 ÷ 1,440 × 피크 배수", compact(r.peakVM)],
      ["서버당 VM", "max(1, floor(5개 제약 중 최소값))", num(r.density)],
      ["서버", "피크 VM ÷ 서버군 사용률 ÷ 서버당 VM", compact(r.servers)],
      ["vCPU 초과 할당", "서버당 VM × VM vCPU ÷ 물리 코어", num(r.cpuOversub)],
      ["RAM 초과 할당", "서버당 VM × 할당 RAM ÷ 호스트 RAM", num(r.ramOversub)],
      ["CPU 연간 비용", "서버 × 서버 $/h × 8,760 + 스토리지 연간 비용", money(r.cpuYear)],
      ["CPU 전력 (GW)", "서버 × 서버 kW ÷ 1,000,000", num(r.cpuGW)],
      ["HBM (TB)", "GPU × GPU당 HBM GB ÷ 1,000", bytes(r.memory[0].tb)],
      ["GPU DRAM (TB)", "GPU ÷ 서버당 GPU × 서버당 DRAM TB", bytes(r.memory[1].tb)],
      ["GPU NVMe (TB)", "GPU ÷ 서버당 GPU × 서버당 NVMe TB", bytes(r.memory[2].tb)],
      ["CPU DRAM (TB)", "CPU 서버 × 서버당 DRAM TB", bytes(r.memory[3].tb)],
      ["CPU NVMe (TB)", "CPU 서버 × 서버당 NVMe TB", bytes(r.memory[4].tb)],
      ["공유 스토리지 (TB)", "공유 PB × 1,000", bytes(r.memory[5].tb)],
      ["1인 연간 비용 C", "(GPU 연간 비용 + CPU 연간 비용) ÷ N", money(r.perUser)],
      ["기존 이익률 M", "(매출 − 비용) ÷ 매출", pct(r.margin)],
      ["기존 이익액 유지 추가 매출", "C", money(r.preserveProfit)], ["기존 이익률 유지 추가 매출", "C ÷ (1 − M)", money(r.preserveMargin)],
    ];
    $("formulas").innerHTML = `<p class="note">N = 일간 이용자 · T = 1인 일간 토큰 · E = $1당 토큰 · U = 가동률(소수). GB/TB/PB는 1,000배 단위입니다.</p><div class="table-scroll"><table><thead><tr><th>항목</th><th>산식</th><th>결과</th></tr></thead><tbody>${formulas.map((row) => `<tr>${row.map((v) => `<td>${e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  function update() {
    try {
      const values = {};
      for (const key of Object.keys(defaults)) {
        if (key !== "preset" && (!$(key).value.trim() || !$(key).checkValidity())) throw new Error("invalid");
        values[key] = key === "preset" ? $(key).value : Number($(key).value);
      }
      const result = calculate(values);
      render(result);
      $("error").hidden = !!window.Chart;
      $("error").textContent = window.Chart ? "" : "차트 라이브러리를 불러오지 못했습니다. 표의 계산 결과는 정상입니다.";
      try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* Storage is optional. */ }
    } catch {
      $("error").hidden = false;
      $("error").textContent = "입력 범위를 확인해 주세요. 처리 효율·GPU TCO·전력·CPU RAM은 0보다 커야 합니다. 결과는 마지막 유효 입력 기준입니다.";
    }
  }
  $("inputs").addEventListener("submit", (event) => event.preventDefault());
  $("inputs").addEventListener("input", (event) => {
    if (event.target.id === "preset" && event.target.value !== "custom") $("tpd").value = event.target.value;
    if (event.target.id === "tpd") $("preset").value = ["191", "121", "60", "33"].includes(event.target.value) ? event.target.value : "custom";
    update();
  });
  $("reset").addEventListener("click", () => { setValues(defaults); update(); });
  update();
})();
