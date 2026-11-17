import { describe, expect, it, vi } from 'vitest';
import { hitTest } from '../interaction/hitTest.js';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { defaultTheme } from '../theme/defaultTheme.js';
import { Dropdown, type DropdownOptions } from './Dropdown.js';
import { Container } from './Container.js';

const FRUIT = ['Apple', 'Banana', 'Cherry', 'Date'];

/** A 300 x 300 screen holding a dropdown at (20, 50) and returns both. */
function setup(options: Partial<DropdownOptions> = {}): { screen: Container; dropdown: Dropdown } {
  const screen = new Container({ width: 300, height: 300 });
  const dropdown = new Dropdown({
    x: 20,
    y: 50,
    width: 120,
    height: 36,
    options: FRUIT,
    ...options,
  });
  screen.addChild(dropdown);
  return { screen, dropdown };
}

describe('Dropdown selection', () => {
  it('shows the first option, or the one asked for', () => {
    expect(setup().dropdown.selectedText).toBe('Apple');
    expect(setup({ selected: 2 }).dropdown.selectedText).toBe('Cherry');
  });

  it('keeps the initial selection within the options', () => {
    expect(setup({ selected: 99 }).dropdown.selectedIndex).toBe(3);
    expect(setup({ selected: -2 }).dropdown.selectedIndex).toBe(0);
  });

  it('has no selected text without options and does not open', () => {
    const { dropdown } = setup({ options: [] });
    expect(dropdown.selectedText).toBeUndefined();
    dropdown.open();
    expect(dropdown.isOpen).toBe(false);
  });

  it('selects with setSelected, firing valueChanged only on a change', () => {
    const { dropdown } = setup();
    const listener = vi.fn();
    dropdown.addEventListener('valueChanged', listener);
    dropdown.setSelected(2);
    dropdown.setSelected(2);
    dropdown.setSelected(50);
    expect(dropdown.selectedText).toBe('Date');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('replaces the options with setOptions', () => {
    const { dropdown } = setup({ selected: 3 });
    dropdown.setOptions(['x', 'y'], 1);
    expect(dropdown.options).toEqual(['x', 'y']);
    expect(dropdown.selectedText).toBe('y');
    expect(dropdown.optionRow(1)?.text).toBe('y');
    expect(dropdown.optionRow(2)).toBeUndefined();
  });
});

describe('Dropdown opening', () => {
  it('opens and closes when clicked', () => {
    const { dropdown } = setup();
    dropdown.dispatchEvent('clicked');
    expect(dropdown.isOpen).toBe(true);
    dropdown.dispatchEvent('clicked');
    expect(dropdown.isOpen).toBe(false);
  });

  it('does not open when disabled', () => {
    const { dropdown } = setup({ disabled: true });
    dropdown.open();
    expect(dropdown.isOpen).toBe(false);
  });

  it('closes when it loses focus', () => {
    const { dropdown } = setup();
    dropdown.open();
    dropdown.dispatchEvent('defocused');
    expect(dropdown.isOpen).toBe(false);
  });

  it('opens its list below, as wide as the dropdown and tall enough for every option', () => {
    const { dropdown } = setup();
    dropdown.open();
    const list = dropdown.listObject;
    expect(list.width).toBe(120);
    expect(list.height).toBe(4 * 36);
    expect(list.getAbsolutePosition()).toEqual({ x: 20, y: 86 });
  });

  it('opens upward', () => {
    const { dropdown } = setup({ direction: 'up', y: 200 });
    dropdown.open();
    expect(dropdown.listObject.getAbsolutePosition()).toEqual({ x: 20, y: 200 - 4 * 36 });
  });

  it('limits an upward list to the room above and scrolls the rest', () => {
    const { dropdown } = setup({ direction: 'up' });
    dropdown.open();
    expect(dropdown.listObject.height).toBe(50 - 4);
    expect(dropdown.listObject.getAbsolutePosition().y).toBe(4);
  });

  it('opens to the right and to the left, level with the dropdown', () => {
    const right = setup({ direction: 'right' }).dropdown;
    right.open();
    expect(right.listObject.getAbsolutePosition()).toEqual({ x: 140, y: 50 });
    const left = setup({ direction: 'left' }).dropdown;
    left.open();
    expect(left.listObject.getAbsolutePosition()).toEqual({ x: 20 - 120, y: 50 });
  });

  it('limits the list to the room on screen and scrolls the rest', () => {
    const { screen, dropdown } = setup({
      options: Array.from({ length: 20 }, (_, index) => `Item ${index}`),
    });
    dropdown.open();
    expect(dropdown.listObject.height).toBe(300 - 86 - 4);
    screen.render(createFakeCanvasContext());
    expect(dropdown.listObject.isScrollable).toBe(true);
  });

  it('honors maxListHeight', () => {
    const { dropdown } = setup({ maxListHeight: 100 });
    dropdown.open();
    expect(dropdown.listObject.height).toBe(100);
  });

  it('scrolls a long list so the selected option is visible', () => {
    const { screen, dropdown } = setup({
      options: Array.from({ length: 20 }, (_, index) => `Item ${index}`),
      selected: 18,
    });
    dropdown.open();
    screen.render(createFakeCanvasContext());
    expect(dropdown.listObject.scrollY).toBeGreaterThan(0);
    const row = dropdown.optionRow(18);
    const list = dropdown.listObject;
    expect(row && row.y >= list.scrollY && row.y + row.height <= list.scrollY + list.height).toBe(
      true,
    );
  });
});

describe('Dropdown choosing', () => {
  it('selects the clicked option, closes, and fires valueChanged', () => {
    const { dropdown } = setup();
    const listener = vi.fn();
    dropdown.addEventListener('valueChanged', listener);
    dropdown.open();
    dropdown.optionRow(2)?.dispatchEvent('clicked');
    expect(dropdown.selectedText).toBe('Cherry');
    expect(dropdown.isOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes without an event when the selected option is clicked again', () => {
    const { dropdown } = setup();
    const listener = vi.fn();
    dropdown.addEventListener('valueChanged', listener);
    dropdown.open();
    dropdown.optionRow(0)?.dispatchEvent('clicked');
    expect(dropdown.isOpen).toBe(false);
    expect(listener).not.toHaveBeenCalled();
  });

  it('lets a click on the open list reach its rows, even over later siblings', () => {
    const { screen, dropdown } = setup();
    const cover = new Container({ x: 0, y: 80, width: 300, height: 200 });
    screen.addChild(cover);
    dropdown.open();
    screen.render(createFakeCanvasContext());
    expect(hitTest(screen, 30, 100)).toBe(dropdown.optionRow(0));
    expect(hitTest(screen, 200, 100)).toBe(cover);
  });
});

describe('Dropdown popup dismissal', () => {
  it('owns presses on itself and its list, not on other objects', () => {
    const { screen, dropdown } = setup();
    const other = new Container({ width: 10, height: 10 });
    screen.addChild(other);
    dropdown.open();
    const row = dropdown.optionRow(1);
    expect(dropdown.popupOpen).toBe(true);
    expect(row && dropdown.ownsPopupTarget(row)).toBe(true);
    expect(dropdown.ownsPopupTarget(dropdown)).toBe(true);
    expect(dropdown.ownsPopupTarget(other)).toBe(false);
    dropdown.closePopup();
    expect(dropdown.isOpen).toBe(false);
  });
});

describe('Dropdown keys', () => {
  it('changes the selection with Up/Down when closed', () => {
    const { dropdown } = setup();
    const listener = vi.fn();
    dropdown.addEventListener('valueChanged', listener);
    dropdown.dispatchEvent('key', { key: 'ArrowDown' });
    dropdown.dispatchEvent('key', { key: 'ArrowDown' });
    dropdown.dispatchEvent('key', { key: 'ArrowUp' });
    expect(dropdown.selectedText).toBe('Banana');
    expect(listener).toHaveBeenCalledTimes(3);
    dropdown.dispatchEvent('key', { key: 'ArrowUp' });
    dropdown.dispatchEvent('key', { key: 'ArrowUp' });
    expect(dropdown.selectedIndex).toBe(0);
  });

  it('moves a highlight when open and only chooses on Enter', () => {
    const { dropdown } = setup();
    const listener = vi.fn();
    dropdown.addEventListener('valueChanged', listener);
    dropdown.dispatchEvent('key', { key: 'Enter' });
    expect(dropdown.isOpen).toBe(true);
    dropdown.dispatchEvent('key', { key: 'ArrowDown' });
    dropdown.dispatchEvent('key', { key: 'ArrowDown' });
    expect(dropdown.selectedText).toBe('Apple');
    expect(listener).not.toHaveBeenCalled();
    dropdown.dispatchEvent('key', { key: 'Enter' });
    expect(dropdown.selectedText).toBe('Cherry');
    expect(dropdown.isOpen).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without choosing', () => {
    const { dropdown } = setup();
    dropdown.dispatchEvent('key', { key: ' ' });
    dropdown.dispatchEvent('key', { key: 'ArrowDown' });
    dropdown.dispatchEvent('key', { key: 'Escape' });
    expect(dropdown.isOpen).toBe(false);
    expect(dropdown.selectedText).toBe('Apple');
  });

  it('ignores other keys', () => {
    const { dropdown } = setup();
    dropdown.dispatchEvent('key', { key: 'x' });
    expect(dropdown.isOpen).toBe(false);
  });
});

describe('Dropdown painting', () => {
  it('paints the selected option and a down arrow when closed', () => {
    const { dropdown } = setup();
    const context = createFakeCanvasContext();
    dropdown.render(context);
    const painted = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(painted).toEqual(['Apple', '▼']);
  });

  it('paints placeholder text instead of the selection, and a custom or empty symbol', () => {
    const { dropdown } = setup({ text: 'Pick one', symbol: '' });
    const context = createFakeCanvasContext();
    dropdown.render(context);
    expect(vi.mocked(context.fillText).mock.calls.map((call) => call[0])).toEqual(['Pick one']);
    dropdown.symbol = '+';
    const again = createFakeCanvasContext();
    dropdown.render(again);
    expect(vi.mocked(again.fillText).mock.calls.map((call) => call[0])).toEqual(['Pick one', '+']);
  });

  it('uses an arrow for each direction', () => {
    const symbols = (['up', 'left', 'right'] as const).map((direction) => {
      const { dropdown } = setup({ direction });
      const context = createFakeCanvasContext();
      dropdown.render(context);
      return vi.mocked(context.fillText).mock.calls[1]?.[0];
    });
    expect(symbols).toEqual(['▲', '◀', '▶']);
  });

  it('paints the open list last, with the selected option highlighted', () => {
    const { screen, dropdown } = setup({ selected: 1 });
    const later = new Container({ x: 0, y: 80, width: 300, height: 200 });
    screen.addChild(later);
    dropdown.open();
    const context = createFakeCanvasContext();
    const textColors: Record<string, string> = {};
    vi.mocked(context.fillText).mockImplementation((text) => {
      textColors[text] = String(context.fillStyle);
    });
    screen.render(context);
    const painted = vi.mocked(context.fillText).mock.calls.map((call) => call[0]);
    expect(painted.slice(-4)).toEqual(['Apple', 'Banana', 'Cherry', 'Date']);
    expect(textColors.Banana).toBe(defaultTheme.textColorOnPrimary);
    expect(textColors.Cherry).toBe(defaultTheme.textColor);
  });

  it('does not highlight when selectedHighlight is off', () => {
    const { screen, dropdown } = setup({ selected: 1, selectedHighlight: false });
    dropdown.open();
    const context = createFakeCanvasContext();
    const textColors: Record<string, string> = {};
    vi.mocked(context.fillText).mockImplementation((text) => {
      textColors[text] = String(context.fillStyle);
    });
    screen.render(context);
    expect(textColors.Banana).toBe(defaultTheme.textColor);
  });
});
