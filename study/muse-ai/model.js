/* Equations and baseline assumptions: https://muse-cost-calculator.vercel.app/
 * GDP (@bookwormengr), inspected 2026-09-30. Independently implemented for EG.
 * This is a scenario model, not a forecast or a live data feed.
 */
(function (root) {
  "use strict";
  const defaults = Object.freeze({
    dau: 4, tok: 10, prefill: 97, mins: 15, preset: "121", tpd: 121,
    tco: 1.73, kw: 1.70, util: 60, sess: 3, tail: 1, peak: 1.5, fleet: 80,
    ccores: 192, vcpu: 1, gram: 2, ucpu: 5, uram: 0.95, udisk: 0.5,
    maxcpu: 50, maxram: 81, ocpu: 10, oram: 2, srv: 7.52, skw: 1.4,
    stor: 44, gps: 8, hbm: 180, gdram: 2, gnvme: 30.72, cdram: 1.5,
    cnvme: 3.4, shared: 310, rev: 67.6, exp: 50,
  });
  function calculate(input = {}) {
    const p = { ...defaults, ...input };
    for (const key of Object.keys(defaults)) {
      if (key === "preset") continue;
      p[key] = Number(p[key]);
      if (!Number.isFinite(p[key]) || p[key] < 0) throw new RangeError(`Invalid ${key}`);
    }
    for (const key of ["tpd", "tco", "kw", "cdram"]) {
      if (p[key] <= 0) throw new RangeError(`Positive ${key} required`);
    }
    for (const key of ["prefill", "util", "fleet", "ucpu", "maxcpu", "maxram"]) {
      if (p[key] > 100) throw new RangeError(`Invalid percentage ${key}`);
    }
    const users = p.dau * 1e9, tokens = p.tok * 1e6, efficiency = p.tpd * 1e6;
    const utilization = Math.max(p.util, 1) / 100;
    const tokensDay = users * tokens;
    const gpuPerUserDay = tokens / efficiency / utilization;
    const gpuYear = gpuPerUserDay * users * 365;
    const throughput = efficiency * p.tco / 3600;
    const gpus = tokensDay / 86400 / throughput / utilization;
    const gpuGW = gpus * p.kw / 1e6;
    const perGW = 1e6 / p.kw * p.tco * 8760;
    const vmMinutes = users * (p.mins + p.sess * p.tail);
    const avgVM = vmMinutes / 1440, peakVM = avgVM * p.peak;
    const slots = peakVM / (Math.max(p.fleet, 1) / 100);
    const coresPerVM = p.vcpu * p.ucpu / 100;
    const ramGB = p.cdram * 1000, nvmeGB = p.cnvme * 1000, coresPerServer = Math.max(p.ccores, 1);
    const limits = [
      { key: "cpu", label: "CPU 실제 사용", value: coresPerServer * p.maxcpu / 100 / Math.max(coresPerVM, 1e-9), formula: "코어 × CPU 상한 ÷ (vCPU × 평균 사용률)" },
      { key: "ram", label: "RAM 실제 사용", value: ramGB * p.maxram / 100 / Math.max(p.uram, 1e-9), formula: "호스트 RAM × RAM 상한 ÷ VM 실제 RAM" },
      { key: "vcpu", label: "vCPU 초과 할당", value: coresPerServer * p.ocpu / Math.max(p.vcpu, 1e-9), formula: "코어 × vCPU 초과 할당 배수 ÷ VM vCPU" },
      { key: "gram", label: "RAM 초과 할당", value: ramGB * p.oram / Math.max(p.gram, 1e-9), formula: "호스트 RAM × RAM 초과 할당 배수 ÷ VM 할당 RAM" },
      { key: "disk", label: "로컬 디스크", value: nvmeGB * 0.8 / Math.max(p.udisk, 1e-9), formula: "로컬 NVMe × 80% ÷ VM 디스크" },
    ];
    const binding = limits.reduce((a, b) => b.value < a.value ? b : a);
    const density = Math.max(Math.floor(binding.value), 1);
    const servers = slots / density, cores = servers * coresPerServer;
    const serverYear = servers * p.srv * 8760;
    const cpuYear = serverYear + p.stor * 1e6, cpuGW = servers * p.skw / 1e6;
    const total = gpuYear + cpuYear, gw = gpuGW + cpuGW;
    const perUser = users > 0 ? total / users : 0;
    const gpuU = users > 0 ? gpuYear / users : 0, cpuU = users > 0 ? cpuYear / users : 0;
    const profit = p.rev - p.exp, margin = p.rev > 0 ? profit / p.rev : 0;
    const preserveProfit = perUser, preserveMargin = margin < 1 ? perUser / (1 - margin) : null;
    const gpuServers = gpus / Math.max(p.gps, 1);
    const memory = [
      { label: "GPU HBM", tb: gpus * p.hbm / 1000, type: "gpu" },
      { label: "GPU 서버 DRAM", tb: gpuServers * p.gdram, type: "gpu" },
      { label: "GPU 서버 NVMe", tb: gpuServers * p.gnvme, type: "gpu" },
      { label: "CPU 서버 DRAM", tb: servers * p.cdram, type: "cpu" },
      { label: "CPU 로컬 NVMe", tb: servers * p.cnvme, type: "cpu" },
      { label: "공유 스토리지", tb: p.shared * 1000, type: "cpu" },
    ];
    return { p, users, tokensDay, prefillTokens: tokensDay * p.prefill / 100,
      decodeTokens: tokensDay * (1 - p.prefill / 100), gpuPerUserDay, gpuYear, throughput,
      gpus, gpuGW, perGW, vmMinutes, avgVM, peakVM, slots, coresPerVM, limits, binding,
      density, servers, cores, serverYear, cpuYear, cpuGW, total, gw, perUser, gpuU, cpuU,
      profit, margin, preserveProfit, preserveMargin, gpuServers, memory,
      cpuOversub: density * p.vcpu / coresPerServer, ramOversub: density * p.gram / ramGB,
      cpuBusy: density * coresPerVM / coresPerServer, ramBusy: density * p.uram / ramGB,
      fleetVcpu: servers * density * p.vcpu, guestRamTB: servers * density * p.gram / 1000,
      hostRamTB: servers * density * p.uram / 1000, diskTB: servers * density * p.udisk / 1000,
      totalDramTB: memory[0].tb + memory[1].tb + memory[3].tb,
      gpuYearByFleet: gpus * p.tco * 8760,
    };
  }
  const api = { defaults, calculate };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.EgMuseModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
