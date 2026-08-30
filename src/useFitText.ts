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
