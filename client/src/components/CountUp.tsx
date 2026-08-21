import { useEffect, useRef, useState } from "react";

/**
 * A figure that counts up the first time it is seen.
 *
 * Only the first reveal animates. Afterwards the value snaps, because the
 * numbers that change are the ones the reader is changing — pressing + is a
 * high-frequency action, and watching 431 crawl to 432 would put a delay
 * between the press and the answer. The reveal is the opposite case: it happens
 * once, it is illustrative, and it earns a longer duration.
 *
 * Counting from zero is safe here because the element keeps its final width
 * from the first paint and never animates opacity. If the frame loop stalls the
 * reader sees a number, not an empty box.
 */
const DURATION = 900;
/** Ease-out-expo: nearly all the distance early, then a long settle. */
const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** The app's one separator. Duplicated rather than imported so this component
    stays free of a page-level dependency; see fmt in pages/Home.tsx. */
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

export default function CountUp({ value, className, suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState<number | null>(null);
  const animated = useRef(false);

  useEffect(() => {
    // Every value after the first is shown immediately.
    if (animated.current) { setShown(value); return; }

    const node = host.current;
    const settle = () => { animated.current = true; setShown(value); };

    if (!node || typeof IntersectionObserver === "undefined") { settle(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { settle(); return; }
    // Nothing to count to, and counting to zero reads as broken.
    if (value <= 0) { settle(); return; }

    let frame = 0;
    let start = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      animated.current = true;
      const step = (now: number) => {
        if (!start) start = now;
        const progress = Math.min(1, (now - start) / DURATION);
        setShown(Math.round(ease(progress) * value));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, { rootMargin: "-8% 0px" });

    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);

  // Before the first frame, render the final value so the box is already the
  // right width and a stalled loop still leaves the number readable.
  // The suffix gets its own element so a unit set beside a Playfair numeral can
  // be given the interface sans — see `.figure-unit`.
  return <span ref={host} className={className}>{fmt(shown ?? value)}{suffix && <span className="figure-unit">{suffix}</span>}</span>;
}
