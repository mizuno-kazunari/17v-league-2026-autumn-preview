// Runs js/main.js against a tiny fake DOM to check resumed / paused countdown states.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const full = fs.readFileSync(new URL("../js/main.js", import.meta.url), "utf8");
// Only the countdown block (from the Countdowns comment up to the Results section)
const src = full.slice(full.indexOf("  // Countdowns:"), full.indexOf("  // —— Results"));
if (!src.includes("tickAll")) throw new Error("countdown block not found");

function el() { return { hidden: false, textContent: "", innerHTML: "", classList: { add(){}, remove(){} }, getAttribute(){ return null; }, querySelector(){ return null; }, querySelectorAll(){ return []; }, insertAdjacentHTML(){} }; }
function makeRoot(mode) {
  const parts = { "[data-cd-grid]": el(), "[data-cd-done]": el(), ".cd__label": el(), ".cd__sub": el(), "[data-cd-sub]": el() };
  for (const k of ["days","hours","mins","secs"]) parts[`[data-cd="${k}"]`] = el();
  parts["[data-cd-done]"].hidden = true;
  const live = new Set();
  return { parts, live, getAttribute: (n) => n === "data-countdown" ? mode : null,
    querySelector: (q) => parts[q] || null,
    classList: { add: (c) => live.add(c), remove: (c) => live.delete(c) } };
}

function run(code, nowIso) {
  const roots = [makeRoot("kickoff"), makeRoot("next-match")];
  const intervals = [];
  const doc = { querySelectorAll: (q) => q === "[data-countdown]" ? roots : [], querySelector: () => null, addEventListener(){} };
  const RealDate = Date;
  let now = RealDate.parse(nowIso);
  class FakeDate extends RealDate { constructor(...a){ super(...(a.length ? a : [now])); } static now(){ return now; } }
  const ctx = { document: doc, window: { addEventListener(){}, scrollY: 0, innerHeight: 800 }, Date: FakeDate, Intl, setInterval: (f) => intervals.push(f), fetch: () => new Promise(() => {}), IntersectionObserver: class { observe(){} }, console };
  ctx.window.document = doc;
  vm.runInNewContext(code, ctx);
  return { roots, advance(iso){ now = RealDate.parse(iso); intervals.forEach(f => f()); } };
}

const expectPaused = (roots) => {
  for (const r of roots) {
    assert.equal(r.parts["[data-cd-done]"].textContent, "一時休止中");
    assert.equal(r.parts["[data-cd-done]"].hidden, false);
    assert.equal(r.parts["[data-cd-grid]"].hidden, true);
    assert.equal(r.parts[".cd__label"].hidden, true);
    assert.equal(r.parts[".cd__sub"].hidden, true);
  }
};

assert.match(src, /var LEAGUE_PAUSED = false;/);

const resumed = run(src, "2026-11-26T17:00:00+09:00");
const [kick, next] = resumed.roots;
assert.equal(kick.parts["[data-cd-done]"].textContent, "リーグ期間中");
assert.equal(kick.parts["[data-cd-done]"].hidden, false);
assert.equal(next.parts["[data-cd-grid]"].hidden, false);
assert.equal(next.parts["[data-cd-done]"].hidden, true);
assert.match(next.parts["[data-cd-sub]"].textContent || next.parts[".cd__sub"].textContent, /12月6日/);
console.log("PASS resumed: kickoff リーグ期間中, next-match counts down to Dec 6");

resumed.advance("2026-11-27T21:00:00+09:00");
assert.equal(next.parts["[data-cd-done]"].textContent !== "対局中" || next.parts["[data-cd-grid]"].hidden === false, true);
assert.equal(next.parts["[data-cd-grid]"].hidden, false);
console.log("PASS resumed: Nov 27 off day is not 対局中");

resumed.advance("2026-12-06T20:59:59+09:00");
assert.equal(next.parts["[data-cd-grid]"].hidden, false);
assert.equal(next.parts['[data-cd="secs"]'].textContent, "01");
console.log("PASS resumed: 1s before Dec 6 21:00 still countdown");

resumed.advance("2026-12-06T21:00:00+09:00");
assert.equal(next.parts["[data-cd-done]"].textContent, "対局中");
console.log("PASS resumed: Dec 6 21:00 → 対局中");

resumed.advance("2026-12-07T00:00:00+09:00");
assert.equal(next.parts["[data-cd-grid]"].hidden, false);
console.log("PASS resumed: midnight after Dec 6 → next countdown");

const pausedSrc = src.replace("var LEAGUE_PAUSED = false;", "var LEAGUE_PAUSED = true;");
const p = run(pausedSrc, "2026-11-08T01:55:00+09:00");
expectPaused(p.roots);
console.log("PASS paused flag still locks both to 一時休止中");
for (const t of ["2026-11-15T20:59:59+09:00","2026-12-06T21:00:00+09:00","2026-12-06T23:59:59+09:00","2026-12-07T00:00:00+09:00","2027-02-01T00:00:00+09:00"]) {
  p.advance(t); expectPaused(p.roots); console.log("PASS paused stays at", t);
}

console.log("\nAll pause/resume tests passed.");
