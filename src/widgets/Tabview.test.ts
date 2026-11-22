import { describe, expect, it, vi } from 'vitest';
import { createAnimationEngine } from '../animation/Animation.js';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Label } from './Label.js';
import { Tabview, type TabviewOptions } from './Tabview.js';

function tabview(options: Partial<TabviewOptions> = {}): Tabview {
  return new Tabview({ width: 300, height: 200, tabs: ['One', 'Two', 'Three'], ...options });
}

/** Presses, releases and clicks the point `(x, y)` on the tab bar, the way the interaction controller does. */
function tapTab(target: Tabview, x: number, y: number): void {
  target.dispatchEvent('pressed');
  target.handlePointerPosition(x, y);
  target.dispatchEvent('released');
  target.dispatchEvent('clicked');
}

describe('Tabview pages', () => {
  it('makes a page for each tab, each as big as the page area, side by side', () => {
    const view = tabview();
    expect(view.tabCount).toBe(3);
    expect(view.names).toEqual(['One', 'Two', 'Three']);
    expect(view.pages.map((page) => [page.x, page.width, page.height])).toEqual([
      [0, 300, 160],
      [300, 300, 160],
      [600, 300, 160],
    ]);
  });

  it('adds a page with addTab and returns it to fill', () => {
    const view = tabview({ tabs: [] });
    const page = view.addTab('Only');
    page.addChild(new Label({ width: 50, height: 20, text: 'Hello' }));
    expect(view.tabCount).toBe(1);
    expect(view.pages[0]).toBe(page);
  });

  it('puts the pages under a top bar and over a bottom bar', () => {
    const top = tabview();
    top.render(createFakeCanvasContext());
    expect(top.pages[0]?.getAbsolutePosition()).toEqual({ x: 0, y: 40 });
    const bottom = tabview({ tabPosition: 'bottom' });
    bottom.render(createFakeCanvasContext());
    expect(bottom.pages[0]?.getAbsolutePosition()).toEqual({ x: 0, y: 0 });
    expect(bottom.pages[0]?.height).toBe(160);
  });

  it('puts the pages beside a side bar, which is wider by default', () => {
    const left = tabview({ tabPosition: 'left' });
    left.render(createFakeCanvasContext());
    expect(left.pages[0]?.getAbsolutePosition()).toEqual({ x: 90, y: 0 });
    expect(left.pages[0]?.width).toBe(210);
    const right = tabview({ tabPosition: 'right', tabBarSize: 60 });
    right.render(createFakeCanvasContext());
    expect(right.pages[0]?.width).toBe(240);
  });

  it('follows the view when it is resized', () => {
    const view = tabview();
    view.width = 200;
    view.height = 120;
    view.render(createFakeCanvasContext());
    expect(view.pages.map((page) => page.x)).toEqual([0, 200, 400]);
    expect(view.pages[0]?.height).toBe(80);
  });
});

describe('Tabview switching', () => {
  it('starts on the first tab', () => {
    expect(tabview().activeIndex).toBe(0);
  });

  it('switches with setActive, scrolling the pages and firing valueChanged once', () => {
    const view = tabview();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.setActive(2);
    view.setActive(2);
    expect(view.activeIndex).toBe(2);
    expect(view.displayedIndex).toBe(2);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps setActive within the tabs and ignores an empty view', () => {
    const view = tabview();
    view.setActive(99);
    expect(view.activeIndex).toBe(2);
    view.setActive(-5);
    expect(view.activeIndex).toBe(0);
    expect(() => tabview({ tabs: [] }).setActive(1)).not.toThrow();
  });

  it('keeps the active page in view across a relayout', () => {
    const view = tabview();
    view.setActive(1);
    view.width = 200;
    view.render(createFakeCanvasContext());
    expect(view.displayedIndex).toBe(1);
  });

  it('switches when a tab is clicked', () => {
    const view = tabview();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    // Three tabs share a 300px bar, so the second is x 100-200.
    tapTab(view, 150, 20);
    expect(view.activeIndex).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('ignores a click that is not on a tab', () => {
    const view = tabview();
    view.dispatchEvent('pressed');
    view.handlePointerPosition(150, 100);
    view.dispatchEvent('released');
    view.dispatchEvent('clicked');
    expect(view.activeIndex).toBe(0);
  });

  it('clicks the right tab on a side bar', () => {
    const view = tabview({ tabPosition: 'left' });
    // Three tabs stack down a 200px bar: the third is y 133-200.
    tapTab(view, 40, 180);
    expect(view.activeIndex).toBe(2);
  });

  it('switches with the arrow keys', () => {
    const view = tabview();
    view.dispatchEvent('key', { key: 'ArrowRight' });
    view.dispatchEvent('key', { key: 'ArrowRight' });
    view.dispatchEvent('key', { key: 'ArrowLeft' });
    view.dispatchEvent('key', { key: 'x' });
    expect(view.activeIndex).toBe(1);
  });

  it('commits the page a swipe settles on when the scroll ends', () => {
    const view = tabview();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    const scroller = view.children[0];
    if (!scroller) {
      throw new Error('missing scroller');
    }
    // The interaction controller marks the scroller as scrolling while a drag is in progress.
    scroller.scrolling = true;
    scroller.scrollTo(310, 0);
    expect(view.activeIndex).toBe(0);
    expect(view.displayedIndex).toBe(1);
    scroller.scrolling = false;
    scroller.dispatchEvent('scrollEnd');
    expect(view.activeIndex).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('eases to the page with an animation engine, reporting once it arrives', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const view = tabview({ animations });
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    view.setActive(1, true);
    expect(view.activeIndex).toBe(0);
    now = 100;
    animations.tick(now);
    const scroller = view.children[0];
    expect(scroller?.scrollX).toBeGreaterThan(0);
    expect(scroller?.scrollX).toBeLessThan(300);
    expect(listener).not.toHaveBeenCalled();
    now = 1000;
    animations.tick(now);
    expect(scroller?.scrollX).toBe(300);
    expect(view.activeIndex).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('Tabview input routing', () => {
  it('hits a page below the bar and the tab view itself on the bar', () => {
    const view = tabview();
    view.render(createFakeCanvasContext());
    expect(hitTest(view, 150, 100)).toBe(view.pages[0]);
    expect(hitTest(view, 150, 20)).toBe(view);
  });

  it('lets a page scroll vertically on its own when its content is taller', () => {
    const view = tabview();
    const page = view.pages[0];
    page?.addChild(new Label({ x: 0, y: 0, width: 100, height: 400, text: 'tall' }));
    view.render(createFakeCanvasContext());
    expect(page?.isScrollable).toBe(true);
    expect(page?.scrollBy(0, 50)).toBe(true);
    expect(page?.scrollBy(50, 0)).toBe(false);
  });
});

describe('Tabview painting', () => {
  it('paints the tab names and the active page contents', () => {
    const view = tabview();
    view.pages[0]?.addChild(new Label({ x: 5, y: 5, width: 100, height: 20, text: 'First page' }));
    const context = createFakeCanvasContext();
    view.render(context);
    const painted = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(painted).toEqual(expect.arrayContaining(['One', 'Two', 'Three', 'First page']));
  });

  it('colors the active tab with the theme primary color', () => {
    const view = tabview();
    view.setActive(1);
    const colors: Record<string, string> = {};
    const context = createFakeCanvasContext();
    vi.mocked(context.fillText).mockImplementation((text) => {
      colors[text] = String(context.fillStyle);
    });
    view.render(context);
    expect(colors.Two).toBe(defaultTheme.primaryColor);
    expect(colors.One).not.toBe(defaultTheme.primaryColor);
  });

  it('puts the indicator under the active tab and slides it while the pages scroll', () => {
    const view = tabview();
    // Three tabs share a 300px bar, so each is 100 wide; the mark is 3px tall on the bar's lower edge.
    expect(view.indicatorBounds).toEqual({ x: 0, y: 37, width: 100, height: 3 });
    const scroller = view.children[0];
    if (scroller) {
      scroller.scrolling = true;
    }
    scroller?.scrollTo(150, 0);
    // Halfway through the 300px page, halfway between the first and second tab.
    expect(view.indicatorBounds).toEqual({ x: 50, y: 37, width: 100, height: 3 });
    view.setActive(2);
    expect(view.indicatorBounds).toEqual({ x: 200, y: 37, width: 100, height: 3 });
  });

  it('puts the indicator on the edge facing the pages for a left bar', () => {
    const view = tabview({ tabPosition: 'left' });
    view.setActive(1);
    expect(view.indicatorBounds?.x).toBe(87);
    expect(view.indicatorBounds?.width).toBe(3);
  });

  it('has no indicator without tabs', () => {
    expect(tabview({ tabs: [] }).indicatorBounds).toBeUndefined();
  });

  it('draws the indicator in the indicator color', () => {
    const view = tabview({ indicatorColor: '#ff0000', indicatorThickness: 5 });
    const fills: string[] = [];
    const context = createFakeCanvasContext();
    vi.mocked(context.fill).mockImplementation(() => {
      fills.push(String(context.fillStyle));
    });
    view.render(context);
    expect(fills).toContain('#ff0000');
    expect(view.indicatorBounds?.height).toBe(5);
  });

  it('paints nothing for tabs when there are none', () => {
    const context = createFakeCanvasContext();
    tabview({ tabs: [] }).render(context);
    expect(vi.mocked(context.fillText)).not.toHaveBeenCalled();
  });
});

describe('Tabview wheel and programmatic scrolling', () => {
  it('commits a tab reached by scrolling the pages without a drag, such as a horizontal wheel', () => {
    const view = tabview();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    const scroller = view.children[0];
    scroller?.scrollBy(300, 0);
    view.render(createFakeCanvasContext());
    expect(view.activeIndex).toBe(1);
    expect(view.displayedIndex).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('steps one page for a wheel notch smaller than half a page, in the direction of the scroll', () => {
    const view = tabview();
    const scroller = view.children[0];
    // A notch of 100px on a 300px page would round back to the first page if it snapped to the nearest.
    scroller?.scrollBy(100, 0);
    view.render(createFakeCanvasContext());
    expect(view.activeIndex).toBe(1);
    expect(scroller?.scrollX).toBe(300);
    scroller?.scrollBy(-100, 0);
    expect(view.activeIndex).toBe(0);
  });

  it('keeps a wheel at the first page where there is nothing before it', () => {
    const view = tabview();
    view.children[0]?.scrollBy(-100, 0);
    expect(view.activeIndex).toBe(0);
    expect(view.children[0]?.scrollX).toBe(0);
  });

  it('settles a wheel move of more than half a page on the nearest page', () => {
    const view = tabview();
    view.children[0]?.scrollBy(500, 0);
    expect(view.activeIndex).toBe(2);
  });
});

describe('Tabview animation against a drag', () => {
  it('stops easing to a tab when the user starts dragging the pages', () => {
    let now = 0;
    const animations = createAnimationEngine({ now: () => now, scheduler: null });
    const view = tabview({ animations });
    view.setActive(2, true);
    now = 100;
    animations.tick(now);
    const scroller = view.children[0];
    const midway = scroller?.scrollX ?? 0;
    expect(midway).toBeGreaterThan(0);
    scroller?.dispatchEvent('scrollBegin');
    now = 2000;
    animations.tick(now);
    expect(scroller?.scrollX).toBe(midway);
    expect(view.activeIndex).toBe(0);
  });
});
