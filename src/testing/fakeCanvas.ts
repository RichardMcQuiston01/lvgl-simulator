import { vi } from 'vitest';

type PointerHandler = (event: PointerEvent) => void;

export interface FakeCanvas extends HTMLCanvasElement {
  /** Invokes every listener registered for `type` with a synthetic event. */
  dispatch(type: string, event: Partial<PointerEvent>): void;
}

/**
 * A minimal fake `HTMLCanvasElement` for interaction-controller tests.
 * jsdom doesn't implement `setPointerCapture`/`releasePointerCapture` (see
 * InteractionController.ts, which guards those calls for exactly this
 * reason), so testing through a real jsdom canvas can't exercise that
 * path — this fake can, via `withPointerCapture`.
 */
export function createFakeCanvas(
  options: { readonly withPointerCapture?: boolean } = {},
): FakeCanvas {
  const listeners = new Map<string, Set<PointerHandler>>();

  const canvas: Partial<FakeCanvas> = {
    addEventListener: vi.fn(((type: string, handler: EventListener) => {
      let set = listeners.get(type);
      if (!set) {
        set = new Set();
        listeners.set(type, set);
      }
      set.add(handler as PointerHandler);
    }) as typeof canvas.addEventListener),
    removeEventListener: vi.fn(((type: string, handler: EventListener) => {
      listeners.get(type)?.delete(handler as PointerHandler);
    }) as typeof canvas.removeEventListener),
    dispatch(type: string, event: Partial<PointerEvent>): void {
      for (const handler of listeners.get(type) ?? []) {
        handler(event as PointerEvent);
      }
    },
  };

  if (options.withPointerCapture ?? true) {
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
  }

  return canvas as FakeCanvas;
}
