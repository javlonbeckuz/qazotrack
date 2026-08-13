/**
 * Scrolling that actually happens.
 *
 * Every navigation control used `scrollIntoView({ behavior: "smooth" })`, and on
 * at least one real browser that is a no-op: the instant form moves the page
 * and the smooth form does nothing at all, with reduced-motion off. The buttons
 * looked broken because nothing moved.
 *
 * So the animation is run here instead of asked for. It is a few lines, it
 * behaves the same everywhere, and it cannot silently do nothing — the final
 * frame sets the exact target whatever happened in between.
 */

const DURATION = 520;
/** Ease-out-quart: most of the distance early, then a calm landing. */
const ease = (t: number) => 1 - Math.pow(1 - t, 4);

let running = 0;

/**
 * Moves the page immediately.
 *
 * `behavior: "instant"` is not optional here. A CSS `scroll-behavior: smooth`
 * on the root applies to every programmatic scroll — including each frame of
 * this animation — so without it the browser tries to smooth-scroll to each
 * intermediate step and the whole thing crawls or stalls.
 */
const jump = (top: number) => window.scrollTo({ top, left: 0, behavior: "instant" });

/** Scrolls the page so `element` sits `offset` pixels below the top. */
export function scrollToElement(element: Element | null, offset = 18) {
  if (!element) return;

  const start = window.scrollY;
  const target = Math.max(0, Math.round(element.getBoundingClientRect().top + start - offset));
  if (Math.abs(target - start) < 2) return;

  // A second press mid-flight retargets rather than fighting the first.
  if (running) cancelAnimationFrame(running);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    jump(target);
    return;
  }

  let began = 0;
  const step = (now: number) => {
    if (!began) began = now;
    const progress = Math.min(1, (now - began) / DURATION);
    jump(Math.round(start + (target - start) * ease(progress)));
    if (progress < 1) running = requestAnimationFrame(step);
    else { running = 0; window.clearTimeout(guarantee); }
  };
  running = requestAnimationFrame(step);

  // Arrival is not left to the animation. A background tab throttles
  // requestAnimationFrame to nothing, and a page that never scrolls is a button
  // that looks broken — the whole fault this file exists to fix. Timers keep
  // running when frames do not, so this lands the page whatever happened.
  const guarantee = window.setTimeout(() => {
    if (running) { cancelAnimationFrame(running); running = 0; }
    if (Math.abs(window.scrollY - target) > 2) jump(target);
  }, DURATION + 140);
}

/** Convenience for the anchors the page navigates between. */
export function scrollToId(id: string, offset?: number) {
  scrollToElement(document.getElementById(id), offset);
}
