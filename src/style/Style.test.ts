import { describe, expect, it } from 'vitest';
import { mergeStyle, paddingAll, resolveStyle, type StyleSet } from './Style';

describe('resolveStyle', () => {
  it('returns the base style when no states are active', () => {
    const styleSet: StyleSet = { base: { bgColor: '#111111' } };

    expect(resolveStyle(styleSet, new Set())).toEqual({ bgColor: '#111111' });
  });

  it('layers a matching state override on top of the base', () => {
    const styleSet: StyleSet = {
      base: { bgColor: '#111111', textColor: '#000000' },
      states: { pressed: { bgColor: '#222222' } },
    };

    expect(resolveStyle(styleSet, new Set(['pressed']))).toEqual({
      bgColor: '#222222',
      textColor: '#000000',
    });
  });

  it('ignores a state override for a state that is not active', () => {
    const styleSet: StyleSet = {
      base: { bgColor: '#111111' },
      states: { pressed: { bgColor: '#222222' } },
    };

    expect(resolveStyle(styleSet, new Set(['focused']))).toEqual({ bgColor: '#111111' });
  });

  it('applies multiple active states in a fixed, documented priority order', () => {
    const styleSet: StyleSet = {
      base: { bgColor: '#000000' },
      states: {
        checked: { bgColor: '#checked' },
        pressed: { bgColor: '#pressed' },
        disabled: { bgColor: '#disabled' },
      },
    };

    // disabled outranks pressed, which outranks checked (see STATE_PRIORITY).
    expect(resolveStyle(styleSet, new Set(['checked', 'pressed', 'disabled'])).bgColor).toBe(
      '#disabled',
    );
    expect(resolveStyle(styleSet, new Set(['checked', 'pressed'])).bgColor).toBe('#pressed');
  });

  it('does not mutate the input styleSet', () => {
    const base = { bgColor: '#111111' };
    const styleSet: StyleSet = { base, states: { pressed: { bgColor: '#222222' } } };

    resolveStyle(styleSet, new Set(['pressed']));

    expect(base).toEqual({ bgColor: '#111111' });
  });
});

describe('mergeStyle', () => {
  it('merges left-to-right, later parts winning', () => {
    expect(mergeStyle({ bgColor: '#111111' }, { bgColor: '#222222' })).toEqual({
      bgColor: '#222222',
    });
  });

  it('does not let an undefined property value overwrite an earlier one', () => {
    expect(mergeStyle({ bgColor: '#111111' }, { bgColor: undefined, textColor: '#000' })).toEqual({
      bgColor: '#111111',
      textColor: '#000',
    });
  });

  it('skips undefined parts entirely', () => {
    expect(mergeStyle({ bgColor: '#111111' }, undefined)).toEqual({ bgColor: '#111111' });
  });

  it('returns an empty style when given no parts', () => {
    expect(mergeStyle()).toEqual({});
  });
});

describe('paddingAll', () => {
  it('applies the same value to all four sides', () => {
    expect(paddingAll(8)).toEqual({ padTop: 8, padRight: 8, padBottom: 8, padLeft: 8 });
  });
});
