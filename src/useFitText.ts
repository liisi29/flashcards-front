import { useLayoutEffect, useRef } from "react";

/** Shrink an element's font-size until its content fits inside `container`.
    Starts from the size CSS gives it (the ceiling) and steps down to
    `minPx`. Re-runs when `deps` change and on container resize. */
export function useFitText<T extends HTMLElement, C extends HTMLElement>(
  minPx = 14,
  deps: unknown[] = []
) {
  const ref = useRef<T>(null);
  const containerRef = useRef<C>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const box = containerRef.current;
    if (!el || !box) return;

    const fit = () => {
      // the container can be transiently 0×0 before a flex/aspect-ratio
      // layout settles (e.g. right after a shape toggle or on first
      // mount) — fitting against that would shrink text all the way to
      // minPx and never recover, since nothing else re-triggers a fit.
      // Skip this run; the ResizeObserver below re-fires once the box
      // has a real size.
      if (box.clientHeight === 0 || box.clientWidth === 0) return;

      // Landscape cards want a genuinely fixed text size (set in CSS),
      // never auto-shrunk — clear any leftover inline size from a
      // previous fit and stop; don't measure/shrink at all.
      if (box.closest(".shape-landscape")) {
        el.style.fontSize = "";
        return;
      }

      // start from the CSS ceiling
      el.style.fontSize = "";
      const ceiling = parseFloat(getComputedStyle(el).fontSize) || 32;
      let size = ceiling;
      el.style.fontSize = size + "px";

      const overflows = () =>
        el.scrollHeight > box.clientHeight || el.scrollWidth > box.clientWidth;

      // quick step-down; good enough and cheap
      let guard = 40;
      while (overflows() && size > minPx && guard-- > 0) {
        size = Math.max(minPx, size - Math.max(1, size * 0.06));
        el.style.fontSize = size + "px";
      }
    };

    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, deps);

  return { ref, containerRef };
}
