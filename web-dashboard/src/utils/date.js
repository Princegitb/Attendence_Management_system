/**
 * Returns the current date in local timezone as YYYY-MM-DD string.
 * Prevents UTC timezone drift where a local day is offset.
 */
export function getLocalDateString(date = new Date()) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().split('T')[0];
}
