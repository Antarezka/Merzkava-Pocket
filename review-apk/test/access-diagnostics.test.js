import test from "node:test";
import assert from "node:assert/strict";
import {
  getAccessDiagnostics,
  getDiagnosticWordFrames,
  formatDiagnosticFrame
} from "../web/src/access-diagnostics.js";

test("Player online trace contains 20–50 real diagnostic fragments", () => {
  const trace = getAccessDiagnostics("player");
  assert.ok(trace.entries.length >= 20 && trace.entries.length <= 50);
  assert.equal(trace.entries.length, 40);
  assert.ok(trace.entries.some(item => item.text === "server int"));
  assert.ok(trace.entries.every(item => item.group && item.truncated === true));
});

test("Developer trace stays local and Pocket transition trace stays device-oriented", () => {
  const developer = getAccessDiagnostics("developer");
  const transition = getAccessDiagnostics("transition");
  assert.ok(developer.entries.length >= 20 && developer.entries.length <= 50);
  assert.ok(transition.entries.length >= 20 && transition.entries.length <= 50);
  assert.match(developer.heading, /LOCAL CREDENTIAL/);
  assert.match(transition.heading, /POCKET INITIALIZATION/);
});

test("diagnostic copy reveals one word at a time without completing the final term", () => {
  assert.deepEqual(getDiagnosticWordFrames("server int"), ["server", "server int"]);
  assert.deepEqual(getDiagnosticWordFrames("TLS handsh"), ["TLS", "TLS handsh"]);
  assert.equal(getDiagnosticWordFrames("TLS handsh").at(-1), "TLS handsh");
});

test("delayed diagnostic dots are prefixed in the required one-two-three order", () => {
  assert.equal(formatDiagnosticFrame("server int", 1), ". server int");
  assert.equal(formatDiagnosticFrame("server int", 2), ".. server int");
  assert.equal(formatDiagnosticFrame("server int", 3), "... server int");
  assert.equal(formatDiagnosticFrame("server int", 0), "server int");
});
