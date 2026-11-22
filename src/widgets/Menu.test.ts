import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Menu, type MenuOptions } from './Menu.js';

function menu(options: Partial<MenuOptions> = {}): Menu {
  return new Menu({ width: 300, height: 240, ...options });
}

/** A root page with two items that each open a page of their own. */
function twoLevel(options: Partial<MenuOptions> = {}): {
  view: Menu;
  root: ReturnType<Menu['createPage']>;
  display: ReturnType<Menu['createPage']>;
  sound: ReturnType<Menu['createPage']>;
} {
  const view = menu(options);
  const root = view.createPage('Settings');
  const display = view.createPage('Display');
  const sound = view.createPage('Sound');
  root.addItem('Display', { page: display });
  root.addItem('Sound', { page: sound });
  display.addItem('Brightness');
  view.setPage(root);
  return { view, root, display, sound };
}

describe('Menu pages', () => {
  it('shows nothing until a page is set', () => {
    const view = menu();
    view.createPage('Settings');
    expect(view.currentPage).toBeUndefined();
    expect(view.pages).toHaveLength(1);
  });

  it('shows the root page set, and only that page', () => {
    const { view, root, display } = twoLevel();
    expect(view.currentPage).toBe(root);
    expect(root.hidden).toBe(false);
    expect(display.hidden).toBe(true);
    expect(view.canGoBack).toBe(false);
    expect(view.historyDepth).toBe(0);
  });

  it('sizes the current page to the main area under the header', () => {
    const { view, root } = twoLevel();
    view.render(createFakeCanvasContext());
    // The header has a title, so it takes 40px of the 240.
    expect(root).toMatchObject({ x: 0, y: 0, width: 300, height: 200 });
    expect(view.header).toMatchObject({ y: 0, height: 40, width: 300 });
  });

  it('gives the whole height to the page when there is no title or back button', () => {
    const view = menu();
    const page = view.createPage();
    view.setPage(page);
    view.render(createFakeCanvasContext());
    expect(page.height).toBe(240);
    expect(view.header.hidden).toBe(true);
  });
});

describe('Menu navigation', () => {
  it('opens the page an item points at, and goes back', () => {
    const { view, root, display } = twoLevel();
    const listener = vi.fn();
    view.addEventListener('valueChanged', listener);
    root.entries[0]?.dispatchEvent('clicked');
    expect(view.currentPage).toBe(display);
    expect(root.hidden).toBe(true);
    expect(display.hidden).toBe(false);
    expect(view.canGoBack).toBe(true);
    expect(view.historyDepth).toBe(1);
    expect(view.back()).toBe(true);
    expect(view.currentPage).toBe(root);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('cannot go back from the root page', () => {
    const { view } = twoLevel();
    expect(view.back()).toBe(false);
    expect(view.currentPage).toBeDefined();
  });

  it('goes back with the header button', () => {
    const { view, root } = twoLevel();
    root.entries[0]?.dispatchEvent('clicked');
    view.backButton.dispatchEvent('clicked');
    expect(view.currentPage).toBe(root);
  });

  it('shows the back button only when there is somewhere to go back to', () => {
    const { view, root } = twoLevel();
    view.render(createFakeCanvasContext());
    expect(view.backButton.hidden).toBe(true);
    root.entries[0]?.dispatchEvent('clicked');
    view.render(createFakeCanvasContext());
    expect(view.backButton.hidden).toBe(false);
  });

  it('can always show the back button', () => {
    const { view } = twoLevel({ alwaysShowBack: true });
    view.render(createFakeCanvasContext());
    expect(view.backButton.hidden).toBe(false);
  });

  it('shows the current page title in the header', () => {
    const { view, root } = twoLevel();
    const context = createFakeCanvasContext();
    view.render(context);
    expect(vi.mocked(context.fillText).mock.calls.map((call) => call[0])).toContain('Settings');
    root.entries[0]?.dispatchEvent('clicked');
    const next = createFakeCanvasContext();
    view.render(next);
    expect(vi.mocked(next.fillText).mock.calls.map((call) => call[0])).toContain('Display');
  });

  it('stacks pages, and setPage clears the history', () => {
    const { view, root, display, sound } = twoLevel();
    view.push(display);
    view.push(sound);
    expect(view.historyDepth).toBe(2);
    view.push(sound);
    expect(view.historyDepth).toBe(2);
    view.setPage(root);
    expect(view.historyDepth).toBe(0);
    expect(sound.hidden).toBe(true);
  });

  it('leaves an item with no page as a plain row', () => {
    const { view, display } = twoLevel();
    view.push(display);
    const before = view.currentPage;
    display.entries[0]?.dispatchEvent('clicked');
    expect(view.currentPage).toBe(before);
  });
});

describe('Menu content', () => {
  it('stacks items, sections and separators in a page, as wide as the page', () => {
    const view = menu();
    const page = view.createPage('P');
    page.addItem('One');
    page.addSeparator();
    const section = page.addSection('Group');
    section.addItem('Inside');
    view.setPage(page);
    view.render(createFakeCanvasContext());
    expect(page.entries).toHaveLength(3);
    // 8px page padding each side.
    expect(page.entries.every((entry) => entry.width === 300 - 16)).toBe(true);
    expect(page.entries.map((entry) => entry.y)).toEqual([8, 8 + 40 + 8, 8 + 40 + 8 + 8 + 8]);
  });

  it('sizes a section to its rows and border', () => {
    const view = menu();
    const page = view.createPage();
    const section = page.addSection('Group');
    section.addItem('A');
    section.addItem('B');
    // A 28px heading, two 40px items, and a 1px border either side.
    expect(section.height).toBe(28 + 40 + 40 + 2);
    expect(section.entries).toHaveLength(3);
  });

  it('opens a page from an item inside a section', () => {
    const view = menu();
    const root = view.createPage('Root');
    const target = view.createPage('Target');
    root.addSection().addItem('Go', { page: target });
    view.setPage(root);
    const section = root.entries[0] as ReturnType<typeof root.addSection>;
    section.entries[0]?.dispatchEvent('clicked');
    expect(view.currentPage).toBe(target);
  });

  it('sizes items by itemHeight', () => {
    const view = menu({ itemHeight: 30 });
    const page = view.createPage();
    expect(page.addItem('A').height).toBe(30);
  });

  it('paints a chevron on an item that opens a page, and not on a plain one', () => {
    const { view, display } = twoLevel();
    const context = createFakeCanvasContext();
    view.render(context);
    const painted = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(painted.filter((text) => text === '›')).toHaveLength(2);
    view.push(display);
    const next = createFakeCanvasContext();
    view.render(next);
    expect(vi.mocked(next.fillText).mock.calls.map((call) => call[0])).not.toContain('›');
  });

  it('scrolls a page whose rows overflow', () => {
    const view = menu();
    const page = view.createPage();
    for (let index = 0; index < 10; index += 1) {
      page.addItem(`Item ${index}`);
    }
    view.setPage(page);
    view.render(createFakeCanvasContext());
    expect(page.isScrollable).toBe(true);
  });
});

describe('Menu sidebar', () => {
  function withSidebar(): ReturnType<typeof twoLevel> & {
    sidebar: ReturnType<Menu['createPage']>;
  } {
    const base = twoLevel();
    const sidebar = base.view.createPage('Menu');
    sidebar.addItem('Display', { page: base.display });
    sidebar.addItem('Sound', { page: base.sound });
    base.view.setSidebarPage(sidebar);
    return { ...base, sidebar };
  }

  it('shows the sidebar page on the left and the main area beside it', () => {
    const { view, sidebar, root } = withSidebar();
    view.render(createFakeCanvasContext());
    expect(view.sidebarPage).toBe(sidebar);
    expect(sidebar).toMatchObject({ x: 0, width: 120, height: 240 });
    expect(sidebar.hidden).toBe(false);
    expect(root.width).toBe(180);
    expect(view.header.x).toBe(120);
  });

  it('replaces the main page, rather than stacking, when a sidebar item is clicked', () => {
    const { view, sidebar, sound } = withSidebar();
    sidebar.entries[1]?.dispatchEvent('clicked');
    expect(view.currentPage).toBe(sound);
    expect(view.historyDepth).toBe(0);
  });

  it('does the same for items inside a sidebar section', () => {
    const base = twoLevel();
    const sidebar = base.view.createPage('Menu');
    sidebar.addSection().addItem('Sound', { page: base.sound });
    base.view.setSidebarPage(sidebar);
    const section = sidebar.entries[0] as ReturnType<typeof sidebar.addSection>;
    section.entries[0]?.dispatchEvent('clicked');
    expect(base.view.currentPage).toBe(base.sound);
    expect(base.view.historyDepth).toBe(0);
  });

  it('removes the sidebar', () => {
    const { view, sidebar, root } = withSidebar();
    view.setSidebarPage(undefined);
    view.render(createFakeCanvasContext());
    expect(view.sidebarPage).toBeUndefined();
    expect(sidebar.hidden).toBe(true);
    expect(root.width).toBe(300);
  });

  it('swaps one sidebar page for another', () => {
    const { view, sidebar } = withSidebar();
    const other = view.createPage('Other');
    view.setSidebarPage(other);
    expect(sidebar.hidden).toBe(true);
    expect(other.hidden).toBe(false);
  });

  it('keeps the sidebar no wider than the menu', () => {
    const { view, sidebar } = withSidebar();
    view.width = 80;
    view.render(createFakeCanvasContext());
    expect(sidebar.width).toBe(80);
  });
});

describe('Menu header after it has been laid out', () => {
  it('keeps the title within the header when the menu narrows', () => {
    const { view } = twoLevel({ alwaysShowBack: true });
    view.render(createFakeCanvasContext());
    view.width = 200;
    view.render(createFakeCanvasContext());
    const title = view.header.children[1];
    const back = view.header.children[0];
    // 4px left and 8px right padding, one 4px gap and the 32px back button.
    expect(title?.width).toBe(200 - 12 - 4 - 32);
    expect((title?.x ?? 0) + (title?.width ?? 0)).toBeLessThanOrEqual(200 - 8);
    expect(back?.x).toBe(4);
  });
});

describe('Menu item targets', () => {
  it('opens the page the item points at when clicked, not the one it had when created', () => {
    const { view, root, display, sound } = twoLevel();
    const item = root.entries[0] as ReturnType<typeof root.addItem>;
    expect(item.target).toBe(display);
    item.target = sound;
    item.dispatchEvent('clicked');
    expect(view.currentPage).toBe(sound);
  });

  it('stops navigating when the target is cleared', () => {
    const { view, root, display } = twoLevel();
    const item = root.entries[0] as ReturnType<typeof root.addItem>;
    item.target = undefined;
    item.dispatchEvent('clicked');
    expect(view.currentPage).not.toBe(display);
  });

  it('navigates from a plain item once it is given a target', () => {
    const { view, display } = twoLevel();
    const plain = display.entries[0] as ReturnType<typeof display.addItem>;
    const other = view.createPage('Other');
    view.push(display);
    plain.target = other;
    plain.dispatchEvent('clicked');
    expect(view.currentPage).toBe(other);
  });
});
