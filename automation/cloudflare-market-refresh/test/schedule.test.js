import test from "node:test";
import assert from "node:assert/strict";
import { newYorkScheduleParts, workForScheduledTime } from "../src/index.js";

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
