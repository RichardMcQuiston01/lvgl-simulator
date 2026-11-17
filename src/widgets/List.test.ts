import { describe, expect, it, vi } from 'vitest';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { List } from './List.js';

function filled(): List {
  const list = new List({ width: 200, height: 100 });
  list.addText('Files');
  list.addButton('New', '+');
  list.addButton('Open');
  list.addButton('Save');
  return list;
}

describe('List', () => {
  it('stacks rows in a column, each as wide as the list', () => {
    const list = filled();
    list.render(createFakeCanvasContext());
    expect(list.items.map((item) => item.y)).toEqual([1, 29, 69, 109]);
    expect(list.items.every((item) => item.width === 198)).toBe(true);
  });

  it('tells headings from buttons', () => {
    const list = filled();
    expect(list.items).toHaveLength(4);
    expect(list.buttons.map((item) => item.text)).toEqual(['New', 'Open', 'Save']);
    expect(list.items[0]?.kind).toBe('text');
  });

  it('sizes button rows by itemHeight', () => {
    const list = new List({ width: 200, height: 100, itemHeight: 24 });
    expect(list.addButton('A').height).toBe(24);
  });

  it('follows the list when it is resized', () => {
    const list = filled();
    list.width = 150;
    list.render(createFakeCanvasContext());
    expect(list.items.every((item) => item.width === 148)).toBe(true);
  });

  it('scrolls vertically once the rows overflow its height', () => {
    const list = filled();
    list.render(createFakeCanvasContext());
    expect(list.isScrollable).toBe(true);
    expect(list.getScrollRange().maxY).toBe(109 + 40 + 1 - 100);
    expect(list.scrollBy(0, 30)).toBe(true);
    expect(list.scrollX).toBe(0);
  });

  it('does not scroll sideways', () => {
    const list = filled();
    list.render(createFakeCanvasContext());
    expect(list.scrollBy(30, 0)).toBe(false);
  });

  it('does not scroll when everything fits', () => {
    const list = new List({ width: 200, height: 100 });
    list.addButton('Only');
    list.render(createFakeCanvasContext());
    expect(list.isScrollable).toBe(false);
  });

  it('reports a click on a button row to onItemClicked listeners', () => {
    const list = filled();
    const listener = vi.fn();
    const stop = list.onItemClicked(listener);
    list.buttons[1]?.dispatchEvent('clicked');
    expect(listener).toHaveBeenCalledWith(list.buttons[1]);
    stop();
    list.buttons[0]?.dispatchEvent('clicked');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps headings out of hit-testing so presses fall through', () => {
    const list = filled();
    list.render(createFakeCanvasContext());
    expect(hitTest(list, 10, 10)).toBe(list);
    expect(hitTest(list, 10, 40)).toBe(list.buttons[0]);
  });

  it('removes a row', () => {
    const list = filled();
    const row = list.buttons[0];
    if (!row) {
      throw new Error('missing row');
    }
    expect(list.removeItem(row)).toBe(true);
    expect(list.removeItem(row)).toBe(false);
    expect(list.items).toHaveLength(3);
    expect(list.children).not.toContain(row);
  });

  it('paints icons and texts, aligning labels of icon-less rows with iconed ones', () => {
    const list = filled();
    const context = createFakeCanvasContext();
    list.render(context);
    const calls = vi.mocked(context.fillText).mock.calls;
    expect(calls.map((call) => call[0])).toEqual(['Files', '+', 'New', 'Open', 'Save']);
    const xOf = (label: string): number => calls.find((call) => call[0] === label)?.[1] ?? NaN;
    // One pixel of border inset, then 12px of row padding; icon rows add the icon column and gap.
    expect(xOf('Files')).toBe(13);
    expect(xOf('+')).toBe(13);
    expect(xOf('New')).toBe(13 + 20 + 10);
    expect(xOf('Open')).toBe(13);
  });
});
