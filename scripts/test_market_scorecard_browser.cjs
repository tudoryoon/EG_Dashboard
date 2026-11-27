// Run against a local dashboard server or the deployed Pages URL.
const {chromium} = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");
const path = require("node:path");
const url = process.argv[2] || "http://dashboard.test/#/screening/market-scorecard";
(async () => {
  const browser = await chromium.launch({channel: process.env.CHROME_CHANNEL || "chrome"});
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({viewport: {width, height: 900}});
      const errors = [];
      page.on("pageerror", err => errors.push(err.message));
      if (!process.argv[2]) await page.route("http://dashboard.test/**", async route => {
        const name = decodeURIComponent(new URL(route.request().url()).pathname.slice(1)) || "index.html";
        const root = path.resolve(__dirname, "..");
        const file = path.resolve(root, name);
        if (!file.startsWith(root + path.sep)) return route.abort();
        try {
          await route.fulfill({path: file, ...(name.endsWith(".mjs") ? {contentType:"text/javascript"} : {})});
        } catch { await route.fulfill({status:404, body:"Not found"}); }
      });
      await page.goto(url, {waitUntil: "domcontentloaded"});
      const tabs = page.getByRole("tablist", {name: "시장"}).getByRole("tab");
      await tabs.first().waitFor({timeout: 60000});
      assert.equal(await tabs.count(), 3);
      for (const [i, key] of ["us", "usq", "sox"].entries()) {
        await tabs.nth(i).click();
        const plot = page.locator("#" + key + "_quad");
        assert.ok(await plot.isVisible());
        assert.ok(await plot.locator("circle").count() > 10);
        const bb = await plot.boundingBox(), cmp = await page.locator("#cmp").boundingBox();
        assert.ok(bb.y + bb.height <= cmp.y && bb.width > 200);
        await page.locator("#" + key + "_strategy summary").click();
        assert.ok(await page.locator("#" + key + "_periods tbody tr").count() >= 1);
      }
      assert.ok(await page.locator("#cmp").evaluate(el => !/과창판|KRX/.test(el.textContent)));
      assert.ok(await page.locator(".wrap").filter({has: tabs.first()}).evaluate(el => el.scrollWidth <= el.clientWidth + 2));
      assert.deepEqual(errors, []);
      console.log(width + "px: 3 US markets, historical intervals visible, no overflow");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => {console.error(e); process.exitCode = 1;});
