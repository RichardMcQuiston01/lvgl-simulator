import { describe, expect, it } from 'vitest';
import {
  formatSpinbox,
  maxMagnitude,
  nextStep,
  previousStep,
  stepDigitIndex,
  stepValue,
} from './spinboxMath.js';

describe('formatSpinbox', () => {
  it('zero-pads to the digit count', () => {
    expect(formatSpinbox(42, 5, 0, false)).toBe('00042');
  });

  it('inserts the decimal point before the last decimal digits', () => {
    expect(formatSpinbox(12345, 5, 2, false)).toBe('123.45');
    expect(formatSpinbox(5, 5, 2, false)).toBe('000.05');
    expect(formatSpinbox(7, 3, 3, false)).toBe('0.007');
  });

  it('prefixes a sign when signed, using minus for negatives and plus otherwise', () => {
    expect(formatSpinbox(5, 3, 0, true)).toBe('+005');
    expect(formatSpinbox(-5, 3, 0, true)).toBe('-005');
    expect(formatSpinbox(0, 3, 1, true)).toBe('+00.0');
  });

  it('handles the largest value and more decimals than digits', () => {
    expect(formatSpinbox(maxMagnitude(3), 3, 0, false)).toBe('999');
    expect(formatSpinbox(5, 2, 9, false)).toBe('0.05');
  });
});

describe('digit and step arithmetic', () => {
  it('limits the magnitude to what the digits can show', () => {
    expect(maxMagnitude(1)).toBe(9);
    expect(maxMagnitude(5)).toBe(99999);
  });

  it('finds the displayed digit a step selects, skipping the decimal point', () => {
    // "123.45": indices 0..5 with the point at 3.
    expect(stepDigitIndex(6, 1, 5, 2)).toBe(5);
    expect(stepDigitIndex(6, 10, 5, 2)).toBe(4);
    expect(stepDigitIndex(6, 100, 5, 2)).toBe(2);
    expect(stepDigitIndex(6, 10000, 5, 2)).toBe(0);
    // No decimals: "00042", the tens digit is index 3.
    expect(stepDigitIndex(5, 10, 5, 0)).toBe(3);
  });

  it('clamps the selected digit to the displayed ones', () => {
    expect(stepDigitIndex(5, 10 ** 9, 5, 0)).toBe(0);
    expect(stepDigitIndex(5, 0, 5, 0)).toBe(4);
  });

  it('moves the step a digit at a time within the digit count', () => {
    expect(nextStep(1, 3)).toBe(10);
    expect(nextStep(10, 3)).toBe(100);
    expect(nextStep(100, 3)).toBe(100);
    expect(previousStep(100)).toBe(10);
    expect(previousStep(10)).toBe(1);
    expect(previousStep(1)).toBe(1);
  });
});

describe('stepValue', () => {
  it('moves by delta within the range', () => {
    expect(stepValue(5, 3, 0, 10, false)).toBe(8);
    expect(stepValue(5, -3, 0, 10, false)).toBe(2);
  });

  it('stops at the ends without rollover', () => {
    expect(stepValue(9, 5, 0, 10, false)).toBe(10);
    expect(stepValue(10, 1, 0, 10, false)).toBe(10);
    expect(stepValue(1, -5, 0, 10, false)).toBe(0);
  });

  it('wraps only when already at an end with rollover, otherwise clamps first', () => {
    expect(stepValue(10, 1, 0, 10, true)).toBe(0);
    expect(stepValue(0, -1, 0, 10, true)).toBe(10);
    expect(stepValue(9, 5, 0, 10, true)).toBe(10);
  });
});
