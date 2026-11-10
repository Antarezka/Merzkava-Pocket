import test from "node:test";
import assert from "node:assert/strict";
import { renderFoxSplashMarkup, mountFoxSplashMotion } from "../web/src/splash-screen/splash-screen.js";

function mockImage() {
  const listeners = new Map();
  const classes = new Set();
  return {
    complete: true,
    naturalWidth: 32,
    listeners,
    classList: {
      add: value => classes.add(value),
      contains: value => classes.has(value),
      toggle: (value, force) => force ? classes.add(value) : classes.delete(value)
    },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name, callback) => {
      if (listeners.get(name) === callback) listeners.delete(name);
    }
  };
}

function makeSplashStage() {
  const tailParts = [mockImage(), mockImage(), mockImage()];
  const body = mockImage();
  const earOne = mockImage();
  const earTwo = mockImage();
  const apple = mockImage();
  const characterClasses = new Set();
  const layoutClasses = new Set();
  const character = { classList: { toggle: (name, value) => value ? characterClasses.add(name) : characterClasses.delete(name) } };
  const layout = { classList: { toggle: (name, value) => value ? layoutClasses.add(name) : layoutClasses.delete(name) } };
  const layers = { body, "ear-one": earOne, "ear-two": earTwo, apple };
  return {
    tailParts, body, earOne, earTwo, apple, characterClasses, layoutClasses,
    querySelector(selector) {
      if (selector === ".splash-character") return character;
      if (selector === ".splash-layout") return layout;
      if (selector === '[data-splash-fox-tail-part="1"]') return tailParts[0];
      if (selector === '[data-splash-fox-tail-part="2"]') return tailParts[1];
      if (selector === '[data-splash-fox-tail-part="3"]') return tailParts[2];
      const prefix = '[data-splash-fox-layer="';
      return selector.startsWith(prefix) && selector.endsWith('"]')
        ? layers[selector.slice(prefix.length, -2)]
        : null;
    },
    querySelectorAll(selector) {
      if (selector === ".splash-fox-tail-layer") return tailParts;
      if (selector === ".splash-fox-layer") return [body, earOne, earTwo, apple];
      return [];
    }
  };
}

test("fox splash markup references every uploaded transparent layer", () => {
  const markup = renderFoxSplashMarkup();
  for (const name of [
    "Based%200.png", "Based%201.png", "Based%202.png", "based%203.png",
    "ear%201.png", "ear%202.png", "floating%20blue-apple.png"
  ]) {
    assert.ok(markup.includes(name), `missing splash asset ${name}`);
  }
});

test("all three fox tail plates receive different animation directions and rhythms", () => {
  const stage = makeSplashStage();
  const calls = [];
  const animate = (target, options) => {
    calls.push({ target, options });
    return { pause() {} };
  };

  const dispose = mountFoxSplashMotion(stage, { animate, reducedMotion: () => false });
  const tailCalls = stage.tailParts.map(target => calls.find(call => call.target === target));

  assert.equal(tailCalls.every(Boolean), true, "each tail plate gets an animation");
  assert.deepEqual(tailCalls.map(call => call.options.duration), [4300, 3650, 3050]);
  assert.deepEqual(tailCalls.map(call => call.options.delay ?? 0), [0, 150, 310]);
  assert.deepEqual(tailCalls.map(call => call.options.rotate), [
    [0, -2.8, 1.1, 0],
    [0, 2.1, -1.5, 0],
    [0, -3.6, 2.7, 0]
  ]);
  assert.equal(new Set(tailCalls.map(call => call.target)).size, 3);
  assert.equal(calls.some(call => call.target === stage), false);
  assert.equal(calls.length, 6, "two ears and the apple also move independently");
  dispose();
});

test("reduced-motion preference keeps the uploaded character still", () => {
  const stage = makeSplashStage();
  let calls = 0;
  const dispose = mountFoxSplashMotion(stage, {
    animate: () => { calls += 1; return { pause() {} }; },
    reducedMotion: () => true
  });

  assert.equal(calls, 0);
  assert.equal(stage.characterClasses.has("no-art"), false);
  assert.equal(stage.layoutClasses.has("no-fox-art"), false);
  dispose();
});
