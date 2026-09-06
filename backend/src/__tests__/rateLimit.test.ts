import { describe, it, expect } from 'vitest';
import { rateLimitService } from '../services/rateLimitService.js';

describe('Rate Limit Window Calculations', () => {
  it('should format hour window consistently as YYYY-MM-DD-HH', () => {
    const fixedDate = new Date('2026-09-06T15:34:00.000Z');
    const window = rateLimitService.getHourWindow(fixedDate);
    expect(window).toBe('2026-09-06-15');
  });

  it('should compute start of the next hour window accurately', () => {
    const date = new Date('2026-09-06T15:34:25.000Z');
    const nextStart = rateLimitService.getNextHourStartTime(date);

    expect(nextStart.toISOString()).toBe('2026-09-06T16:00:00.000Z');
    expect(nextStart.getTime() - date.getTime()).toBe((25 * 60 + 35) * 1000);
  });

  it('should roll over to next day when hour is 23', () => {
    const date = new Date('2026-09-06T23:45:00.000Z');
    const nextStart = rateLimitService.getNextHourStartTime(date);
    expect(nextStart.toISOString()).toBe('2026-09-07T00:00:00.000Z');
  });
});
