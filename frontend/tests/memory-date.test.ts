import { describe, expect, it } from 'vitest';
import { formatMemoryDate } from '@/app/stories/[id]/memories/page';
describe('formatMemoryDate', () => {
  it('preserves unknown and partial date precision', () => {
    expect(formatMemoryDate({ eventDate: null, datePrecision: 'unknown' })).toBe('Date unknown');
    expect(formatMemoryDate({ eventDate: '1999-01-01', datePrecision: 'year' })).toBe('1999');
    expect(formatMemoryDate({ eventDate: '1999-06-01', datePrecision: 'month' })).toBe('June 1999');
    expect(formatMemoryDate({ eventDate: '1999-06-10', datePrecision: 'approximate' })).toContain(
      'Around',
    );
  });
});
