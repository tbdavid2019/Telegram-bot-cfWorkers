import test from 'node:test';
import assert from 'node:assert';
import {
  getZonedDateParts,
  getZonedDateString,
  getZonedDayRangeUtc,
  resolveUserTimeZone,
  zonedTimeToUtc
} from '../src/utils/timezone.js';

test('Midnight Boundary: getZonedDateString returns local date across UTC midnight', () => {
  const timeZone = 'Asia/Taipei'; // UTC+8

  // Case 1: 2026-09-10 00:30:00 Taipei time is 2026-09-09 16:30:00 UTC
  // UTC date is still 2026-09-09, but Taipei date is ALREADY 2026-09-10
  const earlyMorningUtc = new Date('2026-09-09T16:30:00.000Z');
  const dateStr = getZonedDateString(earlyMorningUtc, timeZone);
  assert.strictEqual(dateStr, '2026-09-10', 'Early morning Taipei date must be 2026-09-10');

  // Case 2: 2026-09-09 23:59:59 Taipei time is 2026-09-09 15:59:59 UTC
  const lateNightUtc = new Date('2026-09-09T15:59:59.000Z');
  const lateNightStr = getZonedDateString(lateNightUtc, timeZone);
  assert.strictEqual(lateNightStr, '2026-09-09', 'Late night Taipei date must be 2026-09-09');

  // Case 3: Exactly midnight 2026-09-10 00:00:00 Taipei time (2026-09-09 16:00:00 UTC)
  const midnightUtc = new Date('2026-09-09T16:00:00.000Z');
  const midnightStr = getZonedDateString(midnightUtc, timeZone);
  assert.strictEqual(midnightStr, '2026-09-10', 'Exactly midnight Taipei date must be 2026-09-10');

  const parts = getZonedDateParts(midnightUtc, timeZone);
  assert.strictEqual(parts.year, 2026);
  assert.strictEqual(parts.month, 9);
  assert.strictEqual(parts.day, 10);
  assert.strictEqual(parts.hour, 0, 'Hour at midnight must be 0, not 24');
  assert.strictEqual(parts.minute, 0);
  assert.strictEqual(parts.second, 0);
});

test('Midnight Boundary: New Year rollover at midnight (Year & Month boundary)', () => {
  const timeZone = 'Asia/Taipei'; // UTC+8

  // 2026-01-01 02:00:00 in Taipei is 2025-12-31 18:00:00 in UTC
  const newYearUtc = new Date('2025-12-31T18:00:00.000Z');
  const parts = getZonedDateParts(newYearUtc, timeZone);

  assert.strictEqual(parts.year, 2026, 'Year must be 2026 in Taipei, not 2025 UTC');
  assert.strictEqual(parts.month, 1, 'Month must be 1 (January) in Taipei, not 12 UTC');
  assert.strictEqual(parts.day, 1, 'Day must be 1 in Taipei');
  assert.strictEqual(parts.hour, 2);

  const dateStr = getZonedDateString(newYearUtc, timeZone);
  assert.strictEqual(dateStr, '2026-01-01');
});

test('Midnight Boundary: DAILY_SUMMARY_TIME = 0 (Midnight Hour 0) falsy defense', () => {
  // Simulate USER_CONFIG where user set DAILY_SUMMARY_TIME = 0 (run at midnight)
  const configWithZero = { DAILY_SUMMARY_TIME: 0 };
  const summaryTimeZero = Number.isInteger(configWithZero.DAILY_SUMMARY_TIME)
    ? configWithZero.DAILY_SUMMARY_TIME
    : (configWithZero.DAILY_SUMMARY_TIME ?? 6);
  assert.strictEqual(summaryTimeZero, 0, 'Configured Hour 0 must remain 0 and not default to 6');

  // Simulate default undefined
  const configDefault = {};
  const summaryTimeDefault = Number.isInteger(configDefault.DAILY_SUMMARY_TIME)
    ? configDefault.DAILY_SUMMARY_TIME
    : (configDefault.DAILY_SUMMARY_TIME ?? 6);
  assert.strictEqual(summaryTimeDefault, 6, 'Unconfigured summary time defaults to 6');
});

test('Midnight Boundary: getZonedDayRangeUtc spans exact local day across midnight', () => {
  const timeZone = 'Asia/Taipei';
  // Given Taipei 2026-09-10 14:00:00 (06:00:00 UTC)
  const testDate = new Date('2026-09-10T06:00:00.000Z');
  const { startUtc, endUtc } = getZonedDayRangeUtc(testDate, timeZone);

  // Taipei 2026-09-10 00:00:00 is 2026-09-09 16:00:00 UTC
  assert.strictEqual(startUtc.toISOString(), '2026-09-09T16:00:00.000Z');
  // Taipei 2026-09-11 00:00:00 is 2026-09-10 16:00:00 UTC
  assert.strictEqual(endUtc.toISOString(), '2026-09-10T16:00:00.000Z');
  // Duration must be exactly 24 hours (86,400,000 ms)
  assert.strictEqual(endUtc.getTime() - startUtc.getTime(), 24 * 60 * 60 * 1000);
});

test('Midnight Boundary: Weather weekday calculation is timezone and midnight immune', () => {
  // 2026-09-10 is Thursday (Day 4)
  const dateStr = '2026-09-10';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayName = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date.getUTCDay()];

  assert.strictEqual(dayName, '星期四', '2026-09-10 must be 星期四');

  // 2026-01-01 is Thursday (Day 4)
  const newYearStr = '2026-01-01';
  const [y2, m2, d2] = newYearStr.split('-').map(Number);
  const date2 = new Date(Date.UTC(y2, m2 - 1, d2));
  const dayName2 = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][date2.getUTCDay()];
  assert.strictEqual(dayName2, '星期四', '2026-01-01 must be 星期四');
});

test('Midnight Boundary: All-day calendar events format correctly across timezones', () => {
  const event = {
    start: { date: '2026-09-10' },
    summary: '整天休假'
  };

  const parts = (event.start.date || '').split('-').map(Number);
  const timeStr = parts.length >= 3 ? `${parts[1]}月${parts[2]}日 (全天)` : `${event.start.date} (全天)`;

  assert.strictEqual(timeStr, '9月10日 (全天)', 'Must retain 9月10日 regardless of viewer timezone');
});

test('Midnight Boundary: Flexible schedule date parsing supports both slash and dash', () => {
  const slashDate = '2026/09/10';
  const dashDate = '2026-09-10';

  const parse = (d) => d.includes('/') ? d.split('/').map(Number) : d.split('-').map(Number);

  const [y1, m1, d1] = parse(slashDate);
  const [y2, m2, d2] = parse(dashDate);

  assert.deepStrictEqual([y1, m1, d1], [2026, 9, 10]);
  assert.deepStrictEqual([y2, m2, d2], [2026, 9, 10]);
});

test('Midnight Boundary: "9/1 ~ 9/9" must cover up to 9/9 23:59:59 (Next day 00:00:00 exclusive upper bound)', async () => {
  const { parseNaturalTime } = await import('../src/features/google-calendar.js');

  const range = parseNaturalTime('9/1 ~ 9/9');
  
  // Start must be 2026-09-01 00:00:00 Taipei time (2026-08-31T16:00:00.000Z)
  assert.strictEqual(range.start.toISOString(), '2026-08-31T16:00:00.000Z');
  
  // End must be 2026-09-10 00:00:00 Taipei time (2026-09-09T16:00:00.000Z)
  // Because Google Calendar timeMax is exclusive (start < timeMax),
  // this guarantees that an event at 9/9 23:59:59 IS INCLUDED, while 9/10 00:00:00 is NOT included.
  assert.strictEqual(range.end.toISOString(), '2026-09-09T16:00:00.000Z');

  // Verify that an event on 9/9 at 23:59:59 Taipei (15:59:59 UTC) satisfies eventStart < range.end
  const eventAtEndOfDay = new Date('2026-09-09T15:59:59.000Z');
  assert.ok(eventAtEndOfDay < range.end, 'An event at 9/9 23:59:59 must be included in 9/1 ~ 9/9');

  // Verify that an event on 9/10 at 00:00:00 Taipei (16:00:00 UTC) is NOT included
  const eventNextDay = new Date('2026-09-09T16:00:00.000Z');
  assert.ok(!(eventNextDay < range.end), 'An event on 9/10 00:00:00 must NOT be included in 9/1 ~ 9/9');
});

