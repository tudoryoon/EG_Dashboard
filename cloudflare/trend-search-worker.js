const MAX_KEYWORDS = 5;
const CACHE_SECONDS = 60 * 30;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": `public, max-age=${CACHE_SECONDS}`,
  };
}

function jsonResponse(payload, status = 200, origin = "") {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders(origin) },
  });
}

function parseGooglePayload(text) {
  return JSON.parse(text.replace(/^\)\]\}',?\s*/, ""));
}

function normalizeKeywords(raw) {
  return [...new Set(String(raw || "").split(",").map((item) => item.trim()).filter(Boolean))].slice(0, MAX_KEYWORDS);
}

function toIsoLabel(row) {
  const epoch = Number(row?.time);
  return Number.isFinite(epoch) && epoch > 0 ? new Date(epoch * 1000).toISOString().slice(0, 10) : String(row?.formattedTime || "");
}

async function fetchGoogleInterest({ keywords, geo, mode, timeframe }) {
  const comparisonItem = keywords.map((keyword) => ({ keyword, geo, time: timeframe }));
  const exploreRequest = { comparisonItem, category: 0, property: mode === "youtube" ? "youtube" : "" };
  const exploreUrl = new URL("https://trends.google.com/trends/api/explore");
  exploreUrl.searchParams.set("hl", "en-US");
  exploreUrl.searchParams.set("tz", "540");
  exploreUrl.searchParams.set("req", JSON.stringify(exploreRequest));
  const exploreResponse = await fetch(exploreUrl.toString(), { headers: { "User-Agent": "Mozilla/5.0 EG Dashboard Trend Search" } });
  if (!exploreResponse.ok) throw new Error(`Google Trends explore failed (${exploreResponse.status})`);
  const explore = parseGooglePayload(await exploreResponse.text());
  const widget = (explore.widgets || []).find((item) => item.id === "TIMESERIES");
  if (!widget?.request || !widget?.token) throw new Error("Google Trends timeline widget was unavailable");

  const timelineUrl = new URL("https://trends.google.com/trends/api/widgetdata/multiline");
  timelineUrl.searchParams.set("hl", "en-US");
  timelineUrl.searchParams.set("tz", "540");
  timelineUrl.searchParams.set("req", JSON.stringify(widget.request));
  timelineUrl.searchParams.set("token", widget.token);
  const timelineResponse = await fetch(timelineUrl.toString(), { headers: { "User-Agent": "Mozilla/5.0 EG Dashboard Trend Search" } });
  if (!timelineResponse.ok) throw new Error(`Google Trends timeline failed (${timelineResponse.status})`);
  const timeline = parseGooglePayload(await timelineResponse.text());
  const rows = timeline?.default?.timelineData || [];
  if (!rows.length) throw new Error("Google Trends returned no timeline observations");

  return {
    id: "live",
    label: `${geo || "GLOBAL"} ${mode === "youtube" ? "YouTube Search" : "Web Search"}`,
    keywords,
    geo,
    mode,
    range: timeframe,
    labels: rows.map(toIsoLabel),
    series: keywords.map((keyword, index) => ({
      key: keyword,
      label: keyword,
      values: rows.map((row) => {
        const value = Number(row?.value?.[index]);
        return Number.isFinite(value) ? value : null;
      }),
    })),
    updatedAt: new Date().toISOString(),
  };
}

export default {
  async fetch(request, env, context) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(origin) });
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed" }, 405, origin);

    const url = new URL(request.url);
    if (url.pathname !== "/api/trends") return jsonResponse({ error: "Not found" }, 404, origin);
    const keywords = normalizeKeywords(url.searchParams.get("q"));
    const geo = String(url.searchParams.get("geo") || "US").toUpperCase();
    const mode = url.searchParams.get("mode") === "youtube" ? "youtube" : "web";
    const timeframe = String(url.searchParams.get("range") || "today 12-m").slice(0, 64);
    if (!keywords.length) return jsonResponse({ error: "At least one keyword is required" }, 400, origin);

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
    try {
      const payload = await fetchGoogleInterest({ keywords, geo, mode, timeframe });
      const response = jsonResponse(payload, 200, origin);
      context.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : "Google Trends request failed" }, 502, origin);
    }
  },
};
