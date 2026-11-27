const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../study/market-scorecard/index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Compile the exported UI without executing browser code.
const literal = script.match(/^const DATA=(.+);$/m)[1];
const markets = JSON.parse(literal.replace(/([,{]\s*)(usq?|kr|cn):(?=\{)/g, '$1"$2":'));
assert.deepEqual(Object.keys(markets).sort(), ["cn", "kr", "us", "usq"]);
assert.doesNotMatch(html, /claudeusercontent|[?&]sk=|<script[^>]+src=/i);

function quadrant(b, p) {
  if (b >= 5) return p >= 5 ? "양방향 우호" : "돌파 추격 우위";
  return p >= 5 ? "눌림목 매수 우위" : "관망 / 포지션 축소";
}

for (const [name, {history, latest, asof}] of Object.entries(markets)) {
  assert.ok(history.length >= 120, name);
  assert.equal(history.at(-1).date, asof);
  for (const [idx, row] of history.entries()) {
    if (idx) assert.ok(history[idx - 1].date < row.date);
    // Stored scores are rounded; the source assigns quadrants before rounding.
    if ([row.s4, row.s6].every(n => Number.isFinite(n) && n !== 5)) {
      assert.equal(row.quad, quadrant(row.s4, row.s6), name + " " + row.date);
    }
  }
  for (const i of [4, 6]) {
    const {hit, avg_ret, score} = latest["e" + i];
    const retScore = Math.max(0, Math.min(10, 5 + 2 * avg_ret));
    assert.ok(Math.abs(hit * 0.06 + retScore * 0.4 - score) < 0.012, name + " " + i);
    assert.equal(score, latest["s" + i]);
  }
  console.log(name, asof, history.length, latest.s4, latest.s6, latest.quad);
}
