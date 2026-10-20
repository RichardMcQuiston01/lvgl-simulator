import type { LvObject } from '../core/LvObject.js';

/** Options for {@link createNavigator}. */
export interface NavigatorOptions {
  /**
   * Maximum number of `push()`es allowed on top of the initial view (the
   * initial view itself is depth `0`). `push()` throws once reached. LVGL
   * has no equivalent limit — this exists for embedded-style UIs that want
   * to bound how deep navigation can go. Default: unlimited.
   */
  readonly maxDepth?: number;
}

/**
 * Manages which view is mounted under a screen, plus a back-stack so a
 * "Back" button can return to whatever was showing before. Mirrors LVGL's
 * `lv_screen_load()` (swapping the active screen), with the back-stack
 * added on top since LVGL itself has no built-in navigation history.
 */
export interface Navigator {
  /** The currently mounted view (top of the stack). */
  readonly current: LvObject;
  /** How many `push()`es above the initial view are currently on the stack. */
  readonly depth: number;
  /** Whether `pop()` would do anything (`false` at the initial view). */
  readonly canPop: boolean;
  /**
   * Detaches the current view from the screen, mounts `view` in its place,
   * and pushes the current view onto the back-stack so `pop()` can return
   * to it. Throws if this would exceed `maxDepth`.
   */
  push(view: LvObject): void;
  /**
   * Detaches the current view and remounts whatever was on top of the
   * back-stack. No-op if already at the initial view (`depth === 0`).
   */
  pop(): void;
}

/**
 * Creates a {@link Navigator} that owns `screen`'s children: it removes
 * whatever `screen` already has and mounts `initialView`, then swaps that
 * single child on every `push`/`pop`. `render` is called after every swap
 * so the canvas reflects the new view immediately — pass
 * `simulator.renderOnce` (or `simulator.start`'s render loop already
 * covers it, so `() => {}` works too if the loop is running).
 */
export function createNavigator(
  screen: LvObject,
  initialView: LvObject,
  render: () => void,
  options: NavigatorOptions = {},
): Navigator {
  const { maxDepth = Infinity } = options;
  const stack: LvObject[] = [initialView];

  function mount(view: LvObject): void {
    for (const child of [...screen.children]) {
      screen.removeChild(child);
    }
    screen.addChild(view);
  }

  mount(initialView);

  return {
    get current(): LvObject {
      return stack[stack.length - 1] as LvObject;
    },
    get depth(): number {
      return stack.length - 1;
    },
    get canPop(): boolean {
      return stack.length > 1;
    },
    push(view: LvObject): void {
      const depth = stack.length - 1;
      if (depth >= maxDepth) {
        throw new Error(
          `Navigator.push() would exceed maxDepth (${maxDepth}) — already at depth ${depth}.`,
        );
      }
      stack.push(view);
      mount(view);
      render();
    },
    pop(): void {
      if (stack.length <= 1) {
        return;
      }
      stack.pop();
      mount(stack[stack.length - 1] as LvObject);
      render();
    },
  };
}
