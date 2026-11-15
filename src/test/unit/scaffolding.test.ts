import { describe, it, expect } from 'vitest';
import { cn, formatCurrency } from '@/lib/utils';

describe('Scaffolding Verification', () => {
  it('correctly merges tailwind classnames', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('correctly formats currency', () => {
    expect(formatCurrency(1450.5)).toBe('$1,450.50');
  });
});
