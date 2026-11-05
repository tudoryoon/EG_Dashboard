import test from "node:test";
import assert from "node:assert/strict";
import worker, { newYorkScheduleParts, workForScheduledTime } from "../src/index.js";

test("uses New York daylight saving time for the daily briefing primary run", () => {
  const scheduledTime = Date.parse("2026-08-31T20:42:00Z");
  assert.deepEqual(newYorkScheduleParts(scheduledTime), { weekday: "Mon", time: "16:42" });
  assert.equal(workForScheduledTime(scheduledTime)?.label, "daily-briefing-primary");
});

test("uses New York standard time for the RS primary run", () => {
  const scheduledTime = Date.parse("2026-12-07T21:57:00Z");
  assert.deepEqual(newYorkScheduleParts(scheduledTime), { weekday: "Mon", time: "16:57" });
  assert.equal(workForScheduledTime(scheduledTime)?.label, "market-rs-primary");
});

test("dispatches both retries 30 minutes later", () => {
  assert.equal(workForScheduledTime(Date.parse("2026-08-31T21:12:00Z"))?.label, "daily-briefing-freshness-retry");
  assert.equal(workForScheduledTime(Date.parse("2026-12-07T22:25:00Z"))?.label, "market-rs-freshness-retry");
});

test("does not dispatch at the former market-close times", () => {
  for (const time of ["20:12", "20:27", "20:55"]) {
    assert.equal(workForScheduledTime(Date.parse(`2026-08-31T${time}:00Z`)), null);
  }
});

test("does not run workflows on New York weekends", () => {
  const scheduledTime = Date.parse("2026-09-05T20:42:00Z");
  assert.equal(workForScheduledTime(scheduledTime), null);
});

test("DRAM follows fixed 12:28 KST including weekends and both US DST seasons", () => {
  for (const day of ["2026-08-31", "2026-11-05", "2026-11-07", "2026-12-07"]) {
    const work = workForScheduledTime(Date.parse(`${day}T03:28:00Z`));
    assert.equal(work?.workflow, "update-dram-spot.yml");
    assert.deepEqual(work?.inputs, {dispatch_source:"cloudflare"});
    assert.equal(workForScheduledTime(Date.parse(`${day}T03:27:00Z`)), null);
  }
});

test("DRAM dispatch sends only inputs supported by its dedicated workflow", async (t) => {
  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = {url, body: JSON.parse(options.body)};
    return {ok:true};
  });
  const pending = [];
  await worker.scheduled({scheduledTime:Date.parse("2026-11-05T03:28:00Z")},
    {GH_ACTIONS_TOKEN:"test-token"}, {waitUntil:promise => pending.push(promise)});
  await Promise.all(pending);
  assert.match(request.url, /workflows\/update-dram-spot.yml\/dispatches$/);
  assert.deepEqual(request.body, {ref:"main",inputs:{dispatch_source:"cloudflare"}});
});
