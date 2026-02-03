const DEFAULT_TIME_ZONE = "Asia/Taipei";

function buildZonedDateParts(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = dtf.formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") {
      map[p.type] = p.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const parts = buildZonedDateParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  return (asUtc - date.getTime()) / 60000;
}

function zonedTimeToUtcInternal(year, month, day, hour, minute, second, timeZone) {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  let offset = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  let utc = utcGuess - offset * 60000;
  const offset2 = getTimeZoneOffsetMinutes(new Date(utc), timeZone);
  if (offset2 !== offset) {
    utc = utcGuess - offset2 * 60000;
  }
  return new Date(utc);
}

function addDaysToLocalDateParts(year, month, day, days) {
  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCDate(base.getUTCDate() + days);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate()
  };
}

export function resolveUserTimeZone(configTimeZone) {
  if (typeof configTimeZone === "string" && configTimeZone.trim()) {
    return configTimeZone.trim();
  }
  return DEFAULT_TIME_ZONE;
}

export function getZonedDayStartUtc(dateUtc, timeZone) {
  const parts = buildZonedDateParts(dateUtc, timeZone);
  return zonedTimeToUtcInternal(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
}

export function getZonedDayRangeUtc(dateUtc, timeZone) {
  const parts = buildZonedDateParts(dateUtc, timeZone);
  const startUtc = zonedTimeToUtcInternal(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
  const next = addDaysToLocalDateParts(parts.year, parts.month, parts.day, 1);
  const endUtc = zonedTimeToUtcInternal(next.year, next.month, next.day, 0, 0, 0, timeZone);
  return { startUtc, endUtc };
}

export function getZonedDayRangeUtcByOffset(dateUtc, timeZone, dayOffset) {
  const parts = buildZonedDateParts(dateUtc, timeZone);
  const target = addDaysToLocalDateParts(parts.year, parts.month, parts.day, dayOffset);
  const startUtc = zonedTimeToUtcInternal(target.year, target.month, target.day, 0, 0, 0, timeZone);
  const next = addDaysToLocalDateParts(target.year, target.month, target.day, 1);
  const endUtc = zonedTimeToUtcInternal(next.year, next.month, next.day, 0, 0, 0, timeZone);
  return { startUtc, endUtc };
}

export function getZonedWeekRangeUtc(dateUtc, timeZone) {
  const parts = buildZonedDateParts(dateUtc, timeZone);
  const dayOfWeek = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
  const startLocal = addDaysToLocalDateParts(parts.year, parts.month, parts.day, -dayOfWeek);
  const endLocal = addDaysToLocalDateParts(startLocal.year, startLocal.month, startLocal.day, 7);
  const startUtc = zonedTimeToUtcInternal(startLocal.year, startLocal.month, startLocal.day, 0, 0, 0, timeZone);
  const endUtc = zonedTimeToUtcInternal(endLocal.year, endLocal.month, endLocal.day, 0, 0, 0, timeZone);
  return { startUtc, endUtc };
}

export function getZonedDateParts(dateUtc, timeZone) {
  return buildZonedDateParts(dateUtc, timeZone);
}

export function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  return zonedTimeToUtcInternal(year, month, day, hour, minute, second, timeZone);
}
