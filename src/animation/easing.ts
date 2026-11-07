/** Maps linear progress `t` (0–1) to eased progress. Mirrors LVGL's `lv_anim_path_*` callbacks. */
export type EasingFunction = (t: number) => number;

export type EasingName =
  'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'overshoot' | 'bounce' | 'step';

/** CSS-style `cubic-bezier(x1, y1, x2, y2)` easing, solved by bisection on x. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  // One axis of the Bezier curve: control points 0, p1, p2, 1.
  const axis = (p1: number, p2: number, u: number): number =>
    3 * p1 * u * (1 - u) ** 2 + 3 * p2 * u * u * (1 - u) + u ** 3;

  return (t: number): number => {
    if (t <= 0) {
      return 0;
    }
    if (t >= 1) {
      return 1;
    }
    let low = 0;
    let high = 1;
    let u = t;
    for (let i = 0; i < 24; i += 1) {
      u = (low + high) / 2;
      const x = axis(x1, x2, u);
      if (x < t) {
        low = u;
      } else {
        high = u;
      }
    }
    return axis(y1, y2, u);
  };
}

function bounceOut(t: number): number {
  const n = 7.5625;
  const d = 2.75;
  if (t < 1 / d) {
    return n * t * t;
  }
  if (t < 2 / d) {
    const u = t - 1.5 / d;
    return n * u * u + 0.75;
  }
  if (t < 2.5 / d) {
    const u = t - 2.25 / d;
    return n * u * u + 0.9375;
  }
  const u = t - 2.625 / d;
  return n * u * u + 0.984375;
}

export const easings: Readonly<Record<EasingName, EasingFunction>> = {
  linear: (t) => t,
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1),
  overshoot: cubicBezier(0.34, 1.56, 0.64, 1),
  bounce: bounceOut,
  step: (t) => (t >= 1 ? 1 : 0),
};
