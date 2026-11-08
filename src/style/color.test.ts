import { describe, expect, it } from 'vitest';
import { mixColors, withOpacity } from './color.js';

describe('withOpacity', () => {
  it('returns the color unchanged when opa is undefined', () => {
    expect(withOpacity('#2196f3', undefined)).toBe('#2196f3');
  });

  it('returns the color unchanged when opa is fully opaque (255)', () => {
    expect(withOpacity('#2196f3', 255)).toBe('#2196f3');
  });

  it('converts a partial opacity into an rgba() string', () => {
    expect(withOpacity('#ff0000', 128)).toBe(`rgba(255, 0, 0, ${128 / 255})`);
  });

  it('converts zero opacity into a fully transparent rgba() string', () => {
    expect(withOpacity('#00ff00', 0)).toBe('rgba(0, 255, 0, 0)');
  });

  it('treats an opa above 255 as fully opaque', () => {
    expect(withOpacity('#0000ff', 999)).toBe('#0000ff');
  });

  it('clamps a negative opa value to fully transparent', () => {
    expect(withOpacity('#0000ff', -50)).toBe('rgba(0, 0, 255, 0)');
  });
});

describe('mixColors', () => {
  it('returns the foreground at weight 1 and the background at weight 0', () => {
    expect(mixColors('#ff0000', '#0000ff', 1)).toBe('#ff0000');
    expect(mixColors('#ff0000', '#0000ff', 0)).toBe('#0000ff');
  });

  it('blends proportionally and clamps the weight', () => {
    expect(mixColors('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(mixColors('#ffffff', '#000000', 5)).toBe('#ffffff');
    expect(mixColors('#ffffff', '#000000', -1)).toBe('#000000');
  });
});
