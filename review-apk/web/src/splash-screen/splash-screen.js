const FOX_ASSET_ROOT = "/splash-screen/fox-girl";

const FOX_LAYERS = Object.freeze([
  { id: "tail", file: "base-1.png" },
  { id: "body", file: "base-0.png" },
  { id: "ear-one", file: "ear-1.png" },
  { id: "ear-two", file: "ear-2.png" },
  { id: "apple", file: "apple.png" }
]);

export function renderFoxSplashMarkup() {
  const images = FOX_LAYERS.map(({ id, file }) =>
    `<img class="splash-fox-layer splash-fox-${id}" data-splash-fox-layer="${id}" src="${FOX_ASSET_ROOT}/${file}" alt="" aria-hidden="true" draggable="false" decoding="async">`
  ).join("");

  return `
    <div class="splash-character" aria-hidden="true">
      <div class="splash-character-frame">${images}</div>
    </div>`;
}

export function mountFoxSplashMotion(stage, { animate, reducedMotion = () => false } = {}) {
  if (!stage || typeof animate !== "function") return () => {};

  const animations = [];
  const missingHandlers = [];
  const character = stage.querySelector(".splash-character");
  const getLayer = id => stage.querySelector(`[data-splash-fox-layer="${id}"]`);
  const refreshArtVisibility = () => {
    const visibleLayer = stage.querySelector(".splash-fox-layer:not(.is-missing)");
    character?.classList.toggle("no-art", !visibleLayer);
  };

  for (const { id } of FOX_LAYERS) {
    const image = getLayer(id);
    if (!image) continue;
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
    const tail = getLayer("tail");
    const earOne = getLayer("ear-one");
    const earTwo = getLayer("ear-two");
    const apple = getLayer("apple");

    if (tail) animations.push(animate(tail, {
      rotate: [-1.2, 2.1, -1.2],
      duration: 3400,
      ease: "inOutSine",
      loop: true
    }));
    if (earOne) animations.push(animate(earOne, {
      rotate: [0, 2.8, 0],
      duration: 2900,
      delay: 220,
      ease: "inOutSine",
      loop: true
    }));
    if (earTwo) animations.push(animate(earTwo, {
      rotate: [0, -2.1, 0],
      duration: 3600,
      delay: 460,
      ease: "inOutSine",
      loop: true
    }));
    if (apple) animations.push(animate(apple, {
      translateY: [0, -6, 0],
      scale: [1, 1.025, 1],
      duration: 2300,
      ease: "inOutSine",
      loop: true
    }));
  }

  return () => {
    animations.forEach(animation => animation?.pause?.());
    missingHandlers.forEach(([image, handler]) => image.removeEventListener("error", handler));
  };
}
