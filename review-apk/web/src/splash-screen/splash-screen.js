const FOX_ASSET_ROOT = "/splash-screen/fox-girl";

const FOX_TAIL_FILES = Object.freeze([
  "Based%201.png",
  "Based%202.png",
  "based%203.png"
]);

const FOX_LAYERS = Object.freeze([
  { id: "body", file: "Based%200.png" },
  { id: "ear-one", file: "ear%201.png" },
  { id: "ear-two", file: "ear%202.png" },
  { id: "apple", file: "floating%20blue-apple.png" }
]);

export function renderFoxSplashMarkup() {
  const tailImages = FOX_TAIL_FILES.map((file, index) =>
    `<img class="splash-fox-tail-layer tail-part-${index + 1}" data-splash-fox-tail-part="${index + 1}" src="${FOX_ASSET_ROOT}/${file}" alt="" aria-hidden="true" draggable="false" decoding="async">`
  ).join("");
  const images = FOX_LAYERS.map(({ id, file }) =>
    `<img class="splash-fox-layer splash-fox-${id}" data-splash-fox-layer="${id}" src="${FOX_ASSET_ROOT}/${file}" alt="" aria-hidden="true" draggable="false" decoding="async">`
  ).join("");

  return `
    <div class="splash-character" aria-hidden="true">
      <div class="splash-character-frame">
        <div class="splash-fox-tail-group" data-splash-fox-tail>${tailImages}</div>
        ${images}
      </div>
    </div>`;
}

export function mountFoxSplashMotion(stage, { animate, reducedMotion = () => false } = {}) {
  if (!stage || typeof animate !== "function") return () => {};

  const animations = [];
  const missingHandlers = [];
  const character = stage.querySelector(".splash-character");
  const layout = stage.querySelector(".splash-layout");
  const getLayer = id => stage.querySelector(`[data-splash-fox-layer="${id}"]`);
  const refreshArtVisibility = () => {
    const bodyLayer = getLayer("body");
    const hasBody = Boolean(bodyLayer && !bodyLayer.classList.contains("is-missing"));
    character?.classList.toggle("no-art", !hasBody);
    layout?.classList.toggle("no-fox-art", !hasBody);
  };

  const imageLayers = [
    ...stage.querySelectorAll(".splash-fox-tail-layer"),
    ...stage.querySelectorAll(".splash-fox-layer")
  ];
  for (const image of imageLayers) {
    const markMissing = () => {
      image.classList.add("is-missing");
      refreshArtVisibility();
    };
    image.addEventListener("error", markMissing, { once: true });
    missingHandlers.push([image, markMissing]);
    if (image.complete && image.naturalWidth === 0) markMissing();
  }
  refreshArtVisibility();

  if (!reducedMotion()) {
    const tailOne = stage.querySelector('[data-splash-fox-tail-part="1"]');
    const tailTwo = stage.querySelector('[data-splash-fox-tail-part="2"]');
    const tailThree = stage.querySelector('[data-splash-fox-tail-part="3"]');
    const earOne = getLayer("ear-one");
    const earTwo = getLayer("ear-two");
    const apple = getLayer("apple");

    // Each tail plate has its own pivot and rhythm. The opposing rotations
    // create a soft wave traveling from the tail base to its outer tip.
    if (tailOne) animations.push(animate(tailOne, {
      rotate: [0, -2.8, 1.1, 0],
      translateX: [0, -1.4, 0.7, 0],
      translateY: [0, -1.2, 0.4, 0],
      duration: 4300,
      ease: "inOutSine",
      loop: true
    }));
    if (tailTwo) animations.push(animate(tailTwo, {
      rotate: [0, 2.1, -1.5, 0],
      translateX: [0, 1.2, -0.8, 0],
      translateY: [0, 0.7, -0.9, 0],
      duration: 3650,
      delay: 150,
      ease: "inOutSine",
      loop: true
    }));
    if (tailThree) animations.push(animate(tailThree, {
      rotate: [0, -3.6, 2.7, 0],
      translateX: [0, 1.5, -1.1, 0],
      translateY: [0, -1.8, 1.1, 0],
      duration: 3050,
      delay: 310,
      ease: "inOutSine",
      loop: true
    }));
    if (earOne) animations.push(animate(earOne, {
      rotate: [0, 2.6, 0],
      duration: 2850,
      delay: 180,
      ease: "inOutSine",
      loop: true
    }));
    if (earTwo) animations.push(animate(earTwo, {
      rotate: [0, -2.2, 0],
      duration: 3350,
      delay: 420,
      ease: "inOutSine",
      loop: true
    }));
    if (apple) animations.push(animate(apple, {
      translateY: [0, -5, 0],
      scale: [1, 1.025, 1],
      duration: 2350,
      ease: "inOutSine",
      loop: true
    }));
  }

  return () => {
    animations.forEach(animation => animation?.pause?.());
    missingHandlers.forEach(([image, handler]) => image.removeEventListener("error", handler));
  };
}
