import test from "node:test";
import assert from "node:assert/strict";
import { newYorkScheduleParts, workForScheduledTime } from "../src/index.js";

test("uses New York daylight saving time for the daily briefing primary run", () => {
  const scheduledTime = Date.parse("2026-08-31T20:12:00Z");
  assert.deepEqual(newYorkScheduleParts(scheduledTime), { weekday: "Mon", time: "16:12" });
  assert.equal(workForScheduledTime(scheduledTime)?.label, "daily-briefing-primary");
});

test("uses New York standard time for the RS primary run", () => {
  const scheduledTime = Date.parse("2026-12-07T21:27:00Z");
  assert.deepEqual(newYorkScheduleParts(scheduledTime), { weekday: "Mon", time: "16:27" });
  assert.equal(workForScheduledTime(scheduledTime)?.label, "market-rs-primary");
});

test("does not run workflows on New York weekends", () => {
  const scheduledTime = Date.parse("2026-09-05T20:12:00Z");
  assert.equal(workForScheduledTime(scheduledTime), null);
});
