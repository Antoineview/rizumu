const scene = document.querySelector('.scene');
const characters = [...document.querySelectorAll('.character')];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches;
let elapsed = 0;
let previousTime = null;
let frame = null;

// Subpixel spacing and overlapping edges keep the extrusion solid as it turns.
// Matching caps at either end give the front and reverse the same light face.
characters.forEach(character => {
  for (let step = 0; step <= 72; step++) {
    const depth = -18 + step / 4;
    const layer = document.createElement('span');
    layer.className = step === 0 ? 'layer back' : step === 72 ? 'layer front' : 'layer';
    layer.textContent = character.dataset.character;
    layer.style.setProperty('--depth', `${depth}px`);
    character.append(layer);
  }
});

function render() {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  const tilt = -12 * Math.PI / 180;
  characters.forEach((character, index) => {
    const angle = elapsed / 9000 + index * Math.PI * 2 / 3;
    const x = Math.cos(angle) * width * .32;
    const y = Math.sin(angle) * height * .19;
    const tiltedX = x * Math.cos(tilt) - y * Math.sin(tilt);
    const tiltedY = x * Math.sin(tilt) + y * Math.cos(tilt);
    const z = Math.sin(angle) * 120;
    const spin = elapsed / 85 + index * 30 - 20;
    character.style.transform = `translate(-50%, -50%) translate3d(${tiltedX}px, ${tiltedY}px, ${z}px) rotateX(10deg) rotateY(${spin}deg) rotateZ(-8deg)`;
    character.style.zIndex = String(Math.round(z + 150));
  });
}

function tick(time) {
  if (previousTime !== null) elapsed += Math.min(time - previousTime, 64);
  previousTime = time;
  render();
  frame = requestAnimationFrame(tick);
}

function updateMotion() {
  cancelAnimationFrame(frame);
  previousTime = null;
  if (!paused && !document.hidden) frame = requestAnimationFrame(tick);
}

reducedMotion.addEventListener('change', event => { paused = event.matches; updateMotion(); });
document.addEventListener('visibilitychange', updateMotion);
window.addEventListener('resize', render);
render();
updateMotion();
