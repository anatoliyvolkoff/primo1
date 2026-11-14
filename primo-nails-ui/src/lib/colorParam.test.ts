import { describe, expect, it } from 'vitest';
import { parseColorParam, serializeColorParam } from './colorParam';

describe('parseColorParam', () => {
  it('returns [] for empty / unknown slugs', () => {
    expect(parseColorParam(null)).toEqual([]);
    expect(parseColorParam('nope')).toEqual([]);
  });

  it('keeps every valid colour, de-duplicated, in order (legacy single ?color=<slug> still works)', () => {
    expect(parseColorParam('rosa')).toEqual(['rosa']);
    expect(parseColorParam('magenta,rosa,magenta,nope')).toEqual(['magenta', 'rosa']);
  });

  it('maps slugs to swatch names (b & w ↔ bw)', () => {
    expect(parseColorParam('bw')).toEqual(['b & w']);
  });

  it('is case-insensitive', () => {
    expect(parseColorParam('ROSA')).toEqual(['rosa']);
  });
});

describe('serializeColorParam', () => {
  it('returns null when nothing is selected', () => {
    expect(serializeColorParam([])).toBeNull();
  });

  it('serialises all colours as a comma list', () => {
    expect(serializeColorParam(['magenta', 'rosa'])).toBe('magenta,rosa');
    expect(serializeColorParam(['b & w'])).toBe('bw');
  });

  it('round-trips', () => {
    const names = ['magenta', 'b & w', 'rosa'];
    expect(parseColorParam(serializeColorParam(names))).toEqual(names);
  });
});
