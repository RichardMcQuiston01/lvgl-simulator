import { describe, expect, it, vi } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { Spinbox, type SpinboxOptions } from './Spinbox.js';

/** The fake context measures every character as 7px; default font 14px with 8px padding. */
function spinbox(options: Partial<SpinboxOptions> = {}): Spinbox {
  return new Spinbox({ width: 120, height: 40, ...options });
}

function press(box: Spinbox, ...keys: string[]): void {
  for (const key of keys) {
    box.dispatchEvent('key', { key });
  }
}

type Calls = { mock: { calls: unknown[][] } };
const callsOf = (fn: unknown): unknown[][] => (fn as Calls).mock.calls;

describe('Spinbox value', () => {
  it('defaults to zero over the widest range its digits allow, with a sign', () => {
    const box = spinbox();
    expect([box.value, box.min, box.max, box.step]).toEqual([0, -99999, 99999, 1]);
    expect(box.text).toBe('+00000');
    expect(box.editable).toBe(true);
  });

  it('drops the sign when the range has no negatives, and formats decimals', () => {
    expect(spinbox({ min: 0, value: 42 }).text).toBe('00042');
    const priced = spinbox({ min: 0, value: 12345, decimalDigits: 2 });
    expect(priced.text).toBe('123.45');
    expect(priced.decimalValue).toBe(123.45);
  });

  it('limits the range to what the digit count can show, and clamps the value', () => {
    const box = spinbox({ digitCount: 3, min: -5000, max: 5000, value: 5000 });
    expect([box.min, box.max, box.value]).toEqual([-999, 999, 999]);
  });

  it('clamps setValue to the range and fires valueChanged only on a change', () => {
    const box = spinbox({ min: 0, max: 10 });
    const listener = vi.fn();
    box.addEventListener('valueChanged', listener);
    box.setValue(4);
    box.setValue(4);
    box.setValue(99);
    expect(box.value).toBe(10);
    box.setValue(-5);
    expect(box.value).toBe(0);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe('Spinbox stepping', () => {
  it('increments and decrements by the step, which a digit move scales by ten', () => {
    const box = spinbox({ min: 0, value: 50 });
    box.increment();
    expect(box.value).toBe(51);
    box.stepNext();
    box.increment();
    expect(box.value).toBe(61);
    box.decrement();
    box.decrement();
    expect(box.value).toBe(41);
    box.stepPrevious();
    box.decrement();
    expect(box.value).toBe(40);
  });

  it('stops at the ends, or wraps with rollover', () => {
    const plain = spinbox({ min: 0, max: 3, value: 3 });
    plain.increment();
    expect(plain.value).toBe(3);

    const wrapping = spinbox({ min: 0, max: 3, value: 3, rollover: true });
    wrapping.increment();
    expect(wrapping.value).toBe(0);
    wrapping.decrement();
    expect(wrapping.value).toBe(3);
  });

  it('does not move the step past the digits it has', () => {
    const box = spinbox({ digitCount: 3 });
    box.stepNext();
    box.stepNext();
    box.stepNext();
    expect(box.step).toBe(100);
    box.stepPrevious();
    box.stepPrevious();
    box.stepPrevious();
    expect(box.step).toBe(1);
  });

  it('responds to the arrow and Enter keys', () => {
    const box = spinbox({ min: 0 });
    const ready = vi.fn();
    box.addEventListener('ready', ready);
    press(box, 'ArrowUp', 'ArrowUp', 'ArrowDown');
    expect(box.value).toBe(1);
    press(box, 'ArrowLeft', 'ArrowUp');
    expect(box.value).toBe(11);
    press(box, 'ArrowRight', 'ArrowUp', 'Enter', 'x');
    expect(box.value).toBe(12);
    expect(ready).toHaveBeenCalledTimes(1);
  });
});

describe('Spinbox pointer and painting', () => {
  it('selects the digit that is pressed', () => {
    const box = spinbox({ min: 0, value: 42 });
    box.render(createFakeCanvasContext());
    // "00042": characters are 7px wide, starting at the 8px padding. The 4 spans x 21-28 within the text.
    box.handlePointerPosition(8 + 22);
    expect(box.step).toBe(10);
    box.handlePointerPosition(8 + 1);
    expect(box.step).toBe(10000);
    // Past the last character nothing is selected, so the step is unchanged.
    box.handlePointerPosition(8 + 100);
    expect(box.step).toBe(10000);
  });

  it('skips the decimal point when selecting by pointer', () => {
    const box = spinbox({ min: 0, value: 12345, decimalDigits: 2 });
    box.render(createFakeCanvasContext());
    // "123.45": the point spans x 21-28 within the text, the 4 spans 28-35, the 5 spans 35-42.
    box.handlePointerPosition(8 + 24);
    expect(box.step).toBe(1);
    box.handlePointerPosition(8 + 31);
    expect(box.step).toBe(10);
    box.handlePointerPosition(8 + 38);
    expect(box.step).toBe(1);
    box.handlePointerPosition(8 + 2);
    expect(box.step).toBe(10000);
  });

  it('draws the number in one piece when not focused', () => {
    const context = createFakeCanvasContext();
    spinbox({ min: 0, value: 42 }).render(context);
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['00042']);
    expect(context.fillRect).not.toHaveBeenCalled();
  });

  it('highlights the selected digit when focused', () => {
    const context = createFakeCanvasContext();
    spinbox({ min: 0, value: 42, focused: true }).render(context);
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['0004', '2']);
    // Highlight sits behind the last digit: x = 8 + 4 * 7, 7px wide, 1.5 em tall about the middle.
    expect(context.fillRect).toHaveBeenCalledWith(36, 20 - 10.5, 7, 21);
  });

  it('moves the highlight with the step', () => {
    const box = spinbox({ min: 0, value: 42, focused: true });
    box.stepNext();
    const context = createFakeCanvasContext();
    box.render(context);
    expect(callsOf(context.fillText).map((call) => call[0])).toEqual(['000', '4', '2']);
  });
});
