import { useEffect, useRef, useState } from 'react';
import { motionReduced as reducedMotion } from '../settings';

/** Zählt eine Zahl sanft vom vorherigen (oder Start-)Wert zum Zielwert hoch. */
export function useCountUp(target: number, { from, duration = 900, decimals = 0 }: { from?: number; duration?: number; decimals?: number } = {}) {
  const prev = useRef(from ?? target);
  const [value, setValue] = useState(from ?? target);
  useEffect(() => {
    const start = prev.current;
    prev.current = target;
    if (start === target || reducedMotion()) {
      setValue(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - (1 - k) ** 3;
      setValue(start + (target - start) * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}
