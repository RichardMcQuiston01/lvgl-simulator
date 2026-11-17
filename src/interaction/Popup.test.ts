import { describe, expect, it } from 'vitest';
import { LvObject } from '../core/LvObject.js';
import { dismissPopups, isPopup, type Popup } from './Popup.js';

class FakePopup extends LvObject implements Popup {
  popupOpen = true;
  readonly inside = new LvObject({ width: 10, height: 10 });

  constructor() {
    super({ width: 50, height: 20 });
    this.addChild(this.inside);
  }

  closePopup(): void {
    this.popupOpen = false;
  }

  ownsPopupTarget(target: LvObject): boolean {
    return target === this || target === this.inside;
  }
}

describe('isPopup', () => {
  it('recognizes objects with the popup methods', () => {
    expect(isPopup(new FakePopup())).toBe(true);
    expect(isPopup(new LvObject({ width: 1, height: 1 }))).toBe(false);
    expect(isPopup(null)).toBe(false);
  });
});

describe('dismissPopups', () => {
  it('closes an open popup when the press lands elsewhere', () => {
    const root = new LvObject({ width: 200, height: 200 });
    const popup = new FakePopup();
    const other = new LvObject({ width: 10, height: 10 });
    root.addChild(popup);
    root.addChild(other);
    expect(dismissPopups(root, other)).toBe(true);
    expect(popup.popupOpen).toBe(false);
  });

  it('closes it when the press hits nothing', () => {
    const root = new LvObject({ width: 200, height: 200 });
    const popup = new FakePopup();
    root.addChild(popup);
    expect(dismissPopups(root, null)).toBe(true);
    expect(popup.popupOpen).toBe(false);
  });

  it('leaves it open when the press is inside the popup or on its owner', () => {
    const root = new LvObject({ width: 200, height: 200 });
    const popup = new FakePopup();
    root.addChild(popup);
    expect(dismissPopups(root, popup.inside)).toBe(false);
    expect(dismissPopups(root, popup)).toBe(false);
    expect(popup.popupOpen).toBe(true);
  });

  it('skips popups that are already closed', () => {
    const root = new LvObject({ width: 200, height: 200 });
    const popup = new FakePopup();
    popup.popupOpen = false;
    root.addChild(popup);
    expect(dismissPopups(root, null)).toBe(false);
  });
});
